import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users, BookOpen, FileText, Plus, Pencil, Trash2, X, Mail, Shield, Clock, RefreshCw, UserX, GraduationCap, Video, Image, Youtube, ClipboardList, FileQuestion, Eye, CheckCircle, XCircle, CalendarIcon, Search, MoreVertical, Ban, UserCheck, DollarSign, TrendingUp, Download, Building2 } from "lucide-react";
import AdminCorporateManagement from "@/components/AdminCorporateManagement";
import AdminCollaborationManagement from "@/components/AdminCollaborationManagement";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { FileUpload } from "@/components/FileUpload";
import { QuizQuestionManager } from "@/components/QuizQuestionManager";
import { CourseSectionManager } from "@/components/CourseSectionManager";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CoursePreviewDialog } from "@/components/CoursePreviewDialog";
import CertificateTemplateManager from "@/components/CertificateTemplateManager";
import CouponManagement from "@/components/CouponManagement";
import { Award } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDualCurrency } from "@/lib/currency";

interface InstructorEarning {
  id: string;
  instructor_id: string;
  course_id: string;
  enrollment_id: string;
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
  instructor_profile?: { full_name: string | null; email: string | null };
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  school: string;
  duration: string | null;
  price: number;
  image_url: string | null;
  certificate_template_url: string | null;
  instructor_name: string | null;
  instructor_id: string | null;
  category: string | null;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  year_of_birth: number | null;
  gender: string | null;
  education_level: string | null;
  employment_status: string | null;
  linkedin_profile: string | null;
  hear_about: string | null;
  created_at: string | null;
}

interface UserRole {
  user_id: string;
  role: string;
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

interface AdminInvitation {
  id: string;
  email: string;
  invited_by: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null };
}

interface InstructorInvitation {
  id: string;
  email: string;
  invited_by: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

interface InstructorUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null };
}

