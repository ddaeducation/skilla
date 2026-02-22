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
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the accepting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required. Please log in first." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authToken = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authToken);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the invitation
    console.log("Looking up invitation with token:", token?.substring(0, 8) + "...");
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("course_instructor_invitations")
      .select("*, courses(title)")
      .eq("token", token)
      .maybeSingle();

    console.log("Invitation lookup result:", { found: !!invitation, error: inviteError?.message, status: invitation?.status });

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invitation.status === "accepted") {
      return new Response(
        JSON.stringify({ error: "This invitation has already been accepted" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabaseAdmin
        .from("course_instructor_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      return new Response(
        JSON.stringify({ error: "This invitation has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email matches
    console.log("Email comparison:", { userEmail: user.email?.toLowerCase(), inviteEmail: invitation.email.toLowerCase() });
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return new Response(
        JSON.stringify({
          error: `This invitation is for ${invitation.email}. Please log in with that email address.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Make sure the user has instructor (moderator) role
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "moderator")
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: user.id, role: "moderator" });
      if (roleError) {
        console.error("Failed to assign instructor role:", roleError);
        return new Response(
          JSON.stringify({ error: "Failed to assign instructor role" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (invitation.role === "primary") {
      // Transfer course ownership
      const { error: transferError } = await supabaseAdmin
        .from("courses")
        .update({ instructor_id: user.id })
        .eq("id", invitation.course_id);

      if (transferError) {
        console.error("Failed to transfer course ownership:", transferError);
        return new Response(
          JSON.stringify({ error: "Failed to transfer course ownership" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update course_instructors: remove old primary, add new
      await supabaseAdmin
        .from("course_instructors")
        .delete()
        .eq("course_id", invitation.course_id)
        .eq("role", "primary");

      await supabaseAdmin.from("course_instructors").upsert({
        course_id: invitation.course_id,
        instructor_id: user.id,
        role: "primary",
        added_by: invitation.invited_by,
      });
    } else {
      // Add as co-instructor
      const { data: alreadyAssigned } = await supabaseAdmin
        .from("course_instructors")
        .select("id")
        .eq("course_id", invitation.course_id)
        .eq("instructor_id", user.id)
        .maybeSingle();

      if (!alreadyAssigned) {
        const { error: coError } = await supabaseAdmin
          .from("course_instructors")
          .insert({
            course_id: invitation.course_id,
            instructor_id: user.id,
            role: "co_instructor",
            added_by: invitation.invited_by,
          });

        if (coError) {
          console.error("Failed to add co-instructor:", coError);
          return new Response(
            JSON.stringify({ error: "Failed to add as co-instructor" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Mark invitation as accepted
    await supabaseAdmin
      .from("course_instructor_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    const roleLabel = invitation.role === "primary" ? "Course Owner" : "Co-Instructor";
    const courseTitle = (invitation as any).courses?.title || "the course";

    return new Response(
      JSON.stringify({
        success: true,
        message: `You are now a ${roleLabel} for "${courseTitle}". You can access it from your instructor dashboard.`,
        course_id: invitation.course_id,
        role: invitation.role,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in accept-course-instructor-invitation:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
