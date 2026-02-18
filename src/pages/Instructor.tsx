import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import InstructorSidebar from "@/components/InstructorSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, BookOpen, Users, DollarSign, Plus, Pencil, Trash2, FileText, Video, Image, Youtube, FileQuestion, ClipboardList, Eye, ClipboardCheck, CalendarIcon, X, MoreVertical, Ban, UserX, UserCheck, GraduationCap, CheckCircle, Clock, TrendingUp, Users2, Download } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/FileUpload";
import { QuizQuestionManager } from "@/components/QuizQuestionManager";
import { CourseSectionManager } from "@/components/CourseSectionManager";
import { RichTextEditor } from "@/components/RichTextEditor";
import { InstructorGradingDashboard } from "@/components/InstructorGradingDashboard";
import { StudentProgressDashboard } from "@/components/StudentProgressDashboard";
import CouponManagement from "@/components/CouponManagement";
import InstructorPayoutSettings from "@/components/InstructorPayoutSettings";
import InstructorWithdrawal from "@/components/InstructorWithdrawal";
import { CourseInstructorManager } from "@/components/CourseInstructorManager";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDualCurrency } from "@/lib/currency";

interface Course {
  id: string;
  title: string;
  description: string | null;
  school: string;
  duration: string | null;
  price: number;
  image_url: string | null;
  instructor_id: string | null;
  approval_status: string;
}

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  amount_paid: number | null;
  payment_status: string | null;
  enrolled_at: string | null;
  courses?: { title: string };
  profiles?: { full_name: string | null; email: string | null; phone: string | null };
}

interface Earning {
  id: string;
  course_id: string;
  amount: number;
  platform_fee: number;
  instructor_share: number;
  amount_usd: number;
  platform_fee_usd: number;
  instructor_share_usd: number;
  payment_currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  courses?: { title: string };
}

interface LessonContent {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string | null;
  content_text: string | null;
  order_index: number;
  duration_minutes: number | null;
  is_free_preview: boolean;
}

interface Quiz {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  order_index: number;
}

interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  max_score: number;
  due_date: string | null;
  order_index: number;
}

const schools = [
  "Data Engineering",
  "Product Design",
  "Data & Analytics",
  "Business Studies",
  "Creative Economy",
  "Business Computing",
];

const contentTypes = [
  { value: "text", label: "Text/Notes", icon: FileText },
  { value: "note", label: "Note", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "youtube", label: "YouTube", icon: Youtube },
  { value: "vimeo", label: "Vimeo", icon: Video },
  { value: "pdf", label: "PDF Document", icon: FileText },
  { value: "image", label: "Image/Photo", icon: Image },
  { value: "quiz", label: "Quiz", icon: FileQuestion },
  { value: "assignment", label: "Assignment", icon: ClipboardList },
];

