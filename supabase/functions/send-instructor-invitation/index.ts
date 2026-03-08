import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    console.log("Sending instructor invitation to:", email);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the requesting user from the auth header
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
      console.error("User auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is an admin
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !adminRole) {
      console.error("Role check failed:", roleError);
      return new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if an invitation already exists for this email
    const { data: existingInvitation } = await supabaseAdmin
      .from("instructor_invitations")
      .select("id, used_at, expires_at")
      .eq("email", email)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingInvitation) {
      return new Response(
        JSON.stringify({ error: "A pending invitation already exists for this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is already an instructor
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = existingUser?.users?.find(u => u.email === email);
    
    if (targetUser) {
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", targetUser.id)
        .eq("role", "moderator")
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: "This user is already an instructor" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create the invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("instructor_invitations")
      .insert({
        email,
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

    // Send invitation email using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "https://skilllafrica.lovable.app";
    const inviteLink = `${origin}/accept-instructor-invite?token=${invitation.token}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Global Nexus Institute <noreply@resend.dev>",
        to: email,
        subject: "You've been invited to become an Instructor at Global Nexus Institute",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a;">Welcome to Global Nexus Institute!</h1>
            <p style="color: #4a4a4a; font-size: 16px;">
              You have been invited to join Global Nexus Institute as an Instructor.
            </p>
            <p style="color: #4a4a4a; font-size: 16px;">
              As an instructor, you'll be able to:
            </p>
            <ul style="color: #4a4a4a; font-size: 16px;">
              <li>Create and manage your own courses</li>
              <li>Add lessons, quizzes, and assignments</li>
              <li>Track student progress and performance</li>
              <li>Earn money from course enrollments</li>
            </ul>
            <p style="margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Accept Invitation
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              This invitation expires in 7 days.
            </p>
            <p style="color: #666; font-size: 14px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const emailError = await emailResponse.text();
      console.error("Failed to send email:", emailError);
      // Still return success since invitation was created
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: "Invitation created but email could not be sent",
          invitation_id: invitation.id 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Instructor invitation sent successfully to:", email);
    return new Response(
      JSON.stringify({ success: true, invitation_id: invitation.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-instructor-invitation:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
