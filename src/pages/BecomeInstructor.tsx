import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, GraduationCap, CheckCircle2 } from "lucide-react";

const BecomeInstructor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [isAlreadyInstructor, setIsAlreadyInstructor] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    bio: "",
    expertise: "",
    experience: "",
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Sign in required",
          description: "Please sign in to apply as an instructor",
          variant: "destructive",
        });
        navigate("/auth?redirect=/become-instructor");
        return;
      }

      setUser(session.user);

      // Check if already an instructor
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "moderator");

      if (roles && roles.length > 0) {
        setIsAlreadyInstructor(true);
        setLoading(false);
        return;
      }

      // Check for existing application
      const { data: applications } = await supabase
        .from("instructor_applications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (applications && applications.length > 0) {
        setExistingApplication(applications[0]);
      }

      // Pre-fill form with user data
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setForm((prev) => ({
          ...prev,
          full_name: profile.full_name || "",
          email: profile.email || session.user.email || "",
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          email: session.user.email || "",
        }));
      }
    } catch (error) {
      console.error("Error checking user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    if (!form.full_name || !form.email || !form.expertise) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.from("instructor_applications").insert({
        user_id: user.id,
        full_name: form.full_name,
        email: form.email,
        bio: form.bio || null,
        expertise: form.expertise,
        experience: form.experience || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Application submitted!",
        description: "We'll review your application and get back to you soon.",
      });

      // Refresh to show status
      checkUser();
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (isAlreadyInstructor) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>You're an Instructor!</CardTitle>
              <CardDescription>
                You already have instructor privileges.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/instructor")} className="w-full">
                Go to Instructor Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (existingApplication) {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };

    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Application Submitted</CardTitle>
              <CardDescription>
                Your instructor application is being reviewed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[existingApplication.status] || "bg-gray-100"}`}>
                    {existingApplication.status.charAt(0).toUpperCase() + existingApplication.status.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Submitted</span>
                  <span className="text-sm">
                    {new Date(existingApplication.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {existingApplication.status === "rejected" && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Your application was not approved. You can submit a new application.
                  </p>
                  <Button onClick={() => setExistingApplication(null)}>
                    Submit New Application
                  </Button>
                </div>
              )}

              {existingApplication.status === "approved" && (
                <Button onClick={() => navigate("/instructor")} className="w-full">
                  Go to Instructor Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Become an Instructor</h1>
            <p className="text-muted-foreground mt-2">
              Share your knowledge and expertise with learners around the world
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Instructor Application</CardTitle>
              <CardDescription>
                Tell us about yourself and your teaching experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expertise">Area of Expertise *</Label>
                  <Input
                    id="expertise"
                    value={form.expertise}
                    onChange={(e) => setForm({ ...form, expertise: e.target.value })}
                    placeholder="e.g., Data Science, Web Development, Business Analytics"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Teaching/Professional Experience</Label>
                  <Textarea
                    id="experience"
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    placeholder="Describe your relevant experience..."
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BecomeInstructor;
