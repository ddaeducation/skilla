import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AcceptCorporateInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "checking" | "ready" | "accepting" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState<any>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No invitation token provided");
      return;
    }
    checkInvitation();
  }, [token]);

  const checkInvitation = async () => {
    setStatus("checking");
    const { data, error: fetchError } = await supabase
      .from("corporate_admin_invitations")
      .select("*")
      .eq("token", token!)
      .maybeSingle();

    if (fetchError || !data) {
      setStatus("error");
      setError("Invalid or expired invitation");
      return;
    }

    if (data.used_at) {
      setStatus("error");
      setError("This invitation has already been used");
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setStatus("error");
      setError("This invitation has expired");
      return;
    }

    setInvitation(data);

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=${encodeURIComponent(`/accept-corporate-invite?token=${token}`)}`);
      return;
    }

    setStatus("ready");
  };

  const handleAccept = async () => {
    setStatus("accepting");
    try {
      const { data, error: fnError } = await supabase.functions.invoke("accept-corporate-admin-invitation", {
        body: { token },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setStatus("success");
      toast({ title: "Welcome!", description: "Your corporate account is ready." });
      setTimeout(() => navigate("/corporate-dashboard"), 2000);
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Failed to accept invitation");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building2 className="h-12 w-12 mx-auto text-primary mb-2" />
          <CardTitle>Corporate Admin Invitation</CardTitle>
          <CardDescription>
            {invitation ? `You've been invited to manage ${invitation.company_name}` : "Loading invitation..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(status === "loading" || status === "checking") && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {status === "ready" && invitation && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div><span className="text-muted-foreground">Company:</span> <strong>{invitation.company_name}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> {invitation.company_email}</div>
                <div><span className="text-muted-foreground">Max Seats:</span> {invitation.max_seats}</div>
              </div>
              <p className="text-sm text-muted-foreground">
                By accepting, you'll become the administrator for this corporate account. You'll be able to manage team members, enroll employees in courses, and track progress.
              </p>
              <Button className="w-full" onClick={handleAccept}>
                Accept & Create Account
              </Button>
            </div>
          )}

          {status === "accepting" && (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Setting up your corporate account...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-2 py-8">
              <CheckCircle className="h-12 w-12 text-primary" />
              <p className="font-semibold">Account Created!</p>
              <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-2 py-8">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="font-semibold">Something went wrong</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptCorporateInvite;
