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
import { Loader2, Eye, EyeOff, ArrowLeft, ArrowRight, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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

const employmentStatuses = [
  "Student", "Employed (Full-time)", "Employed (Part-time)", "Self-employed",
  "Freelancer", "Unemployed", "Retired", "Other"
];

const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];

const hearAboutOptions = [
  "Social Media", "Google Search", "Friend/Colleague", "University/School",
  "Online Ad", "Blog/Article", "Event/Conference", "Other"
];

const currentYear = new Date().getFullYear();
const birthYears = Array.from({ length: 80 }, (_, i) => currentYear - 16 - i);

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

const TOTAL_STEPS = 5;

const SignUp = () => {
  const [step, setStep] = useState(1);
  // Step 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Step 2
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  // Step 3
  const [gender, setGender] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [studentResidence, setStudentResidence] = useState("");
  const [hasDisability, setHasDisability] = useState("");
  // Step 4
  const [linkedIn, setLinkedIn] = useState("");
  const [hearAbout, setHearAbout] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);

  const [loading, setLoading] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const redirectUrl = searchParams.get("redirect") || "/";
  const referralCode = searchParams.get("ref") || "";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate(redirectUrl);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && event === "SIGNED_IN") navigate(redirectUrl);
    });
    return () => subscription.unsubscribe();
  }, [navigate, redirectUrl]);

  const validateStep = (s: number): boolean => {
    const errors: Record<string, string> = {};

    if (s === 1) {
      if (!fullName.trim() || fullName.trim().length < 2) errors.fullName = "Full name must be at least 2 characters";
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Please enter a valid email address";
      if (!password || password.length < 6) errors.password = "Password must be at least 6 characters";
    }
    if (s === 2) {
      if (!phone.trim() || phone.trim().length < 7 || !/^[+]?[\d\s()-]+$/.test(phone.trim())) errors.phone = "Please enter a valid phone number";
      if (!country) errors.country = "Please select your country";
      if (!yearOfBirth) errors.yearOfBirth = "Please select your year of birth";
    }
    if (s === 3) {
      if (!educationLevel) errors.educationLevel = "Please select your education level";
      if (!employmentStatus) errors.employmentStatus = "Please select your employment status";
    }
    if (s === 4) {
      if (!agreeTerms) errors.agreeTerms = "You must agree to the Terms & Conditions";
    }
    if (s === 5) {
      if (!confirmAccuracy) errors.confirmAccuracy = "You must confirm the accuracy of your information";
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStepErrors({});
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          country,
          education_level: educationLevel,
          year_of_birth: parseInt(yearOfBirth),
          gender: gender || null,
          employment_status: employmentStatus,
          linkedin_profile: linkedIn.trim() || null,
          hear_about: hearAbout || null,
          referred_by_code: referralCode || null,
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
  const progressPercent = (step / TOTAL_STEPS) * 100;

  const renderStepIndicator = () => (
    <div className="space-y-2 mb-6">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Step {step} of {TOTAL_STEPS}</span>
        <span>{Math.round(progressPercent)}%</span>
      </div>
      <Progress value={progressPercent} className="h-2" />
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name *</Label>
        <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        {stepErrors.fullName && <p className="text-xs text-destructive">{stepErrors.fullName}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email *</Label>
        <Input id="signup-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        {stepErrors.email && <p className="text-xs text-destructive">{stepErrors.email}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password *</Label>
        <div className="relative">
          <Input id="signup-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
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
        {stepErrors.password && <p className="text-xs text-destructive">{stepErrors.password}</p>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone *</Label>
        <Input id="phone" type="tel" placeholder="+250 7XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {stepErrors.phone && <p className="text-xs text-destructive">{stepErrors.phone}</p>}
      </div>
      <div className="space-y-2">
        <Label>Country *</Label>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
          <SelectContent>{countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        {stepErrors.country && <p className="text-xs text-destructive">{stepErrors.country}</p>}
      </div>
      <div className="space-y-2">
        <Label>Year of Birth *</Label>
        <Select value={yearOfBirth} onValueChange={setYearOfBirth}>
          <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
          <SelectContent>{birthYears.map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
        </Select>
        {stepErrors.yearOfBirth && <p className="text-xs text-destructive">{stepErrors.yearOfBirth}</p>}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Gender</Label>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger><SelectValue placeholder="Select gender (optional)" /></SelectTrigger>
          <SelectContent>{genderOptions.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Education Level *</Label>
        <Select value={educationLevel} onValueChange={setEducationLevel}>
          <SelectTrigger><SelectValue placeholder="Select education level" /></SelectTrigger>
          <SelectContent>{educationLevels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
        {stepErrors.educationLevel && <p className="text-xs text-destructive">{stepErrors.educationLevel}</p>}
      </div>
      <div className="space-y-2">
        <Label>Employment Status *</Label>
        <Select value={employmentStatus} onValueChange={setEmploymentStatus}>
          <SelectTrigger><SelectValue placeholder="Select employment status" /></SelectTrigger>
          <SelectContent>{employmentStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        {stepErrors.employmentStatus && <p className="text-xs text-destructive">{stepErrors.employmentStatus}</p>}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="linkedin">LinkedIn Profile (Optional)</Label>
        <Input id="linkedin" type="url" placeholder="https://linkedin.com/in/yourname" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>How Did You Hear About Us?</Label>
        <Select value={hearAbout} onValueChange={setHearAbout}>
          <SelectTrigger><SelectValue placeholder="Select an option (optional)" /></SelectTrigger>
          <SelectContent>{hearAboutOptions.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-3 pt-2">
        <div className="flex items-start space-x-2">
          <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(v === true)} className="mt-0.5" />
          <Label htmlFor="terms" className="text-sm font-normal leading-snug cursor-pointer">
            I agree to the <span className="text-primary underline">Terms & Conditions</span> and <span className="text-primary underline">Privacy Policy</span> *
          </Label>
        </div>
        {stepErrors.agreeTerms && <p className="text-xs text-destructive ml-7">{stepErrors.agreeTerms}</p>}
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">Review & Confirm</h4>
        <p className="text-xs text-muted-foreground">Please confirm that all the information you provided is accurate before creating your account.</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <span className="text-muted-foreground">Name:</span><span className="font-medium truncate">{fullName}</span>
          <span className="text-muted-foreground">Email:</span><span className="font-medium truncate">{email}</span>
          <span className="text-muted-foreground">Phone:</span><span className="font-medium">{phone}</span>
          <span className="text-muted-foreground">Country:</span><span className="font-medium">{country}</span>
          <span className="text-muted-foreground">Education:</span><span className="font-medium">{educationLevel}</span>
          <span className="text-muted-foreground">Employment:</span><span className="font-medium">{employmentStatus}</span>
        </div>
      </div>
      <div className="flex items-start space-x-2">
        <Checkbox id="accuracy" checked={confirmAccuracy} onCheckedChange={(v) => setConfirmAccuracy(v === true)} className="mt-0.5" />
        <Label htmlFor="accuracy" className="text-sm font-normal leading-snug cursor-pointer">
          I confirm that the information provided is accurate *
        </Label>
      </div>
      {stepErrors.confirmAccuracy && <p className="text-xs text-destructive ml-7">{stepErrors.confirmAccuracy}</p>}
    </div>
  );

  const stepTitles = ["Personal Info", "Contact Details", "Background", "Final Details", "Confirm & Submit"];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>{stepTitles[step - 1]}</CardDescription>
            {referralCode && (
              <div className="mt-2 rounded-md bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary flex items-center gap-2">
                <Gift className="h-3.5 w-3.5" />
                You were referred! You and your friend will earn rewards.
              </div>
            )}
          </CardHeader>
          <CardContent>
            {renderStepIndicator()}
            <form onSubmit={step === TOTAL_STEPS ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
              {step === 5 && renderStep5()}

              <div className="flex gap-3">
                {step > 1 && (
                  <Button type="button" variant="outline" className="flex-1" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                )}
                {step < TOTAL_STEPS ? (
                  <Button type="submit" className="flex-1">
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Account"}
                  </Button>
                )}
              </div>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link to="/signin" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default SignUp;
