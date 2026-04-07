import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  type: "member_added" | "course_assigned";
  member_email: string;
  member_name?: string;
  company_name: string;
  course_title?: string;
  site_url: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check: require a valid user who is an admin or corporate admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is an admin or a corporate account admin
    const { data: adminRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const { data: corpAccount } = await supabaseAdmin
      .from("corporate_accounts")
      .select("id")
      .eq("admin_user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!adminRole && !corpAccount) {
      return new Response(JSON.stringify({ error: "Unauthorized: admin or corporate admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type, member_email, member_name, company_name, course_title, site_url }: InvitationRequest = await req.json();

    if (!member_email || !company_name) {
      throw new Error("Missing required fields");
    }

    const name = member_name || "Team Member";

    if (type === "member_added") {
      await resend.emails.send({
        from: `${company_name} <onboarding@resend.dev>`,
        to: [member_email],
        subject: `🎉 You've been added to ${company_name}'s learning team!`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 4px; border-radius: 8px 8px 0 0;"></div>
            <div style="background: #f9fafb; border-radius: 0 0 8px 8px; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">Welcome to ${company_name}'s Learning Portal!</h2>
              <p style="color: #4b5563; margin: 0 0 8px 0;">Dear ${name},</p>
              <p style="color: #4b5563; margin: 0 0 24px 0; line-height: 1.6;">
                You've been added as a team member to <strong>${company_name}</strong>'s corporate learning program. 
                Your organization has enrolled you to access professional courses and development resources.
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${site_url}/auth" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Sign Up & Get Started
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin: 16px 0 0 0;">
                Create an account using this email address (<strong>${member_email}</strong>) to access your assigned courses.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0;">
                This is an automated message from ${company_name}. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        `,
      });
    } else if (type === "course_assigned") {
      await resend.emails.send({
        from: `${company_name} <onboarding@resend.dev>`,
        to: [member_email],
        subject: `📚 New course assigned: ${course_title}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #059669, #2563eb); padding: 4px; border-radius: 8px 8px 0 0;"></div>
            <div style="background: #f9fafb; border-radius: 0 0 8px 8px; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">New Course Assigned!</h2>
              <p style="color: #4b5563; margin: 0 0 8px 0;">Dear ${name},</p>
              <p style="color: #4b5563; margin: 0 0 24px 0; line-height: 1.6;">
                You've been assigned a new course by <strong>${company_name}</strong>:
              </p>
              <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
                <h3 style="color: #1a1a1a; margin: 0 0 8px 0;">📖 ${course_title}</h3>
                <p style="color: #6b7280; font-size: 14px; margin: 0;">Start learning at your own pace!</p>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${site_url}/lms" style="display: inline-block; background: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Start Course
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0;">
                This is an automated message from ${company_name}. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        `,
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending corporate invitation:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send invitation" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
