import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Heart, GraduationCap, Wifi, BookOpen, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";
import { USD_TO_RWF_RATE, fetchBNRRate } from "@/lib/currency";

const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK-a45366014ecf1df9a254802e2f6f104a-X";

const usages = [
  {
    icon: GraduationCap,
    title: "Scholarships",
    description: "Fund scholarships for talented students who cannot afford tuition fees.",
  },
  {
    icon: Wifi,
    title: "Internet Access",
    description: "Provide internet connectivity to students in underserved communities.",
  },
  {
    icon: BookOpen,
    title: "Learning Materials",
    description: "Develop and distribute free learning resources and course content.",
  },
  {
    icon: Users,
    title: "Community Programs",
    description: "Support mentorship programs and community tech hubs across Africa.",
  },
];

const DonateSection = () => {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<"USD" | "RWF">("USD");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    amount: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchBNRRate();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const rawAmount = parseFloat(formData.amount) || 0;
  const donationAmount = rawAmount < 1 ? 0 : rawAmount;

  // For Flutterwave, amount must be in the selected currency
  const flutterwaveConfig = {
    public_key: FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: `donate-${Date.now()}`,
    amount: donationAmount,
    currency: currency,
    payment_options: "card,mobilemoney,ussd,banktransfer",
    customer: {
      email: formData.email || "donor@globalnexus.africa",
      phone_number: formData.phone || "",
      name: formData.name || "Anonymous Donor",
    },
    customizations: {
      title: "Global Nexus Institute - Donation",
      description: formData.message || "Supporting education in Africa",
      logo: "https://globalnexusafrica.lovable.app/favicon.png",
    },
  };

  const handleFlutterPayment = useFlutterwave(flutterwaveConfig);

  const displayAmount = donationAmount > 0
    ? currency === "RWF"
      ? `RWF ${donationAmount.toLocaleString()}`
      : `$${donationAmount}`
    : currency === "RWF"
      ? "RWF 0"
      : "$0";

  const handleDonate = (e: React.FormEvent) => {
    e.preventDefault();
    if (donationAmount < 1) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    handleFlutterPayment({
      callback: (response) => {
        console.log("Donation payment response:", response);
        closePaymentModal();
        if (response.status === "successful" || response.status === "completed") {
          toast({
            title: "Thank you for your donation! 🎉",
            description: `Your generous contribution of ${displayAmount} will make a real difference.`,
          });
          setFormData({ name: "", email: "", phone: "", amount: "", message: "" });
          setOpen(false);
        } else {
          toast({
            title: "Payment not completed",
            description: "Your donation was not processed. Please try again.",
            variant: "destructive",
          });
        }
        setIsSubmitting(false);
      },
      onClose: () => {
        setIsSubmitting(false);
      },
    });
  };

  return (
    <section id="donate" aria-labelledby="donate-heading" className="py-12 md:py-16 bg-muted/50">
      <div className="container px-4">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm font-medium mb-4">
            <Heart className="h-4 w-4" />
            Make a Difference
          </div>
          <h2 id="donate-heading" className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            Support Our Mission
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Your donation helps us provide quality education to thousands of students across Africa. Every contribution, no matter how small, creates lasting impact.
          </p>
          <Button size="lg" onClick={() => setOpen(true)} className="text-lg px-8 py-6">
            <Heart className="mr-2 h-5 w-5" />
            Donate Now
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {usages.map((usage, index) => {
            const Icon = usage.icon;
            return (
              <Card key={index} className="text-center border-none shadow-sm bg-background">
                <CardContent className="pt-6">
                  <div className="mx-auto p-3 rounded-full bg-primary/10 text-primary w-fit mb-3">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-1">{usage.title}</h3>
                  <p className="text-sm text-muted-foreground">{usage.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Donate Now
              </DialogTitle>
              <DialogDescription>
                All fields are optional. Fill in what you'd like.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDonate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="donate-name">Full Name</Label>
                <Input id="donate-name" name="name" placeholder="Your name" value={formData.name} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donate-email">Email</Label>
                <Input id="donate-email" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donate-phone">Phone Number</Label>
                <Input id="donate-phone" name="phone" placeholder="+250 7XX XXX XXX" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="donate-amount">Amount</Label>
                <div className="flex gap-2">
                  <Select value={currency} onValueChange={(v) => setCurrency(v as "USD" | "RWF")}>
                    <SelectTrigger className="w-[100px] shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="RWF">RWF</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="donate-amount"
                    name="amount"
                    type="number"
                    min="1"
                    placeholder={currency === "RWF" ? "e.g. 5000" : "e.g. 25"}
                    value={formData.amount}
                    onChange={handleChange}
                    className="flex-1"
                  />
                </div>
                {currency === "USD" && donationAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ≈ RWF {(donationAmount * USD_TO_RWF_RATE).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </p>
                )}
                {currency === "RWF" && donationAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ≈ ${(donationAmount / USD_TO_RWF_RATE).toFixed(2)} USD
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="donate-message">Message (optional)</Label>
                <Textarea id="donate-message" name="message" placeholder="Leave a word of encouragement..." value={formData.message} onChange={handleChange} rows={3} />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || donationAmount < 1}>
                <Heart className="mr-2 h-5 w-5" />
                {isSubmitting ? "Processing..." : `Donate ${displayAmount}`}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Secure payment powered by Flutterwave. Your payment is processed instantly.
              </p>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default DonateSection;
