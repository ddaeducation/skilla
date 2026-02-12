import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, ArrowDownToLine, Clock, CheckCircle, XCircle, AlertCircle, Smartphone, CreditCard, Building2 } from "lucide-react";
import { USD_TO_RWF_RATE } from "@/lib/currency";
import { format } from "date-fns";

interface PayoutPreferences {
  id?: string;
  payout_method: "momo" | "card" | "bank_transfer";
  momo_provider?: string;
  momo_phone?: string;
  card_holder_name?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  preferred_currency: "USD" | "RWF";
  payout_schedule?: "manual" | "monthly";
}

interface WithdrawalRequest {
  id: string;
  amount_usd: number;
  amount_local: number;
  currency: string;
  payout_method: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  failure_reason: string | null;
}

interface Earning {
  id: string;
  instructor_share_usd: number;
  status: string;
}

const momoProviders: Record<string, string> = {
  mtn: "MTN Mobile Money",
  airtel: "Airtel Money",
};

const bankNames: Record<string, string> = {
  bk: "Bank of Kigali",
  equity: "Equity Bank",
  access: "Access Bank",
  i_m: "I&M Bank",
  cogebanque: "Cogebanque",
  other: "Other",
};

export function InstructorWithdrawal() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  
  const [preferences, setPreferences] = useState<PayoutPreferences | null>(null);
  const [usdBalance, setUsdBalance] = useState(0);
  const [rwfBalance, setRwfBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawCurrency, setWithdrawCurrency] = useState<"USD" | "RWF">("USD");
  const [selectedMethod, setSelectedMethod] = useState<string>("");


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch payout preferences
      const { data: prefsData } = await supabase
        .from("instructor_payout_preferences")
        .select("*")
        .eq("instructor_id", session.user.id)
        .maybeSingle();

      if (prefsData) {
        setPreferences({
          id: prefsData.id,
          payout_method: prefsData.payout_method as "momo" | "card" | "bank_transfer",
          momo_provider: prefsData.momo_provider || undefined,
          momo_phone: prefsData.momo_phone || undefined,
          card_holder_name: prefsData.card_holder_name || undefined,
          bank_name: prefsData.bank_name || undefined,
          bank_account_number: prefsData.bank_account_number || undefined,
          bank_account_name: prefsData.bank_account_name || undefined,
          preferred_currency: (prefsData.preferred_currency as "USD" | "RWF") || "USD",
          payout_schedule: (prefsData.payout_schedule as "manual" | "monthly") || "manual",
        });
        setSelectedMethod(prefsData.payout_method);
        setWithdrawCurrency((prefsData.preferred_currency as "USD" | "RWF") || "USD");
      }

      // Fetch pending earnings - separate by payment currency
      const { data: earningsData } = await supabase
        .from("instructor_earnings")
        .select("instructor_share_usd, instructor_share, payment_currency, status")
        .eq("instructor_id", session.user.id)
        .eq("status", "pending");

      if (earningsData) {
        // Calculate USD earnings (paid in USD)
        const usdEarnings = earningsData
          .filter((e: any) => e.payment_currency === "USD" || !e.payment_currency)
          .reduce((sum: number, e: any) => sum + (e.instructor_share_usd || e.instructor_share || 0), 0);
        
        // Calculate RWF earnings (paid in RWF) - store as RWF amount
        const rwfEarnings = earningsData
          .filter((e: any) => e.payment_currency === "RWF")
          .reduce((sum: number, e: any) => sum + (e.instructor_share || 0), 0);
        
        setUsdBalance(usdEarnings);
        setRwfBalance(rwfEarnings);
      }

      // Fetch withdrawal history
      const { data: withdrawalsData } = await supabase
        .from("instructor_withdrawal_requests")
        .select("*")
        .eq("instructor_id", session.user.id)
        .order("created_at", { ascending: false });

      if (withdrawalsData) {
        setWithdrawals(withdrawalsData as unknown as WithdrawalRequest[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPayoutMethodDisplay = () => {
    if (!preferences) return null;
    
    switch (preferences.payout_method) {
      case "momo":
        return {
          icon: Smartphone,
          label: momoProviders[preferences.momo_provider || ""] || "Mobile Money",
          details: preferences.momo_phone || "No phone set",
        };
      case "card":
        return {
          icon: CreditCard,
          label: "Card",
          details: preferences.card_holder_name || "No card set",
        };
      case "bank_transfer":
        return {
          icon: Building2,
          label: bankNames[preferences.bank_name || ""] || "Bank Transfer",
          details: preferences.bank_account_name || "No account set",
        };
      default:
        return null;
    }
  };

  const handleWithdraw = async () => {
    if (!preferences) {
      toast({
        title: "Setup Required",
        description: "Please configure your payout preferences first",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    // Validate against the selected currency balance
    if (withdrawCurrency === "USD" && amount > usdBalance) {
      toast({
        title: "Insufficient USD Balance",
        description: `Your available USD balance is $${usdBalance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }
    
    if (withdrawCurrency === "RWF" && amount > rwfBalance) {
      toast({
        title: "Insufficient RWF Balance",
        description: `Your available RWF balance is RWF ${rwfBalance.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    // Convert to USD for storage
    const amountUSD = withdrawCurrency === "RWF" ? amount / USD_TO_RWF_RATE : amount;

    // Minimum withdrawal check (RWF 200 or USD equivalent)
    const minRWF = 200;
    const minUSD = minRWF / USD_TO_RWF_RATE;
    
    if ((withdrawCurrency === "RWF" && amount < minRWF) || (withdrawCurrency === "USD" && amount < minUSD)) {
      toast({
        title: "Minimum Withdrawal",
        description: `Minimum withdrawal amount is RWF 200 ($${minUSD.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Calculate local amount
      const amountLocal = withdrawCurrency === "RWF" ? amount : amount * USD_TO_RWF_RATE;

      // Create withdrawal request
      const { error } = await supabase
        .from("instructor_withdrawal_requests")
        .insert({
          instructor_id: session.user.id,
          amount_usd: amountUSD,
          amount_local: amountLocal,
          currency: withdrawCurrency,
          payout_method: preferences.payout_method,
          payout_details: {
            momo_provider: preferences.momo_provider,
            momo_phone: preferences.momo_phone,
            card_holder_name: preferences.card_holder_name,
            bank_name: preferences.bank_name,
            bank_account_number: preferences.bank_account_number,
            bank_account_name: preferences.bank_account_name,
          },
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Withdrawal Requested",
        description: `Your withdrawal of ${withdrawCurrency === "USD" ? `$${amount.toFixed(2)}` : `RWF ${amount.toLocaleString()}`} has been submitted`,
      });

      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
      fetchData();
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId: string) => {
    try {
      const { error } = await supabase
        .from("instructor_withdrawal_requests")
        .update({ status: "cancelled" })
        .eq("id", withdrawalId);

      if (error) throw error;

      toast({
        title: "Withdrawal Cancelled",
        description: "Your withdrawal request has been cancelled",
      });

      fetchData();
    } catch (error) {
      console.error("Error cancelling withdrawal:", error);
      toast({
        title: "Error",
        description: "Failed to cancel withdrawal",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "processing":
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case "cancelled":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const payoutMethodDisplay = getPayoutMethodDisplay();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup Warning */}
      {!preferences && (
        <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg flex items-start gap-3 border border-orange-200 dark:border-orange-800">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-200">Setup Required</p>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Please configure your payout preferences in the Settings tab before requesting a withdrawal.
            </p>
          </div>
        </div>
      )}

      {/* Payout Method Display */}
      {payoutMethodDisplay && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <payoutMethodDisplay.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payout Method</p>
                  <p className="font-medium">{payoutMethodDisplay.label} • {payoutMethodDisplay.details}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Separate Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* USD Balance Card */}
        <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-background">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 bg-green-100 dark:bg-green-900 rounded-full">
                <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              USD Earnings
            </CardTitle>
            <CardDescription>
              Payments received in US Dollars
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${usdBalance.toFixed(2)}
            </p>
            <Button 
              className="w-full mt-4"
              onClick={() => {
                setWithdrawCurrency("USD");
                setWithdrawDialogOpen(true);
              }}
              disabled={usdBalance < (200 / USD_TO_RWF_RATE) || !preferences}
            >
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              Withdraw USD
            </Button>
          </CardContent>
        </Card>

        {/* RWF Balance Card */}
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-background">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              RWF Earnings
            </CardTitle>
            <CardDescription>
              Payments received in Rwandan Francs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              RWF {rwfBalance.toLocaleString()}
            </p>
            <Button 
              className="w-full mt-4"
              onClick={() => {
                setWithdrawCurrency("RWF");
                setWithdrawDialogOpen(true);
              }}
              disabled={rwfBalance < 200 || !preferences}
            >
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              Withdraw RWF
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Withdrawal History */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>
            Track your withdrawal requests and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowDownToLine className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No withdrawal requests yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      {format(new Date(w.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <p className={`font-medium ${w.currency === "USD" ? "text-green-600" : "text-blue-600"}`}>
                        {w.currency === "USD" ? `$${w.amount_usd.toFixed(2)}` : `RWF ${w.amount_local.toLocaleString()}`}
                      </p>
                    </TableCell>
                    <TableCell className="capitalize">{w.payout_method.replace("_", " ")}</TableCell>
                    <TableCell>{getStatusBadge(w.status)}</TableCell>
                    <TableCell>
                      {w.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelWithdrawal(w.id)}
                        >
                          Cancel
                        </Button>
                      )}
                      {w.status === "failed" && w.failure_reason && (
                        <span className="text-xs text-destructive">{w.failure_reason}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Request a withdrawal to your registered payout method
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className={`p-3 rounded-lg text-center ${withdrawCurrency === "USD" ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800" : "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"}`}>
              <p className="text-sm text-muted-foreground">
                {withdrawCurrency === "USD" ? "USD" : "RWF"} Balance
              </p>
              <p className={`text-xl font-bold ${withdrawCurrency === "USD" ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}>
                {withdrawCurrency === "USD" ? `$${usdBalance.toFixed(2)}` : `RWF ${rwfBalance.toLocaleString()}`}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Withdraw From</Label>
              <RadioGroup
                value={withdrawCurrency}
                onValueChange={(v) => {
                  setWithdrawCurrency(v as "USD" | "RWF");
                  setWithdrawAmount("");
                }}
                className="flex gap-4"
              >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="USD" id="withdraw-usd" />
                <Label htmlFor="withdraw-usd" className="cursor-pointer flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  USD Balance (${usdBalance.toFixed(2)})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="RWF" id="withdraw-rwf" />
                <Label htmlFor="withdraw-rwf" className="cursor-pointer flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  RWF Balance (RWF {rwfBalance.toLocaleString()})
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
              <Label htmlFor="amount">Amount to Withdraw</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {withdrawCurrency === "USD" ? "$" : "RWF"}
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder={withdrawCurrency === "USD" ? "0.00" : "0"}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className={withdrawCurrency === "USD" ? "pl-7" : "pl-12"}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum withdrawal: RWF 200 (${(200 / USD_TO_RWF_RATE).toFixed(2)})
              </p>
            </div>

            {payoutMethodDisplay && (
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Sending to</p>
                <div className="flex items-center gap-2">
                  <payoutMethodDisplay.icon className="h-4 w-4" />
                  <span className="font-medium">{payoutMethodDisplay.label}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{payoutMethodDisplay.details}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Request Withdrawal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InstructorWithdrawal;
