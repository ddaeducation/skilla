import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/hooks/useActivityLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Loader2, ArrowLeft, Check, X, Eye, EyeOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";

const countries = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "Egypt", "Morocco", "Tanzania", 
  "Uganda", "Ethiopia", "Rwanda", "Cameroon", "Senegal", "Côte d'Ivoire",
  "United Kingdom", "United States", "Canada", "Germany", "France", "India", 
  "China", "Australia", "Other"
];

const educationLevels = [
  "High School", "Diploma", "Bachelor's Degree", "Master's Degree", 
  "PhD/Doctorate", "Professional Certificate", "Other"
];

const currentYear = new Date().getFullYear();
const birthYears = Array.from({ length: 80 }, (_, i) => currentYear - 16 - i);

// Zod validation schema for signup
const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100, "Full name must be less than 100 characters"),
  email: z.string().trim().email("Please enter a valid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72, "Password must be less than 72 characters"),
  phone: z.string().trim()
    .min(7, "Phone number must be at least 7 digits")
    .max(20, "Phone number must be less than 20 characters")
    .regex(/^[+]?[\d\s()-]+$/, "Please enter a valid phone number (digits, spaces, +, -, () allowed)"),
  country: z.string().min(1, "Please select your country"),
  educationLevel: z.string().min(1, "Please select your education level"),
  yearOfBirth: z.string().min(1, "Please select your year of birth"),
});

type SignupFormErrors = Partial<Record<keyof z.infer<typeof signupSchema>, string>>;

const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score: 20, label: "Weak", color: "text-destructive" };
  if (score === 2) return { score: 40, label: "Fair", color: "text-orange-500" };
  if (score === 3) return { score: 60, label: "Good", color: "text-yellow-500" };
  if (score === 4) return { score: 80, label: "Strong", color: "text-emerald-500" };
  return { score: 100, label: "Very Strong", color: "text-emerald-600" };
};

