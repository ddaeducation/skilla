import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CourseAssistant from "@/components/CourseAssistant";
import LMSSidebar from "@/components/LMSSidebar";
import CertificatesSection from "@/components/CertificatesSection";
import GradeBook from "@/components/GradeBook";
import { StudentAssignmentSubmission } from "@/components/StudentAssignmentSubmission";
import { StudentQuizTaker } from "@/components/StudentQuizTaker";
import LeaderboardSection from "@/components/LeaderboardSection";
import { AnnouncementsPanel } from "@/components/communication/AnnouncementsPanel";
import { useLearningTimeStats } from "@/hooks/useLessonTimeTracking";
import WeeklyLearningChart from "@/components/WeeklyLearningChart";
import { DiscussionForums } from "@/components/communication/DiscussionForums";
import { MessagesPanel } from "@/components/communication/MessagesPanel";
import { LiveSessionsPanel } from "@/components/communication/LiveSessionsPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Clock, 
  DollarSign, 
  Mail, 
  RefreshCw, 
  GraduationCap, 
  TrendingUp, 
  Award, 
  FileText,
  ClipboardCheck,
  MessageSquare,
  Bell,
  
  BarChart3,
  Video,
  HelpCircle,
  Calendar,
  CheckCircle,
  Play,
  Download
} from "lucide-react";
import { User } from "@supabase/supabase-js";

const SCHOOLS = [
  "Data Engineering",
  "Product Design", 
  "Data & Analytics",
  "Business Studies",
  "Creative Economy",
  "Business Computing"
] as const;

