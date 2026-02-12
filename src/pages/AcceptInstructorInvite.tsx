import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AcceptInstructorInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "checking" | "ready" | "accepting" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No invitation token provided");
      return;
    }

    checkInvitation();
  }, [token]);

  const checkInvitation = async () => {
    setStatus("checking");

    try {
      // Check if invitation exists and is valid
      const { data: invitation, error } = await supabase
        .from("instructor_invitations")
        .select("email, expires_at, used_at")
        .eq("token", token!)
        .maybeSingle();

      if (error || !invitation) {
        setStatus("error");
        setErrorMessage("Invalid invitation token");
        return;
      }

      if (invitation.used_at) {
        setStatus("error");
        setErrorMessage("This invitation has already been used");
        return;
      }

      if (new Date(invitation.expires_at) < new Date()) {
        setStatus("error");
        setErrorMessage("This invitation has expired");
        return;
      }

      setInviteEmail(invitation.email);

      // Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Redirect to auth page with return URL
        navigate(`/auth?redirect=/accept-instructor-invite?token=${token}`);
        return;
      }

      // Check if logged in user matches invitation email
      if (session.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        setStatus("error");
        setErrorMessage(`This invitation is for ${invitation.email}. Please log in with that email address.`);
        return;
      }

      setStatus("ready");
    } catch (error) {
      console.error("Error checking invitation:", error);
      setStatus("error");
      setErrorMessage("Failed to verify invitation");
    }
  };

  const handleAccept = async () => {
    setStatus("accepting");

    try {
      const { data, error } = await supabase.functions.invoke("accept-instructor-invitation", {
        body: { token },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setStatus("success");
      toast({
        title: "Welcome, Instructor!",
        description: data.message || "You are now an instructor at Global Nexus Institute",
      });

      // Redirect to instructor dashboard after a short delay
      setTimeout(() => {
        navigate("/instructor");
      }, 2000);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      setStatus("error");
      setErrorMessage(error.message || "Failed to accept invitation");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Instructor Invitation</CardTitle>
            <CardDescription>
              Join Global Nexus Institute as an Instructor
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(status === "loading" || status === "checking") && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Verifying invitation...</p>
              </div>
            )}

            {status === "ready" && (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  You've been invited to become an instructor at Global Nexus Institute.
                </p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="font-medium">As an instructor, you'll be able to:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Create and manage your own courses</li>
                    <li>• Add lessons with various content types</li>
                    <li>• Create quizzes and assignments</li>
                    <li>• Track student progress</li>
                    <li>• Earn money from course enrollments</li>
                  </ul>
                </div>
                <Button onClick={handleAccept} className="w-full" size="lg">
                  Accept Invitation
                </Button>
              </div>
            )}

            {status === "accepting" && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Setting up your instructor account...</p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center gap-4">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <div className="text-center">
                  <p className="font-medium text-lg">Welcome aboard!</p>
                  <p className="text-muted-foreground">
                    Redirecting to your instructor dashboard...
                  </p>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center gap-4">
                <XCircle className="w-12 h-12 text-destructive" />
                <div className="text-center">
                  <p className="font-medium text-lg text-destructive">Unable to accept invitation</p>
                  <p className="text-muted-foreground">{errorMessage}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate("/")}>
                    Go Home
                  </Button>
                  {errorMessage.includes("log in") && (
                    <Button onClick={() => navigate(`/auth?redirect=/accept-instructor-invite?token=${token}`)}>
                      Log In
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default AcceptInstructorInvite;
