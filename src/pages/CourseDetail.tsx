import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLessonTimeTracking } from "@/hooks/useLessonTimeTracking";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CourseAssistant from "@/components/CourseAssistant";
import { CourseContentSidebar } from "@/components/CourseContentSidebar";
import { CourseCommuncationTabs } from "@/components/CourseCommuncationTabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  FileText,
  Video,
  Youtube,
  Image as ImageIcon,
  ClipboardList,
  HelpCircle,
  CheckCircle,
  Play,
  ExternalLink,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Code2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StudentQuizTaker } from "@/components/StudentQuizTaker";
import { StudentAssignmentSubmission } from "@/components/StudentAssignmentSubmission";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import CodePlayground from "@/components/CodePlayground";

interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  parent_id: string | null;
  section_level: number | null;
}

interface LessonContent {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  order_index: number;
  duration_minutes: number | null;
  is_free_preview: boolean;
  section_id: string | null;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  order_index: number;
  section_id: string | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  max_score: number;
  due_date: string | null;
  order_index: number;
  section_id: string | null;
}

interface StudentProgress {
  lesson_id: string;
  completed: boolean;
}

interface QuizAttempt {
  quiz_id: string;
  passed: boolean;
  score: number;
  max_score: number;
}

interface AssignmentSubmission {
  assignment_id: string;
  score: number | null;
  graded_at: string | null;
}

