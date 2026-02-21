import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from "@/lib/exportUtils";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Building2, Users, BookOpen, BarChart3, FileText, Loader2, LogOut, Download,
  UserPlus, Trash2, Trophy, SendHorizonal,
} from "lucide-react";
import CorporateAssignCourse from "@/components/corporate/CorporateAssignCourse";
import CorporateLeaderboard from "@/components/corporate/CorporateLeaderboard";
import CorporateInvoicePayment from "@/components/corporate/CorporateInvoicePayment";

interface CorporateAccount {
  id: string; name: string; email: string; status: string; max_seats: number;
}
interface Member {
  id: string; email: string; full_name: string | null; role: string; status: string; user_id: string | null;
}
interface License {
  id: string; course_id: string; total_seats: number; used_seats: number; price_per_seat: number;
  total_price: number; status: string; courses?: { title: string };
}
interface CorporateEnrollment {
  id: string; member_id: string; course_id: string; status: string; user_id: string | null;
  courses?: { title: string }; corporate_members?: { full_name: string | null; email: string };
}
interface Invoice {
  id: string; invoice_number: string; amount: number; currency: string; status: string;
  due_date: string | null; paid_at: string | null; description: string | null; items: any;
  created_at: string;
}

const CorporateDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<CorporateAccount | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [enrollments, setEnrollments] = useState<CorporateEnrollment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [assignCourseOpen, setAssignCourseOpen] = useState(false);
  const [newMember, setNewMember] = useState({ email: "", full_name: "", role: "member" });
  const [addingMember, setAddingMember] = useState(false);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }

      const { data: acct } = await supabase
        .from("corporate_accounts")
        .select("*")
        .eq("admin_user_id", session.user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!acct) {
        toast({ title: "No corporate account found", description: "Contact us to set up your corporate account.", variant: "destructive" });
        navigate("/corporate-training");
        return;
      }
      setAccount(acct);
      await fetchData(acct.id);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const fetchData = async (accountId: string) => {
    const [membersRes, licensesRes, enrollmentsRes, invoicesRes] = await Promise.all([
      supabase.from("corporate_members").select("*").eq("corporate_account_id", accountId).neq("status", "removed"),
      supabase.from("corporate_course_licenses").select("*, courses(title)").eq("corporate_account_id", accountId),
      supabase.from("corporate_enrollments").select("*, courses(title), corporate_members(full_name, email)").eq("corporate_account_id", accountId),
      supabase.from("corporate_invoices").select("*").eq("corporate_account_id", accountId).order("created_at", { ascending: false }),
    ]);
    if (membersRes.data) setMembers(membersRes.data as any);
    if (licensesRes.data) setLicenses(licensesRes.data as any);
    if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data as any);
    if (invoicesRes.data) setInvoices(invoicesRes.data as any);
  };

  const handleAddMember = async () => {
    if (!account || !newMember.email) return;
    setAddingMember(true);
    try {
      const { error } = await supabase.from("corporate_members").insert({
        corporate_account_id: account.id,
        email: newMember.email,
        full_name: newMember.full_name || null,
        role: newMember.role as any,
      });
      if (error) throw error;

      // Send invitation email
      try {
        await supabase.functions.invoke("send-corporate-member-invitation", {
          body: {
            type: "member_added",
            member_email: newMember.email,
            member_name: newMember.full_name,
            company_name: account.name,
            site_url: window.location.origin,
          },
        });
      } catch { /* email is best-effort */ }

      toast({ title: "Member added & invitation sent", description: `Invitation email sent to ${newMember.email}` });
      setNewMember({ email: "", full_name: "", role: "member" });
      setAddMemberOpen(false);
      await fetchData(account.id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingMember(false);
    }
  };

  const handleResendInvite = async (member: Member) => {
    if (!account) return;
    setSendingInvite(member.id);
    try {
      await supabase.functions.invoke("send-corporate-member-invitation", {
        body: {
          type: "member_added",
          member_email: member.email,
          member_name: member.full_name,
          company_name: account.name,
          site_url: window.location.origin,
        },
      });
      toast({ title: "Invitation resent", description: `Email sent to ${member.email}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingInvite(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!account) return;
    await supabase.from("corporate_members").update({ status: "removed" }).eq("id", memberId);
    toast({ title: "Member removed" });
    await fetchData(account.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!account) return null;

  const activeMembers = members.filter((m) => m.status !== "removed");
  const totalSeats = licenses.reduce((sum, l) => sum + l.total_seats, 0);
  const usedSeats = licenses.reduce((sum, l) => sum + l.used_seats, 0);
  const completedEnrollments = enrollments.filter((e) => e.status === "completed").length;
  const completionRate = enrollments.length > 0 ? Math.round((completedEnrollments / enrollments.length) * 100) : 0;

  const sidebarItems = [
    { id: "overview", title: "Overview", icon: Building2 },
    { id: "team", title: "Team", icon: Users },
    { id: "courses", title: "Courses", icon: BookOpen },
    { id: "progress", title: "Progress", icon: BarChart3 },
    { id: "leaderboard", title: "Leaderboard", icon: Trophy },
    { id: "invoices", title: "Invoices", icon: FileText },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b p-4">
            <h2 className="text-lg font-bold text-primary">{account.name}</h2>
            <p className="text-xs text-muted-foreground">Corporate Dashboard</p>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton isActive={activeTab === item.id} onClick={() => setActiveTab(item.id)}>
                        <item.icon className="h-4 w-4" /><span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="flex items-center gap-2 border-b p-4">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">Corporate Dashboard</h1>
          </header>

          <main className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{activeMembers.length}</div><p className="text-sm text-muted-foreground">Team Members</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{licenses.length}</div><p className="text-sm text-muted-foreground">Course Licenses</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{usedSeats}/{totalSeats}</div><p className="text-sm text-muted-foreground">Seats Used</p></CardContent></Card>
                  <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{completionRate}%</div><p className="text-sm text-muted-foreground">Completion Rate</p></CardContent></Card>
                </div>
                <Card>
                  <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                  <CardContent>
                    {enrollments.slice(0, 5).map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <span className="font-medium">{(e as any).corporate_members?.full_name || (e as any).corporate_members?.email}</span>
                          <span className="text-muted-foreground"> — {(e as any).courses?.title}</span>
                        </div>
                        <Badge variant={e.status === "completed" ? "default" : "secondary"}>{e.status}</Badge>
                      </div>
                    ))}
                    {enrollments.length === 0 && <p className="text-muted-foreground text-sm">No enrollments yet</p>}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "team" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Team Members</h2>
                  <Button onClick={() => setAddMemberOpen(true)}><UserPlus className="h-4 w-4 mr-2" /> Add & Invite Member</Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeMembers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.full_name || "—"}</TableCell>
                        <TableCell>{m.email}</TableCell>
                        <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                        <TableCell><Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge></TableCell>
                        <TableCell className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleResendInvite(m)} disabled={sendingInvite === m.id}>
                            {sendingInvite === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Add & Invite Team Member</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Full Name</Label><Input value={newMember.full_name} onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Email *</Label><Input type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} required /></div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={newMember.role} onValueChange={(v) => setNewMember({ ...newMember, role: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="member">Member</SelectItem><SelectItem value="manager">Manager</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">An invitation email will be sent automatically to the member.</p>
                      <Button className="w-full" onClick={handleAddMember} disabled={addingMember}>
                        {addingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add & Send Invitation
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {activeTab === "courses" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Course Licenses</h2>
                  {licenses.length > 0 && (
                    <Button onClick={() => setAssignCourseOpen(true)}>
                      <BookOpen className="h-4 w-4 mr-2" /> Assign Course
                    </Button>
                  )}
                </div>
                {licenses.length === 0 ? (
                  <Card><CardContent className="py-8 text-center text-muted-foreground">No course licenses yet. Contact us to purchase bulk course access.</CardContent></Card>
                ) : (
                  <div className="grid gap-4">
                    {licenses.map((l) => (
                      <Card key={l.id}>
                        <CardContent className="pt-6 flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{(l as any).courses?.title}</h3>
                            <p className="text-sm text-muted-foreground">{l.used_seats}/{l.total_seats} seats used • ${l.price_per_seat}/seat</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Progress value={(l.used_seats / l.total_seats) * 100} className="w-32" />
                            <Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <CorporateAssignCourse
                  open={assignCourseOpen}
                  onOpenChange={setAssignCourseOpen}
                  members={activeMembers}
                  licenses={licenses}
                  accountId={account.id}
                  accountName={account.name}
                  onAssigned={() => fetchData(account.id)}
                />
              </div>
            )}

            {activeTab === "progress" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Employee Progress</h2>
                  <Button variant="outline" onClick={() => {
                    const columns = [
                      { header: "Employee", accessor: (e: any) => e.corporate_members?.full_name || e.corporate_members?.email || "—" },
                      { header: "Course", accessor: (e: any) => e.courses?.title || "—" },
                      { header: "Status", accessor: (e: any) => e.status },
                    ];
                    exportToExcel(enrollments, columns, "employee-progress");
                  }}>
                    <Download className="h-4 w-4 mr-2" /> Export
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead><TableHead>Course</TableHead><TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{(e as any).corporate_members?.full_name || (e as any).corporate_members?.email || "—"}</TableCell>
                        <TableCell>{(e as any).courses?.title || "—"}</TableCell>
                        <TableCell><Badge variant={e.status === "completed" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {enrollments.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No enrollments yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {activeTab === "leaderboard" && (
              <CorporateLeaderboard members={activeMembers} enrollments={enrollments} />
            )}

            {activeTab === "invoices" && (
              <CorporateInvoicePayment
                invoices={invoices}
                accountName={account.name}
                accountEmail={account.email}
                onPaymentComplete={() => fetchData(account.id)}
              />
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default CorporateDashboard;
