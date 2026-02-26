import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  Award,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  ClipboardCheck,
  FileText,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";

interface GradeBookProps {
  user: User;
}

interface CourseGrade {
  courseId: string;
  courseTitle: string;
  school: string;
  lessonsCompleted: number;
  totalLessons: number;
  quizzes: {
    id: string;
    title: string;
    score: number | null;
    maxScore: number | null;
    passed: boolean | null;
    completedAt: string | null;
  }[];
  assignments: {
    id: string;
    title: string;
    score: number | null;
    maxScore: number;
    submittedAt: string | null;
    gradedAt: string | null;
    feedback: string | null;
  }[];
  overallProgress: number;
  averageQuizScore: number | null;
  averageAssignmentScore: number | null;
}

const GradeBook = ({ user }: GradeBookProps) => {
  const [courseGrades, setCourseGrades] = useState<CourseGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  useEffect(() => {
    fetchGrades();
  }, [user.id]);

  const fetchGrades = async () => {
    setLoading(true);

    // Fetch enrolled courses
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("course_id, courses(id, title, school)")
      .eq("user_id", user.id)
      .eq("payment_status", "completed");

    if (!enrollments || enrollments.length === 0) {
      setLoading(false);
      return;
    }

    const courseIds = enrollments.map((e) => e.course_id);

    // Fetch all related data in parallel
    const [lessonsRes, progressRes, quizzesRes, attemptsRes, assignmentsRes, submissionsRes] =
      await Promise.all([
        supabase.from("lesson_content").select("id, course_id, title").in("course_id", courseIds),
        supabase.from("student_progress").select("*").eq("user_id", user.id).in("course_id", courseIds),
        supabase.from("quizzes").select("id, course_id, title").in("course_id", courseIds),
        supabase.from("quiz_attempts").select("*").eq("user_id", user.id),
        supabase.from("assignments").select("id, course_id, title, max_score").in("course_id", courseIds),
        supabase.from("assignment_submissions").select("*").eq("user_id", user.id),
      ]);

    const lessons = lessonsRes.data || [];
    const progress = progressRes.data || [];
    const quizzes = quizzesRes.data || [];
    const attempts = attemptsRes.data || [];
    const assignments = assignmentsRes.data || [];
    const submissions = submissionsRes.data || [];

    // Build course grades
    const grades: CourseGrade[] = enrollments.map((enrollment) => {
      const course = enrollment.courses as any;
      const courseId = enrollment.course_id;

      // Lessons
      const courseLessons = lessons.filter((l) => l.course_id === courseId);
      const completedLessons = progress.filter(
        (p) => p.course_id === courseId && p.completed
      ).length;

      // Quizzes
      const courseQuizzes = quizzes.filter((q) => q.course_id === courseId);
      const quizData = courseQuizzes.map((quiz) => {
        const attempt = attempts.find((a) => a.quiz_id === quiz.id);
        return {
          id: quiz.id,
          title: quiz.title,
          score: attempt?.score ?? null,
          maxScore: attempt?.max_score ?? null,
          passed: attempt?.passed ?? null,
          completedAt: attempt?.completed_at ?? null,
        };
      });

      // Assignments
      const courseAssignments = assignments.filter((a) => a.course_id === courseId);
      const assignmentData = courseAssignments.map((assignment) => {
        const submission = submissions.find((s) => s.assignment_id === assignment.id);
        return {
          id: assignment.id,
          title: assignment.title,
          score: submission?.score ?? null,
          maxScore: assignment.max_score,
          submittedAt: submission?.submitted_at ?? null,
          gradedAt: submission?.graded_at ?? null,
          feedback: submission?.feedback ?? null,
        };
      });

      // Calculate averages
      const completedQuizzes = quizData.filter((q) => q.score !== null && q.maxScore);
      const averageQuizScore =
        completedQuizzes.length > 0
          ? completedQuizzes.reduce((acc, q) => acc + (q.score! / q.maxScore!) * 100, 0) /
            completedQuizzes.length
          : null;

      const gradedAssignments = assignmentData.filter((a) => a.score !== null);
      const averageAssignmentScore =
        gradedAssignments.length > 0
          ? gradedAssignments.reduce((acc, a) => acc + (a.score! / a.maxScore) * 100, 0) /
            gradedAssignments.length
          : null;

      // Overall progress
      const totalItems = courseLessons.length + courseQuizzes.length + courseAssignments.length;
      const completedItems =
        completedLessons + completedQuizzes.length + gradedAssignments.length;
      const overallProgress = totalItems > 0 ? Math.min(100, (completedItems / totalItems) * 100) : 0;

      return {
        courseId,
        courseTitle: course?.title || "Unknown Course",
        school: course?.school || "",
        lessonsCompleted: completedLessons,
        totalLessons: courseLessons.length,
        quizzes: quizData,
        assignments: assignmentData,
        overallProgress,
        averageQuizScore,
        averageAssignmentScore,
      };
    });

    setCourseGrades(grades);
    if (grades.length > 0 && !selectedCourse) {
      setSelectedCourse(grades[0].courseId);
    }
    setLoading(false);
  };

  const getScoreColor = (percentage: number | null) => {
    if (percentage === null) return "text-muted-foreground";
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 70) return "text-primary";
    if (percentage >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (percentage: number | null) => {
    if (percentage === null) return null;
    if (percentage >= 90) return <Badge className="bg-green-500">A</Badge>;
    if (percentage >= 80) return <Badge className="bg-green-600">B</Badge>;
    if (percentage >= 70) return <Badge className="bg-primary">C</Badge>;
    if (percentage >= 60) return <Badge className="bg-yellow-500">D</Badge>;
    return <Badge variant="destructive">F</Badge>;
  };

  // Calculate overall stats
  const totalQuizzesTaken = courseGrades.reduce(
    (acc, c) => acc + c.quizzes.filter((q) => q.score !== null).length,
    0
  );
  const totalAssignmentsSubmitted = courseGrades.reduce(
    (acc, c) => acc + c.assignments.filter((a) => a.submittedAt !== null).length,
    0
  );
  const overallQuizAverage =
    courseGrades.filter((c) => c.averageQuizScore !== null).length > 0
      ? courseGrades
          .filter((c) => c.averageQuizScore !== null)
          .reduce((acc, c) => acc + c.averageQuizScore!, 0) /
        courseGrades.filter((c) => c.averageQuizScore !== null).length
      : null;
  const overallAssignmentAverage =
    courseGrades.filter((c) => c.averageAssignmentScore !== null).length > 0
      ? courseGrades
          .filter((c) => c.averageAssignmentScore !== null)
          .reduce((acc, c) => acc + c.averageAssignmentScore!, 0) /
        courseGrades.filter((c) => c.averageAssignmentScore !== null).length
      : null;

  const selectedCourseData = courseGrades.find((c) => c.courseId === selectedCourse);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading grades...</p>
      </div>
    );
  }

  if (courseGrades.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-xl text-muted-foreground mb-2">No grades yet</p>
        <p className="text-muted-foreground">Enroll in courses and complete activities to see your grades</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Grade Book</h1>
        <p className="text-muted-foreground">
          Track your academic performance across all courses
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {overallQuizAverage !== null ? `${Math.round(overallQuizAverage)}%` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Avg Quiz Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Award className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {overallAssignmentAverage !== null ? `${Math.round(overallAssignmentAverage)}%` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">Avg Assignment Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <ClipboardCheck className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalQuizzesTaken}</p>
                <p className="text-sm text-muted-foreground">Quizzes Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <FileText className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAssignmentsSubmitted}</p>
                <p className="text-sm text-muted-foreground">Assignments Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Selection and Details */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Course List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Your Courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {courseGrades.map((course) => (
              <button
                key={course.courseId}
                onClick={() => setSelectedCourse(course.courseId)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedCourse === course.courseId
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <p className="font-medium text-sm truncate">{course.courseTitle}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs opacity-80">{course.school}</span>
                  <span className="text-xs font-medium">{Math.round(course.overallProgress)}%</span>
                </div>
                <Progress
                  value={course.overallProgress}
                  className="h-1 mt-2"
                />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Course Details */}
        <div className="lg:col-span-3 space-y-6">
          {selectedCourseData && (
            <>
              {/* Course Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>{selectedCourseData.courseTitle}</CardTitle>
                  <CardDescription>{selectedCourseData.school}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <BookOpen className="w-6 h-6 mx-auto text-primary mb-2" />
                      <p className="text-2xl font-bold">
                        {selectedCourseData.lessonsCompleted}/{selectedCourseData.totalLessons}
                      </p>
                      <p className="text-sm text-muted-foreground">Lessons</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <ClipboardCheck className="w-6 h-6 mx-auto text-green-500 mb-2" />
                      <p className={`text-2xl font-bold ${getScoreColor(selectedCourseData.averageQuizScore)}`}>
                        {selectedCourseData.averageQuizScore !== null
                          ? `${Math.round(selectedCourseData.averageQuizScore)}%`
                          : "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">Quiz Average</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <FileText className="w-6 h-6 mx-auto text-orange-500 mb-2" />
                      <p className={`text-2xl font-bold ${getScoreColor(selectedCourseData.averageAssignmentScore)}`}>
                        {selectedCourseData.averageAssignmentScore !== null
                          ? `${Math.round(selectedCourseData.averageAssignmentScore)}%`
                          : "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">Assignment Average</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Grades */}
              <Tabs defaultValue="quizzes">
                <TabsList>
                  <TabsTrigger value="quizzes">
                    Quizzes ({selectedCourseData.quizzes.length})
                  </TabsTrigger>
                  <TabsTrigger value="assignments">
                    Assignments ({selectedCourseData.assignments.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="quizzes">
                  <Card>
                    <CardContent className="pt-6">
                      {selectedCourseData.quizzes.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No quizzes in this course yet
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Quiz</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Completed</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedCourseData.quizzes.map((quiz) => {
                              const percentage =
                                quiz.score !== null && quiz.maxScore
                                  ? (quiz.score / quiz.maxScore) * 100
                                  : null;
                              return (
                                <TableRow key={quiz.id}>
                                  <TableCell className="font-medium">{quiz.title}</TableCell>
                                  <TableCell>
                                    {quiz.score !== null ? (
                                      <span className={getScoreColor(percentage)}>
                                        {quiz.score}/{quiz.maxScore} ({Math.round(percentage!)}%)
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">Not taken</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {quiz.passed === null ? (
                                      <Badge variant="outline">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Pending
                                      </Badge>
                                    ) : quiz.passed ? (
                                      <Badge className="bg-green-500">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Passed
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Failed
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {quiz.completedAt
                                      ? format(new Date(quiz.completedAt), "MMM d, yyyy")
                                      : "—"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="assignments">
                  <Card>
                    <CardContent className="pt-6">
                      {selectedCourseData.assignments.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No assignments in this course yet
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Assignment</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Grade</TableHead>
                              <TableHead>Submitted</TableHead>
                              <TableHead>Feedback</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedCourseData.assignments.map((assignment) => {
                              const percentage =
                                assignment.score !== null
                                  ? (assignment.score / assignment.maxScore) * 100
                                  : null;
                              return (
                                <TableRow key={assignment.id}>
                                  <TableCell className="font-medium">{assignment.title}</TableCell>
                                  <TableCell>
                                    {assignment.score !== null ? (
                                      <span className={getScoreColor(percentage)}>
                                        {assignment.score}/{assignment.maxScore} (
                                        {Math.round(percentage!)}%)
                                      </span>
                                    ) : assignment.submittedAt ? (
                                      <Badge variant="outline">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Pending
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">Not submitted</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{getScoreBadge(percentage)}</TableCell>
                                  <TableCell>
                                    {assignment.submittedAt
                                      ? format(new Date(assignment.submittedAt), "MMM d, yyyy")
                                      : "—"}
                                  </TableCell>
                                  <TableCell className="max-w-xs">
                                    {assignment.feedback ? (
                                      <p className="text-sm truncate" title={assignment.feedback}>
                                        {assignment.feedback}
                                      </p>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradeBook;