interface InstructorApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  bio: string | null;
  expertise: string | null;
  experience: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface PendingCourse {
  id: string;
  title: string;
  description: string | null;
  school: string;
  duration: string | null;
  price: number;
  image_url: string | null;
  instructor_id: string | null;
  instructor_name: string | null;
  approval_status: string;
  created_at: string | null;
  profiles?: { full_name: string | null; email: string | null };
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

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeView, setActiveView] = useState("courses");
  
  // Data states
  const [courses, setCourses] = useState<Course[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  
  // Instructor states
  const [instructorInvitations, setInstructorInvitations] = useState<InstructorInvitation[]>([]);
  const [instructorUsers, setInstructorUsers] = useState<InstructorUser[]>([]);
  const [instructorInviteDialogOpen, setInstructorInviteDialogOpen] = useState(false);
  const [instructorInviteEmail, setInstructorInviteEmail] = useState("");
  const [sendingInstructorInvite, setSendingInstructorInvite] = useState(false);
  const [instructorApplications, setInstructorApplications] = useState<InstructorApplication[]>([]);
  const [pendingCourses, setPendingCourses] = useState<PendingCourse[]>([]);
  const [previewingCourse, setPreviewingCourse] = useState<PendingCourse | null>(null);
  const [allEarnings, setAllEarnings] = useState<InstructorEarning[]>([]);
  const [earningsInstructorFilter, setEarningsInstructorFilter] = useState<string>("all");
  const [selectedEarnings, setSelectedEarnings] = useState<string[]>([]);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    payment_method: "",
    payment_reference: "",
    notes: "",
  });
  const [processingPayout, setProcessingPayout] = useState(false);
  
  // Course content management states
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseContentSearch, setCourseContentSearch] = useState("");
  const [courseContentCategoryFilter, setCourseContentCategoryFilter] = useState<string>("all");
  const [courseContentSchoolFilter, setCourseContentSchoolFilter] = useState<string>("all");
  const [lessons, setLessons] = useState<LessonContent[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [sections, setSections] = useState<{ id: string; course_id: string; title: string; description: string | null; order_index: number; parent_id: string | null; section_level: number | null }[]>([]);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonContent | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [managingQuizQuestions, setManagingQuizQuestions] = useState<Quiz | null>(null);
  
  // Invitation states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  
  // Pagination states for enrollments
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const enrollmentsPerPage = 10;
  
  // Filter states for enrollments
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [enrollmentCourseFilter, setEnrollmentCourseFilter] = useState<string>("all");
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<string>("all");
  const [enrollmentDateFrom, setEnrollmentDateFrom] = useState<Date | undefined>(undefined);
  const [enrollmentDateTo, setEnrollmentDateTo] = useState<Date | undefined>(undefined);
  
  // Filter states for users
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  // Form states
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
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
    certificate_template_url: "",
    instructor_name: "",
    price_display_currency: "USD",
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

  // User action states
  const [userActionDialogOpen, setUserActionDialogOpen] = useState(false);
  const [userActionType, setUserActionType] = useState<"suspend" | "remove" | "reactivate" | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [processingUserAction, setProcessingUserAction] = useState(false);
  const [selectedInstructorForCourses, setSelectedInstructorForCourses] = useState<string>("");

  const schools = [
    "Data Engineering",
    "Product & Innovation",
    "Data & Analytics",
    "Business Studies",
    "Digital & Creative Media",
    "Languages & Comms",
  ];

  useEffect(() => {
    const checkAdminAccess = async () => {
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

        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin");

        if (error) throw error;

        if (!roles || roles.length === 0) {
          toast({
            title: "Access Denied",
            description: "You don't have admin privileges",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setIsAdmin(true);
        setCurrentUserId(session.user.id);
        fetchData();
      } catch (error) {
        console.error("Error checking admin access:", error);
        toast({
          title: "Error",
          description: "Failed to verify admin access",
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate, toast]);

  const fetchData = async () => {
    try {
      // Fetch courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (coursesData) setCourses(coursesData);

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesData) setProfiles(profilesData);

      const profilesById = new Map(
        (profilesData ?? []).map((p: any) => [p.id, p])
      );

      // Fetch all user roles
      const { data: userRolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");
      
      if (userRolesData) setUserRoles(userRolesData);

      // Fetch enrollments with course info (profiles are attached client-side)
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select(`
          *,
          courses (title)
        `)
        .order("enrolled_at", { ascending: false });

      if (enrollmentsError) {
        console.error("Error fetching enrollments:", enrollmentsError);
      }
      if (enrollmentsData) {
        console.log("Fetched enrollments:", enrollmentsData.length);
        const hydratedEnrollments = (enrollmentsData as any[]).map((e) => ({
          ...e,
          profiles: profilesById.get(e.user_id) ?? null,
        }));
        setEnrollments(hydratedEnrollments as unknown as Enrollment[]);
      }

      // Fetch admin invitations
      const { data: invitationsData } = await supabase
        .from("admin_invitations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (invitationsData) setInvitations(invitationsData as AdminInvitation[]);

      // Fetch current admins (profiles attached client-side)
      const { data: adminUsersData } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "admin")
        .order("created_at", { ascending: false });

      if (adminUsersData) {
        const hydratedAdmins = (adminUsersData as any[]).map((r) => ({
          ...r,
          profiles: profilesById.get(r.user_id) ?? null,
        }));
        setAdminUsers(hydratedAdmins as unknown as AdminUser[]);
      }

      // Fetch instructor invitations
      const { data: instructorInvitationsData } = await supabase
        .from("instructor_invitations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (instructorInvitationsData) setInstructorInvitations(instructorInvitationsData as InstructorInvitation[]);

      // Fetch current instructors (moderator role) (profiles attached client-side)
      const { data: instructorUsersData } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "moderator")
        .order("created_at", { ascending: false });

      if (instructorUsersData) {
        const hydratedInstructors = (instructorUsersData as any[]).map((r) => ({
          ...r,
          profiles: profilesById.get(r.user_id) ?? null,
        }));
        setInstructorUsers(hydratedInstructors as unknown as InstructorUser[]);
      }

      // Fetch instructor applications
      const { data: applicationsData } = await supabase
        .from("instructor_applications")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (applicationsData) setInstructorApplications(applicationsData as InstructorApplication[]);

      // Fetch pending courses (courses needing approval)
      const { data: pendingCoursesData } = await supabase
        .from("courses")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      
      if (pendingCoursesData) setPendingCourses(pendingCoursesData as unknown as PendingCourse[]);

      // Fetch all instructor earnings (admin sees platform fee - 40%)
      const { data: earningsData } = await supabase
        .from("instructor_earnings")
        .select(`
          *,
          courses (title)
        `)
        .order("created_at", { ascending: false });

      if (earningsData && profilesById) {
        const hydratedEarnings = (earningsData as any[]).map((e) => ({
          ...e,
          instructor_profile: profilesById.get(e.instructor_id) ?? null,
        }));
        setAllEarnings(hydratedEarnings as unknown as InstructorEarning[]);
      }
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

  const handleSendInvitation = async () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setSendingInvite(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-admin-invitation", {
        body: { email: inviteEmail },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Invitation sent",
        description: `Admin invitation sent to ${inviteEmail}`,
      });

      setInviteDialogOpen(false);
      setInviteEmail("");
      fetchData();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invitation?")) return;
    
    try {
      const { error } = await supabase.from("admin_invitations").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Invitation deleted" });
      fetchData();
    } catch (error) {
      console.error("Error deleting invitation:", error);
      toast({
        title: "Error",
        description: "Failed to delete invitation",
        variant: "destructive",
      });
    }
  };

  const handleResendInvitation = async (invitation: AdminInvitation) => {
    try {
      // Delete the old invitation first
      await supabase.from("admin_invitations").delete().eq("id", invitation.id);
      
      // Send a new invitation
      const { data, error } = await supabase.functions.invoke("send-admin-invitation", {
        body: { email: invitation.email },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Invitation resent",
        description: `A new invitation has been sent to ${invitation.email}`,
      });
      fetchData();
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  const handleRemoveAdmin = async (adminUser: AdminUser) => {
    if (adminUser.user_id === currentUserId) {
      toast({
        title: "Cannot Remove",
        description: "You cannot remove your own admin privileges",
        variant: "destructive",
      });
      return;
    }

    const adminEmail = adminUser.profiles?.email || "this user";
    if (!confirm(`Are you sure you want to remove admin privileges from ${adminEmail}?`)) return;
    
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", adminUser.id);
      
      if (error) throw error;
      
      // Immediately remove from local state
      setAdminUsers(prev => prev.filter(a => a.id !== adminUser.id));
      
      toast({ 
        title: "Admin removed",
        description: `Admin privileges removed from ${adminEmail}`,
      });
    } catch (error) {
      console.error("Error removing admin:", error);
      toast({
        title: "Error",
        description: "Failed to remove admin privileges",
        variant: "destructive",
      });
    }
  };

  const handleUserAction = async () => {
    if (!selectedUser || !userActionType) return;
    
    setProcessingUserAction(true);
    try {
      if (userActionType === "remove") {
        // Remove all roles from the user
        const { error: roleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", selectedUser.id);
        
        if (roleError) throw roleError;

        // Delete all enrollments for this user
        const { error: enrollError } = await supabase
          .from("enrollments")
          .delete()
          .eq("user_id", selectedUser.id);

        if (enrollError) throw enrollError;

        // Send email notification
        if (selectedUser.email) {
          supabase.functions.invoke("send-notification", {
            body: {
              type: "user_status",
              user_status: {
                user_id: selectedUser.id,
                user_email: selectedUser.email,
                user_name: selectedUser.full_name || "User",
                action: "removed",
              },
            },
          }).catch((err) => console.error("Failed to send notification email:", err));
        }

        // Immediately remove from local state
        setProfiles(prev => prev.filter(p => p.id !== selectedUser.id));
        setEnrollments(prev => prev.filter(e => e.user_id !== selectedUser.id));

        toast({
          title: "User removed",
          description: `${selectedUser.full_name || selectedUser.email} has been removed from all courses and roles`,
        });
      } else if (userActionType === "suspend") {
        // For suspend, we remove all roles which effectively suspends their access
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", selectedUser.id);
        
        if (error) throw error;

        // Send email notification
        if (selectedUser.email) {
          supabase.functions.invoke("send-notification", {
            body: {
              type: "user_status",
              user_status: {
                user_id: selectedUser.id,
                user_email: selectedUser.email,
                user_name: selectedUser.full_name || "User",
                action: "suspended",
              },
            },
          }).catch((err) => console.error("Failed to send notification email:", err));
        }

        toast({
          title: "User suspended",
          description: `${selectedUser.full_name || selectedUser.email} has been suspended`,
        });
      } else if (userActionType === "reactivate") {
        // Check if user already has the 'user' role
        const { data: existingRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", selectedUser.id);
        
        const hasUserRole = existingRoles?.some(r => r.role === "user");
        
        // Add 'user' role if not present
        if (!hasUserRole) {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: selectedUser.id, role: "user" });
          
          if (roleError) throw roleError;
        }
        
        // Reactivate any suspended enrollments
        const { error: enrollError } = await supabase
          .from("enrollments")
          .update({ payment_status: "completed" })
          .eq("user_id", selectedUser.id)
          .eq("payment_status", "suspended");
        
        if (enrollError) throw enrollError;

        // Send email notification
        if (selectedUser.email) {
          supabase.functions.invoke("send-notification", {
            body: {
              type: "user_status",
              user_status: {
                user_id: selectedUser.id,
                user_email: selectedUser.email,
                user_name: selectedUser.full_name || "User",
                action: "reactivated",
              },
            },
          }).catch((err) => console.error("Failed to send notification email:", err));
        }

        toast({
          title: "User reactivated",
          description: `${selectedUser.full_name || selectedUser.email} has been reactivated`,
        });
      }
      
      setUserActionDialogOpen(false);
      setSelectedUser(null);
      setUserActionType(null);
      fetchData();
    } catch (error) {
      console.error("Error performing user action:", error);
      toast({
        title: "Error",
        description: `Failed to ${userActionType} user`,
        variant: "destructive",
      });
    } finally {
      setProcessingUserAction(false);
    }
  };

  const openUserActionDialog = (user: Profile, action: "suspend" | "remove" | "reactivate") => {
    setSelectedUser(user);
    setUserActionType(action);
    setUserActionDialogOpen(true);
  };

  const handleSelectEarning = (earningId: string, checked: boolean) => {
    if (checked) {
      setSelectedEarnings(prev => [...prev, earningId]);
    } else {
      setSelectedEarnings(prev => prev.filter(id => id !== earningId));
    }
  };

  const handleSelectAllEarnings = (checked: boolean, earnings: InstructorEarning[]) => {
    if (checked) {
      const pendingIds = earnings.filter(e => e.status === "pending").map(e => e.id);
      setSelectedEarnings(pendingIds);
    } else {
      setSelectedEarnings([]);
    }
  };

  const handleProcessPayout = async () => {
    if (selectedEarnings.length === 0) {
      toast({
        title: "No earnings selected",
        description: "Please select at least one pending earning to process",
        variant: "destructive",
      });
      return;
    }

    if (!payoutForm.payment_method) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    setProcessingPayout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get selected earnings details
      const selectedEarningDetails = allEarnings.filter(e => selectedEarnings.includes(e.id));
      
      // Group by instructor
      const earningsByInstructor = selectedEarningDetails.reduce((acc, earning) => {
        if (!acc[earning.instructor_id]) {
          acc[earning.instructor_id] = [];
        }
        acc[earning.instructor_id].push(earning);
        return acc;
      }, {} as Record<string, InstructorEarning[]>);

      // Process payouts for each instructor
      for (const [instructorId, earnings] of Object.entries(earningsByInstructor)) {
        const totalAmount = earnings.reduce((sum, e) => sum + Number(e.instructor_share_usd || e.instructor_share), 0);
        
        // Create payout record
        const { error: payoutError } = await supabase
          .from("instructor_payouts")
          .insert({
            instructor_id: instructorId,
            amount: totalAmount,
            payment_method: payoutForm.payment_method,
            payment_reference: payoutForm.payment_reference || null,
            notes: payoutForm.notes || null,
            paid_by: session.user.id,
          });

        if (payoutError) throw payoutError;

        // Update earnings status to paid
        const earningIds = earnings.map(e => e.id);
        const { error: updateError } = await supabase
          .from("instructor_earnings")
          .update({ 
            status: "paid", 
            paid_at: new Date().toISOString() 
          })
          .in("id", earningIds);

        if (updateError) throw updateError;
      }

      toast({
        title: "Payout processed",
        description: `Successfully processed payout for ${selectedEarnings.length} earning(s)`,
      });

      setPayoutDialogOpen(false);
      setSelectedEarnings([]);
      setPayoutForm({ payment_method: "", payment_reference: "", notes: "" });
      fetchData();
    } catch (error: any) {
      console.error("Error processing payout:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process payout",
        variant: "destructive",
      });
    } finally {
      setProcessingPayout(false);
    }
  };

  const handleApproveApplication = async (application: InstructorApplication) => {
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from("instructor_applications")
        .update({
          status: "approved",
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (updateError) throw updateError;

      // Add moderator role to user
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: application.user_id,
          role: "moderator",
        });

      if (roleError) throw roleError;

      toast({
        title: "Application approved",
        description: `${application.full_name} is now an instructor`,
      });
      fetchData();
    } catch (error) {
      console.error("Error approving application:", error);
      toast({
        title: "Error",
        description: "Failed to approve application",
        variant: "destructive",
      });
    }
  };

  const handleRejectApplication = async (application: InstructorApplication) => {
    if (!confirm(`Are you sure you want to reject ${application.full_name}'s application?`)) return;

    try {
      const { error } = await supabase
        .from("instructor_applications")
        .update({
          status: "rejected",
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) throw error;

      toast({
        title: "Application rejected",
        description: `${application.full_name}'s application has been rejected`,
      });
      fetchData();
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast({
        title: "Error",
        description: "Failed to reject application",
        variant: "destructive",
      });
    }
  };

  const handleApproveCourse = async (course: PendingCourse) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ approval_status: "approved" })
        .eq("id", course.id);

      if (error) throw error;

      toast({
        title: "Course approved",
        description: `"${course.title}" is now live`,
      });
      fetchData();
    } catch (error) {
      console.error("Error approving course:", error);
      toast({
        title: "Error",
        description: "Failed to approve course",
        variant: "destructive",
      });
    }
  };

  const handleRejectCourse = async (course: PendingCourse) => {
    if (!confirm(`Are you sure you want to reject "${course.title}"?`)) return;

    try {
      const { error } = await supabase
        .from("courses")
        .update({ approval_status: "rejected" })
        .eq("id", course.id);

      if (error) throw error;

      toast({
        title: "Course rejected",
        description: `"${course.title}" has been rejected`,
      });
      fetchData();
    } catch (error) {
      console.error("Error rejecting course:", error);
      toast({
        title: "Error",
        description: "Failed to reject course",
        variant: "destructive",
      });
    }
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
            certificate_template_url: courseForm.certificate_template_url || null,
            instructor_name: courseForm.instructor_name || null,
            price_display_currency: courseForm.price_display_currency || "USD",
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
            certificate_template_url: courseForm.certificate_template_url || null,
            instructor_name: courseForm.instructor_name || null,
            price_display_currency: courseForm.price_display_currency || "USD",
          });

        if (error) throw error;
        toast({ title: "Course created successfully" });
      }

      setCourseDialogOpen(false);
      setEditingCourse(null);
      setCourseForm({ title: "", description: "", school: "", category: "", duration: "", price: 0, monthly_price: 0, learning_outcomes: "", image_url: "", certificate_template_url: "", instructor_name: "", price_display_currency: "USD" });
      fetchData();
    } catch (error) {
      console.error("Error saving course:", error);
      toast({
        title: "Error",
        description: "Failed to save course",
        variant: "destructive",
      });
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || "",
      school: course.school,
      category: course.category || "",
       duration: course.duration || "",
      price: course.price,
      monthly_price: (course as any).monthly_price || 0,
      learning_outcomes: ((course as any).learning_outcomes || []).join(", "),
      image_url: course.image_url || "",
      price_display_currency: (course as any).price_display_currency || "USD",
      certificate_template_url: course.certificate_template_url || "",
      instructor_name: course.instructor_name || "",
    });
    setCourseDialogOpen(true);
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Course deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive",
      });
    }
  };

  const handleUpdateEnrollmentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("enrollments")
        .update({ payment_status: status })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Enrollment status updated" });
      fetchData();
    } catch (error) {
      console.error("Error updating enrollment:", error);
      toast({
        title: "Error",
        description: "Failed to update enrollment",
        variant: "destructive",
      });
    }
  };

  // Instructor management functions
  const handleSendInstructorInvitation = async () => {
    if (!instructorInviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    setSendingInstructorInvite(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-instructor-invitation", {
        body: { email: instructorInviteEmail },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Invitation sent",
        description: `Instructor invitation sent to ${instructorInviteEmail}`,
      });

      setInstructorInviteDialogOpen(false);
      setInstructorInviteEmail("");
      fetchData();
    } catch (error: any) {
      console.error("Error sending instructor invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    } finally {
      setSendingInstructorInvite(false);
    }
  };

  const handleDeleteInstructorInvitation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invitation?")) return;
    
    try {
      const { error } = await supabase.from("instructor_invitations").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Invitation deleted" });
      fetchData();
    } catch (error) {
      console.error("Error deleting invitation:", error);
      toast({
        title: "Error",
        description: "Failed to delete invitation",
        variant: "destructive",
      });
    }
  };

  const handleResendInstructorInvitation = async (invitation: InstructorInvitation) => {
    try {
      await supabase.from("instructor_invitations").delete().eq("id", invitation.id);
      
      const { data, error } = await supabase.functions.invoke("send-instructor-invitation", {
        body: { email: invitation.email },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Invitation resent",
        description: `A new invitation has been sent to ${invitation.email}`,
      });
      fetchData();
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  const handleRemoveInstructor = async (instructor: InstructorUser) => {
    const instructorEmail = instructor.profiles?.email || "this user";
    if (!confirm(`Are you sure you want to remove instructor privileges from ${instructorEmail}?`)) return;
    
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", instructor.id);
      
      if (error) throw error;
      
      // Immediately remove from local state
      setInstructorUsers(prev => prev.filter(i => i.id !== instructor.id));
      
      toast({ 
        title: "Instructor removed",
        description: `Instructor privileges removed from ${instructorEmail}`,
      });
    } catch (error) {
      console.error("Error removing instructor:", error);
      toast({
        title: "Error",
        description: "Failed to remove instructor privileges",
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
      if (selectedCourse) fetchCourseContent(selectedCourse.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete lesson", variant: "destructive" });
    }
  };

  // Quiz management
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
      if (selectedCourse) fetchCourseContent(selectedCourse.id);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete quiz", variant: "destructive" });
    }
  };

  // Assignment management
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
      if (selectedCourse) fetchCourseContent(selectedCourse.id);
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

  const handleSelectCourseForContent = (course: Course) => {
    setSelectedCourse(course);
    fetchCourseContent(course.id);
  };

  // Compute removed user IDs (users with no roles, no enrollments, and no instructor applications)
  const applicantUserIds = new Set(instructorApplications.map((app) => app.user_id));
  const removedUserIds = new Set(
    profiles
      .filter((profile) => {
        const hasRoles = userRoles.some((r) => r.user_id === profile.id);
        const hasEnrollments = enrollments.some((e) => e.user_id === profile.id);
        const hasApplication = applicantUserIds.has(profile.id);
        return !hasRoles && !hasEnrollments && !hasApplication;
      })
      .map((p) => p.id)
  );

  // Filter instructor applications to exclude removed users
  const filteredInstructorApplications = instructorApplications.filter(
    (app) => !removedUserIds.has(app.user_id)
  );

  // Filter enrollments to exclude removed users
  const displayEnrollments = enrollments.filter(
    (enrollment) => !removedUserIds.has(enrollment.user_id)
  );

  // Filter pending courses to exclude courses from removed instructors
  const filteredPendingCourses = pendingCourses.filter(
    (course) => !course.instructor_id || !removedUserIds.has(course.instructor_id)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar activeView={activeView} setActiveView={setActiveView} />
        <SidebarInset className="flex-1">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Admin Dashboard</h1>
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
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{profiles.length}</p>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-blue-500/10">
                        <BookOpen className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{courses.length}</p>
                        <p className="text-sm text-muted-foreground">Courses</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-green-500/10">
                        <GraduationCap className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{instructorUsers.length}</p>
                        <p className="text-sm text-muted-foreground">Instructors</p>
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
                        <p className="text-2xl font-bold">{displayEnrollments.length}</p>
                        <p className="text-sm text-muted-foreground">Enrollments</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs for Management - controlled by sidebar */}
              <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Courses</h2>
                <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingCourse(null);
                      setCourseForm({ title: "", description: "", school: "", category: "", duration: "", price: 0, monthly_price: 0, learning_outcomes: "", image_url: "", certificate_template_url: "", instructor_name: "" });
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingCourse ? "Edit Course" : "Add New Course"}</DialogTitle>
                      <DialogDescription>
                        {editingCourse ? "Update the course details below." : "Fill in the details to create a new course."}
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
                      <Button onClick={handleSaveCourse} className="w-full">
                        {editingCourse ? "Update Course" : "Create Course"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Monthly Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell>{course.school}</TableCell>
                        <TableCell>{course.duration || "-"}</TableCell>
                        <TableCell>${(course as any).monthly_price ?? course.price}/mo</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCourse(course)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {courses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No courses found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* Course Approvals Tab */}
            <TabsContent value="approvals" className="space-y-4">
              <h2 className="text-2xl font-semibold">Course Approvals</h2>
              <p className="text-muted-foreground">
                Review and approve courses submitted by instructors
              </p>
              
              {filteredPendingCourses.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No courses pending approval</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredPendingCourses.map((course) => (
                    <Card key={course.id}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{course.title}</h3>
                              <Badge variant="secondary">{course.school}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {course.description || "No description"}
                            </p>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span>Monthly Price: <strong>${(course as any).monthly_price ?? course.price}/mo</strong></span>
                              {course.duration && <span>Duration: {course.duration}</span>}
                              <span>Submitted: {course.created_at ? new Date(course.created_at).toLocaleDateString() : "-"}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewingCourse(course)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRejectCourse(course)}
                              className="text-destructive border-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveCourse(course)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Course Preview Dialog */}
              <CoursePreviewDialog
                courseId={previewingCourse?.id || ""}
                courseTitle={previewingCourse?.title || ""}
                open={!!previewingCourse}
                onOpenChange={(open) => !open && setPreviewingCourse(null)}
              />
            </TabsContent>

            {/* Instructor Applications Tab */}
            <TabsContent value="applications" className="space-y-4">
              <h2 className="text-2xl font-semibold">Instructor Applications</h2>
              <p className="text-muted-foreground">
                Review applications from users who want to become instructors
              </p>
              
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Expertise</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructorApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">{application.full_name}</TableCell>
                        <TableCell>{application.email}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={application.expertise || ""}>
                          {application.expertise || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              application.status === "approved"
                                ? "default"
                                : application.status === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(application.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {application.status === "pending" ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRejectApplication(application)}
                                className="text-destructive hover:text-destructive"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveApplication(application)}
                                className="text-green-600 hover:text-green-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {application.reviewed_at
                                ? `Reviewed ${new Date(application.reviewed_at).toLocaleDateString()}`
                                : "-"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {instructorApplications.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No applications yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Users</h2>
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
                        { header: "Name", accessor: (r: Profile) => r.full_name || "-" },
                        { header: "Email", accessor: (r: Profile) => r.email || "-" },
                        { header: "Phone", accessor: (r: Profile) => r.phone || "-" },
                        { header: "Country", accessor: (r: Profile) => r.country || "-" },
                        { header: "Gender", accessor: (r: Profile) => r.gender || "-" },
                        { header: "Education", accessor: (r: Profile) => r.education_level || "-" },
                        { header: "Employment", accessor: (r: Profile) => r.employment_status || "-" },
                        { header: "Year of Birth", accessor: (r: Profile) => r.year_of_birth?.toString() || "-" },
                        { header: "LinkedIn", accessor: (r: Profile) => r.linkedin_profile || "-" },
                        { header: "Heard About", accessor: (r: Profile) => r.hear_about || "-" },
                        { header: "Role", accessor: (r: Profile) => {
                          const roles = userRoles.filter(ur => ur.user_id === r.id).map(ur => ur.role);
                          return roles.length > 0 ? roles.join(", ") : "user";
                        }},
                        { header: "Joined", accessor: (r: Profile) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "-" },
                      ];
                      exportToExcel(profiles, cols, "users");
                    }}>
                      Export as Excel (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const cols = [
                        { header: "Name", accessor: (r: Profile) => r.full_name || "-" },
                        { header: "Email", accessor: (r: Profile) => r.email || "-" },
                        { header: "Phone", accessor: (r: Profile) => r.phone || "-" },
                        { header: "Country", accessor: (r: Profile) => r.country || "-" },
                        { header: "Gender", accessor: (r: Profile) => r.gender || "-" },
                        { header: "Education", accessor: (r: Profile) => r.education_level || "-" },
                        { header: "Employment", accessor: (r: Profile) => r.employment_status || "-" },
                        { header: "Year of Birth", accessor: (r: Profile) => r.year_of_birth?.toString() || "-" },
                        { header: "LinkedIn", accessor: (r: Profile) => r.linkedin_profile || "-" },
                        { header: "Heard About", accessor: (r: Profile) => r.hear_about || "-" },
                        { header: "Role", accessor: (r: Profile) => {
                          const roles = userRoles.filter(ur => ur.user_id === r.id).map(ur => ur.role);
                          return roles.length > 0 ? roles.join(", ") : "user";
                        }},
                        { header: "Joined", accessor: (r: Profile) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "-" },
                      ];
                      exportToPDF(profiles, cols, "users", "All Users");
                    }}>
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select
                  value={userStatusFilter}
                  onValueChange={setUserStatusFilter}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
               <Card className="overflow-x-auto">
                <Table>
                   <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Education</TableHead>
                      <TableHead>Employment</TableHead>
                      <TableHead>Year of Birth</TableHead>
                      <TableHead>LinkedIn</TableHead>
                      <TableHead>Heard About</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles
                      .map((profile) => {
                        const roles = userRoles
                          .filter((r) => r.user_id === profile.id)
                          .map((r) => r.role);
                        const hasEnrollments = enrollments.some((e) => e.user_id === profile.id);
                        const hasSuspendedEnrollment = enrollments.some(
                          (e) => e.user_id === profile.id && e.payment_status === "suspended"
                        );
                        
                        // Determine user status
                        let userStatus: "active" | "suspended" = "active";
                        if (hasSuspendedEnrollment) {
                          userStatus = "suspended";
                        }
                        
                        return { ...profile, roles, userStatus };
                      })
                      .filter((profile) => {
                        // Filter by search query
                        if (userSearchQuery) {
                          const query = userSearchQuery.toLowerCase();
                          const nameMatch = profile.full_name?.toLowerCase().includes(query);
                          const emailMatch = profile.email?.toLowerCase().includes(query);
                          if (!nameMatch && !emailMatch) return false;
                        }
                        
                        // Filter by status
                        if (userStatusFilter !== "all" && profile.userStatus !== userStatusFilter) {
                          return false;
                        }
                        
                        return true;
                      })
                      .map((profile) => {
                        const isCurrentUser = profile.id === currentUserId;
                        const isAdminUser = profile.roles.includes("admin");
                        
                        return (
                          <TableRow key={profile.id}>
                            <TableCell className="font-medium">{profile.full_name || "-"}</TableCell>
                            <TableCell>{profile.email || "-"}</TableCell>
                            <TableCell>{profile.phone || "-"}</TableCell>
                            <TableCell>{profile.country || "-"}</TableCell>
                            <TableCell>{profile.gender || "-"}</TableCell>
                            <TableCell>{profile.education_level || "-"}</TableCell>
                            <TableCell>{profile.employment_status || "-"}</TableCell>
                            <TableCell>{profile.year_of_birth || "-"}</TableCell>
                            <TableCell>
                              {profile.linkedin_profile ? (
                                <a href={profile.linkedin_profile} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">View</a>
                              ) : "-"}
                            </TableCell>
                            <TableCell>{profile.hear_about || "-"}</TableCell>
                            <TableCell>
                              <Select
                                value={
                                  profile.roles.includes("admin")
                                    ? "admin"
                                    : profile.roles.includes("moderator")
                                    ? "moderator"
                                    : "user"
                                }
                                onValueChange={async (value) => {
                                  try {
                                    if (profile.id === currentUserId) return;
                                    const currentRole = profile.roles.includes("admin")
                                      ? "admin"
                                      : profile.roles.includes("moderator")
                                      ? "moderator"
                                      : "user";
                                    if (value === currentRole) return;

                                    // Remove old roles (admin/moderator) first
                                    if (currentRole === "admin") {
                                      await supabase.from("user_roles").delete().eq("user_id", profile.id).eq("role", "admin");
                                    }
                                    if (currentRole === "moderator") {
                                      await supabase.from("user_roles").delete().eq("user_id", profile.id).eq("role", "moderator");
                                    }

                                    // Add new role
                                    if (value === "admin") {
                                      const { error } = await supabase.from("user_roles").insert({ user_id: profile.id, role: "admin" });
                                      if (error) throw error;
                                      toast({ title: "Role updated", description: `${profile.full_name || profile.email} is now an Admin` });
                                    } else if (value === "moderator") {
                                      const { error } = await supabase.from("user_roles").insert({ user_id: profile.id, role: "moderator" });
                                      if (error) throw error;
                                      toast({ title: "Role updated", description: `${profile.full_name || profile.email} is now an Instructor` });
                                    } else {
                                      toast({ title: "Role updated", description: `${profile.full_name || profile.email} is now a regular User` });
                                    }
                                    fetchData();
                                  } catch (error) {
                                    console.error("Error updating role:", error);
                                    toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
                                  }
                                }}
                                disabled={profile.id === currentUserId}
                              >
                                <SelectTrigger className="w-[130px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="moderator">Instructor</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  profile.userStatus === "active"
                                    ? "default"
                                    : profile.userStatus === "suspended"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className={
                                  profile.userStatus === "active"
                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                    : profile.userStatus === "suspended"
                                    ? "bg-orange-100 text-orange-800 hover:bg-orange-100"
                                    : ""
                                }
                              >
                                {profile.userStatus.charAt(0).toUpperCase() + profile.userStatus.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {profile.created_at
                                ? new Date(profile.created_at).toLocaleDateString()
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isCurrentUser && !isAdminUser && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {profile.userStatus === "suspended" ? (
                                      <DropdownMenuItem
                                        onClick={() => openUserActionDialog(profile, "reactivate")}
                                        className="text-green-600"
                                      >
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        Reactivate User
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => openUserActionDialog(profile, "suspend")}
                                        className="text-orange-600"
                                      >
                                        <Ban className="mr-2 h-4 w-4" />
                                        Suspend User
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => openUserActionDialog(profile, "remove")}
                                      className="text-destructive"
                                    >
                                      <UserX className="mr-2 h-4 w-4" />
                                      Remove User
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    {profiles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* Enrollments Tab */}
            <TabsContent value="enrollments" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Enrollments</h2>
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
                  <div className="flex flex-wrap gap-2">
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
                    <Select
                      value={enrollmentStatusFilter}
                      onValueChange={(value) => {
                        setEnrollmentStatusFilter(value);
                        setEnrollmentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
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
                const filteredEnrollmentsList = displayEnrollments.filter((enrollment) => {
                  const searchLower = enrollmentSearch.toLowerCase();
                  const matchesSearch = !enrollmentSearch || 
                    (enrollment.profiles?.full_name?.toLowerCase().includes(searchLower)) ||
                    (enrollment.profiles?.email?.toLowerCase().includes(searchLower));
                  
                  const matchesCourse = enrollmentCourseFilter === "all" || 
                    enrollment.course_id === enrollmentCourseFilter;
                  
                  const matchesStatus = enrollmentStatusFilter === "all" || 
                    (enrollment.payment_status || "pending") === enrollmentStatusFilter;
                  
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
                  
                  return matchesSearch && matchesCourse && matchesStatus && matchesDateRange;
                });

                const totalPages = Math.ceil(filteredEnrollmentsList.length / enrollmentsPerPage);
                const paginatedEnrollments = filteredEnrollmentsList.slice(
                  (enrollmentPage - 1) * enrollmentsPerPage,
                  enrollmentPage * enrollmentsPerPage
                );

                return (
                  <>
                    <div className="flex justify-end">
                      <p className="text-sm text-muted-foreground">
                        Showing {filteredEnrollmentsList.length === 0 ? 0 : Math.min((enrollmentPage - 1) * enrollmentsPerPage + 1, filteredEnrollmentsList.length)} - {Math.min(enrollmentPage * enrollmentsPerPage, filteredEnrollmentsList.length)} of {filteredEnrollmentsList.length}
                        {filteredEnrollmentsList.length !== displayEnrollments.length && ` (filtered from ${displayEnrollments.length})`}
                      </p>
                    </div>
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedEnrollments.map((enrollment) => (
                            <TableRow key={enrollment.id}>
                              <TableCell>
                                <div className="font-medium">
                                  {enrollment.profiles?.full_name || "No Name"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {enrollment.profiles?.email || "-"}
                                </div>
                              </TableCell>
                              <TableCell>{enrollment.profiles?.phone || "-"}</TableCell>
                              <TableCell>{enrollment.courses?.title || "-"}</TableCell>
                              <TableCell>${enrollment.amount_paid || 0}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  enrollment.payment_status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : enrollment.payment_status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}>
                                  {enrollment.payment_status || "pending"}
                                </span>
                              </TableCell>
                              <TableCell>
                                {enrollment.enrolled_at
                                  ? new Date(enrollment.enrolled_at).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Select
                                  value={enrollment.payment_status || "pending"}
                                  onValueChange={(value) => handleUpdateEnrollmentStatus(enrollment.id, value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                            </TableRow>
                          ))}
                          {paginatedEnrollments.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground">
                                {displayEnrollments.length === 0 ? "No enrollments found" : "No enrollments match your filters"}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      {filteredEnrollmentsList.length > enrollmentsPerPage && (
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

            {/* Course Content Tab */}
            <TabsContent value="content" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Course Content Management</h2>
              </div>

              {!selectedCourse ? (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="font-semibold text-lg">Select a Course</h3>
                    <p className="text-muted-foreground">Choose a course to manage its lessons, quizzes, and assignments</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search courses..."
                        value={courseContentSearch}
                        onChange={(e) => setCourseContentSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={courseContentCategoryFilter} onValueChange={setCourseContentCategoryFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Short-Course">Short-Course</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Masterclass">Masterclass</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={courseContentSchoolFilter} onValueChange={setCourseContentSchoolFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="School" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Schools</SelectItem>
                        <SelectItem value="Data Engineering">Data Engineering</SelectItem>
                        <SelectItem value="Product & Innovation">Product & Innovation</SelectItem>
                        <SelectItem value="Data & Analytics">Data & Analytics</SelectItem>
                        <SelectItem value="Business Studies">Business Studies</SelectItem>
                        <SelectItem value="Digital & Creative Media">Digital & Creative Media</SelectItem>
                        <SelectItem value="Languages & Comms">Languages & Comms</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {courses
                      .filter((course) => {
                        const matchesSearch = course.title.toLowerCase().includes(courseContentSearch.toLowerCase()) ||
                          course.school.toLowerCase().includes(courseContentSearch.toLowerCase()) ||
                          (course.description && course.description.toLowerCase().includes(courseContentSearch.toLowerCase()));
                        const matchesCategory = courseContentCategoryFilter === "all" || course.category === courseContentCategoryFilter;
                        const matchesSchool = courseContentSchoolFilter === "all" || course.school === courseContentSchoolFilter;
                        return matchesSearch && matchesCategory && matchesSchool;
                      })
                      .map((course) => (
                        <Card
                          key={course.id}
                          className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                          onClick={() => handleSelectCourseForContent(course)}
                        >
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-5 w-5 text-primary" />
                              <span className="text-xs text-muted-foreground uppercase">{course.school}</span>
                            </div>
                            <h4 className="font-medium line-clamp-2">{course.title}</h4>
                            {course.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{course.description.replace(/<[^>]*>/g, '')}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                  {courses.filter((course) => {
                    const matchesSearch = course.title.toLowerCase().includes(courseContentSearch.toLowerCase()) ||
                      course.school.toLowerCase().includes(courseContentSearch.toLowerCase()) ||
                      (course.description && course.description.toLowerCase().includes(courseContentSearch.toLowerCase()));
                    const matchesCategory = courseContentCategoryFilter === "all" || course.category === courseContentCategoryFilter;
                    const matchesSchool = courseContentSchoolFilter === "all" || course.school === courseContentSchoolFilter;
                    return matchesSearch && matchesCategory && matchesSchool;
                  }).length === 0 && (courseContentSearch || courseContentCategoryFilter !== "all" || courseContentSchoolFilter !== "all") && (
                    <p className="text-center text-muted-foreground">No courses found matching your filters</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>{selectedCourse.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{selectedCourse.school}</p>
                      </div>
                      <Button variant="outline" onClick={() => setSelectedCourse(null)}>
                        <X className="mr-2 h-4 w-4" />
                        Change Course
                      </Button>
                    </CardHeader>
                  </Card>

                  {/* Course Structure */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Course Structure
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Section Manager */}
                      <CourseSectionManager
                        courseId={selectedCourse.id}
                        courseName={selectedCourse.title}
                        sections={sections}
                        onSectionsChange={() => fetchCourseContent(selectedCourse.id)}
                        onContentGenerated={() => fetchCourseContent(selectedCourse.id)}
                      />
                    </CardContent>
                  </Card>

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
                </div>
              )}
            </TabsContent>

            {/* Instructors Tab */}
            <TabsContent value="instructors" className="space-y-6">
              {/* Current Instructors Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold">Current Instructors</h2>
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
                          { header: "Name", accessor: (r: InstructorUser) => r.profiles?.full_name || "-" },
                          { header: "Email", accessor: (r: InstructorUser) => r.profiles?.email || "-" },
                          { header: "Added", accessor: (r: InstructorUser) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "-" },
                        ];
                        exportToExcel(instructorUsers, cols, "instructors");
                      }}>
                        Export as Excel (CSV)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const cols = [
                          { header: "Name", accessor: (r: InstructorUser) => r.profiles?.full_name || "-" },
                          { header: "Email", accessor: (r: InstructorUser) => r.profiles?.email || "-" },
                          { header: "Added", accessor: (r: InstructorUser) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "-" },
                        ];
                        exportToPDF(instructorUsers, cols, "instructors", "Current Instructors");
                      }}>
                        Export as PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {instructorUsers.map((instructor) => (
                        <TableRow key={instructor.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-primary" />
                              {instructor.profiles?.full_name || "-"}
                            </div>
                          </TableCell>
                          <TableCell>{instructor.profiles?.email || "-"}</TableCell>
                          <TableCell>
                            {instructor.created_at 
                              ? new Date(instructor.created_at).toLocaleDateString() 
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveInstructor(instructor)}
                              className="text-destructive hover:text-destructive"
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {instructorUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No instructors found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Instructor Courses Lookup Section */}
              <div>
                <h2 className="text-2xl font-semibold mb-4">Instructor Courses</h2>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Select Instructor</Label>
                      <Select
                        value={selectedInstructorForCourses}
                        onValueChange={setSelectedInstructorForCourses}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an instructor..." />
                        </SelectTrigger>
                        <SelectContent>
                          {instructorUsers.map((inst) => (
                            <SelectItem key={inst.user_id} value={inst.user_id}>
                              {inst.profiles?.full_name || inst.profiles?.email || "Unknown"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedInstructorForCourses && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Courses by {instructorUsers.find(i => i.user_id === selectedInstructorForCourses)?.profiles?.full_name || "this instructor"}:
                        </p>
                        {courses.filter(c => c.instructor_id === selectedInstructorForCourses).length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>School</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Price</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {courses.filter(c => c.instructor_id === selectedInstructorForCourses).map(c => (
                                <TableRow key={c.id}>
                                  <TableCell className="font-medium">{c.title}</TableCell>
                                  <TableCell>{c.school}</TableCell>
                                  <TableCell>{c.category || "-"}</TableCell>
                                  <TableCell>${c.price}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No courses found for this instructor.</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Instructor Invitations Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold">Instructor Invitations</h2>
                  <Dialog open={instructorInviteDialogOpen} onOpenChange={setInstructorInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Mail className="mr-2 h-4 w-4" />
                        Invite Instructor
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Invite New Instructor</DialogTitle>
                        <DialogDescription>
                          Send an invitation email to add a new instructor. They will be able to create courses, add content, and earn from enrollments.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <Input
                            type="email"
                            value={instructorInviteEmail}
                            onChange={(e) => setInstructorInviteEmail(e.target.value)}
                            placeholder="instructor@example.com"
                          />
                        </div>
                        <div className="bg-muted p-4 rounded-lg space-y-2">
                          <h4 className="font-medium text-sm">Instructor Privileges:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Create and manage their own courses</li>
                            <li>• Add lessons (text, video, YouTube, PDF)</li>
                            <li>• Create quizzes and assignments</li>
                            <li>• View enrolled students for their courses</li>
                            <li>• Track earnings from enrollments</li>
                          </ul>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          The invitation expires in 7 days.
                        </p>
                        <Button onClick={handleSendInstructorInvitation} className="w-full" disabled={sendingInstructorInvite}>
                          {sendingInstructorInvite ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Invitation
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {instructorInvitations.map((invitation) => {
                        const isExpired = new Date(invitation.expires_at) < new Date();
                        const isUsed = !!invitation.used_at;
                        
                        return (
                          <TableRow key={invitation.id}>
                            <TableCell className="font-medium">{invitation.email}</TableCell>
                            <TableCell>
                              {isUsed ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  <GraduationCap className="mr-1 h-3 w-3" />
                                  Accepted
                                </Badge>
                              ) : isExpired ? (
                                <Badge variant="destructive">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Expired
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(invitation.expires_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {new Date(invitation.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              {!isUsed && isExpired && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResendInstructorInvitation(invitation)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Resend
                                </Button>
                              )}
                              {!isUsed && !isExpired && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResendInstructorInvitation(invitation)}
                                  title="Resend invitation"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                              {!isUsed && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteInstructorInvitation(invitation.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {instructorInvitations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No invitations sent yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </TabsContent>

            {/* Admin Management Tab */}
            <TabsContent value="admins" className="space-y-6">
              {/* Current Admins Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold">Current Admins</h2>
                </div>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Added</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminUsers.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-primary" />
                              {admin.profiles?.full_name || "-"}
                            </div>
                          </TableCell>
                          <TableCell>{admin.profiles?.email || "-"}</TableCell>
                          <TableCell>
                            {admin.created_at 
                              ? new Date(admin.created_at).toLocaleDateString() 
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {admin.user_id === currentUserId ? (
                              <Badge variant="secondary">You</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAdmin(admin)}
                                className="text-destructive hover:text-destructive"
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Remove
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {adminUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No admins found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Invitations Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold">Admin Invitations</h2>
                  <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Mail className="mr-2 h-4 w-4" />
                        Invite Admin
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Invite New Admin</DialogTitle>
                        <DialogDescription>
                          Send an invitation email to add a new administrator.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <Input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="admin@example.com"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          An email will be sent with a link to accept the invitation. The invitation expires in 7 days.
                        </p>
                        <Button onClick={handleSendInvitation} className="w-full" disabled={sendingInvite}>
                          {sendingInvite ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Invitation
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation) => {
                        const isExpired = new Date(invitation.expires_at) < new Date();
                        const isUsed = !!invitation.used_at;
                        
                        return (
                          <TableRow key={invitation.id}>
                            <TableCell className="font-medium">{invitation.email}</TableCell>
                            <TableCell>
                              {isUsed ? (
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  <Shield className="mr-1 h-3 w-3" />
                                  Accepted
                                </Badge>
                              ) : isExpired ? (
                                <Badge variant="destructive">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Expired
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(invitation.expires_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {new Date(invitation.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              {!isUsed && isExpired && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResendInvitation(invitation)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Resend
                                </Button>
                              )}
                              {!isUsed && !isExpired && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResendInvitation(invitation)}
                                  title="Resend invitation"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                              {!isUsed && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteInvitation(invitation.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {invitations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No invitations sent yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </TabsContent>

            {/* Coupons Tab */}
            <TabsContent value="coupons" className="space-y-4">
              <CouponManagement isAdmin={true} />
            </TabsContent>

            {/* Earnings Tab - Admin sees platform fee (40%) */}
            <TabsContent value="earnings" className="space-y-4">
              {(() => {
                // Filter earnings by instructor
                const filteredEarnings = earningsInstructorFilter === "all"
                  ? allEarnings
                  : allEarnings.filter(e => e.instructor_id === earningsInstructorFilter);

                // Separate by currency
                const usdEarnings = filteredEarnings.filter(e => e.payment_currency === "USD" || !e.payment_currency);
                const rwfEarnings = filteredEarnings.filter(e => e.payment_currency === "RWF");

                // Calculate totals separately by currency
                const totalUsdSales = usdEarnings.reduce((sum, e) => sum + Number(e.amount_usd || e.amount), 0);
                const totalUsdPlatformFee = usdEarnings.reduce((sum, e) => sum + Number(e.platform_fee_usd || e.platform_fee), 0);
                const totalUsdInstructorShare = usdEarnings.reduce((sum, e) => sum + Number(e.instructor_share_usd || e.instructor_share), 0);

                const totalRwfSales = rwfEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
                const totalRwfPlatformFee = rwfEarnings.reduce((sum, e) => sum + Number(e.platform_fee), 0);
                const totalRwfInstructorShare = rwfEarnings.reduce((sum, e) => sum + Number(e.instructor_share), 0);

                // Pending earnings count
                const pendingUsdCount = usdEarnings.filter(e => e.status === "pending").length;
                const pendingRwfCount = rwfEarnings.filter(e => e.status === "pending").length;

                // Get unique instructors for filter
                const uniqueInstructors = Array.from(new Map(
                  allEarnings.map(e => [e.instructor_id, e.instructor_profile])
                ).entries()).filter(([id, profile]) => id && profile);

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold flex items-center gap-2">
                          <DollarSign className="w-6 h-6" />
                          Revenue & Earnings
                        </h2>
                        <p className="text-muted-foreground">
                          Platform fee (40%) and instructor earnings (60%) overview
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={earningsInstructorFilter} onValueChange={setEarningsInstructorFilter}>
                          <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Filter by instructor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Instructors</SelectItem>
                            {uniqueInstructors.map(([id, profile]) => (
                              <SelectItem key={id} value={id}>
                                {profile?.full_name || profile?.email || "Unknown"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedEarnings.length > 0 && (
                          <Button onClick={() => setPayoutDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Pay Selected ({selectedEarnings.length})
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* USD Earnings Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        USD Earnings
                      </h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-green-200">
                          <CardHeader>
                            <CardTitle className="text-lg">Total USD Sales</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">${totalUsdSales.toFixed(2)}</div>
                          </CardContent>
                        </Card>
                        <Card className="border-green-200 bg-green-50">
                          <CardHeader>
                            <CardTitle className="text-lg">Platform Revenue (40%)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-primary">${totalUsdPlatformFee.toFixed(2)}</div>
                          </CardContent>
                        </Card>
                        <Card className="border-green-200">
                          <CardHeader>
                            <CardTitle className="text-lg">Instructor Payouts (60%)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-green-600">${totalUsdInstructorShare.toFixed(2)}</div>
                            {pendingUsdCount > 0 && (
                              <div className="text-sm text-orange-600 mt-1">{pendingUsdCount} pending</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle>USD Transaction History</CardTitle>
                          <div className="flex items-center gap-3">
                            {usdEarnings.filter(e => e.status === "pending").length > 0 && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300"
                                  checked={usdEarnings.filter(e => e.status === "pending").every(e => selectedEarnings.includes(e.id))}
                                  onChange={(e) => handleSelectAllEarnings(e.target.checked, usdEarnings)}
                                />
                                <span className="text-sm text-muted-foreground">Select all pending</span>
                              </div>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => {
                                  const cols = [
                                    { header: "Instructor", accessor: (r: any) => r.instructor_profile?.full_name || r.instructor_profile?.email || "Unknown" },
                                    { header: "Course", accessor: (r: any) => r.courses?.title || "-" },
                                    { header: "Total Sale (USD)", accessor: (r: any) => `$${Number(r.amount_usd || r.amount).toFixed(2)}` },
                                    { header: "Platform Fee (USD)", accessor: (r: any) => `$${Number(r.platform_fee_usd || r.platform_fee).toFixed(2)}` },
                                    { header: "Instructor Share (USD)", accessor: (r: any) => `$${Number(r.instructor_share_usd || r.instructor_share).toFixed(2)}` },
                                    { header: "Status", accessor: (r: any) => r.status },
                                    { header: "Date", accessor: (r: any) => new Date(r.created_at).toLocaleDateString() },
                                  ];
                                  exportToExcel(usdEarnings, cols, "usd-transactions");
                                }}>Export as Excel (CSV)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  const cols = [
                                    { header: "Instructor", accessor: (r: any) => r.instructor_profile?.full_name || r.instructor_profile?.email || "Unknown" },
                                    { header: "Course", accessor: (r: any) => r.courses?.title || "-" },
                                    { header: "Total Sale (USD)", accessor: (r: any) => `$${Number(r.amount_usd || r.amount).toFixed(2)}` },
                                    { header: "Platform Fee (USD)", accessor: (r: any) => `$${Number(r.platform_fee_usd || r.platform_fee).toFixed(2)}` },
                                    { header: "Instructor Share (USD)", accessor: (r: any) => `$${Number(r.instructor_share_usd || r.instructor_share).toFixed(2)}` },
                                    { header: "Status", accessor: (r: any) => r.status },
                                    { header: "Date", accessor: (r: any) => new Date(r.created_at).toLocaleDateString() },
                                  ];
                                  exportToPDF(usdEarnings, cols, "usd-transactions", "USD Transaction History");
                                }}>Export as PDF</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Instructor</TableHead>
                              <TableHead>Course</TableHead>
                              <TableHead>Total Sale</TableHead>
                              <TableHead>Platform Fee (40%)</TableHead>
                              <TableHead>Instructor Share (60%)</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {usdEarnings.map((earning) => (
                              <TableRow key={earning.id}>
                                <TableCell>
                                  {earning.status === "pending" && (
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-gray-300"
                                      checked={selectedEarnings.includes(earning.id)}
                                      onChange={(e) => handleSelectEarning(earning.id, e.target.checked)}
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {earning.instructor_profile?.full_name || earning.instructor_profile?.email || "Unknown"}
                                </TableCell>
                                <TableCell>{earning.courses?.title || "-"}</TableCell>
                                <TableCell>${Number(earning.amount_usd || earning.amount).toFixed(2)}</TableCell>
                                <TableCell className="text-primary">
                                  ${Number(earning.platform_fee_usd || earning.platform_fee).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-green-600">
                                  ${Number(earning.instructor_share_usd || earning.instructor_share).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={earning.status === "paid" ? "default" : "secondary"}>
                                    {earning.status}
                                  </Badge>
                                  {earning.paid_at && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {new Date(earning.paid_at).toLocaleDateString()}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>{new Date(earning.created_at).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                            {usdEarnings.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground">
                                  No USD earnings recorded yet
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </Card>
                    </div>

                    {/* RWF Earnings Section */}
                    <div className="space-y-4 mt-8">
                      <h3 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        RWF Earnings
                      </h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-blue-200">
                          <CardHeader>
                            <CardTitle className="text-lg">Total RWF Sales</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">RWF {totalRwfSales.toLocaleString()}</div>
                          </CardContent>
                        </Card>
                        <Card className="border-blue-200 bg-blue-50">
                          <CardHeader>
                            <CardTitle className="text-lg">Platform Revenue (40%)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-primary">RWF {totalRwfPlatformFee.toLocaleString()}</div>
                          </CardContent>
                        </Card>
                        <Card className="border-blue-200">
                          <CardHeader>
                            <CardTitle className="text-lg">Instructor Payouts (60%)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-blue-600">RWF {totalRwfInstructorShare.toLocaleString()}</div>
                            {pendingRwfCount > 0 && (
                              <div className="text-sm text-orange-600 mt-1">{pendingRwfCount} pending</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle>RWF Transaction History</CardTitle>
                          <div className="flex items-center gap-3">
                            {rwfEarnings.filter(e => e.status === "pending").length > 0 && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300"
                                  checked={rwfEarnings.filter(e => e.status === "pending").every(e => selectedEarnings.includes(e.id))}
                                  onChange={(e) => handleSelectAllEarnings(e.target.checked, rwfEarnings)}
                                />
                                <span className="text-sm text-muted-foreground">Select all pending</span>
                              </div>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => {
                                  const cols = [
                                    { header: "Instructor", accessor: (r: any) => r.instructor_profile?.full_name || r.instructor_profile?.email || "Unknown" },
                                    { header: "Course", accessor: (r: any) => r.courses?.title || "-" },
                                    { header: "Total Sale (RWF)", accessor: (r: any) => `RWF ${Number(r.amount).toLocaleString()}` },
                                    { header: "Platform Fee (RWF)", accessor: (r: any) => `RWF ${Number(r.platform_fee).toLocaleString()}` },
                                    { header: "Instructor Share (RWF)", accessor: (r: any) => `RWF ${Number(r.instructor_share).toLocaleString()}` },
                                    { header: "Status", accessor: (r: any) => r.status },
                                    { header: "Date", accessor: (r: any) => new Date(r.created_at).toLocaleDateString() },
                                  ];
                                  exportToExcel(rwfEarnings, cols, "rwf-transactions");
                                }}>Export as Excel (CSV)</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  const cols = [
                                    { header: "Instructor", accessor: (r: any) => r.instructor_profile?.full_name || r.instructor_profile?.email || "Unknown" },
                                    { header: "Course", accessor: (r: any) => r.courses?.title || "-" },
                                    { header: "Total Sale (RWF)", accessor: (r: any) => `RWF ${Number(r.amount).toLocaleString()}` },
                                    { header: "Platform Fee (RWF)", accessor: (r: any) => `RWF ${Number(r.platform_fee).toLocaleString()}` },
                                    { header: "Instructor Share (RWF)", accessor: (r: any) => `RWF ${Number(r.instructor_share).toLocaleString()}` },
                                    { header: "Status", accessor: (r: any) => r.status },
                                    { header: "Date", accessor: (r: any) => new Date(r.created_at).toLocaleDateString() },
                                  ];
                                  exportToPDF(rwfEarnings, cols, "rwf-transactions", "RWF Transaction History");
                                }}>Export as PDF</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Instructor</TableHead>
                              <TableHead>Course</TableHead>
                              <TableHead>Total Sale</TableHead>
                              <TableHead>Platform Fee (40%)</TableHead>
                              <TableHead>Instructor Share (60%)</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rwfEarnings.map((earning) => (
                              <TableRow key={earning.id}>
                                <TableCell>
                                  {earning.status === "pending" && (
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-gray-300"
                                      checked={selectedEarnings.includes(earning.id)}
                                      onChange={(e) => handleSelectEarning(earning.id, e.target.checked)}
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {earning.instructor_profile?.full_name || earning.instructor_profile?.email || "Unknown"}
                                </TableCell>
                                <TableCell>{earning.courses?.title || "-"}</TableCell>
                                <TableCell>RWF {Number(earning.amount).toLocaleString()}</TableCell>
                                <TableCell className="text-primary">
                                  RWF {Number(earning.platform_fee).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-blue-600">
                                  RWF {Number(earning.instructor_share).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={earning.status === "paid" ? "default" : "secondary"}>
                                    {earning.status}
                                  </Badge>
                                  {earning.paid_at && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {new Date(earning.paid_at).toLocaleDateString()}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>{new Date(earning.created_at).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                            {rwfEarnings.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground">
                                  No RWF earnings recorded yet
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </Card>
                    </div>
                  </>
                );
              })()}

              {/* Payout Dialog */}
              <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Process Instructor Payment</DialogTitle>
                    <DialogDescription>
                      Mark {selectedEarnings.length} earning(s) as paid. Enter payment details below.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Payment Method *</Label>
                      <Select
                        value={payoutForm.payment_method}
                        onValueChange={(value) => setPayoutForm(prev => ({ ...prev, payment_method: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="momo">Mobile Money (MoMo)</SelectItem>
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Reference (Optional)</Label>
                      <Input
                        placeholder="Transaction ID or reference number"
                        value={payoutForm.payment_reference}
                        onChange={(e) => setPayoutForm(prev => ({ ...prev, payment_reference: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        placeholder="Add any notes about this payment"
                        value={payoutForm.notes}
                        onChange={(e) => setPayoutForm(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium">Payment Summary</p>
                      {(() => {
                        const selectedDetails = allEarnings.filter(e => selectedEarnings.includes(e.id));
                        const usdAmount = selectedDetails
                          .filter(e => e.payment_currency === "USD" || !e.payment_currency)
                          .reduce((sum, e) => sum + Number(e.instructor_share_usd || e.instructor_share), 0);
                        const rwfAmount = selectedDetails
                          .filter(e => e.payment_currency === "RWF")
                          .reduce((sum, e) => sum + Number(e.instructor_share), 0);
                        return (
                          <div className="mt-2 space-y-1">
                            {usdAmount > 0 && (
                              <p className="text-lg font-bold text-green-600">${usdAmount.toFixed(2)} USD</p>
                            )}
                            {rwfAmount > 0 && (
                              <p className="text-lg font-bold text-blue-600">RWF {rwfAmount.toLocaleString()}</p>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleProcessPayout}
                      disabled={processingPayout || !payoutForm.payment_method}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingPayout ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm Payment
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Certificate Designer Tab */}
            <TabsContent value="certificates" className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Award className="w-6 h-6" />
                    Certificate Templates
                  </h2>
                  <p className="text-muted-foreground">
                    Manage and design certificate templates with drag-and-drop placeholders
                  </p>
                </div>
              </div>
              <CertificateTemplateManager />
            </TabsContent>

            {/* Corporate Training Tab */}
            <TabsContent value="corporate" className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Building2 className="w-6 h-6" />
                    Corporate Training
                  </h2>
                  <p className="text-muted-foreground">
                    Manage corporate accounts, quote requests, and invoices
                  </p>
                </div>
              </div>
              <AdminCorporateManagement />
            </TabsContent>

            {/* Collaborations Tab */}
            <TabsContent value="collaborations" className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    Collaborations
                  </h2>
                  <p className="text-muted-foreground">
                    Manage collaboration and partnership requests
                  </p>
                </div>
              </div>
              <AdminCollaborationManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* User Action Confirmation Dialog */}
      <AlertDialog open={userActionDialogOpen} onOpenChange={setUserActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userActionType === "suspend" ? "Suspend User" : userActionType === "reactivate" ? "Reactivate User" : "Remove User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userActionType === "suspend" 
                ? `Are you sure you want to suspend ${selectedUser?.full_name || selectedUser?.email}? This will remove all their roles and restrict their access.`
                : userActionType === "reactivate"
                ? `Are you sure you want to reactivate ${selectedUser?.full_name || selectedUser?.email}? This will restore their access and reactivate any suspended enrollments.`
                : `Are you sure you want to remove ${selectedUser?.full_name || selectedUser?.email}? This will remove them from all courses and delete their roles. This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingUserAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUserAction}
              disabled={processingUserAction}
              className={
                userActionType === "remove" 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                  : userActionType === "reactivate"
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-orange-600 text-white hover:bg-orange-700"
              }
            >
              {processingUserAction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                userActionType === "suspend" ? "Suspend" : userActionType === "reactivate" ? "Reactivate" : "Remove"
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

export default Admin;