import { supabase } from "@/integrations/supabase/client";

/**
 * Send enrollment notification email via the existing send-notification edge function.
 */
export const sendEnrollmentNotification = async ({
  userEmail,
  userName,
  courseName,
  amountPaid,
  currency,
}: {
  userEmail: string;
  userName: string;
  courseName: string;
  amountPaid: number;
  currency: string;
}) => {
  try {
    await supabase.functions.invoke("send-notification", {
      body: {
        type: "enrollment_confirmation",
        enrollment_confirmation: {
          user_email: userEmail,
          user_name: userName,
          course_name: courseName,
          amount_paid: amountPaid,
          currency,
          platform_name: "Global Nexus Institute",
        },
      },
    });
  } catch (error) {
    console.error("Failed to send enrollment notification:", error);
  }
};
