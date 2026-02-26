import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  phone: z.string().trim().min(7, "Phone number must be at least 7 digits").max(20).regex(/^[+]?[\d\s()-]+$/, "Please enter a valid phone number"),
  country: z.string().min(1, "Please select your country"),
  educationLevel: z.string().min(1, "Please select your education level"),
  yearOfBirth: z.string().min(1, "Please select your year of birth"),
});

type SignupFormErrors = Partial<Record<keyof z.infer<typeof signupSchema>, string>>;

const getPasswordStrength = (pwd: string) => {
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

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<SignupFormErrors>({});
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const validationResult = signupSchema.safeParse({ fullName, email, password, phone, country, educationLevel, yearOfBirth });

    if (!validationResult.success) {
      const errors: SignupFormErrors = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path[0] as keyof SignupFormErrors;
        if (!errors[field]) errors[field] = err.message;
      });
      setFormErrors(errors);
      toast({ title: "Validation Error", description: "Please fix the errors in the form.", variant: "destructive" });
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
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email!", description: "We've sent you a verification link. Please verify your email to access courses." });
    }
    setLoading(false);
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Sign up to start your learning journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">create with email</span>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  {formErrors.fullName && <p className="text-xs text-destructive">{formErrors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email *</Label>
                  <Input id="signup-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password *</Label>
                  <div className="relative">
                    <Input id="signup-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {password && (
                    <div className="space-y-1">
                      <Progress value={passwordStrength.score} className="h-1.5" />
                      <p className={`text-xs ${passwordStrength.color}`}>{passwordStrength.label}</p>
                    </div>
                  )}
                  {formErrors.password && <p className="text-xs text-destructive">{formErrors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" type="tel" placeholder="+250 7XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Country *</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>{countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  {formErrors.country && <p className="text-xs text-destructive">{formErrors.country}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Education Level *</Label>
                  <Select value={educationLevel} onValueChange={setEducationLevel}>
                    <SelectTrigger><SelectValue placeholder="Select education level" /></SelectTrigger>
                    <SelectContent>{educationLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                  {formErrors.educationLevel && <p className="text-xs text-destructive">{formErrors.educationLevel}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Year of Birth *</Label>
                  <Select value={yearOfBirth} onValueChange={setYearOfBirth}>
                    <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                    <SelectContent>{birthYears.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                  {formErrors.yearOfBirth && <p className="text-xs text-destructive">{formErrors.yearOfBirth}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : "Create Account"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/signin" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default SignUp;