const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [formErrors, setFormErrors] = useState<SignupFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const redirectUrl = searchParams.get("redirect") || "/";

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        navigate(redirectUrl);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user && event === "SIGNED_IN") {
        navigate(redirectUrl);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectUrl]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validate form data
    const validationResult = signupSchema.safeParse({
      fullName,
      email,
      password,
      phone,
      country,
      educationLevel,
      yearOfBirth,
    });

    if (!validationResult.success) {
      const errors: SignupFormErrors = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path[0] as keyof SignupFormErrors;
        if (!errors[field]) {
          errors[field] = err.message;
        }
      });
      setFormErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: validationResult.data.email,
      password: validationResult.data.password,
      options: {
        data: {
          full_name: validationResult.data.fullName,
          phone: validationResult.data.phone,
          country: validationResult.data.country,
          education_level: validationResult.data.educationLevel,
          year_of_birth: parseInt(validationResult.data.yearOfBirth),
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email!",
        description: "We've sent you a verification link. Please verify your email to access courses.",
      });
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
      await logActivity("login", "Signed in via email/password");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setResetEmailSent(true);
      toast({
        title: "Email sent!",
        description: "Check your inbox for the password reset link.",
      });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${redirectUrl}`,
      },
    });

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          {showForgotPassword ? (
            <>
              <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  {resetEmailSent
                    ? "Check your email for a password reset link."
                    : "Enter your email to receive a password reset link."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resetEmailSent ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and spam
                      folder.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetEmailSent(false);
                      }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowForgotPassword(false)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Button>
                  </form>
                )}
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Welcome</CardTitle>
                <CardDescription>Sign in or create an account to access courses</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="signin">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <div className="space-y-4">
                      {/* <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                      >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </Button> */}

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground"> continue with email</span>
                        </div>
                      </div>

                      <form onSubmit={handleSignIn} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signin-email">Email</Label>
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="signin-password">Password</Label>
                            <Button
                              type="button"
                              variant="link"
                              className="px-0 h-auto text-sm"
                              onClick={() => setShowForgotPassword(true)}
                            >
                              Forgot password?
                            </Button>
                          </div>
                          <Input
                            id="signin-password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Signing in..." : "Sign In"}
                        </Button>
                      </form>
                    </div>
                  </TabsContent>

                  <TabsContent value="signup">
                    <div className="space-y-4">
                      {/* <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                      >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Continue with Google
                      </Button> */}

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground"> continue with email</span>
                        </div>
                      </div>

                      <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name">Full Name</Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => { setFullName(e.target.value); setFormErrors(prev => ({ ...prev, fullName: undefined })); }}
                            className={formErrors.fullName ? "border-destructive" : ""}
                          />
                          {formErrors.fullName && <p className="text-sm text-destructive">{formErrors.fullName}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <div className="relative">
                            <Input
                              id="signup-email"
                              type="email"
                              placeholder="your@email.com"
                              value={email}
                              onChange={(e) => { setEmail(e.target.value); setEmailTouched(true); setFormErrors(prev => ({ ...prev, email: undefined })); }}
                              onBlur={() => setEmailTouched(true)}
                              className={`pr-8 ${formErrors.email ? "border-destructive" : emailTouched && email ? (isValidEmail(email) ? "border-emerald-500" : "border-destructive") : ""}`}
                            />
                            {emailTouched && email && (
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                {isValidEmail(email) ? (
                                  <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <X className="h-4 w-4 text-destructive" />
                                )}
                              </span>
                            )}
                          </div>
                          {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
                          {emailTouched && email && !isValidEmail(email) && !formErrors.email && (
                            <p className="text-sm text-destructive">Please enter a valid email address</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Password</Label>
                          <div className="relative">
                            <Input
                              id="signup-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => { setPassword(e.target.value); setFormErrors(prev => ({ ...prev, password: undefined })); }}
                              className={`pr-8 ${formErrors.password ? "border-destructive" : ""}`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {password && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Password strength</span>
                                <span className={`font-medium ${getPasswordStrength(password).color}`}>
                                  {getPasswordStrength(password).label}
                                </span>
                              </div>
                              <Progress value={getPasswordStrength(password).score} className="h-1.5" />
                              <ul className="grid grid-cols-2 gap-x-2 text-xs text-muted-foreground">
                                <li className={`flex items-center gap-1 ${password.length >= 6 ? "text-emerald-500" : ""}`}>
                                  {password.length >= 6 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} 6+ characters
                                </li>
                                <li className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? "text-emerald-500" : ""}`}>
                                  {/[A-Z]/.test(password) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Uppercase
                                </li>
                                <li className={`flex items-center gap-1 ${/[0-9]/.test(password) ? "text-emerald-500" : ""}`}>
                                  {/[0-9]/.test(password) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Number
                                </li>
                                <li className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(password) ? "text-emerald-500" : ""}`}>
                                  {/[^A-Za-z0-9]/.test(password) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Special char
                                </li>
                              </ul>
                            </div>
                          )}
                          {formErrors.password && <p className="text-sm text-destructive">{formErrors.password}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-phone">Phone Number</Label>
                          <Input
                            id="signup-phone"
                            type="tel"
                            placeholder="+234 800 000 0000"
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value); setFormErrors(prev => ({ ...prev, phone: undefined })); }}
                            className={formErrors.phone ? "border-destructive" : ""}
                          />
                          {formErrors.phone && <p className="text-sm text-destructive">{formErrors.phone}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-country">Country</Label>
                          <Select value={country} onValueChange={(val) => { setCountry(val); setFormErrors(prev => ({ ...prev, country: undefined })); }}>
                            <SelectTrigger id="signup-country" className={formErrors.country ? "border-destructive" : ""}>
                              <SelectValue placeholder="Select your country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {formErrors.country && <p className="text-sm text-destructive">{formErrors.country}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-education">Education Level</Label>
                          <Select value={educationLevel} onValueChange={(val) => { setEducationLevel(val); setFormErrors(prev => ({ ...prev, educationLevel: undefined })); }}>
                            <SelectTrigger id="signup-education" className={formErrors.educationLevel ? "border-destructive" : ""}>
                              <SelectValue placeholder="Select education level" />
                            </SelectTrigger>
                            <SelectContent>
                              {educationLevels.map((level) => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {formErrors.educationLevel && <p className="text-sm text-destructive">{formErrors.educationLevel}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-year">Year of Birth</Label>
                          <Select value={yearOfBirth} onValueChange={(val) => { setYearOfBirth(val); setFormErrors(prev => ({ ...prev, yearOfBirth: undefined })); }}>
                            <SelectTrigger id="signup-year" className={formErrors.yearOfBirth ? "border-destructive" : ""}>
                              <SelectValue placeholder="Select year of birth" />
                            </SelectTrigger>
                            <SelectContent>
                              {birthYears.map((year) => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {formErrors.yearOfBirth && <p className="text-sm text-destructive">{formErrors.yearOfBirth}</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Creating account..." : "Sign Up"}
                        </Button>
                      </form>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
