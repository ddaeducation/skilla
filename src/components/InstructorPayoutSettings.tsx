import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Smartphone, CreditCard, Building2, CheckCircle, CalendarClock } from "lucide-react";

interface PayoutPreferences {
  id?: string;
  payout_method: "momo" | "card" | "bank_transfer";
  momo_provider?: string;
  momo_phone?: string;
  card_holder_name?: string;
  card_last_four?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  preferred_currency: "USD" | "RWF";
  payout_schedule: "manual" | "monthly";
}

const momoProviders = [
  { value: "mtn", label: "MTN Mobile Money" },
  { value: "airtel", label: "Airtel Money" },
];

const rwandaBanks = [
  { value: "bk", label: "Bank of Kigali" },
  { value: "equity", label: "Equity Bank" },
  { value: "access", label: "Access Bank" },
  { value: "i_m", label: "I&M Bank" },
  { value: "cogebanque", label: "Cogebanque" },
  { value: "other", label: "Other" },
];

export function InstructorPayoutSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<PayoutPreferences>({
    payout_method: "momo",
    preferred_currency: "RWF",
    payout_schedule: "manual",
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("instructor_payout_preferences")
        .select("*")
        .eq("instructor_id", session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          id: data.id,
          payout_method: data.payout_method as "momo" | "card" | "bank_transfer",
          momo_provider: data.momo_provider || undefined,
          momo_phone: data.momo_phone || undefined,
          card_holder_name: data.card_holder_name || undefined,
          card_last_four: data.card_last_four || undefined,
          bank_name: data.bank_name || undefined,
          bank_account_number: data.bank_account_number || undefined,
          bank_account_name: data.bank_account_name || undefined,
          preferred_currency: data.preferred_currency as "USD" | "RWF",
          payout_schedule: (data.payout_schedule as "manual" | "monthly") || "manual",
        });
      }
    } catch (error) {
      console.error("Error fetching payout preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const payoutData = {
        instructor_id: session.user.id,
        payout_method: preferences.payout_method,
        momo_provider: preferences.momo_provider || null,
        momo_phone: preferences.momo_phone || null,
        card_holder_name: preferences.card_holder_name || null,
        card_last_four: preferences.card_last_four || null,
        bank_name: preferences.bank_name || null,
        bank_account_number: preferences.bank_account_number || null,
        bank_account_name: preferences.bank_account_name || null,
        preferred_currency: preferences.preferred_currency,
        payout_schedule: preferences.payout_schedule,
      };

      if (preferences.id) {
        // Update existing
        const { error } = await supabase
          .from("instructor_payout_preferences")
          .update(payoutData)
          .eq("id", preferences.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("instructor_payout_preferences")
          .insert(payoutData);

        if (error) throw error;
      }

      toast({
        title: "Payout preferences saved",
        description: "Your payout settings have been updated successfully.",
      });

      fetchPreferences();
    } catch (error) {
      console.error("Error saving payout preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save payout preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payout Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to receive your earnings. Your 60% share will be paid to your preferred method.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preferred Currency */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Preferred Currency</Label>
            <RadioGroup
              value={preferences.preferred_currency}
              onValueChange={(value) => setPreferences({ ...preferences, preferred_currency: value as "USD" | "RWF" })}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="RWF" id="currency-rwf" />
                <Label htmlFor="currency-rwf" className="cursor-pointer">
                  Rwandan Franc (RWF)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="USD" id="currency-usd" />
                <Label htmlFor="currency-usd" className="cursor-pointer">
                  US Dollar (USD)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Payout Method */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Payout Method</Label>
            <RadioGroup
              value={preferences.payout_method}
              onValueChange={(value) => setPreferences({ ...preferences, payout_method: value as "momo" | "card" | "bank_transfer" })}
              className="grid gap-4"
            >
              {/* Mobile Money Option */}
              <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${preferences.payout_method === "momo" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="momo" id="method-momo" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="method-momo" className="cursor-pointer flex items-center gap-2 font-medium">
                    <Smartphone className="h-4 w-4" />
                    Mobile Money (MoMo Pay)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive payments directly to your MTN or Airtel mobile money account
                  </p>
                </div>
              </div>

              {/* Card Option */}
              <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${preferences.payout_method === "card" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="card" id="method-card" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="method-card" className="cursor-pointer flex items-center gap-2 font-medium">
                    <CreditCard className="h-4 w-4" />
                    Debit/Credit Card
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive payments to your linked debit or credit card
                  </p>
                </div>
              </div>

              {/* Bank Transfer Option */}
              <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${preferences.payout_method === "bank_transfer" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="bank_transfer" id="method-bank" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="method-bank" className="cursor-pointer flex items-center gap-2 font-medium">
                    <Building2 className="h-4 w-4" />
                    Bank Transfer
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive payments directly to your bank account
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Method-specific fields */}
          {preferences.payout_method === "momo" && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile Money Details
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="momo-provider">Provider</Label>
                  <Select
                    value={preferences.momo_provider || ""}
                    onValueChange={(value) => setPreferences({ ...preferences, momo_provider: value })}
                  >
                    <SelectTrigger id="momo-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {momoProviders.map((provider) => (
                        <SelectItem key={provider.value} value={provider.value}>
                          {provider.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="momo-phone">Phone Number</Label>
                  <Input
                    id="momo-phone"
                    placeholder="+250 7XX XXX XXX"
                    value={preferences.momo_phone || ""}
                    onChange={(e) => setPreferences({ ...preferences, momo_phone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {preferences.payout_method === "card" && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Card Details
              </h4>
              <p className="text-sm text-muted-foreground">
                For security, card details will be collected securely when processing your first payout.
              </p>
              <div className="space-y-2">
                <Label htmlFor="card-holder">Cardholder Name</Label>
                <Input
                  id="card-holder"
                  placeholder="Name as shown on card"
                  value={preferences.card_holder_name || ""}
                  onChange={(e) => setPreferences({ ...preferences, card_holder_name: e.target.value })}
                />
              </div>
            </div>
          )}

          {preferences.payout_method === "bank_transfer" && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Bank Account Details
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Bank</Label>
                  <Select
                    value={preferences.bank_name || ""}
                    onValueChange={(value) => setPreferences({ ...preferences, bank_name: value })}
                  >
                    <SelectTrigger id="bank-name">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {rwandaBanks.map((bank) => (
                        <SelectItem key={bank.value} value={bank.value}>
                          {bank.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-name">Account Holder Name</Label>
                  <Input
                    id="account-name"
                    placeholder="Account holder name"
                    value={preferences.bank_account_name || ""}
                    onChange={(e) => setPreferences({ ...preferences, bank_account_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="account-number">Account Number</Label>
                  <Input
                    id="account-number"
                    placeholder="Your bank account number"
                    value={preferences.bank_account_number || ""}
                    onChange={(e) => setPreferences({ ...preferences, bank_account_number: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payout Schedule */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Payout Schedule
            </Label>
            <RadioGroup
              value={preferences.payout_schedule}
              onValueChange={(value) => setPreferences({ ...preferences, payout_schedule: value as "manual" | "monthly" })}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${preferences.payout_schedule === "manual" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="manual" id="schedule-manual" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="schedule-manual" className="cursor-pointer font-medium">
                    Manual Withdrawal
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Withdraw funds anytime from the Withdraw tab
                  </p>
                </div>
              </div>
              <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${preferences.payout_schedule === "monthly" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="monthly" id="schedule-monthly" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="schedule-monthly" className="cursor-pointer font-medium">
                    Monthly Auto-Payout
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatic withdrawal on the 1st of each month
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Save Payout Preferences
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default InstructorPayoutSettings;