const Instructor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isInstructor, setIsInstructor] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("courses");

  // Data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<LessonContent[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sections, setSections] = useState<{ id: string; course_id: string; title: string; description: string | null; order_index: number; parent_id: string | null; section_level: number | null }[]>([]);

  // Dialog states
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonContent | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [managingQuizQuestions, setManagingQuizQuestions] = useState<Quiz | null>(null);


  // Form states
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    school: "",
    category: "",
    duration: "",
    price: 0,
    monthly_price: 0,
    learning_outcomes: "",
    image_url: "",
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    content_type: "text",
    content_url: "",
    content_text: "",
    order_index: 0,
    duration_minutes: 0,
    is_free_preview: false,
    section_id: "" as string | null,
    // Quiz-specific fields
    passing_score: 70,
    // Assignment-specific fields
    instructions: "",
    max_score: 100,
    due_date: "",
  });

  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    passing_score: 70,
    order_index: 0,
  });

  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    instructions: "",
    max_score: 100,
    due_date: "",
    order_index: 0,
  });

  // Pagination states for enrollments
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const enrollmentsPerPage = 10;
  
  // Filter states for enrollments
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [enrollmentCourseFilter, setEnrollmentCourseFilter] = useState<string>("all");
  const [enrollmentDateFrom, setEnrollmentDateFrom] = useState<Date | undefined>(undefined);
  const [enrollmentDateTo, setEnrollmentDateTo] = useState<Date | undefined>(undefined);

  // Student action states
  const [studentActionDialogOpen, setStudentActionDialogOpen] = useState(false);
  const [studentActionType, setStudentActionType] = useState<"suspend" | "remove" | "reactivate" | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Enrollment | null>(null);
  const [processingStudentAction, setProcessingStudentAction] = useState(false);

  useEffect(() => {
    checkInstructorAccess();
  }, []);

  const checkInstructorAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Access Denied",
          description: "Please log in to continue",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      setCurrentUserId(session.user.id);

      // Check if user has moderator (instructor) role
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "moderator"]);

      if (error) throw error;

      if (!roles || roles.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have instructor privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsInstructor(true);
      fetchData(session.user.id);
    } catch (error) {
      console.error("Error checking instructor access:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (userId: string) => {
    try {
      // Fetch instructor's courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("instructor_id", userId)
        .order("created_at", { ascending: false });

      if (coursesData) setCourses(coursesData);

      // Fetch enrollments for instructor's courses
      if (coursesData && coursesData.length > 0) {
        const courseIds = coursesData.map((c) => c.id);
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from("enrollments")
          .select(`
            *,
            courses (title)
          `)
          .in("course_id", courseIds)
          .in("payment_status", ["completed", "suspended", "pending"])
          .order("enrolled_at", { ascending: false });

        if (enrollmentsError) {
          console.error("Error fetching enrollments:", enrollmentsError);
        }

        if (enrollmentsData) {
          const studentIds = Array.from(
            new Set((enrollmentsData as any[]).map((e) => e.user_id).filter(Boolean))
          ) as string[];

          let profileById = new Map<string, any>();
          if (studentIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from("profiles")
              .select("id, full_name, email, phone")
              .in("id", studentIds);

            if (profilesError) {
              console.error("Error fetching student profiles:", profilesError);
            }

            profileById = new Map((profilesData ?? []).map((p: any) => [p.id, p]));
          }

          const hydratedEnrollments = (enrollmentsData as any[]).map((e) => ({
            ...e,
            profiles: profileById.get(e.user_id) ?? null,
          }));

          setEnrollments(hydratedEnrollments as unknown as Enrollment[]);
        }
      }

      // Fetch earnings
      const { data: earningsData } = await supabase
        .from("instructor_earnings")
        .select(`
          *,
          courses (title)
        `)
        .eq("instructor_id", userId)
        .order("created_at", { ascending: false });

      if (earningsData) setEarnings(earningsData as unknown as Earning[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchCourseContent = async (courseId: string) => {
    try {
      const [lessonsRes, quizzesRes, assignmentsRes, sectionsRes] = await Promise.all([
        supabase.from("lesson_content").select("*").eq("course_id", courseId).order("order_index"),
        supabase.from("quizzes").select("*").eq("course_id", courseId).order("order_index"),
        supabase.from("assignments").select("*").eq("course_id", courseId).order("order_index"),
        supabase.from("course_sections").select("*").eq("course_id", courseId).order("order_index"),
      ]);

      if (lessonsRes.data) setLessons(lessonsRes.data);
      if (quizzesRes.data) setQuizzes(quizzesRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
    } catch (error) {
      console.error("Error fetching course content:", error);
    }
  };

  const handleStudentAction = async () => {
    if (!selectedStudent || !studentActionType) return;
    
    setProcessingStudentAction(true);
    try {
      // Get course name for the notification
      const course = courses.find(c => c.id === selectedStudent.course_id);
      const courseName = course?.title || "your course";
      const studentEmail = selectedStudent.profiles?.email;
      const studentName = selectedStudent.profiles?.full_name || "Student";
      
      // Get instructor name
      const { data: instructorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", currentUserId)
        .single();
      const instructorName = instructorProfile?.full_name || "Your Instructor";

      if (studentActionType === "remove") {
        // Remove the enrollment
        const { error } = await supabase
          .from("enrollments")
          .delete()
          .eq("id", selectedStudent.id);
        
        if (error) throw error;

        // Immediately remove from local state
        setEnrollments(prev => prev.filter(e => e.id !== selectedStudent.id));

        toast({
          title: "Student removed",
          description: `${selectedStudent.profiles?.full_name || selectedStudent.profiles?.email} has been removed from the course`,
        });
      } else if (studentActionType === "suspend") {
        // Update payment status to 'suspended' to effectively suspend access
        const { error } = await supabase
          .from("enrollments")
          .update({ payment_status: "suspended" })
          .eq("id", selectedStudent.id);
        
        if (error) throw error;

        // Immediately update local state
        setEnrollments(prev => prev.map(e => e.id === selectedStudent.id ? { ...e, payment_status: "suspended" } : e));

        toast({
          title: "Student suspended",
          description: `${selectedStudent.profiles?.full_name || selectedStudent.profiles?.email} has been suspended from the course`,
        });
      } else if (studentActionType === "reactivate") {
        // Update payment status back to 'completed' to reactivate access
        const { error } = await supabase
          .from("enrollments")
          .update({ payment_status: "completed" })
          .eq("id", selectedStudent.id);
        
        if (error) throw error;

        // Immediately update local state
        setEnrollments(prev => prev.map(e => e.id === selectedStudent.id ? { ...e, payment_status: "completed" } : e));

        toast({
          title: "Student reactivated",
          description: `${selectedStudent.profiles?.full_name || selectedStudent.profiles?.email} has been reactivated for the course`,
        });
      }

      // Send email notification to the student
      if (studentEmail) {
        try {
          await supabase.functions.invoke("send-notification", {
            body: {
              type: "enrollment_status",
              enrollment_status: {
                user_email: studentEmail,
                user_name: studentName,
                course_name: courseName,
                instructor_name: instructorName,
                action: studentActionType,
              },
            },
          });
          console.log(`Email notification sent to ${studentEmail} for ${studentActionType} action`);
        } catch (notificationError) {
          console.error("Failed to send email notification:", notificationError);
          // Don't throw - the main action succeeded, notification is secondary
        }
      }
      
      setStudentActionDialogOpen(false);
      setSelectedStudent(null);
      setStudentActionType(null);
      if (currentUserId) fetchData(currentUserId);
    } catch (error) {
      console.error("Error performing student action:", error);
      toast({
        title: "Error",
        description: `Failed to ${studentActionType} student`,
        variant: "destructive",
      });
    } finally {
      setProcessingStudentAction(false);
    }
  };

  const openStudentActionDialog = (enrollment: Enrollment, action: "suspend" | "remove" | "reactivate") => {
    setSelectedStudent(enrollment);
    setStudentActionType(action);
    setStudentActionDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    try {
      const learningOutcomesArray = courseForm.learning_outcomes
        ? courseForm.learning_outcomes.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      if (editingCourse) {
        const { error } = await supabase
          .from("courses")
          .update({
            title: courseForm.title,
            description: courseForm.description || null,
            school: courseForm.school,
            category: courseForm.category || null,
            duration: courseForm.duration || null,
            price: courseForm.price,
            monthly_price: courseForm.monthly_price,
            learning_outcomes: learningOutcomesArray,
            image_url: courseForm.image_url || null,
          })
          .eq("id", editingCourse.id);

        if (error) throw error;
        toast({ title: "Course updated successfully" });
      } else {
        const { error } = await supabase
          .from("courses")
          .insert({
            title: courseForm.title,
            description: courseForm.description || null,
            school: courseForm.school,
            category: courseForm.category || null,
            duration: courseForm.duration || null,
            price: courseForm.price,
            monthly_price: courseForm.monthly_price,
            learning_outcomes: learningOutcomesArray,
            image_url: courseForm.image_url || null,
            instructor_id: currentUserId,
            approval_status: "approved",
            publish_status: "draft",
          });

        if (error) throw error;
        toast({ 
          title: "Course created",
          description: "Your course is saved as a draft. Click Publish when you're ready.",
        });
      }

      setCourseDialogOpen(false);
      setEditingCourse(null);
      setCourseForm({ title: "", description: "", school: "", category: "", duration: "", price: 0, monthly_price: 0, learning_outcomes: "", image_url: "" });
      fetchData(currentUserId!);
    } catch (error) {
      console.error("Error saving course:", error);
      toast({
        title: "Error",
        description: "Failed to save course",
        variant: "destructive",
      });
    }
  };

  const handlePublishCourse = async (course: any) => {
    const nextStatus = course.publish_status === "draft" ? "live" : "draft";
    try {
      const { error } = await supabase
        .from("courses")
        .update({ publish_status: nextStatus })
        .eq("id", course.id);
      if (error) throw error;
      toast({ title: nextStatus === "live" ? "Course published!" : "Course unpublished", description: nextStatus === "live" ? "Students can now see and enroll in your course." : "Course is now a draft and hidden from students." });
      fetchData(currentUserId!);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update course status", variant: "destructive" });
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course? All content will be removed.")) return;

    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Course deleted successfully" });
      setSelectedCourse(null);
      fetchData(currentUserId!);
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive",
      });
    }
  };

  // Unified content management (lessons, quizzes, assignments)
  const handleSaveLesson = async () => {
    if (!selectedCourse) return;

    try {
      if (lessonForm.content_type === "quiz") {
        // Save as quiz
        const quizData = {
          course_id: selectedCourse.id,
          title: lessonForm.title,
          description: lessonForm.description || null,
          passing_score: lessonForm.passing_score,
          order_index: lessonForm.order_index,
          section_id: lessonForm.section_id || null,
        };

        if (editingQuiz) {
          const { error } = await supabase.from("quizzes").update(quizData).eq("id", editingQuiz.id);
          if (error) throw error;
          toast({ title: "Quiz updated successfully" });
        } else {
          const { error } = await supabase.from("quizzes").insert(quizData);
          if (error) throw error;
          toast({ title: "Quiz created successfully" });
        }
      } else if (lessonForm.content_type === "assignment") {
        // Save as assignment
        const assignmentData = {
          course_id: selectedCourse.id,
          title: lessonForm.title,
          description: lessonForm.description || null,
          instructions: lessonForm.instructions || null,
          max_score: lessonForm.max_score,
          due_date: lessonForm.due_date || null,
          order_index: lessonForm.order_index,
          section_id: lessonForm.section_id || null,
        };

        if (editingAssignment) {
          const { error } = await supabase.from("assignments").update(assignmentData).eq("id", editingAssignment.id);
          if (error) throw error;
          toast({ title: "Assignment updated successfully" });
        } else {
          const { error } = await supabase.from("assignments").insert(assignmentData);
          if (error) throw error;
          toast({ title: "Assignment created successfully" });
        }
      } else {
        // Save as lesson content
        const lessonData = {
          course_id: selectedCourse.id,
          title: lessonForm.title,
          description: lessonForm.description || null,
          content_type: lessonForm.content_type,
          content_url: lessonForm.content_url || null,
          content_text: lessonForm.content_text || null,
          order_index: lessonForm.order_index,
          duration_minutes: lessonForm.duration_minutes || null,
          is_free_preview: lessonForm.is_free_preview,
          section_id: lessonForm.section_id || null,
        };

        if (editingLesson) {
          const { error } = await supabase
            .from("lesson_content")
            .update(lessonData)
            .eq("id", editingLesson.id);
          if (error) throw error;
          toast({ title: "Content updated successfully" });
        } else {
          const { error } = await supabase.from("lesson_content").insert(lessonData);
          if (error) throw error;
          toast({ title: "Content created successfully" });
        }
      }

      setLessonDialogOpen(false);
      setEditingLesson(null);
      setEditingQuiz(null);
      setEditingAssignment(null);
      resetLessonForm();
      fetchCourseContent(selectedCourse.id);
    } catch (error) {
      console.error("Error saving content:", error);
      toast({ title: "Error", description: "Failed to save content", variant: "destructive" });
    }
  };

  const resetLessonForm = () => {
    const totalContent = lessons.length + quizzes.length + assignments.length;
    setLessonForm({ 
      title: "", 
      description: "", 
      content_type: "text", 
      content_url: "", 
      content_text: "", 
      order_index: totalContent, 
      duration_minutes: 0, 
      is_free_preview: false,
      section_id: null,
      passing_score: 70,
      instructions: "",
      max_score: 100,
      due_date: "",
    });
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    try {
      const { error } = await supabase.from("lesson_content").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Lesson deleted" });
      fetchCourseContent(selectedCourse!.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete lesson", variant: "destructive" });
    }
  };

  const handleSaveQuiz = async () => {
    if (!selectedCourse) return;

    try {
      const quizData = {
        course_id: selectedCourse.id,
        title: quizForm.title,
        description: quizForm.description || null,
        passing_score: quizForm.passing_score,
        order_index: quizForm.order_index,
      };

      if (editingQuiz) {
        const { error } = await supabase.from("quizzes").update(quizData).eq("id", editingQuiz.id);
        if (error) throw error;
        toast({ title: "Quiz updated successfully" });
      } else {
        const { error } = await supabase.from("quizzes").insert(quizData);
        if (error) throw error;
        toast({ title: "Quiz created successfully" });
      }

      setQuizDialogOpen(false);
      setEditingQuiz(null);
      setQuizForm({ title: "", description: "", passing_score: 70, order_index: quizzes.length });
      fetchCourseContent(selectedCourse.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save quiz", variant: "destructive" });
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!confirm("Delete this quiz and all its questions?")) return;
    try {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Quiz deleted" });
      fetchCourseContent(selectedCourse!.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete quiz", variant: "destructive" });
    }
  };

  const handleSaveAssignment = async () => {
    if (!selectedCourse) return;

    try {
      const assignmentData = {
        course_id: selectedCourse.id,
        title: assignmentForm.title,
        description: assignmentForm.description || null,
        instructions: assignmentForm.instructions || null,
        max_score: assignmentForm.max_score,
        due_date: assignmentForm.due_date || null,
        order_index: assignmentForm.order_index,
      };

      if (editingAssignment) {
        const { error } = await supabase.from("assignments").update(assignmentData).eq("id", editingAssignment.id);
        if (error) throw error;
        toast({ title: "Assignment updated successfully" });
      } else {
        const { error } = await supabase.from("assignments").insert(assignmentData);
        if (error) throw error;
        toast({ title: "Assignment created successfully" });
      }

      setAssignmentDialogOpen(false);
      setEditingAssignment(null);
      setAssignmentForm({ title: "", description: "", instructions: "", max_score: 100, due_date: "", order_index: assignments.length });
      fetchCourseContent(selectedCourse.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save assignment", variant: "destructive" });
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    try {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Assignment deleted" });
      fetchCourseContent(selectedCourse!.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete assignment", variant: "destructive" });
    }
  };

  const handleReorderContent = async (items: { id: string; type: "lesson" | "quiz" | "assignment"; newIndex: number }[]) => {
    try {
      const lessonUpdates = items.filter(item => item.type === "lesson");
      const quizUpdates = items.filter(item => item.type === "quiz");
      const assignmentUpdates = items.filter(item => item.type === "assignment");

      // Update lessons
      for (const item of lessonUpdates) {
        await supabase
          .from("lesson_content")
          .update({ order_index: item.newIndex })
          .eq("id", item.id);
      }

      // Update quizzes
      for (const item of quizUpdates) {
        await supabase
          .from("quizzes")
          .update({ order_index: item.newIndex })
          .eq("id", item.id);
      }

      // Update assignments
      for (const item of assignmentUpdates) {
        await supabase
          .from("assignments")
          .update({ order_index: item.newIndex })
          .eq("id", item.id);
      }

      toast({ title: "Content reordered successfully" });
      if (selectedCourse) fetchCourseContent(selectedCourse.id);
    } catch (error) {
      console.error("Error reordering content:", error);
      toast({ title: "Error", description: "Failed to reorder content", variant: "destructive" });
    }
  };

  // Separate earnings by currency - USD earnings
  const usdEarnings = earnings.filter(e => e.payment_currency === "USD" || !e.payment_currency);
  const rwfEarnings = earnings.filter(e => e.payment_currency === "RWF");
  
  const totalUsdEarnings = usdEarnings.reduce((sum, e) => sum + Number(e.instructor_share_usd || e.instructor_share || 0), 0);
  const pendingUsdEarnings = usdEarnings.filter(e => e.status === "pending").reduce((sum, e) => sum + Number(e.instructor_share_usd || e.instructor_share || 0), 0);
  const paidUsdEarnings = usdEarnings.filter(e => e.status === "paid").reduce((sum, e) => sum + Number(e.instructor_share_usd || e.instructor_share || 0), 0);
  
  // RWF earnings - keep in RWF without conversion
  const totalRwfEarnings = rwfEarnings.reduce((sum, e) => sum + Number(e.instructor_share || 0), 0);
  const pendingRwfEarnings = rwfEarnings.filter(e => e.status === "pending").reduce((sum, e) => sum + Number(e.instructor_share || 0), 0);
  const paidRwfEarnings = rwfEarnings.filter(e => e.status === "paid").reduce((sum, e) => sum + Number(e.instructor_share || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isInstructor) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <InstructorSidebar activeView={activeView} setActiveView={setActiveView} />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Instructor Dashboard</h1>
            </div>
          </header>
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Stats Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{courses.length}</p>
                        <p className="text-sm text-muted-foreground">My Courses</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-blue-500/10">
                        <GraduationCap className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{enrollments.length}</p>
                        <p className="text-sm text-muted-foreground">Total Students</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 dark:border-green-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-green-500/10">
                        <DollarSign className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">${totalUsdEarnings.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">USD Earnings (60%)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-blue-500/10">
                        <DollarSign className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">RWF {totalRwfEarnings.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">RWF Earnings (60%)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Tabs - controlled by sidebar */}
              <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">My Courses</h2>
                <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingCourse(null);
                      setCourseForm({ title: "", description: "", school: "", category: "", duration: "", price: 0, monthly_price: 0, learning_outcomes: "", image_url: "" });
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingCourse ? "Edit Course" : "Create New Course"}</DialogTitle>
                      <DialogDescription>
                        {editingCourse ? "Update your course details." : "Fill in the details to create a new course."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={courseForm.title}
                          onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                          placeholder="Course title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>School</Label>
                        <Select
                          value={courseForm.school}
                          onValueChange={(value) => setCourseForm({ ...courseForm, school: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select school" />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map((school) => (
                              <SelectItem key={school} value={school}>
                                {school}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={courseForm.category}
                          onValueChange={(value) => setCourseForm({ ...courseForm, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Short-Course">Short-Course</SelectItem>
                            <SelectItem value="Professional">Professional</SelectItem>
                            <SelectItem value="Masterclass">Masterclass</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={courseForm.description}
                          onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                          placeholder="Course description"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Duration</Label>
                          <Input
                            value={courseForm.duration}
                            onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                            placeholder="e.g., 12 weeks"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Monthly Price ($)</Label>
                          <Input
                            type="number"
                            value={courseForm.monthly_price}
                            onChange={(e) => setCourseForm({ ...courseForm, monthly_price: Number(e.target.value) })}
                            placeholder="e.g., 20"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Learning Outcomes (comma-separated)</Label>
                        <Input
                          value={courseForm.learning_outcomes}
                          onChange={(e) => setCourseForm({ ...courseForm, learning_outcomes: e.target.value })}
                          placeholder="e.g., React, TypeScript, Web Performance"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Image URL</Label>
                        <Input
                          value={courseForm.image_url}
                          onChange={(e) => setCourseForm({ ...courseForm, image_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <Button onClick={handleSaveCourse} className="w-full">
                        {editingCourse ? "Update Course" : "Create Course"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {courses.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first course to start teaching</p>
                    <Button onClick={() => setCourseDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Course
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course) => (
                    <Card key={course.id} className={`cursor-pointer transition-all ${selectedCourse?.id === course.id ? "ring-2 ring-primary" : ""}`}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{course.title}</CardTitle>
                            <CardDescription>{course.school}</CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant="secondary">${(course as any).monthly_price ?? course.price}/mo</Badge>
                            {(course as any).publish_status === "draft" && (
                              <Badge variant="outline" className="text-muted-foreground border-muted-foreground">
                                Draft
                              </Badge>
                            )}
                            {(course as any).publish_status === "upcoming" && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                                Upcoming
                              </Badge>
                            )}
                            {(course as any).publish_status === "live" && (
                              <Badge variant="default" className="bg-green-600">Live</Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={(course as any).publish_status === "live" ? "outline" : "default"}
                            className={(course as any).publish_status !== "live" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                            onClick={() => handlePublishCourse(course)}
                          >
                            {(course as any).publish_status === "live" ? "Unpublish" : "Publish"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCourse(course);
                              fetchCourseContent(course.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Manage Content
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Users2 className="h-4 w-4 mr-1" />
                                Instructors
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Manage Course Instructors</DialogTitle>
                                <DialogDescription>
                                  Add co-instructors or transfer course ownership
                                </DialogDescription>
                              </DialogHeader>
                              {currentUserId && (
                                <CourseInstructorManager
                                  courseId={course.id}
                                  courseName={course.title}
                                  currentInstructorId={currentUserId}
                                  onUpdate={() => fetchData(currentUserId)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCourse(course);
                              setCourseForm({
                                title: course.title,
                                description: course.description || "",
                                school: course.school,
                                category: (course as any).category || "",
                                duration: course.duration || "",
                                price: course.price,
                                monthly_price: (course as any).monthly_price || 0,
                                learning_outcomes: ((course as any).learning_outcomes || []).join(", "),
                                image_url: course.image_url || "",
                              });
                              setCourseDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Course Content Management */}
              {selectedCourse && (
                <Card className="mt-6">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Manage: {selectedCourse.title}</CardTitle>
                        <CardDescription>Add lessons, quizzes, and assignments to your course</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCourse(null)}>
                        Close
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <CourseSectionManager
                        courseId={selectedCourse.id}
                        courseName={selectedCourse.title}
                        sections={sections}
                        onSectionsChange={() => fetchCourseContent(selectedCourse.id)}
                        onContentGenerated={() => fetchCourseContent(selectedCourse.id)}
                      />
                    </div>


                    {/* Quiz Question Manager Modal */}
                    {managingQuizQuestions && (
                      <Dialog open={!!managingQuizQuestions} onOpenChange={(open) => !open && setManagingQuizQuestions(null)}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <QuizQuestionManager
                            quizId={managingQuizQuestions.id}
                            quizTitle={managingQuizQuestions.title}
                            passingScore={managingQuizQuestions.passing_score}
                            quizDescription={managingQuizQuestions.description}
                            onClose={() => setManagingQuizQuestions(null)}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Grading Tab */}
            <TabsContent value="grading" className="space-y-4">
              <h2 className="text-2xl font-semibold">Grade Submissions</h2>
              {currentUserId && (
                <InstructorGradingDashboard
                  instructorId={currentUserId}
                  courses={courses}
                />
              )}
            </TabsContent>

            {/* Students Progress Tab */}
            <TabsContent value="progress" className="space-y-4">
              <h2 className="text-2xl font-semibold">Students Progress</h2>
              {currentUserId && (
                <StudentProgressDashboard
                  instructorId={currentUserId}
                  courses={courses}
                />
              )}
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">My Students</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {
                      const cols = [
                        { header: "Student", accessor: (r: Enrollment) => r.profiles?.full_name || "-" },
                        { header: "Email", accessor: (r: Enrollment) => r.profiles?.email || "-" },
                        { header: "Phone", accessor: (r: Enrollment) => r.profiles?.phone || "-" },
                        { header: "Course", accessor: (r: Enrollment) => r.courses?.title || "-" },
                        { header: "Status", accessor: (r: Enrollment) => r.payment_status || "-" },
                        { header: "Enrolled", accessor: (r: Enrollment) => r.enrolled_at ? new Date(r.enrolled_at).toLocaleDateString() : "-" },
                      ];
                      exportToExcel(enrollments, cols, "my-students");
                    }}>
                      Export as Excel (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const cols = [
                        { header: "Student", accessor: (r: Enrollment) => r.profiles?.full_name || "-" },
                        { header: "Email", accessor: (r: Enrollment) => r.profiles?.email || "-" },
                        { header: "Phone", accessor: (r: Enrollment) => r.profiles?.phone || "-" },
                        { header: "Course", accessor: (r: Enrollment) => r.courses?.title || "-" },
                        { header: "Status", accessor: (r: Enrollment) => r.payment_status || "-" },
                        { header: "Enrolled", accessor: (r: Enrollment) => r.enrolled_at ? new Date(r.enrolled_at).toLocaleDateString() : "-" },
                      ];
                      exportToPDF(enrollments, cols, "my-students", "My Students");
                    }}>
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by student name or email..."
                      value={enrollmentSearch}
                      onChange={(e) => {
                        setEnrollmentSearch(e.target.value);
                        setEnrollmentPage(1);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={enrollmentCourseFilter}
                      onValueChange={(value) => {
                        setEnrollmentCourseFilter(value);
                        setEnrollmentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
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
                </div>
                
                {/* Date Range Filter */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Date range:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[150px] justify-start text-left font-normal",
                          !enrollmentDateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {enrollmentDateFrom ? format(enrollmentDateFrom, "PP") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={enrollmentDateFrom}
                        onSelect={(date) => {
                          setEnrollmentDateFrom(date);
                          setEnrollmentPage(1);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-sm text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[150px] justify-start text-left font-normal",
                          !enrollmentDateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {enrollmentDateTo ? format(enrollmentDateTo, "PP") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={enrollmentDateTo}
                        onSelect={(date) => {
                          setEnrollmentDateTo(date);
                          setEnrollmentPage(1);
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {(enrollmentDateFrom || enrollmentDateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEnrollmentDateFrom(undefined);
                        setEnrollmentDateTo(undefined);
                        setEnrollmentPage(1);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear dates
                    </Button>
                  )}
                </div>
              </div>

              {(() => {
                // Filter out removed users - they should not appear in the list
                // but their enrollment data is preserved for potential reactivation
                const activeEnrollments = enrollments.filter(
                  (enrollment) => enrollment.payment_status !== "removed"
                );
                
                const filteredEnrollments = activeEnrollments.filter((enrollment) => {
                  const searchLower = enrollmentSearch.toLowerCase();
                  const matchesSearch = !enrollmentSearch || 
                    (enrollment.profiles?.full_name?.toLowerCase().includes(searchLower)) ||
                    (enrollment.profiles?.email?.toLowerCase().includes(searchLower));
                  
                  const matchesCourse = enrollmentCourseFilter === "all" || 
                    enrollment.course_id === enrollmentCourseFilter;
                  
                  // Date range filtering
                  let matchesDateRange = true;
                  if (enrollment.enrolled_at) {
                    const enrolledDate = new Date(enrollment.enrolled_at);
                    if (enrollmentDateFrom) {
                      const fromDate = new Date(enrollmentDateFrom);
                      fromDate.setHours(0, 0, 0, 0);
                      matchesDateRange = matchesDateRange && enrolledDate >= fromDate;
                    }
                    if (enrollmentDateTo) {
                      const toDate = new Date(enrollmentDateTo);
                      toDate.setHours(23, 59, 59, 999);
                      matchesDateRange = matchesDateRange && enrolledDate <= toDate;
                    }
                  } else if (enrollmentDateFrom || enrollmentDateTo) {
                    matchesDateRange = false;
                  }
                  
                  return matchesSearch && matchesCourse && matchesDateRange;
                });

                const totalPages = Math.ceil(filteredEnrollments.length / enrollmentsPerPage);
                const paginatedEnrollments = filteredEnrollments.slice(
                  (enrollmentPage - 1) * enrollmentsPerPage,
                  enrollmentPage * enrollmentsPerPage
                );

                return (
                  <>
                    <div className="flex justify-end">
                      <p className="text-sm text-muted-foreground">
                        Showing {filteredEnrollments.length === 0 ? 0 : Math.min((enrollmentPage - 1) * enrollmentsPerPage + 1, filteredEnrollments.length)} - {Math.min(enrollmentPage * enrollmentsPerPage, filteredEnrollments.length)} of {filteredEnrollments.length}
                        {filteredEnrollments.length !== enrollments.length && ` (filtered from ${enrollments.length})`}
                      </p>
                    </div>
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Enrolled</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedEnrollments.map((enrollment) => (
                            <TableRow key={enrollment.id}>
                              <TableCell className="font-medium">
                                {enrollment.profiles?.full_name || "-"}
                              </TableCell>
                              <TableCell>{enrollment.profiles?.email || "-"}</TableCell>
                              <TableCell>{enrollment.profiles?.phone || "-"}</TableCell>
                              <TableCell>{enrollment.courses?.title || "-"}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={enrollment.payment_status === "completed" ? "default" : "secondary"}
                                  className={
                                    enrollment.payment_status === "completed"
                                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                                      : enrollment.payment_status === "suspended"
                                      ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                                      : enrollment.payment_status === "pending"
                                      ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                      : ""
                                  }
                                >
                                  {enrollment.payment_status === "completed" ? "Active" : 
                                   enrollment.payment_status === "suspended" ? "Suspended" : 
                                   enrollment.payment_status === "pending" ? "Pending" :
                                   enrollment.payment_status || "Unknown"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {enrollment.enrolled_at
                                  ? new Date(enrollment.enrolled_at).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {enrollment.payment_status === "suspended" ? (
                                      <DropdownMenuItem
                                        onClick={() => openStudentActionDialog(enrollment, "reactivate")}
                                        className="text-green-600"
                                      >
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        Reactivate Student
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => openStudentActionDialog(enrollment, "suspend")}
                                        className="text-orange-600"
                                      >
                                        <Ban className="mr-2 h-4 w-4" />
                                        Suspend Student
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => openStudentActionDialog(enrollment, "remove")}
                                      className="text-destructive"
                                    >
                                      <UserX className="mr-2 h-4 w-4" />
                                      Remove Student
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                          {paginatedEnrollments.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground">
                                {enrollments.length === 0 ? "No students enrolled yet" : "No students match your filters"}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      {filteredEnrollments.length > enrollmentsPerPage && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEnrollmentPage(p => Math.max(1, p - 1))}
                            disabled={enrollmentPage === 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {enrollmentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEnrollmentPage(p => Math.min(totalPages, p + 1))}
                            disabled={enrollmentPage >= totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </Card>
                  </>
                );
              })()}
            </TabsContent>

            {/* Coupons Tab */}
            <TabsContent value="coupons" className="space-y-4">
              <CouponManagement 
                isAdmin={false} 
                instructorCourseIds={courses.map(c => c.id)} 
              />
            </TabsContent>

            {/* Earnings Tab */}
            <TabsContent value="earnings" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">My Earnings (60% Share)</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => {
                      const cols = [
                        { header: "Course", accessor: (r: Earning) => r.courses?.title || "-" },
                        { header: "Amount", accessor: (r: Earning) => r.amount.toFixed(2) },
                        { header: "Currency", accessor: (r: Earning) => r.payment_currency || "USD" },
                        { header: "Platform Fee", accessor: (r: Earning) => r.platform_fee.toFixed(2) },
                        { header: "Your Share", accessor: (r: Earning) => r.instructor_share.toFixed(2) },
                        { header: "Status", accessor: (r: Earning) => r.status },
                        { header: "Date", accessor: (r: Earning) => new Date(r.created_at).toLocaleDateString() },
                      ];
                      exportToExcel(earnings, cols, "my-earnings");
                    }}>
                      Export as Excel (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const cols = [
                        { header: "Course", accessor: (r: Earning) => r.courses?.title || "-" },
                        { header: "Amount", accessor: (r: Earning) => r.amount.toFixed(2) },
                        { header: "Currency", accessor: (r: Earning) => r.payment_currency || "USD" },
                        { header: "Platform Fee", accessor: (r: Earning) => r.platform_fee.toFixed(2) },
                        { header: "Your Share", accessor: (r: Earning) => r.instructor_share.toFixed(2) },
                        { header: "Status", accessor: (r: Earning) => r.status },
                        { header: "Date", accessor: (r: Earning) => new Date(r.created_at).toLocaleDateString() },
                      ];
                      exportToPDF(earnings, cols, "my-earnings", "My Earnings");
                    }}>
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-muted-foreground">Your earnings represent 60% of each course sale. The platform retains 40% for operations and taxes.</p>
              
              {/* USD Earnings Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  USD Earnings
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-background">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total USD Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">${totalUsdEarnings.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 dark:border-green-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Pending (USD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-600">${pendingUsdEarnings.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 dark:border-green-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Paid (USD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">${paidUsdEarnings.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* RWF Earnings Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  RWF Earnings
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-background">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Total RWF Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">RWF {totalRwfEarnings.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Pending (RWF)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-amber-600">RWF {pendingRwfEarnings.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Paid (RWF)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">RWF {paidRwfEarnings.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* USD Earnings History */}
              {usdEarnings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      USD Earnings History
                    </CardTitle>
                  </CardHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Total Sale</TableHead>
                        <TableHead>Platform Fee (40%)</TableHead>
                        <TableHead>Your Share (60%)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usdEarnings.map((earning) => (
                        <TableRow key={earning.id}>
                          <TableCell className="font-medium">{earning.courses?.title || "-"}</TableCell>
                          <TableCell>${Number(earning.amount_usd || earning.amount).toFixed(2)}</TableCell>
                          <TableCell>${Number(earning.platform_fee_usd || earning.platform_fee).toFixed(2)}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            ${Number(earning.instructor_share_usd || earning.instructor_share).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={earning.status === "paid" ? "default" : "secondary"}>
                              {earning.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(earning.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}

              {/* RWF Earnings History */}
              {rwfEarnings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      RWF Earnings History
                    </CardTitle>
                  </CardHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Total Sale</TableHead>
                        <TableHead>Platform Fee (40%)</TableHead>
                        <TableHead>Your Share (60%)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rwfEarnings.map((earning) => (
                        <TableRow key={earning.id}>
                          <TableCell className="font-medium">{earning.courses?.title || "-"}</TableCell>
                          <TableCell>RWF {Number(earning.amount).toLocaleString()}</TableCell>
                          <TableCell>RWF {Number(earning.platform_fee).toLocaleString()}</TableCell>
                          <TableCell className="text-blue-600 font-medium">
                            RWF {Number(earning.instructor_share).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={earning.status === "paid" ? "default" : "secondary"}>
                              {earning.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(earning.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}

              {earnings.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No earnings yet. Start creating courses to earn money!
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Withdraw Tab */}
            <TabsContent value="withdraw" className="space-y-4">
              <h2 className="text-2xl font-semibold">Withdraw Funds</h2>
              <InstructorWithdrawal />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <h2 className="text-2xl font-semibold">Settings</h2>
              <InstructorPayoutSettings />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Student Action Confirmation Dialog */}
      <AlertDialog open={studentActionDialogOpen} onOpenChange={setStudentActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {studentActionType === "suspend" ? "Suspend Student" : studentActionType === "reactivate" ? "Reactivate Student" : "Remove Student"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {studentActionType === "suspend" 
                ? `Are you sure you want to suspend ${selectedStudent?.profiles?.full_name || selectedStudent?.profiles?.email} from ${selectedStudent?.courses?.title}? They will lose access to the course.`
                : studentActionType === "reactivate"
                ? `Are you sure you want to reactivate ${selectedStudent?.profiles?.full_name || selectedStudent?.profiles?.email} for ${selectedStudent?.courses?.title}? This will restore their access to the course.`
                : `Are you sure you want to remove ${selectedStudent?.profiles?.full_name || selectedStudent?.profiles?.email} from ${selectedStudent?.courses?.title}? This will delete their enrollment. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingStudentAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStudentAction}
              disabled={processingStudentAction}
              className={
                studentActionType === "remove" 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                  : studentActionType === "reactivate"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-orange-600 text-white hover:bg-orange-700"
              }
            >
              {processingStudentAction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                studentActionType === "suspend" ? "Suspend" : studentActionType === "reactivate" ? "Reactivate" : "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Instructor;
