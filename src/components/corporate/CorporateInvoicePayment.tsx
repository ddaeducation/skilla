import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF } from "@/lib/exportUtils";
import { useFlutterwave, closePaymentModal } from "flutterwave-react-v3";
import { Download, Loader2, CreditCard, CheckCircle } from "lucide-react";

const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK-a45366014ecf1df9a254802e2f6f104a-X";

interface Invoice {
  id: string; invoice_number: string; amount: number; currency: string; status: string;
  due_date: string | null; paid_at: string | null; description: string | null; items: any;
  created_at: string;
}

interface Props {
  invoices: Invoice[];
  accountName: string;
  accountEmail: string;
  onPaymentComplete: () => void;
}

const CorporateInvoicePayment = ({ invoices, accountName, accountEmail, onPaymentComplete }: Props) => {
  const { toast } = useToast();
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [verifying, setVerifying] = useState(false);

  const txRef = `corp-inv-${Date.now()}`;

  const flutterwaveConfig = payingInvoice ? {
    public_key: FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: txRef,
    amount: payingInvoice.amount,
    currency: payingInvoice.currency,
    payment_options: payingInvoice.currency === "RWF" ? "mobilemoney,card" : "card,mobilemoney",
    customer: {
      email: accountEmail,
      name: accountName,
      phone_number: "",
    },
    customizations: {
      title: "Invoice Payment",
      description: `Payment for invoice ${payingInvoice.invoice_number}`,
      logo: "",
    },
  } : {
    public_key: FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: txRef,
    amount: 0,
    currency: "USD",
    payment_options: "card",
    customer: { email: "", name: "", phone_number: "" },
    customizations: { title: "", description: "", logo: "" },
  };

  const handleFlutterPayment = useFlutterwave(flutterwaveConfig);

  const initiatePayment = (invoice: Invoice) => {
    setPayingInvoice(invoice);
    setTimeout(() => {
      handleFlutterPayment({
        callback: async (response) => {
          closePaymentModal();
          if (response.status === "successful" || response.status === "completed") {
            setVerifying(true);
            try {
              const { data, error } = await supabase.functions.invoke("verify-corporate-invoice-payment", {
                body: { transaction_id: response.transaction_id, invoice_id: invoice.id },
              });
              if (error) throw error;
              if (data?.error) throw new Error(data.error);
              toast({ title: "Payment successful!", description: `Invoice ${invoice.invoice_number} has been paid.` });
              onPaymentComplete();
            } catch (err: any) {
              toast({ title: "Verification failed", description: err.message, variant: "destructive" });
            } finally {
              setVerifying(false);
              setPayingInvoice(null);
            }
          } else {
            toast({ title: "Payment not completed", variant: "destructive" });
            setPayingInvoice(null);
          }
        },
        onClose: () => setPayingInvoice(null),
      });
    }, 100);
  };

  const items = viewingInvoice?.items as any[] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Invoices</h2>
        <Button variant="outline" onClick={() => {
          const columns = [
            { header: "Invoice", accessor: (inv: any) => inv.invoice_number },
            { header: "Amount", accessor: (inv: any) => `${inv.currency} ${inv.amount}` },
            { header: "Status", accessor: (inv: any) => inv.status },
            { header: "Date", accessor: (inv: any) => new Date(inv.created_at).toLocaleDateString() },
          ];
          exportToPDF(invoices, columns, "corporate-invoices", "Corporate Invoices");
        }}>
          <Download className="h-4 w-4 mr-2" /> Export PDF
        </Button>
      </div>

      {verifying && (
        <Card className="border-primary">
          <CardContent className="pt-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Verifying payment...</span>
          </CardContent>
        </Card>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Due Date</TableHead><TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-mono">{inv.invoice_number}</TableCell>
              <TableCell className="max-w-[200px] truncate">{inv.description || "—"}</TableCell>
              <TableCell className="font-semibold">{inv.currency} {inv.amount.toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"}>
                  {inv.status === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                  {inv.status}
                </Badge>
              </TableCell>
              <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</TableCell>
              <TableCell className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setViewingInvoice(inv)}>View</Button>
                {(inv.status === "sent" || inv.status === "overdue") && (
                  <Button size="sm" onClick={() => initiatePayment(inv)} disabled={!!payingInvoice}>
                    <CreditCard className="h-4 w-4 mr-1" /> Pay Now
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {invoices.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No invoices yet</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Invoice {viewingInvoice?.invoice_number}</DialogTitle></DialogHeader>
          {viewingInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={viewingInvoice.status === "paid" ? "default" : "secondary"}>{viewingInvoice.status}</Badge></div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(viewingInvoice.created_at).toLocaleDateString()}</div>
                {viewingInvoice.due_date && <div><span className="text-muted-foreground">Due:</span> {new Date(viewingInvoice.due_date).toLocaleDateString()}</div>}
                {viewingInvoice.paid_at && <div><span className="text-muted-foreground">Paid:</span> {new Date(viewingInvoice.paid_at).toLocaleDateString()}</div>}
              </div>
              {viewingInvoice.description && <p className="text-sm text-muted-foreground">{viewingInvoice.description}</p>}

              {items.length > 0 && (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{viewingInvoice.currency} {item.unit_price?.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">{viewingInvoice.currency} {(item.quantity * item.unit_price).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{viewingInvoice.currency} {viewingInvoice.amount.toLocaleString()}</span>
              </div>

              {(viewingInvoice.status === "sent" || viewingInvoice.status === "overdue") && (
                <Button className="w-full" onClick={() => { setViewingInvoice(null); initiatePayment(viewingInvoice); }}>
                  <CreditCard className="h-4 w-4 mr-2" /> Pay Now — {viewingInvoice.currency} {viewingInvoice.amount.toLocaleString()}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CorporateInvoicePayment;
