import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ClipboardCheck, FileText, ExternalLink, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface Course {
  id: string;
  title: string;
}

interface Assignment {
  id: string;
  title: string;
  max_score: number;
  course_id: string;
  courses?: { title: string };
}

interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  submission_text: string | null;
  file_url: string | null;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
  graded_by: string | null;
  assignments?: {
    title: string;
    max_score: number;
    course_id: string;
    courses?: { title: string };
  };
  profiles?: { full_name: string | null; email: string | null };
}

interface InstructorGradingDashboardProps {
  instructorId: string;
  courses: Course[];
}

export const InstructorGradingDashboard = ({ instructorId, courses }: InstructorGradingDashboardProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: 0, feedback: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [instructorId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const courseIds = courses.map(c => c.id);
      
      if (courseIds.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      // Fetch assignments for instructor's courses
      const { data: assignmentsData, error: assignErr } = await supabase
        .from("assignments")
        .select("id, title, max_score, course_id, courses (title)")
        .in("course_id", courseIds);

      if (assignErr) throw assignErr;
      if (!assignmentsData || assignmentsData.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const assignmentIds = assignmentsData.map(a => a.id);

      // Fetch submissions for those assignments
      const { data: subsData, error: subsErr } = await supabase
        .from("assignment_submissions")
        .select("*")
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: false });

      if (subsErr) throw subsErr;

      // Get unique user IDs and fetch their profiles
      const userIds = [...new Set((subsData || []).map(s => s.user_id))];
      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        
        if (profilesData) {
          profilesMap = Object.fromEntries(profilesData.map(p => [p.id, { full_name: p.full_name, email: p.email }]));
        }
      }

      // Build assignment lookup
      const assignmentMap = Object.fromEntries(assignmentsData.map(a => [a.id, a]));

      // Combine data
      const combined: Submission[] = (subsData || []).map(sub => ({
        ...sub,
        assignments: assignmentMap[sub.assignment_id] ? {
          title: assignmentMap[sub.assignment_id].title,
          max_score: assignmentMap[sub.assignment_id].max_score,
          course_id: assignmentMap[sub.assignment_id].course_id,
          courses: assignmentMap[sub.assignment_id].courses as { title: string } | undefined,
        } : undefined,
        profiles: profilesMap[sub.user_id] || null,
      }));

      setSubmissions(combined);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!gradingSubmission) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("assignment_submissions")
        .update({
          score: gradeForm.score,
          feedback: gradeForm.feedback || null,
          graded_at: new Date().toISOString(),
          graded_by: instructorId,
        })
        .eq("id", gradingSubmission.id);

      if (error) throw error;

      toast({ title: "Submission graded successfully" });
      setGradingSubmission(null);
      setGradeForm({ score: 0, feedback: "" });
      fetchSubmissions();
    } catch (error) {
      console.error("Error grading submission:", error);
      toast({
        title: "Error",
        description: "Failed to save grade",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openGradeDialog = (submission: Submission) => {
    setGradingSubmission(submission);
    setGradeForm({
      score: submission.score || 0,
      feedback: submission.feedback || "",
    });
  };

  const filteredSubmissions = selectedCourse === "all"
    ? submissions
    : submissions.filter(s => s.assignments?.course_id === selectedCourse);
  const pendingCount = submissions.filter(s => s.score === null).length;
  const gradedCount = submissions.filter(s => s.score !== null).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Graded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{gradedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label>Filter by Course:</Label>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Submissions Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({filteredSubmissions.filter(s => s.score === null).length})
          </TabsTrigger>
          <TabsTrigger value="graded" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Graded ({filteredSubmissions.filter(s => s.score !== null).length})
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <SubmissionsTable
            submissions={filteredSubmissions.filter(s => s.score === null)}
            onGrade={openGradeDialog}
          />
        </TabsContent>

        <TabsContent value="graded">
          <SubmissionsTable
            submissions={filteredSubmissions.filter(s => s.score !== null)}
            onGrade={openGradeDialog}
          />
        </TabsContent>

        <TabsContent value="all">
          <SubmissionsTable
            submissions={filteredSubmissions}
            onGrade={openGradeDialog}
          />
        </TabsContent>
      </Tabs>

      {/* Grading Dialog */}
      <Dialog open={!!gradingSubmission} onOpenChange={(open) => !open && setGradingSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Grade Submission
            </DialogTitle>
          </DialogHeader>

          {gradingSubmission && (
            <div className="space-y-6">
              {/* Submission Info */}
              <div className="grid gap-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Student</Label>
                    <p className="font-medium">
                      {gradingSubmission.profiles?.full_name || "Unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {gradingSubmission.profiles?.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Assignment</Label>
                    <p className="font-medium">{gradingSubmission.assignments?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {gradingSubmission.assignments?.courses?.title}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Submitted</Label>
                  <p className="text-sm">
                    {new Date(gradingSubmission.submitted_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Submission Content */}
              <div className="space-y-4">
                <Label>Submission Content</Label>
                {gradingSubmission.submission_text && (
                  <div className="p-4 border rounded-lg bg-background">
                    <p className="whitespace-pre-wrap">{gradingSubmission.submission_text}</p>
                  </div>
                )}
                {gradingSubmission.file_url && (
                  <Button variant="outline" asChild>
                    <a
                      href={gradingSubmission.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      View Submitted File
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {!gradingSubmission.submission_text && !gradingSubmission.file_url && (
                  <p className="text-muted-foreground italic">No content submitted</p>
                )}
              </div>

              {/* Grading Form */}
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>
                    Score (out of {gradingSubmission.assignments?.max_score || 100})
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={gradingSubmission.assignments?.max_score || 100}
                    value={gradeForm.score}
                    onChange={(e) =>
                      setGradeForm({ ...gradeForm, score: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Feedback (optional)</Label>
                  <Textarea
                    value={gradeForm.feedback}
                    onChange={(e) =>
                      setGradeForm({ ...gradeForm, feedback: e.target.value })
                    }
                    placeholder="Provide feedback for the student..."
                    rows={4}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setGradingSubmission(null)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleGrade} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Save Grade
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Submissions Table Component
const SubmissionsTable = ({
  submissions,
  onGrade,
}: {
  submissions: Submission[];
  onGrade: (submission: Submission) => void;
}) => {
  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No submissions</h3>
          <p className="text-muted-foreground">
            No submissions match the current filter
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Assignment</TableHead>
            <TableHead>Submitted Time</TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Result</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => {
            const maxScore = submission.assignments?.max_score || 100;
            const passed = submission.score !== null ? submission.score >= maxScore * 0.5 : null;

            return (
              <TableRow key={submission.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {submission.profiles?.full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {submission.profiles?.email}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {submission.assignments?.title || "-"}
                  <p className="text-xs text-muted-foreground">{submission.assignments?.courses?.title}</p>
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(submission.submitted_at).toLocaleDateString()}{" "}
                  <span className="text-muted-foreground">
                    {new Date(submission.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </TableCell>
                <TableCell>
                  {submission.file_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={submission.file_url} target="_blank" rel="noopener noreferrer" className="gap-1">
                        <FileText className="h-3 w-3" />
                        View
                      </a>
                    </Button>
                  ) : submission.submission_text ? (
                    <Badge variant="secondary" className="gap-1">
                      <FileText className="h-3 w-3" />
                      Text
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {submission.score !== null ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Graded
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {submission.score !== null ? (
                    <span className="font-medium">
                      {submission.score}/{maxScore}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {passed === true && (
                    <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Passed
                    </Badge>
                  )}
                  {passed === false && (
                    <Badge className="bg-red-100 text-red-800 border-red-200 gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                  {passed === null && <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => onGrade(submission)}>
                    {submission.score !== null ? "Edit Grade" : "Grade"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
};
