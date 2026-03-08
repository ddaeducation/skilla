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
  X,
  GraduationCap,
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
  role: "co_instructor" | "primary" | "admin";
  status: string;
  created_at: string;
  expires_at: string;
}

interface EnrolledStudent {
  user_id: string;
  full_name: string | null;
  email: string | null;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [courseInstructors, setCourseInstructors] = useState<CourseInstructor[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [primaryProfile, setPrimaryProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);

  // Unified invite dialog
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"co_instructor" | "primary" | "admin">("co_instructor");
  const [sendingInvite, setSendingInvite] = useState(false);

  // Enrolled students assignment
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"co_instructor" | "primary" | "admin">("co_instructor");
  const [assigningStudent, setAssigningStudent] = useState(false);

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Check if current user is admin
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!adminRole);
      }

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

      // Fetch enrolled students for this course
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id")
        .eq("course_id", courseId)
        .eq("payment_status", "completed");

      if (enrollments && enrollments.length > 0) {
        const studentIds = enrollments.map((e) => e.user_id);
        const { data: studentProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", studentIds);

        // Filter out users who are already instructors
        const existingInstructorIds = new Set([
          currentInstructorId,
          ...(instructorsData?.map((i) => i.instructor_id) || []),
        ]);

        setEnrolledStudents(
          (studentProfiles || [])
            .filter((s) => !existingInstructorIds.has(s.id))
            .map((s) => ({ user_id: s.id, full_name: s.full_name, email: s.email }))
        );
      } else {
        setEnrolledStudents([]);
      }
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "primary": return "Course Owner";
      case "admin": return "Admin";
      default: return "Co-Instructor";
    }
  };

  const handleSendInvitation = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Email required", description: "Please enter an email address.", variant: "destructive" });
      return;
    }
    setSendingInvite(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("send-course-instructor-invitation", {
        body: { email: inviteEmail.trim(), courseId, role: inviteRole },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      handleInvitationResponse(res, inviteEmail.trim(), getRoleLabel(inviteRole), () => {
        setInviteEmail("");
        setInviteRole("co_instructor");
        setInviteDialogOpen(false);
        fetchData();
        onUpdate?.();
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleAssignStudentRole = async () => {
    if (!selectedStudentId) {
      toast({ title: "Select a student", description: "Please select a student to assign.", variant: "destructive" });
      return;
    }

    const student = enrolledStudents.find((s) => s.user_id === selectedStudentId);
    if (!student?.email) {
      toast({ title: "Error", description: "Student email not found.", variant: "destructive" });
      return;
    }

    setAssigningStudent(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("send-course-instructor-invitation", {
        body: { email: student.email, courseId, role: selectedRole },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      const roleLabel = getRoleLabel(selectedRole);
      handleInvitationResponse(res, student.email, roleLabel, () => {
        setSelectedStudentId("");
        setSelectedRole("co_instructor");
        fetchData();
        onUpdate?.();
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAssigningStudent(false);
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
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Collaborator
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Collaborator</DialogTitle>
                  <DialogDescription>
                    Send an email invitation to add someone as a collaborator on this course. Choose the role and enter their email. The invitation expires in 7 days.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "co_instructor" | "primary" | "admin")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="co_instructor">Co-Instructor</SelectItem>
                        <SelectItem value="primary">Owner (Primary Instructor)</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="person@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendInvitation()}
                    />
                  </div>
                  {inviteRole === "primary" && (
                    <div className="bg-warning/10 border border-warning/30 rounded-md p-3 text-sm text-warning-foreground">
                      ⚠️ The recipient will become the primary owner once they accept.
                    </div>
                  )}
                  {inviteRole === "admin" && (
                    <div className="bg-warning/10 border border-warning/30 rounded-md p-3 text-sm text-warning-foreground">
                      ⚠️ The recipient will be granted platform-wide Admin access once they accept.
                    </div>
                  )}
                  <Button
                    onClick={handleSendInvitation}
                    disabled={sendingInvite || !inviteEmail.trim()}
                    className="w-full"
                  >
                    {sendingInvite ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                    ) : (
                      <><Mail className="mr-2 h-4 w-4" />Send {getRoleLabel(inviteRole)} Invitation</>
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
                        {getRoleLabel(inv.role)} · Expires {new Date(inv.expires_at).toLocaleDateString()}
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

        {/* Assign from Enrolled Students */}
        {enrolledStudents.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Assign from Enrolled Students
            </p>
            <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <GraduationCap className="h-4 w-4" />
                <span>Promote an enrolled student to instructor</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Select Student</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {enrolledStudents.map((student) => (
                        <SelectItem key={student.user_id} value={student.user_id}>
                          {student.full_name || student.email || "Unknown"}
                          {student.full_name && student.email ? ` (${student.email})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Assign Role</Label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "co_instructor" | "primary" | "admin")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="co_instructor">Co-Instructor</SelectItem>
                      <SelectItem value="primary">Owner (Primary Instructor)</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleAssignStudentRole}
                disabled={assigningStudent || !selectedStudentId}
                size="sm"
                className="w-full sm:w-auto"
              >
                {assigningStudent ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending Invitation...</>
                ) : (
                  <><UserPlus className="mr-2 h-4 w-4" />Send Invitation</>
                )}
              </Button>
              {selectedRole === "primary" && selectedStudentId && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
                  ⚠️ This will transfer full ownership of the course once the student accepts.
                </div>
              )}
            </div>
          </div>
        )}

        {coInstructors.length === 0 && pendingInvitations.length === 0 && enrolledStudents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No co-instructors yet. Invite someone via email above.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CourseInstructorManager;
