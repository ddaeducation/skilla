import { useState, useEffect, useCallback, useRef } from "react";
import { stripHtml } from "@/lib/utils";
import { enforceYouTubeParams, sanitizeYouTubeIframes } from "@/lib/youtubeUtils";
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
import { StudentNotetaker } from "@/components/StudentNotetaker";
import CourseDownloadButton from "@/components/CourseDownloadButton";
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
  StickyNote,
  Maximize,
  Minimize,
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
import PaginatedTextContent from "@/components/PaginatedTextContent";
import { PeerReviewPanel } from "@/components/PeerReviewPanel";
import HighlightedHTML from "@/components/HighlightedHTML";
import { useVideoWatchProgress } from "@/hooks/useVideoWatchProgress";
import { VideoQuizPopup } from "@/components/VideoQuizPopup";
import { VideoQuizMarkers } from "@/components/VideoQuizMarkers";

interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  parent_id: string | null;
  section_level: number | null;
  is_locked?: boolean;
  unlock_at?: string | null;
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
  required_watch_percentage: number | null;
  is_locked?: boolean;
  unlock_at?: string | null;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  order_index: number;
  section_id: string | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  rubrics: string | null;
  max_score: number;
  max_submissions: number | null;
  due_date: string | null;
  order_index: number;
  section_id: string | null;
  ai_grading_enabled: boolean;
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

const normalizeRichTextContent = (html: string | null) => {
  if (!html) return "";

  let cleaned = html.trim();
  // Remove empty <p> tags (with optional whitespace/&nbsp;/br inside)
  cleaned = cleaned.replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");
  // Remove empty <div> tags
  cleaned = cleaned.replace(/<div>(?:\s|&nbsp;|<br\s*\/?>)*<\/div>/gi, "");
  // Remove empty <li> tags
  cleaned = cleaned.replace(/<li>(?:\s|&nbsp;|<br\s*\/?>)*<\/li>/gi, "");
  // Remove orphan <br> tags between block elements
  cleaned = cleaned.replace(/(<\/(?:p|div|h[1-6]|ul|ol|li|blockquote|pre)>)\s*(?:<br\s*\/?>)+\s*(<(?:p|div|h[1-6]|ul|ol|li|blockquote|pre)[\s>])/gi, "$1$2");
  // Strip leading whitespace/empty blocks
  const leadingEmptyBlocksPattern = /^(?:\s|&nbsp;|<br\s*\/?>)+/i;
  cleaned = cleaned.replace(leadingEmptyBlocksPattern, "");

  return cleaned.trim();
};

