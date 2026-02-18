import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
import { Label } from "@/components/ui/label";
import { Users, Search, Crown, UserPlus, ArrowRightLeft, Loader2, Mail } from "lucide-react";

interface InstructorProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface Course {
  id: string;
  title: string;
  instructor_id: string | null;
}

interface Props {
  currentUserId: string | null;
  courses: Course[];
  onCourseUpdated: () => void;
}

export const InstructorDirectoryTab = ({ currentUserId, courses, onCourseUpdated }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<InstructorProfile[]>([]);
  const [search, setSearch] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorProfile | null>(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [assignRole, setAssignRole] = useState<"owner" | "co_instructor">("co_instructor");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      setLoading(true);
      // Fetch all users with moderator or admin role
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["moderator", "admin"]);

      if (!rolesData || rolesData.length === 0) {
        setInstructors([]);
        return;
      }

      const userIds = rolesData.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      setInstructors(profiles || []);
    } catch (error) {
      console.error("Error fetching instructors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedInstructor || !selectedCourse || !currentUserId) return;

    setSubmitting(true);
    try {
      const course = courses.find((c) => c.id === selectedCourse);
      if (!course) throw new Error("Course not found");

      if (assignRole === "owner") {
        // Transfer ownership: update course.instructor_id
        const { error: courseError } = await supabase
          .from("courses")
          .update({ instructor_id: selectedInstructor.id })
          .eq("id", selectedCourse);
        if (courseError) throw courseError;

        // Remove old primary entry if any
        await supabase
          .from("course_instructors")
          .delete()
          .eq("course_id", selectedCourse)
          .eq("role", "primary");

        // Upsert new primary entry
        await supabase.from("course_instructors").upsert({
          course_id: selectedCourse,
          instructor_id: selectedInstructor.id,
          role: "primary",
          added_by: currentUserId,
        });

        toast({
          title: "Ownership transferred",
          description: `${selectedInstructor.full_name || selectedInstructor.email} is now the owner of "${course.title}"`,
        });
      } else {
        // Check if already a co-instructor
        const { data: existing } = await supabase
          .from("course_instructors")
          .select("id")
          .eq("course_id", selectedCourse)
          .eq("instructor_id", selectedInstructor.id)
          .maybeSingle();

        if (existing) {
          toast({
            title: "Already assigned",
            description: "This instructor is already assigned to this course",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }

        const { error } = await supabase.from("course_instructors").insert({
          course_id: selectedCourse,
          instructor_id: selectedInstructor.id,
          role: "co_instructor",
          added_by: currentUserId,
        });
        if (error) throw error;

        toast({
          title: "Co-instructor added",
          description: `${selectedInstructor.full_name || selectedInstructor.email} added as co-instructor of "${course.title}"`,
        });
      }

      setAssignDialogOpen(false);
      setSelectedCourse("");
      setAssignRole("co_instructor");
      onCourseUpdated();
    } catch (error: any) {
      console.error("Error assigning instructor:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign instructor",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = instructors.filter((i) => {
    const q = search.toLowerCase();
    return (
      i.full_name?.toLowerCase().includes(q) ||
      i.email?.toLowerCase().includes(q)
    );
  });

  const openAssignDialog = (instructor: InstructorProfile) => {
    setSelectedInstructor(instructor);
    setSelectedCourse("");
    setAssignRole("co_instructor");
    setAssignDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Instructor Directory</h2>
          <p className="text-muted-foreground text-sm">
            Browse all instructors on the platform and assign them to your courses.
          </p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          <Users className="h-4 w-4 mr-1" />
          {instructors.length} instructors
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Instructors grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? "No instructors match your search." : "No other instructors found on the platform."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((instructor) => {
            const isMe = instructor.id === currentUserId;
            const ownedCourses = courses.filter((c) => c.instructor_id === instructor.id);

            return (
              <Card key={instructor.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold">
                      {(instructor.full_name || instructor.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base truncate">
                          {instructor.full_name || "Unnamed"}
                        </CardTitle>
                        {isMe && (
                          <Badge variant="secondary" className="text-xs shrink-0">You</Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        {instructor.email || "No email"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-3">
                  {ownedCourses.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Crown className="h-3 w-3" /> Owns {ownedCourses.length} of your course(s)
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {ownedCourses.slice(0, 2).map((c) => (
                          <Badge key={c.id} variant="outline" className="text-xs">
                            {c.title}
                          </Badge>
                        ))}
                        {ownedCourses.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{ownedCourses.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {!isMe && courses.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-auto"
                      onClick={() => openAssignDialog(instructor)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Assign to Course
                    </Button>
                  )}
                  {isMe && (
                    <p className="text-xs text-muted-foreground text-center">This is you</p>
                  )}
                  {!isMe && courses.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Create a course first to assign instructors
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Course</DialogTitle>
            <DialogDescription>
              Assign <strong>{selectedInstructor?.full_name || selectedInstructor?.email}</strong> to one of your courses as owner or co-instructor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={assignRole} onValueChange={(v) => setAssignRole(v as "owner" | "co_instructor")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="co_instructor">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Co-Instructor
                    </div>
                  </SelectItem>
                  <SelectItem value="owner">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4" />
                      Transfer Ownership
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {assignRole === "owner" && (
                <p className="text-xs text-amber-600">
                  ⚠️ Transferring ownership will make this instructor the primary owner. You may lose management rights to the course.
                </p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleAssign}
              disabled={submitting || !selectedCourse}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : assignRole === "owner" ? (
                "Transfer Ownership"
              ) : (
                "Add as Co-Instructor"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstructorDirectoryTab;
