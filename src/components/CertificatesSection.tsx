import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Award, Download, Loader2, CheckCircle, Clock, GraduationCap } from "lucide-react";
import { User } from "@supabase/supabase-js";
import CertificateRenderer, { CertificateData } from "@/components/CertificateRenderer";
import CourseRatingDialog from "@/components/CourseRatingDialog";

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  pdf_url: string | null;
  course: {
    id: string;
    title: string;
    school: string;
  };
}

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  school: string;
  completedLessons: number;
  totalLessons: number;
  passedQuizzes: number;
  totalQuizzes: number;
  submittedAssignments: number;
  totalAssignments: number;
  percentage: number;
  isComplete: boolean;
  hasCertificate: boolean;
}

interface CertificatesSectionProps {
  user: User;
}

// Hidden off-screen renderer for html2canvas capture
function HiddenCertificateRenderer({
  data,
  containerRef,
  onReady,
}: {
  data: CertificateData | null;
  containerRef: React.RefObject<HTMLDivElement>;
  onReady?: () => void;
}) {
  if (!data) return null;
  const w = data.template?.width || 842;
  const h = data.template?.height || 595;
  return (
    <div
      style={{
        position: "fixed",
        left: -9999,
        top: -9999,
        width: w,
        height: h,
        zIndex: -1,
        pointerEvents: "none",
      }}
    >
      <CertificateRenderer ref={containerRef} data={data} scale={1} onReady={onReady} />
    </div>
  );
}

