import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, BookOpen, ClipboardCheck, FileQuestion, TrendingUp, Eye, Search, GraduationCap, Clock, CheckCircle, XCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface Course {
  id: string;
  title: string;
}

interface StudentProgress {
  userId: string;
  fullName: string | null;
  email: string | null;
  courseId: string;
  courseTitle: string;
  lessonsCompleted: number;
  totalLessons: number;
  lessonProgress: number;
  quizzesPassed: number;
  totalQuizzes: number;
  quizAvgScore: number;
  assignmentsSubmitted: number;
  totalAssignments: number;
  assignmentAvgScore: number;
  totalTimeSpent: number;
  overallProgress: number;
}

interface StudentDetail {
  lessonProgress: {
    lessonId: string;
    lessonTitle: string;
    completed: boolean;
    timeSpent: number;
  }[];
  quizAttempts: {
    quizId: string;
    quizTitle: string;
    score: number | null;
    maxScore: number | null;
    passed: boolean | null;
    attemptedAt: string;
  }[];
  assignmentSubmissions: {
    assignmentId: string;
    assignmentTitle: string;
    score: number | null;
    maxScore: number;
    submittedAt: string;
    graded: boolean;
  }[];
}

interface StudentProgressDashboardProps {
  instructorId: string;
  courses: Course[];
}

