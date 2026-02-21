import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/exportUtils";
import { Building2, Users, FileText, Plus, Loader2, Download, CheckCircle, XCircle, Eye } from "lucide-react";

interface QuoteRequest {
  id: string; company_name: string; contact_name: string; contact_email: string;
  contact_phone: string | null; number_of_employees: number; courses_interested: any;
  message: string | null; status: string; quoted_amount: number | null;
  admin_notes: string | null; created_at: string;
}
interface CorporateAccount {
  id: string; name: string; email: string; status: string; max_seats: number;
  admin_user_id: string; created_at: string; phone: string | null;
}
interface Invoice {
  id: string; invoice_number: string; amount: number; currency: string; status: string;
  corporate_account_id: string; description: string | null; created_at: string;
  corporate_accounts?: { name: string };
}

const AdminCorporateManagement = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState("quotes");
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Quote review
  const [reviewingQuote, setReviewingQuote] = useState<QuoteRequest | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // Account creation via invitation
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({ admin_email: "", name: "", email: "", phone: "", max_seats: 10 });

  // Invoice creation
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ corporate_account_id: "", amount: 0, currency: "USD", description: "", due_date: "" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [q, a, i] = await Promise.all([
      supabase.from("corporate_quote_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("corporate_accounts").select("*").order("created_at", { ascending: false }),
      supabase.from("corporate_invoices").select("*, corporate_accounts(name)").order("created_at", { ascending: false }),
    ]);
    if (q.data) setQuotes(q.data as any);
    if (a.data) setAccounts(a.data as any);
    if (i.data) setInvoices(i.data as any);
    setLoading(false);
  };

  const handleQuoteAction = async (status: string) => {
    if (!reviewingQuote) return;
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from("corporate_quote_requests").update({
        status,
        quoted_amount: quoteAmount ? parseFloat(quoteAmount) : null,
        admin_notes: quoteNotes || null,
        reviewed_by: session?.user?.id || null,
      }).eq("id", reviewingQuote.id);
      toast({ title: `Quote ${status}` });
      setReviewingQuote(null);
      setQuoteAmount(""); setQuoteNotes("");
      await fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!accountForm.admin_email || !accountForm.name || !accountForm.email) {
      toast({ title: "Fill in required fields", variant: "destructive" }); return;
    }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-corporate-admin-invitation", {
        body: {
          email: accountForm.admin_email,
          company_name: accountForm.name,
          company_email: accountForm.email,
          company_phone: accountForm.phone || undefined,
          max_seats: accountForm.max_seats,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Invitation sent!", description: data?.warning || `Invitation email sent to ${accountForm.admin_email}` });
      setCreateAccountOpen(false);
      setAccountForm({ admin_email: "", name: "", email: "", phone: "", max_seats: 10 });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceForm.corporate_account_id || !invoiceForm.amount) {
      toast({ title: "Fill in required fields", variant: "destructive" }); return;
    }
    setProcessing(true);
    try {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("corporate_invoices").insert({
        corporate_account_id: invoiceForm.corporate_account_id,
        invoice_number: invoiceNumber,
        amount: invoiceForm.amount,
        currency: invoiceForm.currency,
        description: invoiceForm.description || null,
        due_date: invoiceForm.due_date || null,
        status: "sent",
      });
      if (error) throw error;
      toast({ title: "Invoice created", description: `Invoice ${invoiceNumber}` });
      setCreateInvoiceOpen(false);
      setInvoiceForm({ corporate_account_id: "", amount: 0, currency: "USD", description: "", due_date: "" });
      await fetchAll();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, status: string) => {
    await supabase.from("corporate_invoices").update({
      status,
      ...(status === "paid" ? { paid_at: new Date().toISOString() } : {}),
    }).eq("id", invoiceId);
    toast({ title: `Invoice marked as ${status}` });
    await fetchAll();
  };

  const handleUpdateAccountStatus = async (accountId: string, status: string) => {
    await supabase.from("corporate_accounts").update({ status }).eq("id", accountId);
    toast({ title: `Account ${status}` });
    await fetchAll();
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const pendingQuotes = quotes.filter((q) => q.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{accounts.length}</div><p className="text-sm text-muted-foreground">Corporate Accounts</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{pendingQuotes}</div><p className="text-sm text-muted-foreground">Pending Quotes</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{invoices.filter((i) => i.status === "paid").length}</div><p className="text-sm text-muted-foreground">Paid Invoices</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">${invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0).toLocaleString()}</div><p className="text-sm text-muted-foreground">Total Revenue</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="quotes">Quote Requests {pendingQuotes > 0 && <Badge className="ml-2" variant="destructive">{pendingQuotes}</Badge>}</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Company</TableHead><TableHead>Contact</TableHead><TableHead>Employees</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.company_name}</TableCell>
                  <TableCell><div>{q.contact_name}</div><div className="text-xs text-muted-foreground">{q.contact_email}</div></TableCell>
                  <TableCell>{q.number_of_employees}</TableCell>
                  <TableCell><Badge variant={q.status === "pending" ? "secondary" : q.status === "quoted" ? "default" : "outline"}>{q.status}</Badge></TableCell>
                  <TableCell>{new Date(q.created_at).toLocaleDateString()}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => { setReviewingQuote(q); setQuoteAmount(q.quoted_amount?.toString() || ""); setQuoteNotes(q.admin_notes || ""); }}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              {quotes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No quote requests</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Corporate Accounts</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                const columns = [
                  { header: "Name", accessor: (a: any) => a.name },
                  { header: "Email", accessor: (a: any) => a.email },
                  { header: "Status", accessor: (a: any) => a.status },
                  { header: "Seats", accessor: (a: any) => a.max_seats },
                  { header: "Created", accessor: (a: any) => new Date(a.created_at).toLocaleDateString() },
                ];
                exportToExcel(accounts, columns, "corporate-accounts");
              }}><Download className="h-4 w-4 mr-2" /> Export</Button>
              <Button onClick={() => setCreateAccountOpen(true)}><Plus className="h-4 w-4 mr-2" /> Invite Corporate Admin</Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Company</TableHead><TableHead>Email</TableHead><TableHead>Max Seats</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{a.max_seats}</TableCell>
                  <TableCell><Badge variant={a.status === "active" ? "default" : a.status === "suspended" ? "destructive" : "secondary"}>{a.status}</Badge></TableCell>
                  <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {a.status === "pending" && <Button size="sm" variant="outline" onClick={() => handleUpdateAccountStatus(a.id, "active")}>Activate</Button>}
                    {a.status === "active" && <Button size="sm" variant="outline" onClick={() => handleUpdateAccountStatus(a.id, "suspended")}>Suspend</Button>}
                    {a.status === "suspended" && <Button size="sm" variant="outline" onClick={() => handleUpdateAccountStatus(a.id, "active")}>Reactivate</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {accounts.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No corporate accounts</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Invoices</h3>
            <Button onClick={() => setCreateInvoiceOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create Invoice</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Invoice #</TableHead><TableHead>Company</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                  <TableCell>{(inv as any).corporate_accounts?.name || "—"}</TableCell>
                  <TableCell>{inv.currency} {inv.amount.toLocaleString()}</TableCell>
                  <TableCell><Badge variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"}>{inv.status}</Badge></TableCell>
                  <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {inv.status === "sent" && <Button size="sm" variant="outline" onClick={() => handleUpdateInvoiceStatus(inv.id, "paid")}>Mark Paid</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invoices</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Quote Review Dialog */}
      <Dialog open={!!reviewingQuote} onOpenChange={() => setReviewingQuote(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Quote Request</DialogTitle></DialogHeader>
          {reviewingQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Company:</span> <strong>{reviewingQuote.company_name}</strong></div>
                <div><span className="text-muted-foreground">Contact:</span> <strong>{reviewingQuote.contact_name}</strong></div>
                <div><span className="text-muted-foreground">Email:</span> {reviewingQuote.contact_email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {reviewingQuote.contact_phone || "—"}</div>
                <div><span className="text-muted-foreground">Employees:</span> {reviewingQuote.number_of_employees}</div>
              </div>
              {reviewingQuote.message && <div className="text-sm"><span className="text-muted-foreground">Message:</span><p className="mt-1">{reviewingQuote.message}</p></div>}
              <div className="space-y-2">
                <Label>Quoted Amount (USD)</Label>
                <Input type="number" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} placeholder="Enter quote amount" />
              </div>
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} placeholder="Internal notes..." />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleQuoteAction("quoted")} disabled={processing}>{processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Quote</Button>
                <Button variant="destructive" onClick={() => handleQuoteAction("declined")} disabled={processing}>Decline</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Corporate Admin</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Admin Email *</Label><Input type="email" value={accountForm.admin_email} onChange={(e) => setAccountForm({ ...accountForm, admin_email: e.target.value })} placeholder="Email of the person who will manage this account" /></div>
            <div className="space-y-2"><Label>Company Name *</Label><Input value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Company Email *</Label><Input type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={accountForm.phone} onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Max Seats</Label><Input type="number" value={accountForm.max_seats} onChange={(e) => setAccountForm({ ...accountForm, max_seats: parseInt(e.target.value) || 10 })} /></div>
            <p className="text-sm text-muted-foreground">An invitation email will be sent automatically. When accepted, the corporate account will be created and the admin can start enrolling students.</p>
            <Button className="w-full" onClick={handleSendInvitation} disabled={processing}>{processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Invitation</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Select value={invoiceForm.corporate_account_id} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, corporate_account_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Amount *</Label><Input type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: parseFloat(e.target.value) || 0 })} /></div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={invoiceForm.currency} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="RWF">RWF</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} /></div>
            <Button className="w-full" onClick={handleCreateInvoice} disabled={processing}>{processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCorporateManagement;
