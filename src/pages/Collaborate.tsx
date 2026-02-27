import { useState } from "react";
import { Helmet } from "react-helmet";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SkipNavigation from "@/components/SkipNavigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Handshake, Building2, Users, GraduationCap } from "lucide-react";
import type { NavTab } from "@/pages/Index";

const collaborationTypes = [
  { value: "training_partner", label: "Training Partner" },
  { value: "content_provider", label: "Content Provider" },
  { value: "corporate_training", label: "Corporate Training" },
  { value: "technology_partner", label: "Technology Partner" },
  { value: "research_partner", label: "Research Partner" },
  { value: "sponsorship", label: "Sponsorship" },
  { value: "other", label: "Other" },
];

const Collaborate = () => {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    company_website: "",
    collaboration_type: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name || !form.contact_name || !form.contact_email || !form.collaboration_type || !form.description) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("collaboration_requests" as any).insert([form] as any);
    setLoading(false);

    if (error) {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
      toast({ title: "Application submitted!", description: "We'll review your request and get back to you soon." });
    }
  };

  return (
    <>
      <Helmet>
        <title>Collaborate with Us | Global Nexus Institute</title>
        <meta name="description" content="Partner with Global Nexus Institute to empower Africa's workforce through education and training." />
      </Helmet>
      <div className="min-h-screen">
        <SkipNavigation />
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main id="main-content" className="py-12 md:py-20">
          <div className="container px-4 max-w-4xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary mb-4">
                <Handshake className="h-10 w-10" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Collaborate with Us</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join forces with Global Nexus Institute to shape the future of education in Africa. Whether you're a company, organization, or institution, let's create impact together.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid gap-6 md:grid-cols-3 mb-12">
              {[
                { icon: Building2, title: "Industry Partnership", desc: "Align training programs with real industry needs" },
                { icon: Users, title: "Talent Pipeline", desc: "Access skilled graduates ready for the workforce" },
                { icon: GraduationCap, title: "Co-branded Programs", desc: "Create jointly certified training programs" },
              ].map((item, i) => (
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

            {/* Form */}
            {submitted ? (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-100 text-green-600 mb-4">
                    <Handshake className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
                  <p className="text-muted-foreground">Your collaboration request has been submitted. Our team will review it and contact you shortly.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Collaboration Application</CardTitle>
                  <CardDescription>Tell us about your organization and how you'd like to collaborate</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="company_name">Company / Organization Name *</Label>
                        <Input id="company_name" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_name">Contact Person Name *</Label>
                        <Input id="contact_name" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} required />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="contact_email">Email Address *</Label>
                        <Input id="contact_email" type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_phone">Phone Number</Label>
                        <Input id="contact_phone" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="company_website">Company Website</Label>
                        <Input id="company_website" placeholder="https://" value={form.company_website} onChange={e => setForm(f => ({ ...f, company_website: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="collaboration_type">Type of Collaboration *</Label>
                        <Select value={form.collaboration_type} onValueChange={v => setForm(f => ({ ...f, collaboration_type: v }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {collaborationTypes.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">How would you like to collaborate? *</Label>
                      <Textarea id="description" rows={5} placeholder="Describe your collaboration proposal, goals, and how you envision working together..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Application
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

export default Collaborate;
