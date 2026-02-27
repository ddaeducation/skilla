import { useState, useEffect, useCallback } from "react";
import { stripHtml } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
import { useLessonTimeTracking } from "@/hooks/useLessonTimeTracking";
import { supabase } from "@/integrations/supabase/client";
import { getFallbackRating } from "@/lib/courseUtils";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CourseAssistant from "@/components/CourseAssistant";
import ModuleRatingDialog from "@/components/ModuleRatingDialog";
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
  Lock,
  Star,
  User,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StudentQuizTaker } from "@/components/StudentQuizTaker";
import { StudentAssignmentSubmission } from "@/components/StudentAssignmentSubmission";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import CodePlayground from "@/components/CodePlayground";
import CodeLessonPlayer from "@/components/CodeLessonPlayer";
import PdfPresentationViewer from "@/components/PdfPresentationViewer";

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
  const [instructorProfile, setInstructorProfile] = useState<{ full_name: string | null; avatar_url: string | null; bio?: string | null } | null>(null);
  const [lessons, setLessons] = useState<LessonContent[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contentCounts, setContentCounts] = useState<{ lesson_count: number; quiz_count: number } | null>(null);
  const [activeContent, setActiveContent] = useState<ContentItem | null>(null);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);
  const [previewLesson, setPreviewLesson] = useState<LessonContent | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedCurriculumSection, setSelectedCurriculumSection] = useState<string | null>(null);

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

  // Module rating dialog state
  const [moduleRatingOpen, setModuleRatingOpen] = useState(false);
  const [moduleRatingSectionId, setModuleRatingSectionId] = useState<string | null>(null);
  const [moduleRatingSectionTitle, setModuleRatingSectionTitle] = useState("");
  const [ratedSections, setRatedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkUserAndCourse();
  }, [courseId]);

  const checkUserAndCourse = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
    }
    await fetchCourse();
    if (session?.user) {
      await checkEnrollment(session.user.id);
    } else {
      // Fetch sections and free preview lessons for unauthenticated visitors
      await fetchPublicCourseContent();
    }
  };

  const fetchPublicCourseContent = async () => {
    const [sectionsRes, curriculumRes] = await Promise.all([
      supabase
        .from("course_sections")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index"),
      supabase.rpc("get_course_curriculum", { p_course_id: courseId }),
    ]);
    if (sectionsRes.data) setSections(sectionsRes.data);
    if (curriculumRes.data) {
      // Map curriculum data to LessonContent shape (without actual content)
      const mappedLessons: LessonContent[] = (curriculumRes.data as any[]).map((item: any) => ({
        id: item.id,
        title: item.title,
        description: null,
        content_type: item.content_type,
        content_url: null,
        content_text: null,
        order_index: item.order_index,
        duration_minutes: item.duration_minutes,
        is_free_preview: item.is_free_preview,
        section_id: item.section_id,
      }));
      setLessons(mappedLessons);
    }
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

    // Fetch instructor profile
    if (data.instructor_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", data.instructor_id)
        .maybeSingle();
      
      // Also fetch the instructor application for bio
      const { data: application } = await supabase
        .from("instructor_applications")
        .select("bio")
        .eq("user_id", data.instructor_id)
        .maybeSingle();
      
      if (profile) {
        setInstructorProfile({
          ...profile,
          bio: application?.bio || null,
        });
      }
    }

    // Calculate average rating
    const { data: enrollmentCount } = await supabase
      .from("enrollments")
      .select("id", { count: "exact" })
      .eq("course_id", courseId!)
      .eq("payment_status", "completed");
    
    const enrolledCount = enrollmentCount?.length || 0;
    // Use consistent fallback rating between 4.5 and 5.0
    const fallback = getFallbackRating(courseId!);
    setAverageRating(fallback);
    setTotalRatings(enrolledCount);

    // Fetch content counts (accessible to all users via database function)
    const { data: countsData } = await supabase.rpc("get_course_content_counts", { p_course_id: courseId });
    if (countsData) setContentCounts(countsData as any);
  };

  const checkEnrollment = async (userId: string) => {
    // Check if user is the course instructor
    const { data: courseData } = await supabase
      .from("courses")
      .select("instructor_id")
      .eq("id", courseId)
      .maybeSingle();

    let instructorAccess = courseData?.instructor_id === userId;

    // Also check if user is a co-instructor
    if (!instructorAccess) {
      const { data: coInstructor } = await supabase
        .from("course_instructors")
        .select("id")
        .eq("course_id", courseId)
        .eq("instructor_id", userId)
        .maybeSingle();
      if (coInstructor) instructorAccess = true;
    }

    if (instructorAccess) {
      setIsInstructor(true);
      setIsEnrolled(true);
      await fetchCourseContent(userId);
      return;
    }

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
    } else {
      // User is authenticated but not enrolled — show sections and free preview lessons
      await fetchPublicCourseContent();
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


  // Create unified content list sorted by section hierarchy then by order_index within each section
  const unifiedContent: ContentItem[] = (() => {
    const items: ContentItem[] = [
      ...lessons.map((l) => ({ type: "lesson" as const, data: l, order_index: l.order_index })),
      ...quizzes.map((q) => ({ type: "quiz" as const, data: q, order_index: q.order_index })),
      ...assignments.map((a) => ({ type: "assignment" as const, data: a, order_index: a.order_index })),
    ];

    // Build section ordering maps for hierarchical sorting
    const sectionOrderMap = new Map<string, number>();
    const sectionParentMap = new Map<string, string | null>();
    sections.forEach((s) => {
      sectionOrderMap.set(s.id, s.order_index);
      sectionParentMap.set(s.id, s.parent_id);
    });

    // Get the root (level 1) section order for a given section
    const getRootSectionOrder = (sectionId: string | null): number => {
      if (!sectionId) return -1;
      let currentId: string | null = sectionId;
      let rootId = sectionId;
      while (currentId && sectionParentMap.has(currentId)) {
        const parentId = sectionParentMap.get(currentId);
        if (!parentId || !sectionParentMap.has(parentId)) break;
        rootId = parentId;
        currentId = parentId;
      }
      // If the current section has a parent, the root is the parent
      const directParent = sectionParentMap.get(sectionId);
      if (directParent && sectionOrderMap.has(directParent)) {
        return sectionOrderMap.get(directParent) ?? 0;
      }
      return sectionOrderMap.get(sectionId) ?? 0;
    };

    const getSectionOrder = (sectionId: string | null): number => {
      if (!sectionId) return -1;
      return sectionOrderMap.get(sectionId) ?? 0;
    };

    return items.sort((a, b) => {
      const aSectionId = a.data.section_id;
      const bSectionId = b.data.section_id;

      // First sort by root/parent section order
      const aRoot = getRootSectionOrder(aSectionId);
      const bRoot = getRootSectionOrder(bSectionId);
      if (aRoot !== bRoot) return aRoot - bRoot;

      // Then sort by child section order
      const aSection = getSectionOrder(aSectionId);
      const bSection = getSectionOrder(bSectionId);
      if (aSection !== bSection) return aSection - bSection;

      // Finally sort by item order_index within the same section
      return a.order_index - b.order_index;
    });
  })();

  // Set first content as active when content is loaded
  useEffect(() => {
    if (unifiedContent.length > 0 && !activeContent) {
      setActiveContent(unifiedContent[0]);
    }
  }, [lessons, quizzes, assignments]);

  const handleEnrollClick = () => {
    if (!user) {
      navigate(`/signin?redirect=/course/${courseId}`);
      return;
    }
    navigate(`/apply?courseId=${courseId}`);
  };

  const handleFreePreviewClick = async (lesson: LessonContent) => {
    if (!user) {
      navigate(`/signin?redirect=/course/${courseId}`);
      return;
    }
    setLoadingPreview(true);
    const { data } = await supabase.rpc("get_free_preview_lesson", { p_lesson_id: lesson.id });
    if (data && (data as any[]).length > 0) {
      const item = (data as any[])[0];
      setPreviewLesson({
        id: item.id,
        title: item.title,
        description: item.description,
        content_type: item.content_type,
        content_url: item.content_url,
        content_text: item.content_text,
        order_index: item.order_index,
        duration_minutes: item.duration_minutes,
        is_free_preview: item.is_free_preview,
        section_id: item.section_id,
      });
    }
    setLoadingPreview(false);
  };

  const isLessonCompleted = (lessonId: string) => {
    return progress.some((p) => p.lesson_id === lessonId && p.completed);
  };

  const getQuizAttempt = (quizId: string) => {
    // Prioritize passed attempts so reopening doesn't lose "passed" status
    const attempts = quizAttempts.filter((a) => a.quiz_id === quizId);
    return attempts.find((a) => a.passed) || attempts[attempts.length - 1] || undefined;
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
      const nextItem = unifiedContent[currentIndex + 1];
      if (isItemLocked(nextItem)) {
        toast({
          title: "Content Locked",
          description: "Complete the current item first to proceed.",
          variant: "destructive",
        });
        return;
      }
      setActiveContent(nextItem);
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

  // Check if all items in a section are complete after an update
  const checkSectionCompletion = useCallback((sectionId: string | null, updatedProgress: StudentProgress[], updatedQuizAttempts: QuizAttempt[], updatedAssignmentSubmissions: AssignmentSubmission[]) => {
    if (!sectionId || !user || ratedSections.has(sectionId)) return;
    
    const sectionLessons = lessons.filter(l => l.section_id === sectionId);
    const sectionQuizzes = quizzes.filter(q => q.section_id === sectionId);
    const sectionAssignments = assignments.filter(a => a.section_id === sectionId);
    
    const totalItems = sectionLessons.length + sectionQuizzes.length + sectionAssignments.length;
    if (totalItems === 0) return;
    
    const completedLessonCount = sectionLessons.filter(l => 
      updatedProgress.some(p => p.lesson_id === l.id && p.completed)
    ).length;
    const passedQuizCount = sectionQuizzes.filter(q => 
      updatedQuizAttempts.some(a => a.quiz_id === q.id && a.passed)
    ).length;
    const submittedAssignmentCount = sectionAssignments.filter(a => 
      updatedAssignmentSubmissions.some(s => s.assignment_id === a.id)
    ).length;
    
    if (completedLessonCount + passedQuizCount + submittedAssignmentCount >= totalItems) {
      const section = sections.find(s => s.id === sectionId);
      setModuleRatingSectionId(sectionId);
      setModuleRatingSectionTitle(section?.title || "Module");
      setModuleRatingOpen(true);
    }
  }, [lessons, quizzes, assignments, sections, user, ratedSections]);

  // Fetch already-rated sections on mount
  useEffect(() => {
    if (user && courseId) {
      supabase
        .from("module_ratings")
        .select("section_id")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .then(({ data }) => {
          if (data) {
            setRatedSections(new Set(data.map(r => r.section_id)));
          }
        });
    }
  }, [user, courseId]);

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
      const updatedProgress = [
        ...progress.filter((p) => p.lesson_id !== lessonId),
        { lesson_id: lessonId, completed: true },
      ];
      setProgress(updatedProgress);
      toast({
        title: "Lesson Completed!",
        description: "Your progress has been saved.",
      });
      
      // Check if this completes the section
      const lesson = lessons.find(l => l.id === lessonId);
      if (lesson?.section_id) {
        checkSectionCompletion(lesson.section_id, updatedProgress, quizAttempts, assignmentSubmissions);
      }
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
      const updatedAttempts = [
        ...quizAttempts.filter((a) => a.quiz_id !== selectedQuiz.id),
        { quiz_id: selectedQuiz.id, passed, score, max_score: maxScore },
      ];
      setQuizAttempts(updatedAttempts);
      
      // Check if this completes the section
      if (passed && selectedQuiz.section_id) {
        checkSectionCompletion(selectedQuiz.section_id, progress, updatedAttempts, assignmentSubmissions);
      }
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
      ? `https://www.youtube-nocookie.com/embed/${videoIdMatch[1]}?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=1&disablekb=0&controls=1&cc_load_policy=0&playsinline=1&title=0&autoplay=0&origin=${window.location.origin}`
      : null;
  };

  const getVimeoEmbedUrl = (url: string) => {
    if (!url) return null;
    const vimeoIdMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return vimeoIdMatch
      ? `https://player.vimeo.com/video/${vimeoIdMatch[1]}?byline=0&portrait=0&title=0&sidedock=0&controls=1`
      : null;
  };

  // Calculate progress including quizzes and assignments
  const completedLessons = progress.filter((p) => p.completed).length;
  const passedQuizzes = quizAttempts.filter((a) => a.passed).length;
  const submittedAssignments = assignmentSubmissions.length;
  const totalItems = lessons.length + quizzes.length + assignments.length;
  const completedItems = completedLessons + passedQuizzes + submittedAssignments;
  const progressPercentage = totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0;

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

        {lesson.description && <p className="text-muted-foreground">{stripHtml(lesson.description)}</p>}

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

        {/* Embedded Video (Distraction-Free) */}
        {lesson.content_type === "embed" && lesson.content_url && (
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
            <iframe
              src={(() => {
                const url = lesson.content_url!;
                const ytEmbed = getYouTubeEmbedUrl(url);
                if (ytEmbed) return ytEmbed;
               const vimeoEmbed = getVimeoEmbedUrl(url);
                if (vimeoEmbed) return vimeoEmbed;
                // Add distraction-free params to generic embed URLs
                try {
                  const embedUrlObj = new URL(url);
                  embedUrlObj.searchParams.set('rel', '0');
                  embedUrlObj.searchParams.set('showinfo', '0');
                  embedUrlObj.searchParams.set('modestbranding', '1');
                  embedUrlObj.searchParams.set('title', '0');
                  embedUrlObj.searchParams.set('controls', '1');
                  return embedUrlObj.toString();
                } catch {
                  return url;
                }
              })()}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          </div>
        )}

        {/* Video URL - check if it's an embed URL or a direct video file */}
        {lesson.content_type === "video" && lesson.content_url && !embedUrl && (
          (() => {
            const videoUrl = lesson.content_url!;
            const isEmbedUrl = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo.com') || videoUrl.includes('/embed/');
            if (isEmbedUrl) {
              const ytEmbed = getYouTubeEmbedUrl(videoUrl);
              const vimeoEmbed = getVimeoEmbedUrl(videoUrl);
              let src = ytEmbed || vimeoEmbed || null;
              if (!src) {
                try {
                  const embedUrlObj = new URL(videoUrl);
                  embedUrlObj.searchParams.set('rel', '0');
                  embedUrlObj.searchParams.set('showinfo', '0');
                  embedUrlObj.searchParams.set('modestbranding', '1');
                  embedUrlObj.searchParams.set('title', '0');
                  embedUrlObj.searchParams.set('controls', '1');
                  src = embedUrlObj.toString();
                } catch {
                  src = videoUrl;
                }
              }
              return (
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={src}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={lesson.title}
                  />
                </div>
              );
            }
            return (
              <video controls className="w-full rounded-lg">
                <source src={videoUrl} />
                Your browser does not support the video tag.
              </video>
            );
          })()
        )}

        {/* PDF */}
        {lesson.content_type === "pdf" && lesson.content_url && (
          <div className="space-y-2">
            <PdfPresentationViewer url={lesson.content_url} title={lesson.title} />
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

        {/* Python / SQL Code Lesson */}
        {(lesson.content_type === "python" || lesson.content_type === "sql") && (
          <CodeLessonPlayer
            language={lesson.content_type as "python" | "sql"}
            initialCode={lesson.content_url || undefined}
            lessonTitle={lesson.title}
          />
        )}

        {/* Text/Notes - show for text type OR as supplemental content for any type */}
        {lesson.content_text && (
          <div 
            className="prose prose-sm max-w-none p-6 bg-muted/50 rounded-lg break-words overflow-wrap-anywhere [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-3 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-medium [&>h3]:mb-2 [&>p]:mb-4 [&>p]:leading-relaxed [&>p]:break-words [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1 [&>li]:break-words [&>a]:text-primary [&>a]:underline [&>a]:break-all [&>pre]:bg-muted [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>pre]:whitespace-pre-wrap [&>pre]:break-words [&>code]:break-words [&>blockquote]:border-l-4 [&>blockquote]:border-primary/30 [&>blockquote]:pl-4 [&>blockquote]:italic [&_*]:max-w-full"
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
          {quiz.description && <p className="text-muted-foreground">{stripHtml(quiz.description)}</p>}
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
          {assignment.description && <p className="text-muted-foreground">{stripHtml(assignment.description)}</p>}
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
              <div 
                className="prose prose-sm max-w-none [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-3 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-medium [&>h3]:mb-2 [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1 [&>a]:text-primary [&>a]:underline [&>pre]:bg-muted [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>blockquote]:border-l-4 [&>blockquote]:border-primary/30 [&>blockquote]:pl-4 [&>blockquote]:italic"
                dangerouslySetInnerHTML={{ __html: assignment.instructions }}
              />
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

  // Sequential locking: an item is locked if the previous item is not completed
  // Instructors bypass all locks
  const isItemLocked = (item: ContentItem) => {
    if (isInstructor) return false;
    const currentIndex = unifiedContent.findIndex(
      (i) => i.type === item.type && i.data.id === item.data.id
    );
    if (currentIndex <= 0) return false; // First item is never locked
    const previousItem = unifiedContent[currentIndex - 1];
    return !getItemStatus(previousItem);
  };

  // Handle content selection with lock check
  const handleSelectContent = (item: ContentItem) => {
    if (isItemLocked(item)) {
      toast({
        title: "Content Locked",
        description: "Complete the previous item first to unlock this content.",
        variant: "destructive",
      });
      return;
    }
    setActiveContent(item);
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
              <div className="flex items-center gap-3 flex-wrap">
                {course.publish_status === "upcoming" && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    Upcoming
                  </Badge>
                )}
                <p className="text-muted-foreground">{course.school}</p>
                {averageRating && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= Math.floor(averageRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : star - 0.5 <= averageRating
                              ? "fill-yellow-400/50 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      ))}
                      <span className="text-sm font-medium ml-1">{averageRating.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">({totalRatings} students)</span>
                    </div>
                  </>
                )}
                {(course.instructor_name || instructorProfile?.full_name) && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        by {instructorProfile?.full_name || course.instructor_name}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            {isEnrolled && (
              <div className="text-right flex items-center gap-3">
                {isInstructor && (
                  <Badge variant="secondary" className="text-xs">
                    Instructor Preview
                  </Badge>
                )}
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    {isInstructor ? "Course Progress" : "Your Progress"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={progressPercentage} className="w-32 h-2" />
                    <span className="font-medium">{progressPercentage}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isEnrolled ? (
          /* Not Enrolled View */
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Course Overview</CardTitle>
                <CardDescription>{stripHtml(course.description)}</CardDescription>
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

                {/* Instructor Bio */}
                {instructorProfile && (
                  <>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={instructorProfile.avatar_url || undefined} />
                        <AvatarFallback className="text-lg">
                          {(instructorProfile.full_name || "I").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-0.5">Instructor</p>
                        <p className="font-semibold">{instructorProfile.full_name || course.instructor_name}</p>
                        {instructorProfile.bio && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                            {instructorProfile.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Curriculum / Sections with Free Preview - Split Layout */}
                {sections.length > 0 && (
                  <>
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Course Curriculum</h3>
                      {course.publish_status === "upcoming" ? (
                        /* Upcoming course: show only module names, no units */
                        <div className="border rounded-lg overflow-hidden">
                          <div className="divide-y bg-background">
                            {sections
                              .filter((s) => !s.parent_id)
                              .sort((a, b) => a.order_index - b.order_index)
                              .map((section) => (
                                <div
                                  key={section.id}
                                  className="p-3 flex items-center gap-2 text-sm"
                                >
                                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="font-medium">{section.title}</span>
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                                </div>
                              ))}
                          </div>
                          <div className="p-4 bg-muted/30 border-t text-center">
                            <p className="text-sm text-muted-foreground">
                              Course content will be available once the course goes live.
                            </p>
                          </div>
                        </div>
                      ) : (
                      <div className="flex gap-0 border rounded-lg overflow-hidden min-h-[300px]">
                        {/* Left: Module list */}
                        <div className="w-1/2 border-r divide-y bg-background">
                          {sections
                            .filter((s) => !s.parent_id)
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((section) => {
                              const sectionLessons = lessons.filter(
                                (l) => l.section_id === section.id
                              );
                              const childSections = sections
                                .filter((s) => s.parent_id === section.id)
                                .sort((a, b) => a.order_index - b.order_index);
                              const childLessons = childSections.flatMap((cs) =>
                                lessons.filter((l) => l.section_id === cs.id)
                              );
                              const allLessons = [...sectionLessons, ...childLessons];
                              const isSelected = selectedCurriculumSection === section.id;

                              return (
                                <button
                                  key={section.id}
                                  onClick={() => setSelectedCurriculumSection(isSelected ? null : section.id)}
                                  className={`w-full p-3 flex items-center justify-between text-left text-sm transition-colors ${
                                    isSelected
                                      ? "bg-primary/10 border-l-2 border-l-primary font-semibold"
                                      : "hover:bg-muted/50"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <ChevronRight className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isSelected ? "rotate-90" : ""}`} />
                                    <span className="break-words">{section.title}</span>
                                  </div>
                                  {allLessons.length > 0 && (
                                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                                      {allLessons.length} {allLessons.length === 1 ? "lesson" : "lessons"}
                                    </Badge>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                        {/* Right: Lessons for selected module */}
                        <div className="w-1/2 bg-muted/20">
                          {selectedCurriculumSection ? (
                            (() => {
                              const section = sections.find((s) => s.id === selectedCurriculumSection);
                              if (!section) return null;
                              const sectionLessons = lessons.filter(
                                (l) => l.section_id === section.id
                              );
                              const childSections = sections
                                .filter((s) => s.parent_id === section.id)
                                .sort((a, b) => a.order_index - b.order_index);
                              const childLessons = childSections.flatMap((cs) =>
                                lessons.filter((l) => l.section_id === cs.id)
                              );
                              const allLessons = [...sectionLessons, ...childLessons].sort(
                                (a, b) => a.order_index - b.order_index
                              );

                              return (
                                <div>
                                  <div className="p-3 border-b bg-muted/50 font-medium text-sm flex items-center justify-between">
                                    <span>{section.title}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {allLessons.length} {allLessons.length === 1 ? "lesson" : "lessons"}
                                    </Badge>
                                  </div>
                                  {allLessons.length > 0 ? (
                                    <div className="divide-y">
                                      {allLessons.map((lesson) => (
                                        <div
                                          key={lesson.id}
                                          className={`p-3 flex items-center gap-3 text-sm ${
                                            lesson.is_free_preview
                                              ? "cursor-pointer hover:bg-muted/50 transition-colors"
                                              : ""
                                          }`}
                                          onClick={() => {
                                            if (lesson.is_free_preview) {
                                              handleFreePreviewClick(lesson);
                                            }
                                          }}
                                        >
                                          {getContentIcon(lesson.content_type)}
                                          <span className="flex-1 break-words">{lesson.title}</span>
                                          {lesson.is_free_preview && (
                                            <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 shrink-0">
                                              Free Preview
                                            </Badge>
                                          )}
                                          {lesson.duration_minutes && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                                              {!lesson.is_free_preview && <Lock className="w-3 h-3" />}
                                              {lesson.duration_minutes} min
                                            </span>
                                          )}
                                          {!lesson.is_free_preview && !lesson.duration_minutes && (
                                            <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="p-4 text-sm text-muted-foreground italic text-center">No lessons yet</p>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <div className="flex items-center justify-center h-full p-6">
                              <p className="text-sm text-muted-foreground">Select a module to view its lessons</p>
                            </div>
                          )}
                        </div>
                      </div>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                                {/* Free Preview Content Viewer */}
                                {previewLesson && (
                                  <>
                                    <Separator />
                                    <div>
                                      <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-lg">Free Preview</h3>
                                        <Button variant="ghost" size="sm" onClick={() => setPreviewLesson(null)}>
                                          Close Preview
                                        </Button>
                                      </div>
                                      <Card>
                                        <CardContent className="p-6">
                                          {renderLessonContent(previewLesson)}
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </>
                                )}

                                {loadingPreview && (
                                  <div className="text-center py-4">
                                    <p className="text-sm text-muted-foreground">Loading preview...</p>
                                  </div>
                                )}

                                <div className="text-center">
                                  {course.publish_status === "upcoming" ? (
                                    <Button size="lg" className="w-full" disabled variant="outline">
                                      Coming Soon
                                    </Button>
                                  ) : (
                                    <Button onClick={handleEnrollClick} size="lg" className="w-full">
                                      <Play className="w-4 h-4 mr-2" />
                                      {user ? "Enroll Now" : "Sign Up to Enroll"}
                                    </Button>
                                  )}
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
                        onSelectContent={handleSelectContent}
                        getItemStatus={getItemStatus}
                        isItemLocked={isItemLocked}
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
              const updatedSubs = [
                ...assignmentSubmissions.filter((s) => s.assignment_id !== selectedAssignment.id),
                { assignment_id: selectedAssignment.id, score: null, graded_at: null },
              ];
              setAssignmentSubmissions(updatedSubs);
              
              // Check if this completes the section
              if (selectedAssignment.section_id) {
                checkSectionCompletion(selectedAssignment.section_id, progress, quizAttempts, updatedSubs);
              }
            }
          }}
        />
      )}

      {/* Module Rating Dialog */}
      {moduleRatingSectionId && courseId && user && (
        <ModuleRatingDialog
          open={moduleRatingOpen}
          onOpenChange={setModuleRatingOpen}
          courseId={courseId}
          sectionId={moduleRatingSectionId}
          sectionTitle={moduleRatingSectionTitle}
          userId={user.id}
          onRatingSubmitted={() => {
            setModuleRatingOpen(false);
            setRatedSections(prev => new Set([...prev, moduleRatingSectionId]));
            setModuleRatingSectionId(null);
          }}
        />
      )}
    </div>
  );
};

export default CourseDetail;
