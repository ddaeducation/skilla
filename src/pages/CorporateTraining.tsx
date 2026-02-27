import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SkipNavigation from "@/components/SkipNavigation";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Users, BarChart3, FileText, CheckCircle, Loader2, ChevronsUpDown, X, Briefcase } from "lucide-react";

const CorporateTraining = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<{ id: string; title: string; school: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    number_of_employees: 1,
    message: "",
  });
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, school")
        .eq("publish_status", "live")
        .order("title");
      if (data) setCourses(data);
    };
    fetchCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name || !form.contact_name || !form.contact_email) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("corporate_quote_requests").insert({
        company_name: form.company_name,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        number_of_employees: form.number_of_employees,
        courses_interested: selectedCourses,
        message: form.message || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Quote request submitted!", description: "We'll get back to you within 48 hours." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: Building2, title: "Company Accounts", desc: "Centralized account with full team management" },
    { icon: Users, title: "Bulk Enrollment", desc: "Enroll your team with seat-based licensing" },
    { icon: BarChart3, title: "Progress Tracking", desc: "Monitor completion rates and performance" },
    { icon: FileText, title: "Invoicing & Reporting", desc: "Centralized billing and exportable reports" },
  ];

  const benefits = [
    "Custom pricing with volume discounts",
    "Dedicated company dashboard",
    "Employee progress tracking & analytics",
    "Centralized billing & invoicing",
    "Add or remove team members anytime",
    "Exportable performance reports",
    "Priority support for corporate accounts",
    "Custom course bundles available",
  ];

  return (
    <>
      <Helmet>
        <title>Corporate Training | Global Nexus Institute</title>
        <meta name="description" content="Upskill your entire team with custom training solutions, volume discounts, and centralized management." />
      </Helmet>
      <div className="min-h-screen">
        <SkipNavigation />
        <Navigation />
        <main id="main-content" className="py-12 md:py-20">
          <div className="container px-4 max-w-4xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
                <Briefcase className="h-10 w-10" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Corporate Training</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Custom training solutions with volume discounts, centralized management, and detailed progress reports. Upskill your entire team with Global Nexus Institute.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid gap-6 md:grid-cols-4 sm:grid-cols-2 mb-12">
              {features.map((item, i) => (
                <Card key={i} className="text-center">
                  <CardContent className="pt-6">
                    <div className="inline-flex items-center justify-center p-2 rounded-full bg-primary/10 text-primary mb-3">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Benefits */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-center mb-6">Benefits for Your Organization</h2>
              <div className="grid md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            {submitted ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-100 text-green-600 mb-4">
                    <Briefcase className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
                  <p className="text-muted-foreground">Your quote request has been submitted. Our team will review it and contact you within 48 hours.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Request a Custom Quote</CardTitle>
                  <CardDescription>Tell us about your organization and training needs</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="company_name">Company Name *</Label>
                        <Input id="company_name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_name">Contact Person *</Label>
                        <Input id="contact_name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contact_email">Email Address *</Label>
                        <Input id="contact_email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_phone">Phone Number</Label>
                        <Input id="contact_phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="num_employees">Number of Employees *</Label>
                        <Input id="num_employees" type="number" min={1} value={form.number_of_employees} onChange={(e) => setForm({ ...form, number_of_employees: parseInt(e.target.value) || 1 })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Courses of Interest</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-10 font-normal">
                              <span className="text-muted-foreground truncate">
                                {selectedCourses.length === 0
                                  ? "Search and select courses..."
                                  : `${selectedCourses.length} course${selectedCourses.length > 1 ? "s" : ""} selected`}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-[100]" align="start">
                            <Command>
                              <CommandInput placeholder="Search courses..." />
                              <CommandList>
                                <CommandEmpty>No courses found.</CommandEmpty>
                                <CommandGroup>
                                  {courses.map((c) => (
                                    <CommandItem
                                      key={c.id}
                                      value={c.title}
                                      onSelect={() =>
                                        setSelectedCourses((prev) =>
                                          prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                                        )
                                      }
                                    >
                                      <Checkbox checked={selectedCourses.includes(c.id)} className="mr-2 pointer-events-none" />
                                      <span className="truncate">{c.title}</span>
                                      <span className="ml-auto text-xs text-muted-foreground">{c.school}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedCourses.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {selectedCourses.map((id) => {
                              const course = courses.find((c) => c.id === id);
                              return (
                                <Badge key={id} variant="secondary" className="gap-1 pr-1">
                                  <span className="max-w-[200px] truncate">{course?.title}</span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCourses((prev) => prev.filter((cid) => cid !== id))}
                                    className="rounded-full hover:bg-muted p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Additional Details</Label>
                      <Textarea id="message" rows={5} placeholder="Training goals, timeline, specific requirements..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Quote Request
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default CorporateTraining;
