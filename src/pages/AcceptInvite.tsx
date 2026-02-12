import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("");
  
  const token = searchParams.get("token");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAcceptInvitation = async () => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid invitation link");
      return;
    }

    setAccepting(true);

    try {
      const { data, error } = await supabase.functions.invoke("accept-admin-invitation", {
        body: { token },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        setStatus("error");
        setMessage(data.error);
      } else {
        setStatus("success");
        setMessage(data.message || "You are now an admin!");
        toast({
          title: "Welcome, Admin!",
          description: "You now have admin privileges.",
        });
      }
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      setStatus("error");
      setMessage(error.message || "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-6 w-6" />
                Invalid Link
              </CardTitle>
              <CardDescription>
                This invitation link is invalid or incomplete.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/")} className="w-full">
                Go to Homepage
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="max-w-md w-full">
          {status === "pending" && (
            <>
              <CardHeader>
                <CardTitle>Admin Invitation</CardTitle>
                <CardDescription>
                  You've been invited to become an admin at GNI Academy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Signed in as <strong>{user.email}</strong>
                    </p>
                    <Button
                      onClick={handleAcceptInvitation}
                      className="w-full"
                      disabled={accepting}
                    >
                      {accepting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        "Accept Invitation"
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Please sign in or create an account to accept this invitation.
                    </p>
                    <Button
                      onClick={() => navigate(`/auth?redirect=/accept-invite?token=${token}`)}
                      className="w-full"
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign In to Continue
                    </Button>
                  </>
                )}
              </CardContent>
            </>
          )}

          {status === "success" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-6 w-6" />
                  Welcome, Admin!
                </CardTitle>
                <CardDescription>{message}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/admin")} className="w-full">
                  Go to Admin Dashboard
                </Button>
              </CardContent>
            </>
          )}

          {status === "error" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-6 w-6" />
                  Error
                </CardTitle>
                <CardDescription>{message}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/")} className="w-full">
                  Go to Homepage
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default AcceptInvite;