const CertificatesSection = ({ user }: CertificatesSectionProps) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // For client-side PDF rendering
  const [renderData, setRenderData] = useState<CertificateData | null>(null);
  const renderRef = useRef<HTMLDivElement>(null);
  // Resolves when CertificateRenderer signals it's fully painted (QR included)
  const rendererReadyResolveRef = useRef<(() => void) | null>(null);

  // Rating dialog state
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [pendingDownloadCert, setPendingDownloadCert] = useState<Certificate | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchCertificatesAndProgress();
  }, [user.id]);

  const fetchCertificatesAndProgress = async () => {
    try {
      const { data: certs, error: certsError } = await supabase
        .from("certificates")
        .select(`id, certificate_number, issued_at, pdf_url, course:courses(id, title, school)`)
        .eq("user_id", user.id);
      if (certsError) throw certsError;

      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select(`course_id, course:courses(id, title, school)`)
        .eq("user_id", user.id)
        .eq("payment_status", "completed");
      if (enrollError) throw enrollError;

      const courseIds = enrollments?.map(e => e.course_id) || [];
      const fallback = ['no-courses'];

      const [
        { data: lessons },
        { data: progress },
        { data: quizzes },
        { data: quizAttempts },
        { data: assignments },
        { data: submissions },
      ] = await Promise.all([
        supabase.from("lesson_content").select("id, course_id").in("course_id", courseIds.length > 0 ? courseIds : fallback),
        supabase.from("student_progress").select("lesson_id, course_id, completed").eq("user_id", user.id).in("course_id", courseIds.length > 0 ? courseIds : fallback),
        supabase.from("quizzes").select("id, course_id").in("course_id", courseIds.length > 0 ? courseIds : fallback),
        supabase.from("quiz_attempts").select("quiz_id, passed").eq("user_id", user.id),
        supabase.from("assignments").select("id, course_id").in("course_id", courseIds.length > 0 ? courseIds : fallback),
        supabase.from("assignment_submissions").select("assignment_id").eq("user_id", user.id),
      ]);

      const certificateIds = new Set(certs?.map(c => c.course?.id) || []);
      const submittedAssignmentIds = new Set(submissions?.map(s => s.assignment_id) || []);
      const passedQuizIds = new Set((quizAttempts || []).filter(a => a.passed).map(a => a.quiz_id));

      const progressData: CourseProgress[] = (enrollments || []).map(enrollment => {
        const courseLessons = lessons?.filter(l => l.course_id === enrollment.course_id) || [];
        const cp = progress?.filter(p => p.course_id === enrollment.course_id) || [];
        const completedLessons = cp.filter(p => p.completed).length;
        const courseQuizzes = quizzes?.filter(q => q.course_id === enrollment.course_id) || [];
        const passedQuizzes = courseQuizzes.filter(q => passedQuizIds.has(q.id)).length;
        const courseAssignments = assignments?.filter(a => a.course_id === enrollment.course_id) || [];
        const submittedAssignments = courseAssignments.filter(a => submittedAssignmentIds.has(a.id)).length;
        const totalItems = courseLessons.length + courseQuizzes.length + courseAssignments.length;
        const completedItems = completedLessons + passedQuizzes + submittedAssignments;
        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        return {
          courseId: enrollment.course_id,
          courseTitle: enrollment.course?.title || "Unknown Course",
          school: enrollment.course?.school || "Unknown School",
          completedLessons,
          totalLessons: courseLessons.length,
          passedQuizzes,
          totalQuizzes: courseQuizzes.length,
          submittedAssignments,
          totalAssignments: courseAssignments.length,
          percentage,
          isComplete: totalItems > 0 && completedItems >= totalItems,
          hasCertificate: certificateIds.has(enrollment.course_id),
        };
      });

      setCertificates(certs as Certificate[] || []);
      setCourseProgress(progressData);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast({ title: "Error", description: "Failed to load certificates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async (courseId: string) => {
    setGenerating(courseId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-certificate", { body: { courseId } });
      if (error) throw error;
      toast({ title: "Certificate Generated!", description: "Your certificate has been created successfully." });
      await fetchCertificatesAndProgress();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to generate certificate", variant: "destructive" });
    } finally {
      setGenerating(null);
    }
  };

  // Fetches the certificate data + current template from backend, then renders client-side PDF
  const downloadCertificate = async (cert: Certificate) => {
    setDownloading(cert.id);
    try {
      // 1. Fetch current template for this course
      const courseId = cert.course?.id;
      const { data: templates } = await supabase
        .from("certificate_templates")
        .select("*")
        .or(`course_id.eq.${courseId},is_default.eq.true`)
        .order("course_id", { ascending: false, nullsFirst: false });

      const template = templates?.find(t => t.course_id === courseId) || templates?.find(t => t.is_default) || null;

      // 2. Fetch student profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // 3. Fetch course details
      const { data: course } = await supabase
        .from("courses")
        .select("title, school, instructor_name")
        .eq("id", courseId)
        .single();

      const appUrl = window.location.origin;
      const verificationUrl = `${appUrl}/certificate/verify/${cert.certificate_number}`;

      const issueDate = new Date(cert.issued_at).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });

      const certData: CertificateData = {
        studentName: profile?.full_name || user.email?.split("@")[0] || "Student",
        courseName: course?.title || cert.course?.title || "",
        schoolName: course?.school || cert.course?.school || "",
        certificateNumber: cert.certificate_number,
        issueDate,
        instructorName: course?.instructor_name || "Course Instructor",
        verificationUrl,
        template: template
          ? {
              placeholders: template.placeholders as any,
              width: template.width,
              height: template.height,
              background_url: template.background_url,
            }
          : undefined,
      };

      // 4. Mount the hidden renderer and wait for it to signal ready
      //    (which happens after QR codes are fetched and painted into DOM)
      await new Promise<void>((resolve) => {
        rendererReadyResolveRef.current = resolve;
        setRenderData(certData);
        // Safety fallback: resolve after 6s max to avoid hanging
        setTimeout(resolve, 6000);
      });

      // 5. Capture with html2canvas and produce PDF
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const el = renderRef.current;
      if (!el) throw new Error("Render element not available");

      const w = certData.template?.width || 842;
      const h = certData.template?.height || 595;
      const orientation = w > h ? "landscape" : "portrait";

      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        width: w,
        height: h,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const pdf = new jsPDF({ orientation, unit: "pt", format: [w, h] });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, w, h);
      pdf.save(`certificate-${cert.certificate_number}.pdf`);

      toast({ title: "Downloaded!", description: "Your certificate PDF has been saved." });
    } catch (error: any) {
      console.error("Certificate download error:", error);
      toast({ title: "Download Failed", description: error.message || "Failed to generate certificate PDF", variant: "destructive" });
    } finally {
      setDownloading(null);
      setRenderData(null);
      rendererReadyResolveRef.current = null;
    }
  };

  // Intercept download: show rating dialog first
  const handleDownloadClick = async (cert: Certificate) => {
    const courseId = cert.course?.id;
    if (!courseId) {
      downloadCertificate(cert);
      return;
    }

    // Check if already rated
    const { data: existingRating } = await supabase
      .from("course_ratings")
      .select("id")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingRating) {
      // Already rated, download directly
      downloadCertificate(cert);
    } else {
      // Show rating dialog first
      setPendingDownloadCert(cert);
      setRatingDialogOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedCourses = courseProgress.filter(c => c.isComplete && !c.hasCertificate);
  const inProgressCourses = courseProgress.filter(c => !c.isComplete);

  return (
    <div>
      {/* Hidden off-screen certificate renderer for PDF capture */}
      <HiddenCertificateRenderer
        data={renderData}
        containerRef={renderRef}
        onReady={() => {
          if (rendererReadyResolveRef.current) {
            rendererReadyResolveRef.current();
            rendererReadyResolveRef.current = null;
          }
        }}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Certificates</h1>
        <p className="text-muted-foreground">Your earned certificates of completion</p>
      </div>

      {/* Earned Certificates */}
      {certificates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Earned Certificates
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <Card key={cert.id} className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Award className="w-10 h-10 text-primary" />
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      Certified
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{cert.course?.title}</CardTitle>
                  <CardDescription>{cert.course?.school}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Certificate #{cert.certificate_number}</p>
                    <p>Issued: {new Date(cert.issued_at).toLocaleDateString()}</p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleDownloadClick(cert)}
                    disabled={!!downloading}
                  >
                    {downloading === cert.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Building PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download Certificate
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Ready to Claim */}
      {completedCourses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Ready to Claim
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedCourses.map((course) => (
              <Card key={course.courseId} className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <GraduationCap className="w-10 h-10 text-green-500" />
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      Course Complete
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{course.courseTitle}</CardTitle>
                  <CardDescription>{course.school}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      {course.completedLessons}/{course.totalLessons} lessons completed
                    </div>
                    {course.totalQuizzes > 0 && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {course.passedQuizzes}/{course.totalQuizzes} quizzes passed
                      </div>
                    )}
                    {course.totalAssignments > 0 && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        {course.submittedAssignments}/{course.totalAssignments} assignments submitted
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => generateCertificate(course.courseId)}
                    disabled={generating === course.courseId}
                  >
                    {generating === course.courseId ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                    ) : (
                      <><Award className="w-4 h-4 mr-2" />Claim Certificate</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* In Progress */}
      {inProgressCourses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            In Progress
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inProgressCourses.map((course) => (
              <Card key={course.courseId} className="opacity-80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{course.courseTitle}</CardTitle>
                  <CardDescription>{course.school}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2 text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{course.percentage}%</span>
                    </div>
                    <Progress value={course.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {course.completedLessons}/{course.totalLessons} lessons
                      {course.totalQuizzes > 0 && ` · ${course.passedQuizzes}/${course.totalQuizzes} quizzes`}
                      {course.totalAssignments > 0 && ` · ${course.submittedAssignments}/${course.totalAssignments} assignments`}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full" disabled>
                    <Award className="w-4 h-4 mr-2 opacity-50" />
                    Complete course to earn certificate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {certificates.length === 0 && completedCourses.length === 0 && inProgressCourses.length === 0 && (
        <div className="text-center py-12">
          <Award className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-xl text-muted-foreground mb-2">No certificates yet</p>
          <p className="text-muted-foreground">Enroll in courses and complete them to earn certificates</p>
        </div>
      )}
      {/* Rating Dialog */}
      <CourseRatingDialog
        open={ratingDialogOpen}
        onOpenChange={(open) => {
          setRatingDialogOpen(open);
          if (!open) setPendingDownloadCert(null);
        }}
        courseId={pendingDownloadCert?.course?.id || ""}
        courseTitle={pendingDownloadCert?.course?.title || ""}
        userId={user.id}
        onRatingSubmitted={() => {
          setRatingDialogOpen(false);
          if (pendingDownloadCert) {
            downloadCertificate(pendingDownloadCert);
            setPendingDownloadCert(null);
          }
        }}
      />
    </div>
  );
};

export default CertificatesSection;
