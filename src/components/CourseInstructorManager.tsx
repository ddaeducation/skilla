import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Trash2,
  Crown,
  UserPlus,
  ArrowRightLeft,
  Loader2,
  Search,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CourseInstructor {
  id: string;
  instructor_id: string;
  role: "primary" | "co_instructor";
}

interface InstructorProfile {
  id: string;
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
  const [courseInstructors, setCourseInstructors] = useState<CourseInstructor[]>([]);
  const [allInstructors, setAllInstructors] = useState<InstructorProfile[]>([]);
  const [profileMap, setProfileMap] = useState<Map<string, InstructorProfile>>(new Map());
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null); // holds instructor id being acted on

  // Confirmation dialogs
  const [confirmTransfer, setConfirmTransfer] = useState<InstructorProfile | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null); // instructor_id

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch assigned course instructors + all platform instructors in parallel
      const [assignedRes, rolesRes] = await Promise.all([
        supabase.from("course_instructors").select("*").eq("course_id", courseId),
        supabase.from("user_roles").select("user_id").in("role", ["moderator", "admin"]),
      ]);

      if (assignedRes.error) throw assignedRes.error;
      setCourseInstructors(
        (assignedRes.data || []).map((i) => ({
          ...i,
          role: i.role as "primary" | "co_instructor",
        }))
      );

      const userIds = (rolesRes.data || []).map((r) => r.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const map = new Map((profiles || []).map((p) => [p.id, p]));
        setProfileMap(map);
        setAllInstructors(profiles || []);
      }
    } catch (error) {
      console.error("Error fetching instructors:", error);
      toast({
        title: "Error",
        description: "Failed to load instructor data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoInstructor = async (instructorId: string) => {
    setSubmitting(instructorId);
    try {
      const { error } = await supabase.from("course_instructors").insert({
        course_id: courseId,
        instructor_id: instructorId,
        role: "co_instructor",
        added_by: currentInstructorId,
      });
      if (error) throw error;

      setCourseInstructors((prev) => [
        ...prev,
        { id: crypto.randomUUID(), instructor_id: instructorId, role: "co_instructor" },
      ]);

      toast({ title: "Co-instructor added", description: "Instructor has been added to this course." });
      onUpdate?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add co-instructor", variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  };

  const handleRemoveInstructor = async (instructorId: string) => {
    setSubmitting(instructorId);
    try {
      const { error } = await supabase
        .from("course_instructors")
        .delete()
        .eq("course_id", courseId)
        .eq("instructor_id", instructorId);
      if (error) throw error;

      setCourseInstructors((prev) => prev.filter((i) => i.instructor_id !== instructorId));
      toast({ title: "Instructor removed" });
      onUpdate?.();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to remove instructor", variant: "destructive" });
    } finally {
      setSubmitting(null);
      setConfirmRemove(null);
    }
  };

  const handleTransferOwnership = async (toInstructorId: string) => {
    setSubmitting(toInstructorId);
    try {
      const { error: courseError } = await supabase
        .from("courses")
        .update({ instructor_id: toInstructorId })
        .eq("id", courseId);
      if (courseError) throw courseError;

      await supabase
        .from("course_instructors")
        .delete()
        .eq("course_id", courseId)
        .eq("role", "primary");

      await supabase.from("course_instructors").upsert({
        course_id: courseId,
        instructor_id: toInstructorId,
        role: "primary",
        added_by: currentInstructorId,
      });

      toast({ title: "Ownership transferred", description: "The course now has a new primary instructor." });
      fetchData();
      onUpdate?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to transfer ownership", variant: "destructive" });
    } finally {
      setSubmitting(null);
      setConfirmTransfer(null);
    }
  };

  // Derived state
  const assignedIds = new Set(courseInstructors.map((i) => i.instructor_id));
  const primaryProfile = profileMap.get(currentInstructorId);

  const filteredInstructors = allInstructors.filter((i) => {
    if (i.id === currentInstructorId) return false; // skip self — shown separately
    const q = search.toLowerCase();
    return i.full_name?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Manage Instructors — {courseName}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Browse all platform instructors and assign them as co-instructor or course owner.
        </p>
      </div>

      {/* Current Primary Instructor */}
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Crown className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{primaryProfile?.full_name || "You"}</p>
          <p className="text-xs text-muted-foreground truncate">{primaryProfile?.email || ""}</p>
        </div>
        <Badge>Primary Owner</Badge>
      </div>

      {/* Co-Instructors already assigned */}
      {courseInstructors.filter((i) => i.instructor_id !== currentInstructorId).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned Co-Instructors</p>
          {courseInstructors
            .filter((i) => i.instructor_id !== currentInstructorId)
            .map((ci) => {
              const profile = profileMap.get(ci.instructor_id);
              return (
                <div
                  key={ci.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-sm font-medium">
                    {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{profile?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email || ""}</p>
                  </div>
                  <Badge variant="secondary">Co-Instructor</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={submitting === ci.instructor_id}
                    onClick={() => setConfirmRemove(ci.instructor_id)}
                  >
                    {submitting === ci.instructor_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>
              );
            })}
        </div>
      )}

      <Separator />

      {/* All platform instructors */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          All Platform Instructors ({allInstructors.length - 1})
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {filteredInstructors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {search ? "No instructors match your search." : "No other instructors on the platform."}
            </p>
          )}
          {filteredInstructors.map((instructor) => {
            const isAssigned = assignedIds.has(instructor.id);
            const isBusy = submitting === instructor.id;

            return (
              <div
                key={instructor.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                  {(instructor.full_name || instructor.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {instructor.full_name || "Unnamed"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    {instructor.email || "No email"}
                  </p>
                </div>

                {isAssigned ? (
                  <div className="flex items-center gap-1 text-xs text-green-600 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Assigned</span>
                  </div>
                ) : (
                  <div className="flex gap-1 shrink-0">
                    {/* Add as Co-Instructor */}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      onClick={() => handleAddCoInstructor(instructor.id)}
                      className="text-xs h-8 px-2"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          Co-Instructor
                        </>
                      )}
                    </Button>
                    {/* Transfer Ownership */}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isBusy}
                      onClick={() => setConfirmTransfer(instructor)}
                      className="text-xs h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                      Owner
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm Remove Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Co-Instructor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {profileMap.get(confirmRemove || "")?.full_name ||
                  profileMap.get(confirmRemove || "")?.email}
              </strong>{" "}
              from this course?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmRemove && handleRemoveInstructor(confirmRemove)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Transfer Dialog */}
      <AlertDialog open={!!confirmTransfer} onOpenChange={(o) => !o && setConfirmTransfer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Course Ownership</AlertDialogTitle>
            <AlertDialogDescription>
              Transfer <strong>{courseName}</strong> to{" "}
              <strong>{confirmTransfer?.full_name || confirmTransfer?.email}</strong>? They will become the
              primary owner. You may lose management rights to this course.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => confirmTransfer && handleTransferOwnership(confirmTransfer.id)}
            >
              Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CourseInstructorManager;