const CourseDetail = () => {
  const { courseId: courseParam } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [courseId, setCourseId] = useState<string | undefined>(courseParam);
  const [instructorProfile, setInstructorProfile] = useState<{ full_name: string | null; avatar_url: string | null; bio?: string | null } | null>(null);
  const [coInstructors, setCoInstructors] = useState<{ full_name: string | null; avatar_url: string | null; bio?: string | null }[]>([]);
  const [lessons, setLessons] = useState<LessonContent[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmission[]>([]);
  const [peerReviewStatus, setPeerReviewStatus] = useState<Record<string, { assigned: number; completed: number }>>({});
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
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
  const [showCourseOverview, setShowCourseOverview] = useState(true);
  const [textPageInfo, setTextPageInfo] = useState<{ current: number; total: number }>({ current: 1, total: 1 });
  // Get active lesson ID for time tracking
  const activeLessonId = activeContent?.type === "lesson" ? activeContent.data.id : undefined;
  const activeLesson = activeContent?.type === "lesson" ? activeContent.data as LessonContent : null;
  
  // Time tracking for the active lesson
  const { timeSpent: lessonTimeSpent, isTracking } = useLessonTimeTracking(
    user?.id,
    activeLessonId,
    courseId
  );

  // Video watch progress tracking
  const isVideoLesson = activeLesson && ['video', 'youtube', 'vimeo', 'embed'].includes(activeLesson.content_type);
  const {
    watchedPercentage,
    hasMetRequirement: hasMetWatchRequirement,
    maxWatchedRef,
    reset: resetWatchProgress,
    videoRefCallback,
    enableYouTubeJSApi,
  } = useVideoWatchProgress(isVideoLesson ? activeLesson?.required_watch_percentage ?? null : null);

  // Reset watch progress when active lesson changes
  useEffect(() => {
    resetWatchProgress();
  }, [activeLessonId, resetWatchProgress]);

  // Video quiz popup: track current video time
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoQuizPausedRef = useRef(false);

  useEffect(() => {
    setVideoCurrentTime(0);
    setVideoDuration(0);
    videoQuizPausedRef.current = false;
  }, [activeLessonId]);

  // YouTube & Vimeo time tracking via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        // YouTube infoDelivery
        if (data?.event === "infoDelivery" && typeof data?.info?.currentTime === "number") {
          setVideoCurrentTime(data.info.currentTime);
          if (typeof data?.info?.duration === "number" && data.info.duration > 0) {
            setVideoDuration(data.info.duration);
          }
        }
        // Vimeo playProgress
        if (data?.method === "playProgress" && typeof data?.value?.seconds === "number") {
          setVideoCurrentTime(data.value.seconds);
        }
        // Vimeo timeupdate (newer postMessage payload)
        if (data?.event === "timeupdate" && typeof data?.data?.seconds === "number") {
          setVideoCurrentTime(data.data.seconds);
        }
        // Vimeo playProgress (alternate payload)
        if (data?.event === "playProgress" && typeof data?.data?.seconds === "number") {
          setVideoCurrentTime(data.data.seconds);
        }
        // YouTube onReady — start listening for info
        if (data?.event === "onReady" || data?.event === "initialDelivery") {
          const iframes = document.querySelectorAll("iframe");
          iframes.forEach((iframe) => {
            try {
              iframe.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "*");
            } catch {}
          });
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);

    // Periodically tell YouTube iframes we're listening (needed to receive infoDelivery)
    const ytInterval = setInterval(() => {
      document.querySelectorAll("iframe").forEach((iframe) => {
        const src = iframe.src || "";
        if (src.includes("youtube") || src.includes("youtube-nocookie")) {
          try {
            iframe.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "*");
          } catch {}
        }
        // Vimeo: request playProgress events
        if (src.includes("vimeo")) {
          try {
            iframe.contentWindow?.postMessage(JSON.stringify({ method: "addEventListener", value: "timeupdate" }), "*");
            iframe.contentWindow?.postMessage(JSON.stringify({ method: "addEventListener", value: "playProgress" }), "*");
          } catch {}
        }
      });
    }, 1000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(ytInterval);
    };
  }, []);

  const handleVideoQuizPause = useCallback(() => {
    videoQuizPausedRef.current = true;
    if (videoElementRef.current) videoElementRef.current.pause();
    document.querySelectorAll("iframe").forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "pauseVideo", args: [] }), "*");
        iframe.contentWindow?.postMessage(JSON.stringify({ method: "pause" }), "*");
      } catch {}
    });
  }, []);

  const handleVideoQuizResume = useCallback(() => {
    videoQuizPausedRef.current = false;
    if (videoElementRef.current) videoElementRef.current.play();
    document.querySelectorAll("iframe").forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
        iframe.contentWindow?.postMessage(JSON.stringify({ method: "play" }), "*");
      } catch {}
    });
  }, []);

  // autoCompletedRef kept for manual tracking only
  const autoCompletedRef = useRef<Set<string>>(new Set());

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && contentAreaRef.current) {
      contentAreaRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

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
  }, [courseParam]);

  // Realtime subscription: auto-refresh course, sections, lessons, quizzes, and assignments when updated
  useEffect(() => {
    if (!courseId) return;

    const channel = supabase
      .channel(`course-content-${courseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courses', filter: `id=eq.${courseId}` },
        () => {
          // Re-fetch course details
          supabase
            .from("courses")
            .select("*")
            .eq("id", courseId)
            .maybeSingle()
            .then(({ data }) => { if (data) setCourse(data); });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'course_sections', filter: `course_id=eq.${courseId}` },
        () => {
          // Re-fetch sections
          supabase
            .from("course_sections")
            .select("*")
            .eq("course_id", courseId)
            .order("order_index")
            .then(({ data }) => { if (data) setSections(data); });
          // Sections deleted may cascade-delete lessons/quizzes, refresh counts and content
          supabase.from("lesson_content").select("*").eq("course_id", courseId).order("order_index")
            .then(({ data }) => { if (data) setLessons(data); });
          supabase.from("quizzes").select("*").eq("course_id", courseId).order("order_index")
            .then(({ data }) => { if (data) setQuizzes(data); });
          supabase.from("assignments").select("*").eq("course_id", courseId).order("order_index")
            .then(({ data }) => { if (data) setAssignments(data); });
          supabase.rpc("get_course_content_counts", { p_course_id: courseId })
            .then(({ data }) => { if (data) setContentCounts(data as any); });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lesson_content', filter: `course_id=eq.${courseId}` },
        () => {
          supabase.from("lesson_content").select("*").eq("course_id", courseId).order("order_index")
            .then(({ data }) => { if (data) setLessons(data); });
          supabase.rpc("get_course_content_counts", { p_course_id: courseId })
            .then(({ data }) => { if (data) setContentCounts(data as any); });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quizzes', filter: `course_id=eq.${courseId}` },
        () => {
          supabase.from("quizzes").select("*").eq("course_id", courseId).order("order_index")
            .then(({ data }) => { if (data) setQuizzes(data); });
          supabase.rpc("get_course_content_counts", { p_course_id: courseId })
            .then(({ data }) => { if (data) setContentCounts(data as any); });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assignments', filter: `course_id=eq.${courseId}` },
        () => {
          supabase.from("assignments").select("*").eq("course_id", courseId).order("order_index")
            .then(({ data }) => { if (data) setAssignments(data); });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId]);

  const checkUserAndCourse = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
    }
    const resolvedId = await fetchCourse();
    if (!resolvedId) return;
    if (session?.user) {
      await checkEnrollment(session.user.id, resolvedId);
    } else {
      // Fetch sections and free preview lessons for unauthenticated visitors
      await fetchPublicCourseContent(resolvedId);
    }
  };

  const fetchPublicCourseContent = async (resolvedCourseId?: string) => {
    const cid = resolvedCourseId || courseId;
    if (!cid) return;
    const [sectionsRes, curriculumRes] = await Promise.all([
      supabase
        .from("course_sections")
        .select("*")
        .eq("course_id", cid)
        .order("order_index"),
      supabase.rpc("get_course_curriculum", { p_course_id: cid }),
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
        required_watch_percentage: null,
      }));
      setLessons(mappedLessons);
    }
  };

  const fetchCourse = async (): Promise<string | null> => {
    // Try fetching by slug first, then fall back to UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseParam || "");
    
    let data: any = null;
    let error: any = null;

    if (isUUID) {
      ({ data, error } = await supabase.from("courses").select("*").eq("id", courseParam).maybeSingle());
    }
    
    if (!data) {
      ({ data, error } = await supabase.from("courses").select("*").eq("slug", courseParam).maybeSingle());
    }

    if (error || !data) {
      toast({
        title: "Error",
        description: "Course not found",
        variant: "destructive",
      });
      navigate("/lms");
      return null;
    }
    
    // Set the resolved UUID as courseId for internal use
    setCourseId(data.id);
    setCourse(data);
    setLoading(false);

    // Redirect UUID URLs to slug URLs for SEO
    if (isUUID && data.slug && courseParam !== data.slug) {
      navigate(`/course/${data.slug}`, { replace: true });
    }

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

    // Fetch co-instructors
    const { data: coInstructorLinks } = await supabase
      .from("course_instructors")
      .select("instructor_id")
      .eq("course_id", data.id)
      .eq("role", "co_instructor");

    if (coInstructorLinks && coInstructorLinks.length > 0) {
      const coProfiles = await Promise.all(
        coInstructorLinks.map(async (link) => {
          const [profileRes, appRes] = await Promise.all([
            supabase.from("profiles").select("full_name, avatar_url").eq("id", link.instructor_id).maybeSingle(),
            supabase.from("instructor_applications").select("bio").eq("user_id", link.instructor_id).maybeSingle(),
          ]);
          return {
            full_name: profileRes.data?.full_name || null,
            avatar_url: profileRes.data?.avatar_url || null,
            bio: appRes.data?.bio || null,
          };
        })
      );
      setCoInstructors(coProfiles);
    }

    // Calculate average rating
    const { data: enrollmentCount } = await supabase
      .from("enrollments")
      .select("id", { count: "exact" })
      .eq("course_id", data.id)
      .eq("payment_status", "completed");
    
    const enrolledCount = enrollmentCount?.length || 0;
    // Use consistent fallback rating between 4.5 and 5.0
    const fallback = getFallbackRating(data.id);
    setAverageRating(fallback);
    setTotalRatings(enrolledCount);

    // Fetch content counts (accessible to all users via database function)
    const { data: countsData } = await supabase.rpc("get_course_content_counts", { p_course_id: data.id });
    if (countsData) setContentCounts(countsData as any);

    return data.id;
  };

  const checkEnrollment = async (userId: string, resolvedCourseId?: string) => {
    const cid = resolvedCourseId || courseId;
    // Check if user is the course instructor
    const { data: courseData } = await supabase
      .from("courses")
      .select("instructor_id")
      .eq("id", cid)
      .maybeSingle();

    let instructorAccess = courseData?.instructor_id === userId;

    // Also check if user is a co-instructor
    if (!instructorAccess) {
      const { data: coInstructor } = await supabase
        .from("course_instructors")
        .select("id")
        .eq("course_id", cid)
        .eq("instructor_id", userId)
        .maybeSingle();
      if (coInstructor) instructorAccess = true;
    }

    if (instructorAccess) {
      setIsInstructor(true);
      setIsEnrolled(true);
      await fetchCourseContent(userId, cid);
      return;
    }

    const { data } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", cid)
      .eq("payment_status", "completed")
      .maybeSingle();

    if (data) {
      // Check if subscription has expired
      if (data.subscription_expires_at && new Date(data.subscription_expires_at) < new Date()) {
        setIsSubscriptionExpired(true);
        setSubscriptionExpiresAt(data.subscription_expires_at);
        setIsEnrolled(false);
        // Still fetch content structure but don't allow access
        await fetchPublicCourseContent(cid);
      } else {
        setIsEnrolled(true);
        setSubscriptionExpiresAt(data.subscription_expires_at);
        await fetchCourseContent(userId, cid);
      }
    } else {
      // Check for expired enrollment (payment_status might have been changed to suspended)
      const { data: expiredEnrollment } = await supabase
        .from("enrollments")
        .select("subscription_expires_at")
        .eq("user_id", userId)
        .eq("course_id", cid)
        .in("payment_status", ["suspended", "expired"])
        .maybeSingle();
      
      if (expiredEnrollment) {
        setIsSubscriptionExpired(true);
        setSubscriptionExpiresAt(expiredEnrollment.subscription_expires_at);
      }
      // User is authenticated but not enrolled — show sections and free preview lessons
      await fetchPublicCourseContent(cid);
    }
  };

  const fetchCourseContent = async (userId: string, resolvedCourseId?: string) => {
    const cid = resolvedCourseId || courseId;
    if (!cid) return;

    // Fetch sections
    const { data: sectionsData } = await supabase
      .from("course_sections")
      .select("*")
      .eq("course_id", cid)
      .order("order_index");

    if (sectionsData) {
      setSections(sectionsData);
    }

    // Fetch lessons
    const { data: lessonsData } = await supabase
      .from("lesson_content")
      .select("*")
      .eq("course_id", cid)
      .order("order_index");

    if (lessonsData) setLessons(lessonsData);

    // Fetch quizzes
    const { data: quizzesData } = await supabase
      .from("quizzes")
      .select("*")
      .eq("course_id", cid)
      .order("order_index");

    if (quizzesData) setQuizzes(quizzesData);

    // Fetch assignments
    const { data: assignmentsData } = await supabase
      .from("assignments")
      .select("*")
      .eq("course_id", cid)
      .order("order_index");

    if (assignmentsData) setAssignments(assignmentsData);

    // Fetch progress
    const { data: progressData } = await supabase
      .from("student_progress")
      .select("lesson_id, completed")
      .eq("user_id", userId)
      .eq("course_id", cid);

    if (progressData) setProgress(progressData);

    // Fetch quiz attempts
    const { data: attemptsData } = await supabase
      .from("quiz_attempts")
      .select("quiz_id, passed, score, max_score")
      .eq("user_id", userId);

    if (attemptsData) {
      // Consolidate to best attempt per quiz (max grade policy)
      const bestByQuiz = new Map<string, QuizAttempt>();
      attemptsData.forEach((a: QuizAttempt) => {
        const existing = bestByQuiz.get(a.quiz_id);
        if (!existing) {
          bestByQuiz.set(a.quiz_id, a);
        } else {
          // Keep highest score; preserve passed=true if any attempt passed
          const everPassed = existing.passed || a.passed;
          const best = a.score > existing.score ? a : existing;
          bestByQuiz.set(a.quiz_id, { ...best, passed: everPassed });
        }
      });
      setQuizAttempts(Array.from(bestByQuiz.values()));
    }

    // Fetch assignment submissions
    const { data: submissionsData } = await supabase
      .from("assignment_submissions")
      .select("assignment_id, score, graded_at")
      .eq("user_id", userId);

    if (submissionsData) setAssignmentSubmissions(submissionsData);

    // Fetch peer review completion status for each assignment
    await fetchPeerReviewStatus(userId, cid);
  };

  const fetchPeerReviewStatus = async (userId: string, resolvedCourseId?: string) => {
    const cid = resolvedCourseId || courseId;
    if (!cid) return;
    const { data: reviews } = await supabase
      .from("peer_reviews")
      .select("assignment_id, reviewed_at")
      .eq("reviewer_id", userId)
      .eq("course_id", cid);

    if (reviews) {
      const status: Record<string, { assigned: number; completed: number }> = {};
      reviews.forEach(r => {
        if (!status[r.assignment_id]) {
          status[r.assignment_id] = { assigned: 0, completed: 0 };
        }
        status[r.assignment_id].assigned += 1;
        if (r.reviewed_at) {
          status[r.assignment_id].completed += 1;
        }
      });
      setPeerReviewStatus(status);
    }
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

  // Set active content to where student left off (first uncompleted item)
  useEffect(() => {
    if (unifiedContent.length > 0 && !activeContent && !showCourseOverview) {
      if (isEnrolled || isInstructor) {
        // Find the first uncompleted content item
        const firstUncompleted = unifiedContent.find((item) => {
          if (item.type === "lesson") {
            return !progress.some((p) => p.lesson_id === item.data.id && p.completed);
          }
          if (item.type === "quiz") {
            const attempts = quizAttempts.filter((a) => a.quiz_id === item.data.id);
            return !attempts.some((a) => a.passed);
          }
          if (item.type === "assignment") {
            return !assignmentSubmissions.some((s) => s.assignment_id === item.data.id && s.graded_at);
          }
          return true;
        });
        // Default to first item if all completed, ensuring first lesson is always accessible
        setActiveContent(firstUncompleted || unifiedContent[0] || null);
      } else {
        setActiveContent(unifiedContent[0]);
      }
    }
  }, [lessons, quizzes, assignments, progress, quizAttempts, assignmentSubmissions, showCourseOverview, isEnrolled, isInstructor]);

  const courseSlug = course?.slug || courseId;

  const handleEnrollClick = () => {
    if (!user) {
      navigate(`/signin?redirect=/course/${courseSlug}`);
      return;
    }
    navigate(`/apply?courseId=${courseId}`);
  };

  const handleFreePreviewClick = async (lesson: LessonContent) => {
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
        required_watch_percentage: null,
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
      // Use max grade: keep the best attempt (highest score) rather than the latest
      const existingAttempts = quizAttempts.filter((a) => a.quiz_id === selectedQuiz.id);
      const bestExisting = existingAttempts.length > 0
        ? existingAttempts.reduce((best, a) => (a.score > best.score ? a : best), existingAttempts[0])
        : null;
      
      const currentAttempt = { quiz_id: selectedQuiz.id, passed, score, max_score: maxScore };
      
      // Pick whichever attempt has the higher score
      const bestAttempt = bestExisting && bestExisting.score > score
        ? bestExisting
        : currentAttempt;
      
      // Mark as passed if ANY attempt ever passed
      const everPassed = passed || existingAttempts.some((a) => a.passed);
      const finalAttempt = { ...bestAttempt, passed: everPassed };
      
      const updatedAttempts = [
        ...quizAttempts.filter((a) => a.quiz_id !== selectedQuiz.id),
        finalAttempt,
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
    if (!videoIdMatch) return null;
    return enforceYouTubeParams(`https://www.youtube-nocookie.com/embed/${videoIdMatch[1]}`);
  };

  const getVimeoEmbedUrl = (url: string) => {
    if (!url) return null;
    const vimeoIdMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return vimeoIdMatch
      ? `https://player.vimeo.com/video/${vimeoIdMatch[1]}?byline=0&portrait=0&title=0&sidedock=0&controls=1`
      : null;
  };

  const withPlayerTrackingParams = (src: string) => {
    try {
      const parsed = new URL(src);
      const host = parsed.hostname.toLowerCase();

      if (host.includes("youtube")) {
        parsed.searchParams.set("enablejsapi", "1");
      }

      if (host.includes("vimeo.com")) {
        parsed.searchParams.set("api", "1");
        if (!parsed.searchParams.has("player_id")) {
          parsed.searchParams.set("player_id", "vimeo-player");
        }
      }

      return parsed.toString();
    } catch {
      return src;
    }
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
      <div className="space-y-1">
        {/* Lesson Title & Badges */}
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

        {/* Spacer between header and media */}
        <div className="pt-1" />

        {/* Video Pop-up Quiz Overlay */}
        {isVideoLesson && user && (
          <VideoQuizPopup
            lessonId={lesson.id}
            courseId={courseId || ""}
            currentTimeSeconds={videoCurrentTime}
            onPauseVideo={handleVideoQuizPause}
            onResumeVideo={handleVideoQuizResume}
            userId={user.id}
          />
        )}

        {/* YouTube Video */}
        {embedUrl && (() => {
          const hasWatchReq = lesson.required_watch_percentage != null && lesson.required_watch_percentage > 0 && !hasMetWatchRequirement && !isLessonCompleted(lesson.id);
          const trackedSrc = withPlayerTrackingParams(embedUrl);
          const finalSrc = trackedSrc + (hasWatchReq ? `${trackedSrc.includes("?") ? "&" : "?"}disablekb=1` : "");
          return (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative">
              <iframe
                ref={(el) => { if (el) enableYouTubeJSApi(el); }}
                src={finalSrc}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen={!hasWatchReq}
                title={lesson.title}
              />
              {hasWatchReq && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-transparent z-10 cursor-not-allowed" title="Watch the video to unlock seeking" />
              )}
            </div>
          );
        })()}

        {/* Vimeo Video */}
        {vimeoEmbedUrl && (() => {
          const hasWatchReq = lesson.required_watch_percentage != null && lesson.required_watch_percentage > 0 && !hasMetWatchRequirement && !isLessonCompleted(lesson.id);
          const vimeoSrc = withPlayerTrackingParams(vimeoEmbedUrl);
          return (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative">
              <iframe
                id="vimeo-player"
                src={vimeoSrc}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen={!hasWatchReq}
                title={lesson.title}
              />
              {hasWatchReq && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-transparent z-10 cursor-not-allowed" title="Watch the video to unlock seeking" />
              )}
            </div>
          );
        })()}

        {/* Embedded Video (Distraction-Free) */}
        {lesson.content_type === "embed" && lesson.content_url && (() => {
          const hasWatchReq = lesson.required_watch_percentage != null && lesson.required_watch_percentage > 0 && !hasMetWatchRequirement && !isLessonCompleted(lesson.id);
          return (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative">
              <iframe
                src={(() => {
                  const url = lesson.content_url!;
                  const ytEmbed = getYouTubeEmbedUrl(url);
                  if (ytEmbed) return withPlayerTrackingParams(ytEmbed);
                  const vimeoEmbed = getVimeoEmbedUrl(url);
                  if (vimeoEmbed) return withPlayerTrackingParams(vimeoEmbed);
                  try {
                    const embedUrlObj = new URL(url);
                    embedUrlObj.searchParams.set('rel', '0');
                    embedUrlObj.searchParams.set('showinfo', '0');
                    embedUrlObj.searchParams.set('modestbranding', '1');
                    embedUrlObj.searchParams.set('title', '0');
                    embedUrlObj.searchParams.set('controls', '1');
                    if (hasWatchReq) embedUrlObj.searchParams.set('disablekb', '1');
                    return withPlayerTrackingParams(embedUrlObj.toString());
                  } catch {
                    return withPlayerTrackingParams(url);
                  }
                })()}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen={!hasWatchReq}
                title={lesson.title}
              />
              {hasWatchReq && (
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-transparent z-10 cursor-not-allowed" title="Watch the video to unlock seeking" />
              )}
            </div>
          );
        })()}

        {/* Video URL - check if it's an embed URL or a direct video file */}
        {lesson.content_type === "video" && lesson.content_url && !embedUrl && (
          (() => {
            const videoUrl = lesson.content_url!;
            const isEmbedUrl = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo.com') || videoUrl.includes('/embed/');
            if (isEmbedUrl) {
              const hasWatchReq = lesson.required_watch_percentage != null && lesson.required_watch_percentage > 0 && !hasMetWatchRequirement && !isLessonCompleted(lesson.id);
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
                  if (hasWatchReq) embedUrlObj.searchParams.set('disablekb', '1');
                  src = embedUrlObj.toString();
                } catch {
                  src = videoUrl;
                }
              }
              const trackedSrc = src ? withPlayerTrackingParams(src) : src;
              return (
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black relative">
                  <iframe
                    src={trackedSrc || src}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen={!hasWatchReq}
                    title={lesson.title}
                  />
                  <VideoQuizMarkers lessonId={lesson.id} videoDuration={videoDuration || (lesson.duration_minutes ? lesson.duration_minutes * 60 : 0)} />
                  {hasWatchReq && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-transparent z-10 cursor-not-allowed" title="Watch the video to unlock seeking" />
                  )}
                </div>
              );
            }
            const hasWatchReq = lesson.required_watch_percentage != null && lesson.required_watch_percentage > 0 && !hasMetWatchRequirement && !isLessonCompleted(lesson.id);
            return (
              <div className="relative">
                <video
                  controls
                  controlsList={hasWatchReq ? "nofullscreen nodownload noplaybackrate" : undefined}
                  className="w-full rounded-lg"
                  ref={(el) => {
                    videoRefCallback(el);
                    videoElementRef.current = el;
                  }}
                  onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                  onSeeking={hasWatchReq ? (e) => {
                    const video = e.currentTarget;
                    const maxAllowed = (maxWatchedRef.current / 100) * video.duration;
                    if (video.currentTime > maxAllowed + 2) {
                      video.currentTime = maxAllowed;
                    }
                  } : undefined}
                >
                  <source src={videoUrl} type={videoUrl.match(/\.webm$/i) ? 'video/webm' : videoUrl.match(/\.ogg$/i) ? 'video/ogg' : videoUrl.match(/\.mov$/i) ? 'video/quicktime' : 'video/mp4'} />
                  Your browser does not support the video tag.
                </video>
                <VideoQuizMarkers lessonId={lesson.id} videoDuration={videoDuration} />
              </div>
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

        {/* Description & Notetaker Tabs below media */}
        <Tabs defaultValue="description" className="mt-1">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="description" className="gap-2 flex-1">
              <FileText className="h-4 w-4" />
              Description
            </TabsTrigger>
            <TabsTrigger value="notetaker" className="gap-2 flex-1">
              <StickyNote className="h-4 w-4" />
              Notetaker
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-0 space-y-0">
            {lesson.description && (
              <p className="text-muted-foreground">{stripHtml(lesson.description)}</p>
            )}
            {lesson.content_text && (
              <PaginatedTextContent
                htmlContent={sanitizeYouTubeIframes(normalizeRichTextContent(lesson.content_text))}
                className="prose prose-sm max-w-none p-2 bg-muted/50 rounded-lg break-words overflow-wrap-anywhere [&>*:first-child]:mt-0 [&>*:first-child]:pt-0 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-3 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-medium [&>h3]:mb-2 [&>p]:mb-4 [&>p]:leading-relaxed [&>p]:break-words [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1 [&>li]:break-words [&>a]:text-primary [&>a]:underline [&>a]:break-all [&>pre]:bg-muted [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>pre]:whitespace-pre-wrap [&>pre]:break-words [&>code]:break-words [&>blockquote]:border-l-4 [&>blockquote]:border-primary/30 [&>blockquote]:pl-4 [&>blockquote]:italic [&_*]:max-w-full"
                onPageInfo={(current, total) => setTextPageInfo({ current, total })}
              />
            )}
            {!lesson.description && !lesson.content_text && (
              <p className="text-sm text-muted-foreground italic py-4">No description available for this lesson.</p>
            )}
          </TabsContent>

          <TabsContent value="notetaker" className="mt-1">
            {user ? (
              <StudentNotetaker
                userId={user.id}
                courseId={courseId!}
                lessonId={lesson.id}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic py-4">Sign in to take notes.</p>
            )}
          </TabsContent>
        </Tabs>

        {/* Video watch progress indicator */}
        {lesson.required_watch_percentage != null && lesson.required_watch_percentage > 0 && isVideoLesson && !isLessonCompleted(lesson.id) && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Watch progress: {watchedPercentage}% / {lesson.required_watch_percentage}% required
              </span>
              {hasMetWatchRequirement ? (
                <Badge variant="outline" className="text-primary border-primary">
                  <CheckCircle className="w-3 h-3 mr-1" /> Requirement met
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  <Lock className="w-3 h-3 mr-1" /> Keep watching
                </Badge>
              )}
            </div>
            <Progress value={Math.min(100, (watchedPercentage / lesson.required_watch_percentage) * 100)} className="h-2" />
          </div>
        )}

        {/* Mark Complete and Next Buttons */}
        <div className={`flex justify-between items-center gap-2 pt-2 ${isFullscreen ? "sticky bottom-0 bg-background border-t border-border px-4 py-3 mb-5 z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]" : ""}`}>
          <div>
            {hasPreviousContent() && (
              <Button variant="outline" onClick={goToPreviousContent}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          {lesson.content_text && textPageInfo.total > 1 && (
            <span className="text-sm font-medium text-muted-foreground">
              Page {textPageInfo.current} of {textPageInfo.total}
            </span>
          )}
          <div className="flex items-center gap-2">
          {isLessonCompleted(lesson.id) ? (
            <Badge className="bg-green-500">
              <CheckCircle className="w-4 h-4 mr-1" />
              Completed
            </Badge>
          ) : (
            <Button 
              onClick={() => markLessonComplete(lesson.id)}
              disabled={!hasMetWatchRequirement}
              title={!hasMetWatchRequirement ? `Watch at least ${lesson.required_watch_percentage}% of the video to continue` : undefined}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Complete
            </Button>
          )}
          {hasNextContent() && (
            <Button 
              variant="outline" 
              onClick={goToNextContent}
              disabled={!hasMetWatchRequirement && !isLessonCompleted(lesson.id)}
            >
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
      <div className="space-y-3 py-2">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <HelpCircle className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-2">{quiz.title}</h3>
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

        {/* Description & Notetaker Tabs */}
        <Tabs defaultValue="description" className="mt-1">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="description" className="gap-2 flex-1">
              <FileText className="h-4 w-4" />
              Description
            </TabsTrigger>
            <TabsTrigger value="notetaker" className="gap-2 flex-1">
              <StickyNote className="h-4 w-4" />
              Notetaker
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-0">
            {quiz.description ? (
              <p className="text-muted-foreground">{stripHtml(quiz.description)}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic py-4">No description available for this quiz.</p>
            )}
          </TabsContent>
          <TabsContent value="notetaker" className="mt-0">
            {user && courseId ? (
              <StudentNotetaker
                userId={user.id}
                courseId={courseId}
                lessonId={quiz.id}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic py-4">Sign in to take notes.</p>
            )}
          </TabsContent>
        </Tabs>

        <div className={`flex justify-between items-center gap-2 ${isFullscreen ? "sticky bottom-0 bg-background border-t border-border px-4 py-3 mb-5 z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]" : ""}`}>
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

        {/* Description & Notetaker Tabs */}
        <Tabs defaultValue="description" className="mt-1">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="description" className="gap-2 flex-1">
              <FileText className="h-4 w-4" />
              Description
            </TabsTrigger>
            <TabsTrigger value="notetaker" className="gap-2 flex-1">
              <StickyNote className="h-4 w-4" />
              Notetaker
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-0 space-y-0">
            {assignment.description && (
              <p className="text-muted-foreground">{stripHtml(assignment.description)}</p>
            )}
            {assignment.instructions && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Instructions</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <HighlightedHTML
                    html={sanitizeYouTubeIframes(normalizeRichTextContent(assignment.instructions))}
                    className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:first-child]:pt-0 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-3 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-medium [&>h3]:mb-2 [&>p]:mb-4 [&>p]:leading-relaxed [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1 [&>a]:text-primary [&>a]:underline [&>pre]:bg-muted [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto [&>blockquote]:border-l-4 [&>blockquote]:border-primary/30 [&>blockquote]:pl-4 [&>blockquote]:italic"
                  />
                </CardContent>
              </Card>
            )}
            {!assignment.description && !assignment.instructions && (
              <p className="text-sm text-muted-foreground italic py-4">No description available for this assignment.</p>
            )}
          </TabsContent>
          <TabsContent value="notetaker" className="mt-0">
            {user && courseId ? (
              <StudentNotetaker
                userId={user.id}
                courseId={courseId}
                lessonId={assignment.id}
              />
            ) : (
              <p className="text-sm text-muted-foreground italic py-4">Sign in to take notes.</p>
            )}
          </TabsContent>
        </Tabs>

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

        {/* Peer Review Section - shown after submission */}
        {submission && user && courseId && (
          <PeerReviewPanel
            assignmentId={assignment.id}
            courseId={courseId}
            maxScore={assignment.max_score}
            userId={user.id}
            onReviewsComplete={() => {
              const existing = peerReviewStatus[assignment.id];
              setPeerReviewStatus(prev => ({ ...prev, [assignment.id]: { assigned: existing?.assigned || 2, completed: existing?.assigned || 2 } }));
            }}
          />
        )}

        <div className={`flex justify-between items-center gap-2 ${isFullscreen ? "sticky bottom-0 bg-background border-t border-border px-4 py-3 mb-5 z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]" : ""}`}>
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
      if (unifiedContent.length === 0) {
        return (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No content yet</h3>
            <p className="text-muted-foreground mb-4">
              Course content is being prepared. Check back soon!
            </p>
            <Button variant="outline" onClick={() => setShowCourseOverview(true)}>
              Back to Course Overview
            </Button>
          </div>
        );
      }
      // Content exists but nothing selected yet — auto-select first item
      const first = unifiedContent[0];
      setActiveContent(first);
      return null;
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
      if (!submission) return false;
      // Check peer review status - only block if reviews are assigned
      const reviewInfo = peerReviewStatus[item.data.id];
      if (!reviewInfo) return true; // No reviews assigned yet → allow progression
      // If reviews are assigned, all must be completed
      return reviewInfo.completed >= reviewInfo.assigned;
    }
  };

  // Sequential locking + instructor-set locks
  // Instructors bypass all locks
  const isItemLocked = (item: ContentItem) => {
    if (isInstructor) return false;

    // The very first content item is always unlocked for enrolled students
    const currentIndex = unifiedContent.findIndex(
      (i) => i.type === item.type && i.data.id === item.data.id
    );
    if (currentIndex === 0) return false;

    // Check instructor-set lock on the lesson itself
    if (item.type === "lesson") {
      const lesson = item.data as LessonContent;
      if (lesson.is_locked) {
        // Check if scheduled unlock time has passed
        if (lesson.unlock_at && new Date(lesson.unlock_at) <= new Date()) {
          // Time has passed, not locked anymore
        } else {
          return true;
        }
      }
    }

    // Check instructor-set lock on the parent section/module
    if (item.data.section_id) {
      const section = sections.find(s => s.id === item.data.section_id);
      if (section) {
        // Check the unit itself
        if (section.is_locked) {
          if (section.unlock_at && new Date(section.unlock_at) <= new Date()) {
            // Scheduled unlock passed
          } else {
            return true;
          }
        }
        // Check the parent module
        if (section.parent_id) {
          const parentModule = sections.find(s => s.id === section.parent_id);
          if (parentModule?.is_locked) {
            if (parentModule.unlock_at && new Date(parentModule.unlock_at) <= new Date()) {
              // Scheduled unlock passed
            } else {
              return true;
            }
          }
        }
      }
    }

    // Sequential lock: item is locked if the previous item is not completed
    if (currentIndex <= 0) return false;
    const previousItem = unifiedContent[currentIndex - 1];
    return !getItemStatus(previousItem);
  };

  // Handle content selection with lock check
  const handleSelectContent = (item: ContentItem) => {
    if (isItemLocked(item)) {
      // Check if locked by schedule
      const section = item.data.section_id ? sections.find(s => s.id === item.data.section_id) : null;
      const parentModule = section?.parent_id ? sections.find(s => s.id === section.parent_id) : null;
      const lessonUnlock = item.type === "lesson" && (item.data as LessonContent).unlock_at;
      const sectionUnlock = section?.unlock_at;
      const moduleUnlock = parentModule?.unlock_at;
      const unlockTime = lessonUnlock || sectionUnlock || moduleUnlock;
      
      if (unlockTime && new Date(unlockTime) > new Date()) {
        toast({
          title: "Content Scheduled",
          description: `This content will be available on ${new Date(unlockTime).toLocaleDateString()} at ${new Date(unlockTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Content Locked",
          description: "Complete the previous item first to unlock this content.",
          variant: "destructive",
        });
      }
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
                        {coInstructors.length > 0 && (
                          <> &amp; {coInstructors.map(c => c.full_name).join(", ")}</>
                        )}
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
                {isEnrolled && courseId && (
                  <div className="mt-2">
                    <CourseDownloadButton courseId={courseId} courseTitle={course.title} variant="compact" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isSubscriptionExpired && (
          <div className="max-w-6xl mx-auto mb-6">
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-destructive">Subscription Expired</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your subscription expired on {subscriptionExpiresAt ? new Date(subscriptionExpiresAt).toLocaleDateString() : "N/A"}. 
                      Renew to continue accessing course content. Your progress has been saved.
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate(`/apply?courseId=${courseId}`)}
                    className="shrink-0"
                  >
                    Renew Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {(!isEnrolled || showCourseOverview) ? (
          /* Course Overview View */
          <div className="max-w-6xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Course Overview</CardTitle>
                <CardDescription>{stripHtml(course.description)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{sections.filter(s => !s.parent_id).length || "—"}</p>
                    <p className="text-sm text-muted-foreground">Modules</p>
                  </div>
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
                    <div className="space-y-4">
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
                      {coInstructors.map((co, idx) => (
                        <div key={idx} className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={co.avatar_url || undefined} />
                            <AvatarFallback>
                              {(co.full_name || "C").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-0.5">Co-Instructor</p>
                            <p className="font-semibold">{co.full_name}</p>
                            {co.bio && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                                {co.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
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
                                            } else if (!isEnrolled) {
                                              toast({
                                                title: "Enroll to Access",
                                                description: "This lesson is only available to enrolled students. Enroll now to unlock all content.",
                                              });
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
                                  ) : isEnrolled ? (
                                    <Button onClick={() => { setActiveContent(null); setShowCourseOverview(false); }} size="lg" className="w-full">
                                      <Play className="w-4 h-4 mr-2" />
                                      Continue Where You Left
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
              <div ref={contentAreaRef} className={isFullscreen ? "bg-background" : ""}>
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
                  {/* Fullscreen toggle */}
                  <div className="flex justify-end mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? "Exit full screen" : "Full screen"}
                      className="gap-1.5"
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                      {isFullscreen ? "Exit Full Screen" : "Full Screen"}
                    </Button>
                  </div>
                  {/* Main Content Area - Full Width */}
                  <Card>
                    <CardContent className="p-6">{renderActiveContent()}</CardContent>
                  </Card>
                </div>
              ) : (
                <>
                  {/* Fullscreen toggle */}
                  <div className="flex justify-end mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? "Exit full screen" : "Full screen"}
                      className="gap-1.5"
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                      {isFullscreen ? "Exit Full Screen" : "Full Screen"}
                    </Button>
                  </div>
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
                </>
              )}
              </div>
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
          maxAttempts={selectedQuiz.max_attempts}
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
          rubrics={selectedAssignment.rubrics}
          maxScore={selectedAssignment.max_score}
          dueDate={selectedAssignment.due_date}
          maxSubmissions={selectedAssignment.max_submissions}
          aiGradingEnabled={selectedAssignment.ai_grading_enabled}
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
