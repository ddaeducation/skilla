import { supabase } from "@/integrations/supabase/client";

type ActivityAction = 
  | "login"
  | "logout"
  | "profile_update"
  | "password_change"
  | "avatar_upload"
  | "avatar_remove"
  | "account_created";

export const logActivity = async (
  action: ActivityAction,
  details?: string
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    await supabase.from("activity_logs").insert({
      user_id: session.user.id,
      action,
      details,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

export const useActivityLog = () => {
  return { logActivity };
};
