import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, courseId, role } = await req.json();

    if (!email || !courseId || !role) {
      return new Response(
        JSON.stringify({ error: "email, courseId, and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["co_instructor", "primary", "admin"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "role must be co_instructor, primary, or admin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user owns the course or is admin
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("id, title, instructor_id")
      .eq("id", courseId)
      .maybeSingle();

    if (!course) {
      return new Response(
        JSON.stringify({ error: "Course not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!adminRole;

    if (course.instructor_id !== user.id && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only the course owner or admin can send invitations" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only admins can invite other admins
    if (role === "admin" && !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Only admins can invite other admins" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if a pending invitation already exists
    const { data: existing } = await supabaseAdmin
      .from("course_instructor_invitations")
      .select("id")
      .eq("course_id", courseId)
      .eq("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "A pending invitation already exists for this email on this course" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get inviter profile
    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    // Create the invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("course_instructor_invitations")
      .insert({
        course_id: courseId,
        email,
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Failed to create invitation:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "https://skilllafrica.lovable.app";
    const inviteLink = `${origin}/accept-course-instructor-invite?token=${invitation.token}`;
    const roleLabel = role === "primary" ? "Course Owner" : role === "admin" ? "Platform Admin" : "Co-Instructor";
    const inviterName = inviterProfile?.full_name || inviterProfile?.email || "An instructor";

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Global Nexus Institute <noreply@resend.dev>",
        to: email,
        subject: `You've been invited as a ${roleLabel} for "${course.title}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
            <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <h1 style="color: #1a1a1a; margin-top: 0;">Course Instructor Invitation</h1>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                <strong>${inviterName}</strong> has invited you to join the course 
                <strong>"${course.title}"</strong> as a <strong>${roleLabel}</strong>.
              </p>
              ${role === "primary" ? `
              <div style="background: #fff8e1; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>Note:</strong> Accepting this invitation will make you the primary owner of this course.
                </p>
              </div>` : role === "admin" ? `
              <div style="background: #fff8e1; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>Note:</strong> Accepting this invitation will grant you platform-wide Admin access.
                </p>
              </div>` : ""}
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                As a ${roleLabel}, you will be able to manage course content, view student progress, and collaborate on this course.
              </p>
              <div style="margin: 32px 0; text-align: center;">
                <a href="${inviteLink}" 
                   style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                  Accept Invitation
                </a>
              </div>
              <p style="color: #888; font-size: 13px;">
                This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #aaa; font-size: 12px; margin: 0;">
                Global Nexus Institute &mdash; Skills for Africa
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error("Failed to send email:", emailError);
      return new Response(
        JSON.stringify({
          success: true,
          warning: "Invitation created but email could not be sent. Share the link manually.",
          invite_link: inviteLink,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, invitation_id: invitation.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-course-instructor-invitation:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