export const StudentProgressDashboard = ({ instructorId, courses }: StudentProgressDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sortBy, setSortBy] = useState<string>("overall");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // General statistics
  const [generalStats, setGeneralStats] = useState({
    totalStudents: 0,
    avgLessonCompletion: 0,
    avgQuizScore: 0,
    avgAssignmentScore: 0,
    studentsCompleted: 0,
  });

  useEffect(() => {
    if (courses.length > 0) {
      fetchStudentProgress();
    } else {
      setLoading(false);
    }
  }, [courses]);

  const fetchStudentProgress = async () => {
    setLoading(true);
    try {
      const courseIds = courses.map(c => c.id);
      
      // Fetch all enrollments for instructor's courses
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select("user_id, course_id")
        .in("course_id", courseIds)
        .eq("payment_status", "completed");

      if (enrollError) throw enrollError;
      if (!enrollments || enrollments.length === 0) {
        setLoading(false);
        return;
      }

      // Get unique student IDs
      const studentIds = [...new Set(enrollments.map(e => e.user_id))];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds);

      // Fetch lessons count per course
      const { data: lessons } = await supabase
        .from("lesson_content")
        .select("id, course_id")
        .in("course_id", courseIds);

      // Fetch quizzes per course
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, course_id")
        .in("course_id", courseIds);

      // Fetch assignments per course
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, course_id, max_score")
        .in("course_id", courseIds);

      // Fetch student progress records
      const { data: progressRecords } = await supabase
        .from("student_progress")
        .select("user_id, course_id, lesson_id, completed")
        .in("course_id", courseIds)
        .in("user_id", studentIds);

      // Fetch lesson time tracking
      const { data: timeTracking } = await supabase
        .from("lesson_time_tracking")
        .select("user_id, course_id, time_spent_seconds")
        .in("course_id", courseIds)
        .in("user_id", studentIds);

      // Fetch quiz attempts
      const quizIds = quizzes?.map(q => q.id) || [];
      const { data: quizAttempts } = quizIds.length > 0 
        ? await supabase
            .from("quiz_attempts")
            .select("user_id, quiz_id, score, max_score, passed")
            .in("quiz_id", quizIds)
            .in("user_id", studentIds)
        : { data: [] };

      // Fetch assignment submissions
      const assignmentIds = assignments?.map(a => a.id) || [];
      const { data: submissions } = assignmentIds.length > 0
        ? await supabase
            .from("assignment_submissions")
            .select("user_id, assignment_id, score")
            .in("assignment_id", assignmentIds)
            .in("user_id", studentIds)
        : { data: [] };

      // Process data for each student-course combination
      const progressData: StudentProgress[] = [];

      for (const enrollment of enrollments) {
        const profile = profiles?.find(p => p.id === enrollment.user_id);
        const course = courses.find(c => c.id === enrollment.course_id);
        
        // Count lessons for this course
        const courseLessons = lessons?.filter(l => l.course_id === enrollment.course_id) || [];
        const totalLessons = courseLessons.length;
        
        // Count completed lessons
        const completedLessons = progressRecords?.filter(
          p => p.user_id === enrollment.user_id && 
               p.course_id === enrollment.course_id && 
               p.completed
        ).length || 0;
        
        // Calculate lesson progress percentage
        const lessonProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

        // Count quizzes for this course
        const courseQuizzes = quizzes?.filter(q => q.course_id === enrollment.course_id) || [];
        const totalQuizzes = courseQuizzes.length;
        
        // Get quiz attempts for this student and course
        const studentQuizAttempts = quizAttempts?.filter(
          qa => qa.user_id === enrollment.user_id && 
                courseQuizzes.some(q => q.id === qa.quiz_id)
        ) || [];
        
        const quizzesPassed = studentQuizAttempts.filter(qa => qa.passed).length;
        const quizScores = studentQuizAttempts
          .filter(qa => qa.score !== null && qa.max_score !== null && qa.max_score > 0)
          .map(qa => (qa.score! / qa.max_score!) * 100);
        const quizAvgScore = quizScores.length > 0 
          ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length 
          : 0;

        // Count assignments for this course
        const courseAssignments = assignments?.filter(a => a.course_id === enrollment.course_id) || [];
        const totalAssignments = courseAssignments.length;
        
        // Get submissions for this student and course
        const studentSubmissions = submissions?.filter(
          s => s.user_id === enrollment.user_id && 
               courseAssignments.some(a => a.id === s.assignment_id)
        ) || [];
        
        const assignmentsSubmitted = studentSubmissions.length;
        const gradedSubmissions = studentSubmissions.filter(s => s.score !== null);
        const assignmentScores = gradedSubmissions.map(s => {
          const assignment = courseAssignments.find(a => a.id === s.assignment_id);
          return assignment && assignment.max_score > 0 ? (s.score! / assignment.max_score) * 100 : 0;
        });
        const assignmentAvgScore = assignmentScores.length > 0 
          ? assignmentScores.reduce((a, b) => a + b, 0) / assignmentScores.length 
          : 0;

        // Get total time spent
        const studentTimeTracking = timeTracking?.filter(
          t => t.user_id === enrollment.user_id && t.course_id === enrollment.course_id
        ) || [];
        const totalTimeSpent = studentTimeTracking.reduce((acc, t) => acc + t.time_spent_seconds, 0);

        // Calculate overall progress (weighted average)
        const weights = { lessons: 0.4, quizzes: 0.3, assignments: 0.3 };
        const lessonWeight = totalLessons > 0 ? lessonProgress * weights.lessons : 0;
        const quizWeight = totalQuizzes > 0 ? (quizzesPassed / totalQuizzes) * 100 * weights.quizzes : 0;
        const assignmentWeight = totalAssignments > 0 ? (assignmentsSubmitted / totalAssignments) * 100 * weights.assignments : 0;
        
        const totalWeight = (totalLessons > 0 ? weights.lessons : 0) + 
                           (totalQuizzes > 0 ? weights.quizzes : 0) + 
                           (totalAssignments > 0 ? weights.assignments : 0);
        
        const overallProgress = totalWeight > 0 
          ? (lessonWeight + quizWeight + assignmentWeight) / totalWeight 
          : 0;

        progressData.push({
          userId: enrollment.user_id,
          fullName: profile?.full_name || null,
          email: profile?.email || null,
          courseId: enrollment.course_id,
          courseTitle: course?.title || "Unknown Course",
          lessonsCompleted: completedLessons,
          totalLessons,
          lessonProgress,
          quizzesPassed,
          totalQuizzes,
          quizAvgScore,
          assignmentsSubmitted,
          totalAssignments,
          assignmentAvgScore,
          totalTimeSpent,
          overallProgress,
        });
      }

      setStudentProgress(progressData);

      // Calculate general statistics
      const totalStudents = [...new Set(progressData.map(p => p.userId))].length;
      const avgLessonCompletion = progressData.length > 0 
        ? progressData.reduce((acc, p) => acc + p.lessonProgress, 0) / progressData.length 
        : 0;
      const avgQuizScore = progressData.filter(p => p.totalQuizzes > 0).length > 0
        ? progressData.filter(p => p.totalQuizzes > 0).reduce((acc, p) => acc + p.quizAvgScore, 0) / progressData.filter(p => p.totalQuizzes > 0).length
        : 0;
      const avgAssignmentScore = progressData.filter(p => p.totalAssignments > 0).length > 0
        ? progressData.filter(p => p.totalAssignments > 0).reduce((acc, p) => acc + p.assignmentAvgScore, 0) / progressData.filter(p => p.totalAssignments > 0).length
        : 0;
      const studentsCompleted = progressData.filter(p => p.overallProgress >= 100).length;

      setGeneralStats({
        totalStudents,
        avgLessonCompletion,
        avgQuizScore,
        avgAssignmentScore,
        studentsCompleted,
      });

    } catch (error) {
      console.error("Error fetching student progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetail = async (student: StudentProgress) => {
    setLoadingDetail(true);
    setSelectedStudent(student);
    setDetailDialogOpen(true);

    try {
      // Fetch lessons for this course
      const { data: lessons } = await supabase
        .from("lesson_content")
        .select("id, title")
        .eq("course_id", student.courseId)
        .order("order_index");

      // Fetch student progress for lessons
      const { data: progressRecords } = await supabase
        .from("student_progress")
        .select("lesson_id, completed")
        .eq("user_id", student.userId)
        .eq("course_id", student.courseId);

      // Fetch time tracking for lessons
      const { data: timeTracking } = await supabase
        .from("lesson_time_tracking")
        .select("lesson_id, time_spent_seconds")
        .eq("user_id", student.userId)
        .eq("course_id", student.courseId);

      // Build lesson progress
      const lessonProgress = (lessons || []).map(lesson => {
        const progress = progressRecords?.find(p => p.lesson_id === lesson.id);
        const time = timeTracking?.find(t => t.lesson_id === lesson.id);
        return {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          completed: progress?.completed || false,
          timeSpent: time?.time_spent_seconds || 0,
        };
      });

      // Fetch quizzes and attempts
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, title")
        .eq("course_id", student.courseId);

      const quizIds = quizzes?.map(q => q.id) || [];
      const { data: attempts } = quizIds.length > 0
        ? await supabase
            .from("quiz_attempts")
            .select("quiz_id, score, max_score, passed, completed_at")
            .eq("user_id", student.userId)
            .in("quiz_id", quizIds)
            .order("completed_at", { ascending: false })
        : { data: [] };

      const quizAttempts = (quizzes || []).map(quiz => {
        const attempt = attempts?.find(a => a.quiz_id === quiz.id);
        return {
          quizId: quiz.id,
          quizTitle: quiz.title,
          score: attempt?.score || null,
          maxScore: attempt?.max_score || null,
          passed: attempt?.passed || null,
          attemptedAt: attempt?.completed_at || "",
        };
      });

      // Fetch assignments and submissions
      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, title, max_score")
        .eq("course_id", student.courseId);

      const assignmentIds = assignments?.map(a => a.id) || [];
      const { data: submissions } = assignmentIds.length > 0
        ? await supabase
            .from("assignment_submissions")
            .select("assignment_id, score, submitted_at, graded_at")
            .eq("user_id", student.userId)
            .in("assignment_id", assignmentIds)
            .order("submitted_at", { ascending: false })
        : { data: [] };

      const assignmentSubmissions = (assignments || []).map(assignment => {
        const submission = submissions?.find(s => s.assignment_id === assignment.id);
        return {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          score: submission?.score || null,
          maxScore: assignment.max_score,
          submittedAt: submission?.submitted_at || "",
          graded: submission?.graded_at !== null,
        };
      });

      setStudentDetail({
        lessonProgress,
        quizAttempts,
        assignmentSubmissions,
      });
    } catch (error) {
      console.error("Error fetching student detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const filteredProgress = studentProgress.filter(p => {
    const matchesCourse = selectedCourse === "all" || p.courseId === selectedCourse;
    const matchesSearch = !searchQuery || 
      p.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCourse && matchesSearch;
  });

  const sortedProgress = useMemo(() => {
    const sorted = [...filteredProgress];
    sorted.sort((a, b) => {
      let aVal = 0, bVal = 0;
      switch (sortBy) {
        case "lessons":
          aVal = a.lessonProgress;
          bVal = b.lessonProgress;
          break;
        case "quizzes":
          aVal = a.quizAvgScore;
          bVal = b.quizAvgScore;
          break;
        case "assignments":
          aVal = a.assignmentAvgScore;
          bVal = b.assignmentAvgScore;
          break;
        case "time":
          aVal = a.totalTimeSpent;
          bVal = b.totalTimeSpent;
          break;
        case "overall":
        default:
          aVal = a.overallProgress;
          bVal = b.overallProgress;
          break;
      }
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [filteredProgress, sortBy, sortDirection]);

  // Calculate filtered stats
  const filteredStats = {
    totalStudents: [...new Set(filteredProgress.map(p => p.userId))].length,
    avgLessonCompletion: filteredProgress.length > 0 
      ? filteredProgress.reduce((acc, p) => acc + p.lessonProgress, 0) / filteredProgress.length 
      : 0,
    avgQuizScore: filteredProgress.filter(p => p.totalQuizzes > 0).length > 0
      ? filteredProgress.filter(p => p.totalQuizzes > 0).reduce((acc, p) => acc + p.quizAvgScore, 0) / filteredProgress.filter(p => p.totalQuizzes > 0).length
      : 0,
    avgAssignmentScore: filteredProgress.filter(p => p.totalAssignments > 0).length > 0
      ? filteredProgress.filter(p => p.totalAssignments > 0).reduce((acc, p) => acc + p.assignmentAvgScore, 0) / filteredProgress.filter(p => p.totalAssignments > 0).length
      : 0,
    totalTimeSpent: filteredProgress.reduce((acc, p) => acc + p.totalTimeSpent, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Courses Yet</h3>
          <p className="text-muted-foreground">
            Create courses to start tracking student progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* General Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Avg. Lesson Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.avgLessonCompletion.toFixed(1)}%</div>
            <Progress value={filteredStats.avgLessonCompletion} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileQuestion className="h-4 w-4" />
              Avg. Quiz Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.avgQuizScore.toFixed(1)}%</div>
            <Progress value={filteredStats.avgQuizScore} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Avg. Assignment Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredStats.avgAssignmentScore.toFixed(1)}%</div>
            <Progress value={filteredStats.avgAssignmentScore} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Time Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(filteredStats.totalTimeSpent)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{generalStats.studentsCompleted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Student Progress</CardTitle>
          <CardDescription>View individual student progress across your courses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filter by course" />
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

          {/* Students Table */}
          {filteredProgress.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Students Found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedCourse !== "all" 
                  ? "No students match the current filters." 
                  : "No students are enrolled in your courses yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-center cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("lessons")}>
                      <span className="inline-flex items-center">Lessons{getSortIcon("lessons")}</span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("quizzes")}>
                      <span className="inline-flex items-center">Quizzes{getSortIcon("quizzes")}</span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("assignments")}>
                      <span className="inline-flex items-center">Assignments{getSortIcon("assignments")}</span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("time")}>
                      <span className="inline-flex items-center">Time Spent{getSortIcon("time")}</span>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort("overall")}>
                      <span className="inline-flex items-center">Overall{getSortIcon("overall")}</span>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProgress.map((student, index) => (
                    <TableRow key={`${student.userId}-${student.courseId}-${index}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.fullName || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {student.courseTitle}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-medium">
                            {student.lessonsCompleted}/{student.totalLessons}
                          </span>
                          <Progress 
                            value={student.lessonProgress} 
                            className="h-1.5 w-16" 
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-medium">
                            {student.quizzesPassed}/{student.totalQuizzes}
                          </span>
                          {student.totalQuizzes > 0 && (
                            <Badge variant={student.quizAvgScore >= 70 ? "default" : "secondary"}>
                              {student.quizAvgScore.toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-medium">
                            {student.assignmentsSubmitted}/{student.totalAssignments}
                          </span>
                          {student.totalAssignments > 0 && student.assignmentsSubmitted > 0 && (
                            <Badge variant={student.assignmentAvgScore >= 70 ? "default" : "secondary"}>
                              {student.assignmentAvgScore.toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground">
                          {formatTime(student.totalTimeSpent)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Progress 
                            value={student.overallProgress} 
                            className="h-2 w-16" 
                          />
                          <span className="text-xs text-muted-foreground">
                            {student.overallProgress.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => fetchStudentDetail(student)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Student Progress Details
            </DialogTitle>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Student</p>
                    <p className="font-medium">{selectedStudent.fullName || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Course</p>
                    <p className="font-medium">{selectedStudent.courseTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Overall Progress</p>
                    <div className="flex items-center gap-2">
                      <Progress value={selectedStudent.overallProgress} className="h-2 flex-1" />
                      <span className="font-medium">{selectedStudent.overallProgress.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Time Spent</p>
                    <p className="font-medium">{formatTime(selectedStudent.totalTimeSpent)}</p>
                  </div>
                </div>
              </div>

              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : studentDetail && (
                <Tabs defaultValue="lessons">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="lessons" className="gap-2">
                      <BookOpen className="h-4 w-4" />
                      Lessons ({studentDetail.lessonProgress.filter(l => l.completed).length}/{studentDetail.lessonProgress.length})
                    </TabsTrigger>
                    <TabsTrigger value="quizzes" className="gap-2">
                      <FileQuestion className="h-4 w-4" />
                      Quizzes ({studentDetail.quizAttempts.filter(q => q.passed).length}/{studentDetail.quizAttempts.length})
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      Assignments ({studentDetail.assignmentSubmissions.filter(a => a.submittedAt).length}/{studentDetail.assignmentSubmissions.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="lessons" className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lesson</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Time Spent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentDetail.lessonProgress.map((lesson) => (
                          <TableRow key={lesson.lessonId}>
                            <TableCell className="font-medium">{lesson.lessonTitle}</TableCell>
                            <TableCell className="text-center">
                              {lesson.completed ? (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Completed
                                </Badge>
                              ) : lesson.timeSpent > 0 ? (
                                <Badge variant="secondary" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  In Progress
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Not Started
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {formatTime(lesson.timeSpent)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {studentDetail.lessonProgress.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              No lessons in this course
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="quizzes" className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quiz</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Attempted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentDetail.quizAttempts.map((quiz) => (
                          <TableRow key={quiz.quizId}>
                            <TableCell className="font-medium">{quiz.quizTitle}</TableCell>
                            <TableCell className="text-center">
                              {quiz.score !== null && quiz.maxScore !== null ? (
                                <span className="font-medium">{quiz.score}/{quiz.maxScore}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {quiz.passed !== null ? (
                                quiz.passed ? (
                                  <Badge className="bg-green-600 text-white">Passed</Badge>
                                ) : (
                                  <Badge variant="destructive">Failed</Badge>
                                )
                              ) : (
                                <Badge variant="outline">Not Attempted</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {quiz.attemptedAt ? new Date(quiz.attemptedAt).toLocaleDateString() : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {studentDetail.quizAttempts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No quizzes in this course
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="assignments" className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Assignment</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-center">Submitted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentDetail.assignmentSubmissions.map((assignment) => (
                          <TableRow key={assignment.assignmentId}>
                            <TableCell className="font-medium">{assignment.assignmentTitle}</TableCell>
                            <TableCell className="text-center">
                              {assignment.score !== null ? (
                                <span className="font-medium">{assignment.score}/{assignment.maxScore}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {assignment.submittedAt ? (
                                assignment.graded ? (
                                  <Badge variant="default">Graded</Badge>
                                ) : (
                                  <Badge variant="secondary">Pending</Badge>
                                )
                              ) : (
                                <Badge variant="outline">Not Submitted</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleDateString() : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {studentDetail.assignmentSubmissions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              No assignments in this course
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
