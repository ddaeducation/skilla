import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Award, Download, Loader2, CheckCircle, Clock, GraduationCap } from "lucide-react";
import { User } from "@supabase/supabase-js";

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
  percentage: number;
  isComplete: boolean;
  hasCertificate: boolean;
}

interface CertificatesSectionProps {
  user: User;
}

const CertificatesSection = ({ user }: CertificatesSectionProps) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCertificatesAndProgress();
  }, [user.id]);

  const fetchCertificatesAndProgress = async () => {
    try {
      // Fetch existing certificates
      const { data: certs, error: certsError } = await supabase
        .from("certificates")
        .select(`
          id,
          certificate_number,
          issued_at,
          pdf_url,
          course:courses(id, title, school)
        `)
        .eq("user_id", user.id);

      if (certsError) throw certsError;

      // Fetch enrollments with course info
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select(`
          course_id,
          course:courses(id, title, school)
        `)
        .eq("user_id", user.id)
        .eq("payment_status", "completed");

      if (enrollError) throw enrollError;

      // Fetch lesson content for each enrolled course
      const courseIds = enrollments?.map(e => e.course_id) || [];
      
      const { data: lessons, error: lessonsError } = await supabase
        .from("lesson_content")
        .select("id, course_id")
        .in("course_id", courseIds.length > 0 ? courseIds : ['no-courses']);

      if (lessonsError) throw lessonsError;

      // Fetch student progress
      const { data: progress, error: progressError } = await supabase
        .from("student_progress")
        .select("lesson_id, course_id, completed")
        .eq("user_id", user.id)
        .in("course_id", courseIds.length > 0 ? courseIds : ['no-courses']);

      if (progressError) throw progressError;

      // Calculate progress for each course
      const certificateIds = new Set(certs?.map(c => c.course?.id) || []);
      
      const progressData: CourseProgress[] = (enrollments || []).map(enrollment => {
        const courseLessons = lessons?.filter(l => l.course_id === enrollment.course_id) || [];
        const courseProgress = progress?.filter(p => p.course_id === enrollment.course_id) || [];
        const completedLessons = courseProgress.filter(p => p.completed).length;
        const totalLessons = courseLessons.length;
        const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        
        return {
          courseId: enrollment.course_id,
          courseTitle: enrollment.course?.title || "Unknown Course",
          school: enrollment.course?.school || "Unknown School",
          completedLessons,
          totalLessons,
          percentage,
          isComplete: totalLessons > 0 && completedLessons >= totalLessons,
          hasCertificate: certificateIds.has(enrollment.course_id)
        };
      });

      setCertificates(certs as Certificate[] || []);
      setCourseProgress(progressData);
    } catch (error) {
      console.error("Error fetching certificates:", error);
      toast({
        title: "Error",
        description: "Failed to load certificates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async (courseId: string) => {
    setGenerating(courseId);
    try {
      const { data, error } = await supabase.functions.invoke("generate-certificate", {
        body: { courseId },
      });

      if (error) throw error;

      toast({
        title: "Certificate Generated!",
        description: "Your certificate has been created successfully.",
      });

      // Refresh the list
      await fetchCertificatesAndProgress();
    } catch (error: any) {
      console.error("Error generating certificate:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate certificate",
        variant: "destructive",
      });
    } finally {
      setGenerating(null);
    }
  };

  const downloadCertificate = (pdfUrl: string | null, certificateNumber: string) => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else {
      toast({
        title: "Certificate Ready",
        description: `Certificate #${certificateNumber} is available. PDF download coming soon.`,
      });
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Certificates</h1>
        <p className="text-muted-foreground">
          Your earned certificates of completion
        </p>
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
                    onClick={() => downloadCertificate(cert.pdf_url, cert.certificate_number)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Certificate
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
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    All {course.totalLessons} lessons completed
                  </div>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => generateCertificate(course.courseId)}
                    disabled={generating === course.courseId}
                  >
                    {generating === course.courseId ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4 mr-2" />
                        Claim Certificate
                      </>
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
                      {course.completedLessons} of {course.totalLessons} lessons completed
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
    </div>
  );
};

export default CertificatesSection;
