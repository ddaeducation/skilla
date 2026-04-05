import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/hooks/useActivityLog";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Loader2, ArrowLeft, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import logoImg from "@/assets/logo.png";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const redirectUrl = searchParams.get("redirect") || "/";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate(redirectUrl);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && event === "SIGNED_IN") navigate(redirectUrl);
    });
    return () => subscription.unsubscribe();
  }, [navigate, redirectUrl]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let loginEmail = email.trim();
    if (!loginEmail.includes('@')) {
      const { data } = await supabase.rpc('get_email_by_username', { p_username: loginEmail });
      if (!data) {
        toast({ title: "Sign in failed", description: "No account found with that username.", variant: "destructive" });
        setLoading(false);
        return;
      }
      loginEmail = data;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!", description: "Successfully signed in." });
      await logActivity("login", "Signed in via email/password");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setResetEmailSent(true);
      toast({ title: "Email sent!", description: "Check your inbox for the password reset link." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex items-center justify-center min-h-[85vh] px-4 py-12">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-[440px]">
          {/* Card */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-xl shadow-primary/5 overflow-hidden">
            {showForgotPassword ? (
              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
                    <Mail className="h-7 w-7 text-primary" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    Reset Password
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {resetEmailSent
                      ? "Check your email for a password reset link."
                      : "Enter your email to receive a reset link."}
                  </p>
                </div>

                {resetEmailSent ? (
                  <div className="space-y-5">
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center">
                      <p className="text-sm text-foreground">
                        We've sent a reset link to <strong className="text-primary">{email}</strong>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-11 rounded-xl"
                      onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-sm font-medium text-foreground">
                        Email address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-11 pl-10 rounded-xl border-border/60 focus:border-primary"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-11 rounded-xl font-semibold" disabled={loading}>
                      {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : "Send Reset Link"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full h-10 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowForgotPassword(false)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
                    <img src={logoImg} alt="Global Nexus Institute" className="w-full h-full object-contain" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    Welcome back
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Sign in to access your courses and dashboard
                  </p>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      continue with email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Email / Username */}
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-sm font-medium text-foreground">
                      Email or Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="text"
                        placeholder="your@email.com or username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-11 pl-10 rounded-xl border-border/60 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-sm font-medium text-foreground">
                        Password
                      </Label>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 pl-10 pr-11 rounded-xl border-border/60 focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl font-semibold text-base mt-2 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>

                {/* Footer link */}
                <p className="text-center text-sm text-muted-foreground mt-6">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-primary font-semibold hover:underline transition-colors">
                    Sign up
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Bottom accent */}
          <p className="text-center text-xs text-muted-foreground/50 mt-6">
            Global Nexus Institute &middot; Secure Login
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SignIn;
