import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Users, BarChart3, FileText, CheckCircle, ArrowRight, Loader2, ChevronsUpDown, X } from "lucide-react";

const CorporateTraining = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<{ id: string; title: string; school: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
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
      toast({ title: "Quote request submitted!", description: "We'll get back to you within 48 hours." });
      setForm({ company_name: "", contact_name: "", contact_email: "", contact_phone: "", number_of_employees: 1, message: "" });
      setSelectedCourses([]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: Building2, title: "Company Accounts", description: "Centralized account for your organization with full team management capabilities" },
    { icon: Users, title: "Bulk Enrollment", description: "Enroll your entire team in courses with a single purchase and seat-based licensing" },
    { icon: BarChart3, title: "Progress Tracking", description: "Monitor employee learning progress, completion rates, and performance metrics" },
    { icon: FileText, title: "Invoicing & Reporting", description: "Centralized payment, invoicing, and exportable reports for your organization" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="relative py-20 overflow-hidden" style={{ background: "var(--hero-gradient)" }}>
        <div className="container px-4 text-center">
          <Badge variant="secondary" className="mb-4">Corporate Training</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Upskill Your Entire Team
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Custom training solutions for organizations. Get volume discounts, centralized management, and detailed progress reports.
          </p>
          <Button size="lg" variant="secondary" onClick={() => document.getElementById("quote-form")?.scrollIntoView({ behavior: "smooth" })}>
            Request a Quote <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 container px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Why Corporate Training?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-muted/30">
        <div className="container px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Benefits for Your Organization</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              "Custom pricing with volume discounts",
              "Dedicated company dashboard",
              "Employee progress tracking & analytics",
              "Centralized billing & invoicing",
              "Add or remove team members anytime",
              "Exportable performance reports",
              "Priority support for corporate accounts",
              "Custom course bundles available",
            ].map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Form */}
      <section id="quote-form" className="py-16 container px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">Request a Custom Quote</h2>
          <p className="text-muted-foreground text-center mb-8">Tell us about your training needs and we'll create a tailored proposal.</p>

          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input id="company_name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact Person *</Label>
                    <Input id="contact_name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email *</Label>
                    <Input id="contact_email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_phone">Phone</Label>
                    <Input id="contact_phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                  </div>
                </div>
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
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
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
                <div className="space-y-2">
                  <Label htmlFor="message">Additional Details</Label>
                  <Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your training goals, timeline, etc." rows={4} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Quote Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CorporateTraining;
