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
import { Users, Plus, Trash2, Crown, UserPlus, ArrowRightLeft, Loader2 } from "lucide-react";
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

interface Instructor {
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
  const [availableInstructors, setAvailableInstructors] = useState<Instructor[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<string>("");
  const [transferToInstructor, setTransferToInstructor] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch current course instructors
      const { data: instructorsData, error: instructorsError } = await supabase
        .from("course_instructors")
        .select("*")
        .eq("course_id", courseId);

      if (instructorsError) throw instructorsError;

      // Fetch profiles for course instructors
      if (instructorsData && instructorsData.length > 0) {
        const instructorIds = instructorsData.map(i => i.instructor_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", instructorIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        setCourseInstructors(
          instructorsData.map(i => ({
            ...i,
            role: i.role as "primary" | "co_instructor",
            profile: profileMap.get(i.instructor_id) || null,
          }))
        );
      } else {
        setCourseInstructors([]);
      }

      // Fetch all instructors (users with moderator or admin role)
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["moderator", "admin"]);

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        setAvailableInstructors(profiles || []);
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

  const handleAddCoInstructor = async () => {
    if (!selectedInstructor) {
      toast({
        title: "Select an instructor",
        description: "Please select an instructor to add",
        variant: "destructive",
      });
      return;
    }

    // Check if already added
    if (courseInstructors.some(i => i.instructor_id === selectedInstructor)) {
      toast({
        title: "Already added",
        description: "This instructor is already assigned to this course",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("course_instructors").insert({
        course_id: courseId,
        instructor_id: selectedInstructor,
        role: "co_instructor",
        added_by: currentInstructorId,
      });

      if (error) throw error;

      toast({
        title: "Co-instructor added",
        description: "The co-instructor has been added to this course",
      });

      setSelectedInstructor("");
      setDialogOpen(false);
      fetchData();
      onUpdate?.();
    } catch (error: any) {
      console.error("Error adding co-instructor:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add co-instructor",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveInstructor = async (instructorId: string) => {
    if (!confirm("Remove this instructor from the course?")) return;

    try {
      const { error } = await supabase
        .from("course_instructors")
        .delete()
        .eq("course_id", courseId)
        .eq("instructor_id", instructorId);

      if (error) throw error;

      // Immediately remove from local state
      setCourseInstructors(prev => prev.filter(i => i.instructor_id !== instructorId));

      toast({
        title: "Instructor removed",
        description: "The instructor has been removed from this course",
      });

      onUpdate?.();
    } catch (error) {
      console.error("Error removing instructor:", error);
      toast({
        title: "Error",
        description: "Failed to remove instructor",
        variant: "destructive",
      });
    }
  };

  const handleTransferCourse = async () => {
    if (!transferToInstructor) {
      toast({
        title: "Select an instructor",
        description: "Please select an instructor to transfer the course to",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Update the course's primary instructor
      const { error: courseError } = await supabase
        .from("courses")
        .update({ instructor_id: transferToInstructor })
        .eq("id", courseId);

      if (courseError) throw courseError;

      // Remove old primary instructor from course_instructors if exists
      await supabase
        .from("course_instructors")
        .delete()
        .eq("course_id", courseId)
        .eq("role", "primary");

      // Add new primary instructor to course_instructors
      await supabase.from("course_instructors").upsert({
        course_id: courseId,
        instructor_id: transferToInstructor,
        role: "primary",
        added_by: currentInstructorId,
      });

      toast({
        title: "Course transferred",
        description: "The course has been transferred to the new instructor",
      });

      setTransferToInstructor("");
      setTransferDialogOpen(false);
      fetchData();
      onUpdate?.();
    } catch (error: any) {
      console.error("Error transferring course:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to transfer course",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter out already assigned instructors
  const unassignedInstructors = availableInstructors.filter(
    i => !courseInstructors.some(ci => ci.instructor_id === i.id) && i.id !== currentInstructorId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Course Instructors
            </CardTitle>
            <CardDescription>
              Manage instructors for {courseName}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Transfer Course Dialog */}
            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer Course
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer Course Ownership</DialogTitle>
                  <DialogDescription>
                    Transfer this course to another instructor. They will become the primary owner.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select New Owner</Label>
                    <Select value={transferToInstructor} onValueChange={setTransferToInstructor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an instructor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInstructors
                          .filter(i => i.id !== currentInstructorId)
                          .map(instructor => (
                            <SelectItem key={instructor.id} value={instructor.id}>
                              {instructor.full_name || instructor.email || "Unknown"}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleTransferCourse} 
                    disabled={submitting || !transferToInstructor}
                    className="w-full"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Transferring...
                      </>
                    ) : (
                      "Transfer Course"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Co-Instructor Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Co-Instructor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Co-Instructor</DialogTitle>
                  <DialogDescription>
                    Add a co-instructor who can help manage this course.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Instructor</Label>
                    <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an instructor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedInstructors.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No available instructors
                          </SelectItem>
                        ) : (
                          unassignedInstructors.map(instructor => (
                            <SelectItem key={instructor.id} value={instructor.id}>
                              {instructor.full_name || instructor.email || "Unknown"}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleAddCoInstructor} 
                    disabled={submitting || !selectedInstructor}
                    className="w-full"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Co-Instructor"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Primary Instructor (from course.instructor_id) */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {availableInstructors.find(i => i.id === currentInstructorId)?.full_name || "You"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {availableInstructors.find(i => i.id === currentInstructorId)?.email || "Primary Instructor"}
                </p>
              </div>
            </div>
            <Badge>Primary</Badge>
          </div>

          {/* Co-Instructors */}
          {courseInstructors
            .filter(i => i.instructor_id !== currentInstructorId)
            .map(instructor => (
              <div 
                key={instructor.id} 
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {instructor.profile?.full_name || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {instructor.profile?.email || "Co-Instructor"}
                    </p>
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

          {courseInstructors.filter(i => i.instructor_id !== currentInstructorId).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No co-instructors assigned yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CourseInstructorManager;