const getCategoryBadgeStyle = (category: string) => {
  switch (category) {
    case "Short-Course":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Professional":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "Masterclass":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const LMS = () => {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [activeView, setActiveView] = useState("home");
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchCourses();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEnrollments(session.user.id);
        fetchAssignments(session.user.id);
        fetchQuizzes(session.user.id);
        fetchProgress(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchEnrollments(session.user.id);
    fetchAssignments(session.user.id);
    fetchQuizzes(session.user.id);
    fetchProgress(session.user.id);
  };

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      });
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  };

  const fetchEnrollments = async (userId: string) => {
    const { data, error } = await supabase
      .from("enrollments")
      .select("course_id, payment_status")
      .eq("user_id", userId);

    if (!error && data) {
      setEnrollments(data);
    }
  };

  const fetchAssignments = async (userId: string) => {
    const { data } = await supabase
      .from("assignments")
      .select("*, courses(title)")
      .order("due_date", { ascending: true });
    
    if (data) setAssignments(data);
  };

  const fetchQuizzes = async (userId: string) => {
    const { data } = await supabase
      .from("quizzes")
      .select("*, courses(title)")
      .order("created_at", { ascending: false });
    
    if (data) setQuizzes(data);

    // Fetch quiz attempts for the user
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("user_id", userId);
    
    if (attempts) setQuizAttempts(attempts);
  };

  const getQuizStatus = (quizId: string) => {
    const attempts = quizAttempts.filter(a => a.quiz_id === quizId);
    if (attempts.length === 0) return "not_started";
    
    const hasCompleted = attempts.some(a => a.completed_at !== null);
    if (hasCompleted) return "completed";
    
    return "in_progress";
  };

  const getQuizBestScore = (quizId: string) => {
    const completedAttempts = quizAttempts.filter(
      a => a.quiz_id === quizId && a.completed_at !== null
    );
    if (completedAttempts.length === 0) return null;
    
    return completedAttempts.reduce((best, attempt) => {
      const percentage = attempt.max_score > 0 
        ? Math.round((attempt.score / attempt.max_score) * 100) 
        : 0;
      return percentage > best ? percentage : best;
    }, 0);
  };

  const fetchProgress = async (userId: string) => {
    const { data } = await supabase
      .from("student_progress")
      .select("*, lesson_content(title), courses(title)")
      .eq("user_id", userId);
    
    if (data) setProgress(data);
  };

  const isEnrolled = (courseId: string) => {
    return enrollments.some(
      (e) => e.course_id === courseId && e.payment_status === "completed"
    );
  };

  const handleEnroll = (courseId: string) => {
    navigate(`/course/${courseId}`);
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    setResendingEmail(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/lms`,
      }
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email sent!",
        description: "Please check your inbox for the verification link.",
      });
    }
    setResendingEmail(false);
  };

  const isEmailVerified = user?.email_confirmed_at != null;
  const enrolledCourses = courses.filter((course) => isEnrolled(course.id));
  const enrolledCourseIds = enrolledCourses.map((c) => c.id);
  const completedLessons = progress.filter(p => p.completed).length;
  
  // Use the time tracking hook
  const { stats: timeStats } = useLearningTimeStats(user?.id);
  const totalTimeSpent = timeStats.totalTime || progress.reduce((acc, p) => acc + (p.time_spent_seconds || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show email verification required message
  if (user && !isEmailVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription>
              Please verify your email address to access your courses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We sent a verification link to <strong>{user.email}</strong>. 
              Please check your inbox and click the link to verify your account.
            </p>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleResendVerification} 
                disabled={resendingEmail}
                variant="outline"
              >
                {resendingEmail ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => window.location.reload()}
              >
                I've verified my email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case "home":
        return (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'}!
              </h1>
              <p className="text-muted-foreground">
                Continue your learning journey
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{enrolledCourses.length}</p>
                      <p className="text-sm text-muted-foreground">Enrolled Courses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-500/10">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{completedLessons}</p>
                      <p className="text-sm text-muted-foreground">Lessons Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-orange-500/10">
                      <Clock className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalTimeSpent >= 3600 ? `${Math.floor(totalTimeSpent / 3600)}h ${Math.floor((totalTimeSpent % 3600) / 60)}m` : `${Math.floor(totalTimeSpent / 60)}m`}</p>
                      <p className="text-sm text-muted-foreground">Time Spent</p>
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
                      <p className="text-sm text-muted-foreground">Available Courses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Continue Learning Section */}
            {enrolledCourses.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Continue Learning</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {enrolledCourses.slice(0, 3).map((course) => (
                    <Card key={course.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        <CardDescription>{course.school}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          className="w-full"
                          onClick={() => navigate(`/course/${course.id}`)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Continue
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Get Started Section */}
            {enrolledCourses.length === 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Get Started</h2>
                <p className="text-muted-foreground mb-4">
                  You haven't enrolled in any courses yet. Browse our catalog to get started!
                </p>
                <Button onClick={() => setActiveView("courses")}>
                  Browse Courses
                </Button>
              </div>
            )}

            {/* Weekly Learning Chart */}
            <WeeklyLearningChart userId={user?.id} />
          </div>
        );

      case "courses":
        const filteredCourses = selectedSchool 
          ? courses.filter(c => c.school === selectedSchool)
          : courses;
        
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">All Courses</h1>
              <p className="text-muted-foreground">
                Explore our courses organized by schools
              </p>
            </div>

            {/* School Filter Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Button
                variant={selectedSchool === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSchool(null)}
              >
                All Schools
              </Button>
              {SCHOOLS.map((school) => (
                <Button
                  key={school}
                  variant={selectedSchool === school ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSchool(school)}
                >
                  {school}
                </Button>
              ))}
            </div>

            {filteredCourses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-xl text-muted-foreground">
                  {selectedSchool 
                    ? `No courses available in ${selectedSchool} yet.`
                    : "No courses available yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {selectedSchool ? (
                  // Show filtered courses
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((course) => (
                      <Card key={course.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle>{course.title}</CardTitle>
                            <div className="flex gap-1 shrink-0">
                              {course.category && (
                                <Badge variant="outline" className={getCategoryBadgeStyle(course.category)}>
                                  {course.category}
                                </Badge>
                              )}
                              {Number(course.price) === 0 && (
                                <Badge className="bg-green-500 hover:bg-green-600 text-white">Free</Badge>
                              )}
                            </div>
                          </div>
                          <CardDescription>
                            <Badge variant="secondary" className="mt-1">{course.school}</Badge>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm line-clamp-2">{course.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {course.duration && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {course.duration}
                              </div>
                            )}
                            {Number((course as any).monthly_price ?? course.price) > 0 && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                ${(course as any).monthly_price ?? course.price}/mo
                              </div>
                            )}
                          </div>
                          {isEnrolled(course.id) ? (
                            <Button
                              className="w-full"
                              onClick={() => navigate(`/course/${course.id}`)}
                            >
                              <BookOpen className="w-4 h-4 mr-2" />
                              Continue Learning
                            </Button>
                          ) : (
                            <Button
                              className="w-full"
                              variant="outline"
                              onClick={() => handleEnroll(course.id)}
                            >
                              Enroll Now
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // Show courses grouped by school
                  SCHOOLS.map((school) => {
                    const schoolCourses = courses.filter(c => c.school === school);
                    if (schoolCourses.length === 0) return null;
                    
                    return (
                      <div key={school}>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-semibold">{school}</h2>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedSchool(school)}
                          >
                            View All ({schoolCourses.length})
                          </Button>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {schoolCourses.slice(0, 3).map((course) => (
                            <Card key={course.id} className="hover:shadow-lg transition-shadow">
                              <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                  <CardTitle className="text-lg">{course.title}</CardTitle>
                                  <div className="flex gap-1 shrink-0">
                                    {course.category && (
                                      <Badge variant="outline" className={getCategoryBadgeStyle(course.category)}>
                                        {course.category}
                                      </Badge>
                                    )}
                                    {Number(course.price) === 0 && (
                                      <Badge className="bg-green-500 hover:bg-green-600 text-white">Free</Badge>
                                    )}
                                  </div>
                                </div>
                                <CardDescription>
                                  <Badge variant="secondary" className="mt-1">{course.school}</Badge>
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <p className="text-sm line-clamp-2">{course.description}</p>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {course.duration && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-4 h-4" />
                                      {course.duration}
                                    </div>
                                  )}
                                  {Number((course as any).monthly_price ?? course.price) > 0 && (
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="w-4 h-4" />
                                      ${(course as any).monthly_price ?? course.price}/mo
                                    </div>
                                  )}
                                </div>
                                {isEnrolled(course.id) ? (
                                  <Button
                                    className="w-full"
                                    onClick={() => navigate(`/course/${course.id}`)}
                                  >
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Continue
                                  </Button>
                                ) : (
                                  <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => handleEnroll(course.id)}
                                  >
                                    Enroll Now
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );

      case "my-courses":
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">My Courses</h1>
              <p className="text-muted-foreground">
                Your enrolled courses
              </p>
            </div>

            {enrolledCourses.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-xl text-muted-foreground mb-4">You haven't enrolled in any courses yet.</p>
                <Button onClick={() => setActiveView("courses")}>
                  Browse Courses
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle>{course.title}</CardTitle>
                      <CardDescription>{course.school}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm line-clamp-2">{course.description}</p>
                      <Button
                        className="w-full"
                        onClick={() => navigate(`/course/${course.id}`)}
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Continue Learning
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case "lessons":
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Lessons</h1>
              <p className="text-muted-foreground">
                Access your course lessons and materials
              </p>
            </div>

            {enrolledCourses.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-xl text-muted-foreground mb-2">No lessons available</p>
                <p className="text-muted-foreground">Enroll in a course to access lessons</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {enrolledCourses.map((course) => (
                  <Card key={course.id} className="flex flex-col hover:shadow-md transition-shadow">
                    <CardHeader className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                        {course.category && (
                          <Badge variant="outline" className={`shrink-0 text-xs ${getCategoryBadgeStyle(course.category)}`}>
                            {course.category}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{course.school}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button className="w-full" onClick={() => navigate(`/course/${course.id}`)}>
                        <Play className="w-4 h-4 mr-2" />
                        View Lessons
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case "assignments":
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Assignments</h1>
              <p className="text-muted-foreground">
                View and submit your assignments
              </p>
            </div>

            {assignments.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-xl text-muted-foreground mb-2">No assignments yet</p>
                <p className="text-muted-foreground">Your assignments will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} className="flex flex-col hover:shadow-md transition-shadow">
                    <CardHeader className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">{assignment.title}</CardTitle>
                        {assignment.due_date && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(assignment.due_date).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-1">{assignment.courses?.title}</CardDescription>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{assignment.description}</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => setSelectedAssignment(assignment)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Details & Submit
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Assignment Submission Dialog */}
            {selectedAssignment && (
              <StudentAssignmentSubmission
                assignmentId={selectedAssignment.id}
                assignmentTitle={selectedAssignment.title}
                assignmentDescription={selectedAssignment.description}
                instructions={selectedAssignment.instructions}
                maxScore={selectedAssignment.max_score || 100}
                dueDate={selectedAssignment.due_date}
                open={!!selectedAssignment}
                onClose={() => setSelectedAssignment(null)}
                onSubmit={() => {
                  if (user) fetchAssignments(user.id);
                }}
              />
            )}
          </div>
        );

      case "quizzes":
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Quizzes & Exams</h1>
              <p className="text-muted-foreground">
                Test your knowledge with quizzes and exams
              </p>
            </div>

            {quizzes.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-xl text-muted-foreground mb-2">No quizzes available</p>
                <p className="text-muted-foreground">Quizzes will appear here when available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quizzes.map((quiz) => {
                  const status = getQuizStatus(quiz.id);
                  const bestScore = getQuizBestScore(quiz.id);
                  
                  return (
                    <Card key={quiz.id} className="flex flex-col hover:shadow-md transition-shadow">
                      <CardHeader className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                          {status === "completed" && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {status === "in_progress" && (
                            <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 shrink-0">
                              <Clock className="w-3 h-3 mr-1" />
                              In Progress
                            </Badge>
                          )}
                          {status === "not_started" && (
                            <Badge variant="outline" className="shrink-0">
                              Not Started
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="line-clamp-1">{quiz.courses?.title}</CardDescription>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{quiz.description}</p>
                        {bestScore !== null && (
                          <p className="text-xs font-medium text-primary mt-1">
                            Best Score: {bestScore}%
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {quiz.time_limit_minutes && (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="w-3 h-3" />
                              {quiz.time_limit_minutes} min
                            </Badge>
                          )}
                          <Badge variant="outline" className="gap-1">
                            <Award className="w-3 h-3" />
                            {quiz.passing_score}%
                          </Badge>
                        </div>
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => setSelectedQuiz(quiz)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {status === "completed" ? "Retake Quiz" : status === "in_progress" ? "Continue Quiz" : "Start Quiz"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Quiz Taker Dialog */}
            {selectedQuiz && (
              <StudentQuizTaker
                quizId={selectedQuiz.id}
                quizTitle={selectedQuiz.title}
                quizDescription={selectedQuiz.description}
                passingScore={selectedQuiz.passing_score || 70}
                timeLimitMinutes={selectedQuiz.time_limit_minutes}
                open={!!selectedQuiz}
                onClose={() => setSelectedQuiz(null)}
                onComplete={(passed, score, maxScore) => {
                  if (user) fetchQuizzes(user.id);
                  toast({
                    title: passed ? "Congratulations!" : "Quiz Completed",
                    description: `You scored ${score}/${maxScore} (${Math.round((score / maxScore) * 100)}%)`,
                  });
                }}
              />
            )}
          </div>
        );

      case "announcements":
        return user ? (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Announcements</h1>
              <p className="text-muted-foreground">
                Stay updated with the latest news and announcements
              </p>
            </div>
            <AnnouncementsPanel
              userId={user.id}
              userRole="student"
              courses={enrolledCourses}
              enrolledCourseIds={enrolledCourses.map(c => c.id)}
            />
          </div>
        ) : null;

      case "discussions":
        return user ? (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Discussion Forums</h1>
              <p className="text-muted-foreground">
                Connect with instructors and fellow learners
              </p>
            </div>
            <DiscussionForums
              userId={user.id}
              userRole="student"
              courses={enrolledCourses}
            />
          </div>
        ) : null;

      case "messages":
        return user ? (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Messages</h1>
              <p className="text-muted-foreground">
                Your private messages and notifications
              </p>
            </div>
            <MessagesPanel userId={user.id} />
          </div>
        ) : null;

      case "live-sessions":
        return user ? (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Live Sessions</h1>
              <p className="text-muted-foreground">
                Join live classes and webinars
              </p>
            </div>
            <LiveSessionsPanel
              userId={user.id}
              userRole="student"
              courses={enrolledCourses}
            />
          </div>
        ) : null;

      case "grades":
        return user ? <GradeBook user={user} /> : null;

      case "certificates":
        return user ? <CertificatesSection user={user} /> : null;


      case "leaderboard":
        return user ? (
          <LeaderboardSection user={user} enrolledCourseIds={enrolledCourseIds} />
        ) : null;


      case "settings":
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Settings</h1>
              <p className="text-muted-foreground">
                Manage your account settings
              </p>
            </div>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your profile and preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => navigate("/profile")}>
                    Go to Profile
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Manage how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Notification settings coming soon</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>Control your privacy and data</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Privacy settings coming soon</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "help":
        return (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Help & Support</h1>
              <p className="text-muted-foreground">
                Get help and find answers to your questions
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>FAQs</CardTitle>
                  <CardDescription>Find answers to common questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" onClick={() => navigate("/#faq")}>
                    View FAQs
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Support</CardTitle>
                  <CardDescription>Get in touch with our support team</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Email us at: <a href="mailto:globalnexusinstitute@gmail.com" className="text-primary font-medium hover:underline">globalnexusinstitute@gmail.com</a>
                  </p>
                  <Button variant="outline" asChild>
                    <a href="mailto:globalnexusinstitute@gmail.com">
                      <Mail className="w-4 h-4 mr-2" />
                      Contact Us
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Guide</CardTitle>
                  <CardDescription>Learn how to use the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    View Guide
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Technical Support</CardTitle>
                  <CardDescription>Report technical issues</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <LMSSidebar user={user} activeView={activeView} onViewChange={setActiveView} />
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6">
            {renderContent()}
          </main>
        </SidebarInset>
      </div>
      <CourseAssistant />
    </SidebarProvider>
  );
};

export default LMS;
