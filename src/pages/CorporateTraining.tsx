import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Users, BarChart3, FileText, CheckCircle, ArrowRight, Loader2, ChevronsUpDown, X } from "lucide-react";

const CorporateTraining = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<{ id: string; title: string; school: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
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
      setQuoteOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { icon: Building2, title: "Company Accounts", description: "Centralized account with full team management" },
    { icon: Users, title: "Bulk Enrollment", description: "Enroll your team with seat-based licensing" },
    { icon: BarChart3, title: "Progress Tracking", description: "Monitor completion rates and performance" },
    { icon: FileText, title: "Invoicing & Reporting", description: "Centralized billing and exportable reports" },
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
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero - compact */}
      <section className="relative py-12 overflow-hidden" style={{ background: "var(--hero-gradient)" }}>
        <div className="container px-4 text-center">
          <Badge variant="secondary" className="mb-3">Corporate Training</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
            Upskill Your Entire Team
          </h1>
          <p className="text-base text-primary-foreground/80 max-w-xl mx-auto mb-5">
            Custom training solutions with volume discounts, centralized management, and detailed progress reports.
          </p>
          <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="secondary">
                Request a Custom Quote <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background">
              <DialogHeader>
                <DialogTitle>Request a Custom Quote</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input id="company_name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_name">Contact Person *</Label>
                    <Input id="contact_name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_email">Email *</Label>
                    <Input id="contact_email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_phone">Phone</Label>
                    <Input id="contact_phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="num_employees">Number of Employees *</Label>
                  <Input id="num_employees" type="number" min={1} value={form.number_of_employees} onChange={(e) => setForm({ ...form, number_of_employees: parseInt(e.target.value) || 1 })} required />
                </div>
                <div className="space-y-1.5">
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
                <div className="space-y-1.5">
                  <Label htmlFor="message">Additional Details</Label>
                  <Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Training goals, timeline, etc." rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Quote Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* Features + Benefits combined */}
      <section className="py-10 container px-4">
        <h2 className="text-2xl font-bold text-center mb-6">Why Corporate Training?</h2>
        <div className="grid md:grid-cols-4 gap-4 mb-10">
          {features.map((f) => (
            <Card key={f.title} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-5 pb-4">
                <div className="mx-auto w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-center mb-6">Benefits for Your Organization</h2>
        <div className="grid md:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CorporateTraining;
