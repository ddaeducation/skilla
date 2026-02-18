import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Trash2,
  Crown,
  UserPlus,
  ArrowRightLeft,
  Loader2,
  Mail,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CourseInstructor {
  id: string;
  instructor_id: string;
  role: "primary" | "co_instructor";
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

interface PendingInvitation {
  id: string;
  email: string;
  role: "co_instructor" | "primary";
  status: string;
  created_at: string;
  expires_at: string;
}

interface CourseInstructorManagerProps {
  courseId: string;
  courseName: string;
  currentInstructorId: string;
  onUpdate?: () => void;
}

export const CourseInstructorManager = ({
  courseId,
  courseName,
  currentInstructorId,
  onUpdate,
}: CourseInstructorManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courseInstructors, setCourseInstructors] = useState<CourseInstructor[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [primaryProfile, setPrimaryProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);

  // Co-instructor invite dialog
  const [coDialogOpen, setCoDialogOpen] = useState(false);
  const [coEmail, setCoEmail] = useState("");
  const [sendingCo, setSendingCo] = useState(false);

  // Transfer ownership dialog
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [sendingTransfer, setSendingTransfer] = useState(false);

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch co-instructors from course_instructors
      const { data: instructorsData } = await supabase
        .from("course_instructors")
        .select("*")
        .eq("course_id", courseId);

      if (instructorsData && instructorsData.length > 0) {
        const ids = instructorsData.map((i) => i.instructor_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
        setCourseInstructors(
          instructorsData.map((i) => ({
            ...i,
            role: i.role as "primary" | "co_instructor",
            profile: profileMap.get(i.instructor_id) || null,
          }))
        );
      } else {
        setCourseInstructors([]);
      }

      // Fetch primary instructor profile
      const { data: primaryPro } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", currentInstructorId)
        .maybeSingle();
      setPrimaryProfile(primaryPro || null);

      // Fetch pending invitations for this course
      const { data: invitations } = await supabase
        .from("course_instructor_invitations")
        .select("id, email, role, status, created_at, expires_at")
        .eq("course_id", courseId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setPendingInvitations((invitations as PendingInvitation[]) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationResponse = (
    res: { data?: any; error?: any },
    email: string,
    roleLabel: string,
    onSuccess: () => void
  ) => {
    if (res.error && !res.data?.warning) {
      throw new Error(res.data?.error || res.error?.message || "Failed to send invitation");
    }
    if (res.data?.warning && res.data?.invite_link) {
      const link = res.data.invite_link as string;
      navigator.clipboard.writeText(link).catch(() => {});
      toast({
        title: "Invitation created — link copied!",
        description: `Email delivery is unavailable. The invite link for ${email} has been copied to your clipboard. Share it directly with them.`,
        duration: 15000,
      });
    } else {
      toast({ title: `${roleLabel} invitation sent!`, description: `An invitation has been sent to ${email}.` });
    }
    onSuccess();
  };

  const handleInviteCoInstructor = async () => {
    if (!coEmail.trim()) {
      toast({ title: "Email required", description: "Please enter an email address.", variant: "destructive" });
      return;
    }
    setSendingCo(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("send-course-instructor-invitation", {
        body: { email: coEmail.trim(), courseId, role: "co_instructor" },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      handleInvitationResponse(res, coEmail.trim(), "Co-Instructor", () => {
        setCoEmail("");
        setCoDialogOpen(false);
        fetchData();
        onUpdate?.();
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSendingCo(false);
    }
  };

  const handleInviteOwner = async () => {
    if (!transferEmail.trim()) {
      toast({ title: "Email required", description: "Please enter an email address.", variant: "destructive" });
      return;
    }
    setSendingTransfer(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("send-course-instructor-invitation", {
        body: { email: transferEmail.trim(), courseId, role: "primary" },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      handleInvitationResponse(res, transferEmail.trim(), "Ownership Transfer", () => {
        setTransferEmail("");
        setTransferDialogOpen(false);
        fetchData();
        onUpdate?.();
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSendingTransfer(false);
    }
  };

  const handleRemoveInstructor = async (instructorId: string) => {
    if (!confirm("Remove this co-instructor from the course?")) return;
    try {
      const { error } = await supabase
        .from("course_instructors")
        .delete()
        .eq("course_id", courseId)
        .eq("instructor_id", instructorId);

      if (error) throw error;
      setCourseInstructors((prev) => prev.filter((i) => i.instructor_id !== instructorId));
      toast({ title: "Instructor removed", description: "The instructor has been removed from this course." });
      onUpdate?.();
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove instructor", variant: "destructive" });
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("course_instructor_invitations")
        .delete()
        .eq("id", invitationId);
      if (error) throw error;
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      toast({ title: "Invitation revoked" });
    } catch {
      toast({ title: "Error", description: "Failed to revoke invitation", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const coInstructors = courseInstructors.filter((i) => i.instructor_id !== currentInstructorId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Course Instructors
            </CardTitle>
            <CardDescription>Manage instructors for {courseName}</CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Transfer Ownership */}
            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer Ownership
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer Course Ownership</DialogTitle>
                  <DialogDescription>
                    Send an invitation to transfer full ownership of this course to another instructor. They must accept the invite via email.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-email">Recipient Email</Label>
                    <Input
                      id="transfer-email"
                      type="email"
                      placeholder="instructor@example.com"
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInviteOwner()}
                    />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                    ⚠️ The recipient will become the primary owner once they accept. The invitation link expires in 7 days.
                  </div>
                  <Button
                    onClick={handleInviteOwner}
                    disabled={sendingTransfer || !transferEmail.trim()}
                    className="w-full"
                  >
                    {sendingTransfer ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                    ) : (
                      <><Mail className="mr-2 h-4 w-4" />Send Transfer Invitation</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Co-Instructor */}
            <Dialog open={coDialogOpen} onOpenChange={setCoDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Co-Instructor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Co-Instructor</DialogTitle>
                  <DialogDescription>
                    Send an email invitation to add someone as a co-instructor on this course. The invitation expires in 7 days.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="co-email">Instructor Email</Label>
                    <Input
                      id="co-email"
                      type="email"
                      placeholder="instructor@example.com"
                      value={coEmail}
                      onChange={(e) => setCoEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInviteCoInstructor()}
                    />
                  </div>
                  <Button
                    onClick={handleInviteCoInstructor}
                    disabled={sendingCo || !coEmail.trim()}
                    className="w-full"
                  >
                    {sendingCo ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                    ) : (
                      <><Mail className="mr-2 h-4 w-4" />Send Invitation</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Instructor */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Primary Owner</p>
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{primaryProfile?.full_name || "You"}</p>
                <p className="text-sm text-muted-foreground">{primaryProfile?.email || "Primary Instructor"}</p>
              </div>
            </div>
            <Badge>Primary</Badge>
          </div>
        </div>

        {/* Co-Instructors */}
        {coInstructors.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Co-Instructors</p>
            <div className="space-y-2">
              {coInstructors.map((instructor) => (
                <div
                  key={instructor.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{instructor.profile?.full_name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{instructor.profile?.email || ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Co-Instructor</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveInstructor(instructor.instructor_id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pending Invitations</p>
            <div className="space-y-2">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-dashed bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.role === "primary" ? "Ownership transfer" : "Co-instructor"} · Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRevokeInvitation(inv.id)}
                      title="Revoke invitation"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {coInstructors.length === 0 && pendingInvitations.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No co-instructors yet. Invite someone via email above.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CourseInstructorManager;
