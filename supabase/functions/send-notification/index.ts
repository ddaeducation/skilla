import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "announcement" | "message" | "user_status" | "enrollment_status" | "enrollment_confirmation";
  announcement?: {
    title: string;
    content: string;
    course_id?: string;
    is_global: boolean;
    author_name: string;
  };
  message?: {
    sender_name: string;
    recipient_id: string;
    content: string;
  };
  user_status?: {
    user_id: string;
    user_email: string;
    user_name: string;
    action: "suspended" | "removed" | "reactivated";
    platform_name?: string;
  };
  enrollment_status?: {
    user_email: string;
    user_name: string;
    course_name: string;
    instructor_name: string;
    action: "suspended" | "removed" | "reactivated";
    platform_name?: string;
  };
  enrollment_confirmation?: {
    user_email: string;
    user_name: string;
    course_name: string;
    amount_paid: number;
    currency: string;
    platform_name?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, announcement, message, user_status, enrollment_status, enrollment_confirmation }: NotificationRequest = await req.json();
    console.log(`Processing ${type} notification`);

    // Handle enrollment confirmation notification
    if (type === "enrollment_confirmation" && enrollment_confirmation) {
      const { user_email, user_name, course_name, amount_paid, currency, platform_name = "Global Nexus Institute" } = enrollment_confirmation;
      console.log(`Sending enrollment confirmation to ${user_email}`);

      const paymentLine = amount_paid > 0
        ? `<strong>Amount Paid:</strong> ${currency} ${amount_paid.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
        : `<strong>Enrollment:</strong> Free`;

      await resend.emails.send({
        from: `${platform_name} <onboarding@resend.dev>`,
        to: [user_email],
        subject: `🎉 Welcome to "${course_name}" — Enrollment Confirmed`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎓 Enrollment Confirmed!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #4b5563; margin: 0 0 8px 0; font-size: 16px;">Hi ${user_name || "Student"},</p>
              <p style="color: #4b5563; margin: 0 0 20px 0; line-height: 1.6;">
                Congratulations! You have successfully enrolled in the course below. You can start learning right away.
              </p>
              <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="color: #1e40af; font-weight: 700; font-size: 16px; margin: 0 0 8px 0;">${course_name}</p>
                <p style="color: #64748b; font-size: 14px; margin: 0;">${paymentLine}</p>
              </div>
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1e40af); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                  Start Learning Now →
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                This is an automated message from ${platform_name}. Please do not reply directly.
              </p>
            </div>
          </div>
        `,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }


    // Handle user status notifications (suspended, removed, reactivated)
    if (type === "user_status" && user_status) {
      const { user_email, user_name, action, platform_name = "Global Nexus Institute" } = user_status;
      
      console.log(`Sending ${action} notification to ${user_email}`);

      const subjects: Record<string, string> = {
        suspended: `⚠️ Your ${platform_name} account has been suspended`,
        removed: `❌ Your ${platform_name} account has been removed`,
        reactivated: `✅ Your ${platform_name} account has been reactivated`,
      };

      const messages: Record<string, { heading: string; body: string; color: string }> = {
        suspended: {
          heading: "Account Suspended",
          body: "Your account has been temporarily suspended. During this time, you will not be able to access your courses or platform features. If you believe this is an error or would like to appeal this decision, please contact our support team.",
          color: "#f59e0b",
        },
        removed: {
          heading: "Account Removed",
          body: "Your account has been removed from our platform. You will no longer have access to courses or platform features. If you have any questions or believe this was done in error, please contact our support team.",
          color: "#ef4444",
        },
        reactivated: {
          heading: "Account Reactivated",
          body: "Great news! Your account has been reactivated. You now have full access to your courses and all platform features. Welcome back!",
          color: "#22c55e",
        },
      };

      const { heading, body, color } = messages[action] || messages.suspended;

      await resend.emails.send({
        from: `${platform_name} <onboarding@resend.dev>`,
        to: [user_email],
        subject: subjects[action] || subjects.suspended,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${color}; padding: 4px; border-radius: 8px 8px 0 0;"></div>
            <div style="background: #f9fafb; border-radius: 0 0 8px 8px; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">${heading}</h2>
              <p style="color: #4b5563; margin: 0 0 8px 0;">Dear ${user_name || "User"},</p>
              <p style="color: #4b5563; margin: 0 0 24px 0; line-height: 1.6;">${body}</p>
              <div style="background: white; border-radius: 6px; padding: 16px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  <strong>Need help?</strong> Contact our support team if you have any questions.
                </p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This is an automated message from ${platform_name}. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        `,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle enrollment status notifications (instructor-initiated course access changes)
    if (type === "enrollment_status" && enrollment_status) {
      const { user_email, user_name, course_name, instructor_name, action, platform_name = "Global Nexus Institute" } = enrollment_status;
      
      console.log(`Sending enrollment ${action} notification to ${user_email} for course: ${course_name}`);

      const subjects: Record<string, string> = {
        suspended: `⚠️ Your access to "${course_name}" has been suspended`,
        removed: `❌ You have been removed from "${course_name}"`,
        reactivated: `✅ Your access to "${course_name}" has been restored`,
      };

      const messages: Record<string, { heading: string; body: string; color: string }> = {
        suspended: {
          heading: "Course Access Suspended",
          body: `Your access to the course "<strong>${course_name}</strong>" has been temporarily suspended by your instructor, ${instructor_name}. During this time, you will not be able to access the course materials. If you believe this is an error or have questions, please contact your instructor.`,
          color: "#f59e0b",
        },
        removed: {
          heading: "Removed from Course",
          body: `You have been removed from the course "<strong>${course_name}</strong>" by your instructor, ${instructor_name}. You will no longer have access to the course materials. If you have questions about this action, please contact your instructor or our support team.`,
          color: "#ef4444",
        },
        reactivated: {
          heading: "Course Access Restored",
          body: `Great news! Your access to the course "<strong>${course_name}</strong>" has been restored by your instructor, ${instructor_name}. You now have full access to all course materials. Welcome back!`,
          color: "#22c55e",
        },
      };

      const { heading, body, color } = messages[action] || messages.suspended;

      await resend.emails.send({
        from: `${platform_name} <onboarding@resend.dev>`,
        to: [user_email],
        subject: subjects[action] || subjects.suspended,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${color}; padding: 4px; border-radius: 8px 8px 0 0;"></div>
            <div style="background: #f9fafb; border-radius: 0 0 8px 8px; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px 0;">${heading}</h2>
              <p style="color: #4b5563; margin: 0 0 8px 0;">Dear ${user_name || "Student"},</p>
              <p style="color: #4b5563; margin: 0 0 24px 0; line-height: 1.6;">${body}</p>
              <div style="background: white; border-radius: 6px; padding: 16px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  <strong>Course:</strong> ${course_name}<br/>
                  <strong>Instructor:</strong> ${instructor_name}
                </p>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This is an automated message from ${platform_name}. Please do not reply directly to this email.
              </p>
            </div>
          </div>
        `,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (type === "announcement" && announcement) {
      let recipientEmails: string[] = [];

      if (announcement.is_global) {
        // Get all user emails for global announcements
        const { data: profiles } = await supabase
          .from("profiles")
          .select("email")
          .not("email", "is", null);
        
        recipientEmails = profiles?.map(p => p.email).filter(Boolean) || [];
      } else if (announcement.course_id) {
        // Get enrolled students' emails for course-specific announcements
        const { data: enrollments } = await supabase
          .from("enrollments")
          .select("profiles:user_id(email)")
          .eq("course_id", announcement.course_id)
          .eq("payment_status", "completed");

        recipientEmails = enrollments
          ?.map((e: any) => e.profiles?.email)
          .filter(Boolean) || [];
      }

      console.log(`Sending announcement to ${recipientEmails.length} recipients`);

      if (recipientEmails.length > 0) {
        // Send in batches to avoid rate limits
        const batchSize = 50;
        for (let i = 0; i < recipientEmails.length; i += batchSize) {
          const batch = recipientEmails.slice(i, i + batchSize);
          
          await resend.emails.send({
            from: "Learning Portal <onboarding@resend.dev>",
            to: batch,
            subject: `📢 New Announcement: ${announcement.title}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a1a; margin-bottom: 16px;">New Announcement</h2>
                <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="color: #333; margin: 0 0 12px 0;">${announcement.title}</h3>
                  <p style="color: #666; margin: 0 0 12px 0; white-space: pre-wrap;">${announcement.content}</p>
                  <p style="color: #888; font-size: 14px; margin: 0;">Posted by ${announcement.author_name}</p>
                </div>
                <a href="${supabaseUrl.replace('.supabase.co', '')}" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  View in Portal
                </a>
                <p style="color: #888; font-size: 12px; margin-top: 20px;">
                  You received this email because you are enrolled in our learning platform.
                </p>
              </div>
            `,
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, recipients: recipientEmails.length }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (type === "message" && message) {
      // Get recipient email
      const { data: recipient } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", message.recipient_id)
        .single();

      if (recipient?.email) {
        console.log(`Sending message notification to ${recipient.email}`);

        await resend.emails.send({
          from: "Learning Portal <onboarding@resend.dev>",
          to: [recipient.email],
          subject: `💬 New message from ${message.sender_name}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a1a1a; margin-bottom: 16px;">You have a new message</h2>
              <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <p style="color: #888; font-size: 14px; margin: 0 0 8px 0;">From: ${message.sender_name}</p>
                <p style="color: #333; margin: 0; white-space: pre-wrap;">${message.content}</p>
              </div>
              <a href="${supabaseUrl.replace('.supabase.co', '')}" 
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View & Reply
              </a>
              <p style="color: #888; font-size: 12px; margin-top: 20px;">
                You received this email because someone sent you a message on our learning platform.
              </p>
            </div>
          `,
        });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid request" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
