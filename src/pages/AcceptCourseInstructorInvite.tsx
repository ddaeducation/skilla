import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Users, Crown } from "lucide-react";

const AcceptCourseInstructorInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "idle" | "accepting" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [inviteInfo, setInviteInfo] = useState<{ email: string; role: string; courseTitle: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);

      if (!token) {
        setStatus("error");
        setMessage("Invalid invitation link. No token found.");
        return;
      }

      // Load invitation info
      try {
        const { data, error } = await supabase
          .from("course_instructor_invitations")
          .select("email, role, status, expires_at, courses(title)")
          .eq("token", token)
          .maybeSingle();

        if (error || !data) {
          setStatus("error");
          setMessage("This invitation link is invalid or has already been used.");
          return;
        }

        if (data.status === "accepted") {
          setStatus("error");
          setMessage("This invitation has already been accepted.");
          return;
        }

        if (new Date(data.expires_at) < new Date()) {
          setStatus("error");
          setMessage("This invitation has expired.");
          return;
        }

        setInviteInfo({
          email: data.email,
          role: data.role,
          courseTitle: (data as any).courses?.title || "a course",
        });
        setStatus("idle");
      } catch {
        setStatus("error");
        setMessage("Failed to load invitation details.");
      }
    };

    init();
  }, [token]);

  const handleAccept = async () => {
    if (!isLoggedIn) {
      const redirectUrl = `/accept-course-instructor-invite?token=${encodeURIComponent(token!)}`;
      navigate(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    setStatus("accepting");
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setIsLoggedIn(false);
        setStatus("idle");
        return;
      }

      const res = await supabase.functions.invoke("accept-course-instructor-invitation", {
        body: { token },
      });

      if (res.error) {
        // For non-2xx responses, try to get the actual error from the response
        let errMsg = "Failed to accept invitation";
        if (res.data?.error) {
          errMsg = res.data.error;
        } else if (res.error instanceof Error && 'context' in res.error) {
          try {
            const ctx = res.error as any;
            const body = await ctx.context?.json?.();
            if (body?.error) errMsg = body.error;
          } catch {
            errMsg = res.error.message || errMsg;
          }
        }
        throw new Error(errMsg);
      }

      if (res.data?.error) {
        throw new Error(res.data.error);
      }

      setStatus("success");
      setMessage(res.data.message || "You have successfully accepted the invitation!");
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to accept invitation. Please try again.");
    }
  };

  const roleLabel = inviteInfo?.role === "primary" ? "Course Owner" : "Co-Instructor";
  const RoleIcon = inviteInfo?.role === "primary" ? Crown : Users;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Course Instructor Invitation</CardTitle>
          <CardDescription>Global Nexus Institute</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading invitation details…</p>
            </div>
          )}

          {status === "idle" && inviteInfo && (
            <>
              <div className="flex flex-col items-center gap-3 py-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <RoleIcon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">You're invited as a {roleLabel}</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    for <span className="font-medium text-foreground">"{inviteInfo.courseTitle}"</span>
                  </p>
                </div>
              </div>

              {inviteInfo.role === "primary" && (
              <div className="bg-warning/10 border border-warning/30 rounded-md p-3 text-sm text-warning-foreground">
                  ⚠️ Accepting this invitation will make you the <strong>primary owner</strong> of the course.
                </div>
              )}

              {!isLoggedIn && (
                <div className="bg-secondary border border-border rounded-md p-3 text-sm text-secondary-foreground">
                  You must be logged in with <strong>{inviteInfo.email}</strong> to accept this invitation.
                </div>
              )}

              <Button onClick={handleAccept} className="w-full" size="lg">
                {isLoggedIn ? `Accept as ${roleLabel}` : "Log In to Accept"}
              </Button>
            </>
          )}

          {status === "accepting" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Accepting invitation…</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="h-14 w-14 text-primary" />
              <div className="text-center space-y-1">
                <p className="font-semibold text-lg">Invitation Accepted!</p>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <Button onClick={() => navigate("/instructor")} className="w-full">
                Go to Instructor Dashboard
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <XCircle className="h-14 w-14 text-destructive" />
              <div className="text-center space-y-1">
                <p className="font-semibold text-lg">Invitation Error</p>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Go to Homepage
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptCourseInstructorInvite;