type ContentItem =
  | { type: "lesson"; data: LessonContent; order_index: number }
  | { type: "quiz"; data: Quiz; order_index: number }
  | { type: "assignment"; data: Assignment; order_index: number };

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<LessonContent[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contentCounts, setContentCounts] = useState<{ lesson_count: number; quiz_count: number } | null>(null);
  const [activeContent, setActiveContent] = useState<ContentItem | null>(null);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  // Get active lesson ID for time tracking
  const activeLessonId = activeContent?.type === "lesson" ? activeContent.data.id : undefined;
  
  // Time tracking for the active lesson
  const { timeSpent: lessonTimeSpent, isTracking } = useLessonTimeTracking(
    user?.id,
    activeLessonId,
    courseId
  );

  // Quiz and Assignment dialogs
  const [quizTakerOpen, setQuizTakerOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    checkUserAndCourse();
  }, [courseId]);

  const checkUserAndCourse = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await fetchCourse();
    await checkEnrollment(session.user.id);
  };

  const fetchCourse = async () => {
    const { data, error } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();

    if (error || !data) {
      toast({
        title: "Error",
        description: "Course not found",
        variant: "destructive",
      });
      navigate("/lms");
      return;
    }
    setCourse(data);
    setLoading(false);

    // Fetch content counts (accessible to all users via database function)
    const { data: countsData } = await supabase.rpc("get_course_content_counts", { p_course_id: courseId });
    if (countsData) setContentCounts(countsData as any);
  };

  const checkEnrollment = async (userId: string) => {
    const { data } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .eq("payment_status", "completed")
      .maybeSingle();

    if (data) {
      setIsEnrolled(true);
      await fetchCourseContent(userId);
    }
  };

  const fetchCourseContent = async (userId: string) => {
    // Fetch sections
    const { data: sectionsData } = await supabase
      .from("course_sections")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index");

    if (sectionsData) {
      setSections(sectionsData);
    }

    // Fetch lessons
    const { data: lessonsData } = await supabase
      .from("lesson_content")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index");

    if (lessonsData) setLessons(lessonsData);

    // Fetch quizzes
    const { data: quizzesData } = await supabase
      .from("quizzes")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index");

    if (quizzesData) setQuizzes(quizzesData);

    // Fetch assignments
    const { data: assignmentsData } = await supabase
      .from("assignments")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index");

    if (assignmentsData) setAssignments(assignmentsData);

    // Fetch progress
    const { data: progressData } = await supabase
      .from("student_progress")
      .select("lesson_id, completed")
      .eq("user_id", userId)
      .eq("course_id", courseId);

    if (progressData) setProgress(progressData);

    // Fetch quiz attempts
    const { data: attemptsData } = await supabase
      .from("quiz_attempts")
      .select("quiz_id, passed, score, max_score")
      .eq("user_id", userId);

    if (attemptsData) setQuizAttempts(attemptsData);

    // Fetch assignment submissions
    const { data: submissionsData } = await supabase
      .from("assignment_submissions")
      .select("assignment_id, score, graded_at")
      .eq("user_id", userId);

    if (submissionsData) setAssignmentSubmissions(submissionsData);
  };


  // Create unified content list sorted by order_index
  const unifiedContent: ContentItem[] = [
    ...lessons.map((l) => ({ type: "lesson" as const, data: l, order_index: l.order_index })),
    ...quizzes.map((q) => ({ type: "quiz" as const, data: q, order_index: q.order_index })),
    ...assignments.map((a) => ({ type: "assignment" as const, data: a, order_index: a.order_index })),
  ].sort((a, b) => a.order_index - b.order_index);

  // Set first content as active when content is loaded
  useEffect(() => {
    if (unifiedContent.length > 0 && !activeContent) {
      setActiveContent(unifiedContent[0]);
    }
  }, [lessons, quizzes, assignments]);

  const handleEnrollClick = () => {
    navigate(`/apply?courseId=${courseId}`);
  };

  const isLessonCompleted = (lessonId: string) => {
    return progress.some((p) => p.lesson_id === lessonId && p.completed);
  };

  const getQuizAttempt = (quizId: string) => {
    return quizAttempts.find((a) => a.quiz_id === quizId);
  };

  const getAssignmentSubmission = (assignmentId: string) => {
    return assignmentSubmissions.find((s) => s.assignment_id === assignmentId);
  };

  const goToNextContent = () => {
    if (!activeContent) return;
    const currentIndex = unifiedContent.findIndex(
      (item) => item.type === activeContent.type && item.data.id === activeContent.data.id,
    );
    if (currentIndex < unifiedContent.length - 1) {
      setActiveContent(unifiedContent[currentIndex + 1]);
    }
  };

  const goToPreviousContent = () => {
    if (!activeContent) return;
    const currentIndex = unifiedContent.findIndex(
      (item) => item.type === activeContent.type && item.data.id === activeContent.data.id,
    );
    if (currentIndex > 0) {
      setActiveContent(unifiedContent[currentIndex - 1]);
    }
  };

  const hasNextContent = () => {
    if (!activeContent) return false;
    const currentIndex = unifiedContent.findIndex(
      (item) => item.type === activeContent.type && item.data.id === activeContent.data.id,
    );
    return currentIndex < unifiedContent.length - 1;
  };

  const hasPreviousContent = () => {
    if (!activeContent) return false;
    const currentIndex = unifiedContent.findIndex(
      (item) => item.type === activeContent.type && item.data.id === activeContent.data.id,
    );
    return currentIndex > 0;
  };

  const markLessonComplete = async (lessonId: string) => {
    if (!user) return;

    const { error } = await supabase.from("student_progress").upsert(
      {
        user_id: user.id,
        course_id: courseId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,course_id,lesson_id",
      },
    );

    if (!error) {
      setProgress((prev) => [
        ...prev.filter((p) => p.lesson_id !== lessonId),
        { lesson_id: lessonId, completed: true },
      ]);
      toast({
        title: "Lesson Completed!",
        description: "Your progress has been saved.",
      });
    }
  };

  const handleOpenQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setQuizTakerOpen(true);
  };

  const handleOpenAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setAssignmentOpen(true);
  };

  const handleQuizComplete = (passed: boolean, score: number, maxScore: number) => {
    if (selectedQuiz) {
      setQuizAttempts((prev) => [
        ...prev.filter((a) => a.quiz_id !== selectedQuiz.id),
        { quiz_id: selectedQuiz.id, passed, score, max_score: maxScore },
      ]);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-4 h-4" />;
      case "youtube":
        return <Youtube className="w-4 h-4" />;
      case "pdf":
        return <FileText className="w-4 h-4" />;
      case "image":
        return <ImageIcon className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
    return videoIdMatch 
      ? `https://www.youtube-nocookie.com/embed/${videoIdMatch[1]}?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=1&disablekb=0&controls=1&cc_load_policy=0&playsinline=1&title=0&origin=${window.location.origin}`
      : null;
  };

  const getVimeoEmbedUrl = (url: string) => {
    if (!url) return null;
    const vimeoIdMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return vimeoIdMatch
      ? `https://player.vimeo.com/video/${vimeoIdMatch[1]}?byline=0&portrait=0&title=0`
      : null;
  };

  // Calculate progress including quizzes and assignments
  const completedLessons = progress.filter((p) => p.completed).length;
  const passedQuizzes = quizAttempts.filter((a) => a.passed).length;
  const submittedAssignments = assignmentSubmissions.length;
  const totalItems = lessons.length + quizzes.length + assignments.length;
  const completedItems = completedLessons + passedQuizzes + submittedAssignments;
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <p className="text-center">Loading course...</p>
        </div>
      </div>
    );
  }

  const renderLessonContent = (lesson: LessonContent) => {
    const embedUrl =
      lesson.content_type === "youtube" && lesson.content_url ? getYouTubeEmbedUrl(lesson.content_url) : null;
    const vimeoEmbedUrl =
      lesson.content_type === "vimeo" && lesson.content_url ? getVimeoEmbedUrl(lesson.content_url) : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xl font-semibold">{lesson.title}</h3>
          <div className="flex items-center gap-2">
            {activeLessonId === lesson.id && lessonTimeSpent > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" />
                {Math.floor(lessonTimeSpent / 60)}:{(lessonTimeSpent % 60).toString().padStart(2, "0")} spent
              </Badge>
            )}
            {lesson.duration_minutes && (
              <Badge variant="outline">
                <Clock className="w-3 h-3 mr-1" />
                {lesson.duration_minutes} min
              </Badge>
            )}
            <Badge variant="outline">{lesson.content_type}</Badge>
          </div>
        </div>

        {lesson.description && <p className="text-muted-foreground">{lesson.description}</p>}

        {/* YouTube Video */}
        {embedUrl && (
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          </div>
        )}

        {/* Vimeo Video */}
        {vimeoEmbedUrl && (
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
            <iframe
              src={vimeoEmbedUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          </div>
        )}

        {/* Video URL */}
        {lesson.content_type === "video" && lesson.content_url && !embedUrl && (
          <video controls className="w-full rounded-lg">
            <source src={lesson.content_url} />
            Your browser does not support the video tag.
          </video>
        )}

        {/* PDF */}
        {lesson.content_type === "pdf" && lesson.content_url && (
          <div className="space-y-2">
            <iframe src={lesson.content_url} className="w-full h-[600px] rounded-lg border" title={lesson.title} />
            <Button variant="outline" asChild>
              <a href={lesson.content_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </a>
            </Button>
          </div>
        )}

        {/* Image */}
        {lesson.content_type === "image" && lesson.content_url && (
          <img src={lesson.content_url} alt={lesson.title} className="w-full rounded-lg" />
        )}

        {/* Text/Notes */}
        {lesson.content_type === "text" && lesson.content_text && (
          <div 
            className="prose prose-sm max-w-none p-6 bg-muted/50 rounded-lg [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-3 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-medium [&>h3]:mb-2 [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1 [&>a]:text-primary [&>a]:underline [&>pre]:bg-muted [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>blockquote]:border-l-4 [&>blockquote]:border-primary/30 [&>blockquote]:pl-4 [&>blockquote]:italic"
            dangerouslySetInnerHTML={{ __html: lesson.content_text }}
          />
        )}

        {/* Mark Complete and Next Buttons */}
        <div className="flex justify-between items-center gap-2 pt-4">
          <div>
            {hasPreviousContent() && (
              <Button variant="outline" onClick={goToPreviousContent}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
          {isLessonCompleted(lesson.id) ? (
            <Badge className="bg-green-500">
              <CheckCircle className="w-4 h-4 mr-1" />
              Completed
            </Badge>
          ) : (
            <Button onClick={() => markLessonComplete(lesson.id)}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Complete
            </Button>
          )}
          {hasNextContent() && (
            <Button variant="outline" onClick={goToNextContent}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          </div>
        </div>
      </div>
    );
  };

  const renderQuizContent = (quiz: Quiz) => {
    const attempt = getQuizAttempt(quiz.id);

    return (
      <div className="space-y-6 py-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-2">{quiz.title}</h3>
          {quiz.description && <p className="text-muted-foreground">{quiz.description}</p>}
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <Badge variant="outline" className="text-sm py-1 px-3">
            <Award className="w-4 h-4 mr-1" />
            Pass: {quiz.passing_score}%
          </Badge>
          {quiz.time_limit_minutes && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              <Clock className="w-4 h-4 mr-1" />
              {quiz.time_limit_minutes} minutes
            </Badge>
          )}
        </div>

        {attempt && (
          <Card className={attempt.passed ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{attempt.passed ? "You passed!" : "Not passed yet"}</p>
                  <p className="text-sm text-muted-foreground">
                    Score: {attempt.score}/{attempt.max_score} ({Math.round((attempt.score / attempt.max_score) * 100)}
                    %)
                  </p>
                </div>
                {attempt.passed ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <Badge variant="destructive">Try Again</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center gap-2">
          <div>
            {hasPreviousContent() && (
              <Button size="lg" variant="outline" onClick={goToPreviousContent}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
          <Button size="lg" onClick={() => handleOpenQuiz(quiz)}>
            <Play className="w-4 h-4 mr-2" />
            {attempt ? "Retake Quiz" : "Start Quiz"}
          </Button>
          {hasNextContent() && (
            <Button size="lg" variant="outline" onClick={goToNextContent}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          </div>
        </div>
      </div>
    );
  };

  const renderAssignmentContent = (assignment: Assignment) => {
    const submission = getAssignmentSubmission(assignment.id);

    return (
      <div className="space-y-6 py-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <ClipboardList className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-2">{assignment.title}</h3>
          {assignment.description && <p className="text-muted-foreground">{assignment.description}</p>}
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <Badge variant="outline" className="text-sm py-1 px-3">
            <Award className="w-4 h-4 mr-1" />
            {assignment.max_score} points
          </Badge>
          {assignment.due_date && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              <Clock className="w-4 h-4 mr-1" />
              Due: {new Date(assignment.due_date).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {assignment.instructions && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{assignment.instructions}</p>
            </CardContent>
          </Card>
        )}

        {submission && (
          <Card className={submission.graded_at ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{submission.graded_at ? "Graded" : "Submitted"}</p>
                  {submission.graded_at && (
                    <p className="text-sm text-muted-foreground">
                      Score: {submission.score}/{assignment.max_score}
                    </p>
                  )}
                </div>
                <CheckCircle className={`w-8 h-8 ${submission.graded_at ? "text-green-500" : "text-blue-500"}`} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center gap-2">
          <div>
            {hasPreviousContent() && (
              <Button size="lg" variant="outline" onClick={goToPreviousContent}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
          <Button size="lg" onClick={() => handleOpenAssignment(assignment)}>
            <FileText className="w-4 h-4 mr-2" />
            {submission ? "View/Update Submission" : "Submit Assignment"}
          </Button>
          {hasNextContent() && (
            <Button size="lg" variant="outline" onClick={goToNextContent}>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          </div>
        </div>
      </div>
    );
  };

  const renderActiveContent = () => {
    if (!activeContent) {
      return (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No content yet</h3>
          <p className="text-muted-foreground">
            The instructor is still preparing the course content. Check back soon!
          </p>
        </div>
      );
    }

    switch (activeContent.type) {
      case "lesson":
        return renderLessonContent(activeContent.data);
      case "quiz":
        return renderQuizContent(activeContent.data);
      case "assignment":
        return renderAssignmentContent(activeContent.data);
    }
  };

  const getItemStatus = (item: ContentItem) => {
    if (item.type === "lesson") {
      return isLessonCompleted(item.data.id);
    } else if (item.type === "quiz") {
      const attempt = getQuizAttempt(item.data.id);
      return attempt?.passed || false;
    } else {
      const submission = getAssignmentSubmission(item.data.id);
      return submission != null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-muted-foreground">{course.school}</p>
            </div>
            {isEnrolled && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">Your Progress</div>
                <div className="flex items-center gap-2">
                  <Progress value={progressPercentage} className="w-32 h-2" />
                  <span className="font-medium">{progressPercentage}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isEnrolled ? (
          /* Not Enrolled View */
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Course Overview</CardTitle>
                <CardDescription>{course.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{(contentCounts?.lesson_count ?? lessons.length) || "—"}</p>
                    <p className="text-sm text-muted-foreground">Lessons</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{(contentCounts?.quiz_count ?? quizzes.length) || "—"}</p>
                    <p className="text-sm text-muted-foreground">Quizzes</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{course.duration || "—"}</p>
                    <p className="text-sm text-muted-foreground">Duration</p>
                  </div>
                </div>

                <Separator />

                <div className="text-center">
                  {/* <p className="text-3xl font-bold text-green-600 mb-2">
                    {Number(course.price) === 0 ? "FREE" : `$${course.price}/month`}
                  </p> */}
                  <Button onClick={handleEnrollClick} size="lg" className="w-full">
                    <Play className="w-4 h-4 mr-2" />
                    {Number(course.price) === 0 ? "Enroll for Free" : "Enroll Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Enrolled View with Tabs */
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="content" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Course Content
              </TabsTrigger>
              <TabsTrigger value="playground" className="gap-2">
                <Code2 className="h-4 w-4" />
                Code Playground
              </TabsTrigger>
              <TabsTrigger value="communication" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Communication
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content">
              {isSidebarHidden ? (
                <div className="relative">
                  {/* Floating show sidebar button when hidden */}
                  <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSidebarHidden(false)}
                      className="shadow-lg bg-background"
                    >
                      Show Content
                    </Button>
                  </div>
                  {/* Main Content Area - Full Width */}
                  <Card>
                    <CardContent className="p-6">{renderActiveContent()}</CardContent>
                  </Card>
                </div>
              ) : (
                <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border">
                  {/* Sidebar Panel */}
                  <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                    <div className="h-full overflow-auto">
                      <CourseContentSidebar
                        sections={sections}
                        unifiedContent={unifiedContent}
                        activeContent={activeContent}
                        onSelectContent={setActiveContent}
                        getItemStatus={getItemStatus}
                        completedItems={completedItems}
                        totalItems={totalItems}
                        onHideSidebar={() => setIsSidebarHidden(true)}
                      />
                    </div>
                  </ResizablePanel>

                  {/* Resizable Handle / Splitter */}
                  <ResizableHandle withHandle />

                  {/* Main Content Panel */}
                  <ResizablePanel defaultSize={75}>
                    <div className="h-full overflow-auto p-6">
                      {renderActiveContent()}
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              )}
            </TabsContent>

            <TabsContent value="playground">
              <Card>
                <CardContent className="p-6">
                  <CodePlayground />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="communication">
              <CourseCommuncationTabs 
                userId={user.id}
                courseId={courseId!}
                courseTitle={course.title}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
      <Footer />
      {course && <CourseAssistant courseName={course.title} />}

      {/* Quiz Taker Dialog */}
      {selectedQuiz && (
        <StudentQuizTaker
          quizId={selectedQuiz.id}
          quizTitle={selectedQuiz.title}
          quizDescription={selectedQuiz.description}
          passingScore={selectedQuiz.passing_score}
          timeLimitMinutes={selectedQuiz.time_limit_minutes}
          open={quizTakerOpen}
          onClose={() => {
            setQuizTakerOpen(false);
            setSelectedQuiz(null);
          }}
          onComplete={handleQuizComplete}
        />
      )}

      {/* Assignment Submission Dialog */}
      {selectedAssignment && (
        <StudentAssignmentSubmission
          assignmentId={selectedAssignment.id}
          assignmentTitle={selectedAssignment.title}
          assignmentDescription={selectedAssignment.description}
          instructions={selectedAssignment.instructions}
          maxScore={selectedAssignment.max_score}
          dueDate={selectedAssignment.due_date}
          open={assignmentOpen}
          onClose={() => {
            setAssignmentOpen(false);
            setSelectedAssignment(null);
          }}
          onSubmit={() => {
            if (selectedAssignment) {
              setAssignmentSubmissions((prev) => [
                ...prev.filter((s) => s.assignment_id !== selectedAssignment.id),
                { assignment_id: selectedAssignment.id, score: null, graded_at: null },
              ]);
            }
          }}
        />
      )}
    </div>
  );
};

export default CourseDetail;
