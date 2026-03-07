import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Award, User, BookOpen, Calendar, BarChart2, ClipboardList, Clock, GraduationCap, Loader2 } from "lucide-react";

interface CertificateInfo {
  certificate_number: string;
  issued_at: string;
  student_name: string;
  course_title: string;
  school: string;
  duration: string | null;
  avg_quiz_score: number | null;
  avg_assignment_score: number | null;
  completed_date: string;
}

const CertificateVerify = () => {
  const { certNumber } = useParams<{ certNumber: string }>();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<CertificateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      if (!certNumber) {
        setError("No certificate number provided.");
        setLoading(false);
        return;
      }

      try {
        // Fetch certificate
        const { data: cert, error: certError } = await supabase
          .from("certificates")
          .select("certificate_number, issued_at, user_id, course_id")
          .eq("certificate_number", certNumber)
          .single();

        if (certError || !cert) {
          setError("Certificate not found. It may be invalid or revoked.");
          setLoading(false);
          return;
        }

        // Fetch profile, course in parallel
        const [profileRes, courseRes] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", cert.user_id).single(),
          supabase.from("courses").select("title, school").eq("id", cert.course_id).single(),
        ]);

        const studentName = profileRes.data?.full_name || "Student";
        const courseTitle = courseRes.data?.title || "Course";
        const school = courseRes.data?.school || "";

        // Fetch quiz attempts for average
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("score, max_score, quiz_id")
          .eq("user_id", cert.user_id)
          .not("completed_at", "is", null);

        // Filter attempts for this course's quizzes
        let avgQuiz: number | null = null;
        if (attempts && attempts.length > 0) {
          // Get quizzes for this course
          const { data: quizzes } = await supabase
            .from("quizzes")
            .select("id")
            .eq("course_id", cert.course_id);

          const quizIds = new Set((quizzes || []).map((q) => q.id));
          const courseAttempts = attempts.filter((a) => quizIds.has(a.quiz_id));

          if (courseAttempts.length > 0) {
            const totalPct = courseAttempts.reduce((sum, a) => {
              const pct = a.max_score && a.max_score > 0 ? (a.score || 0) / a.max_score * 100 : 0;
              return sum + pct;
            }, 0);
            avgQuiz = Math.round(totalPct / courseAttempts.length);
          }
        }

        // Fetch assignment submissions for average
        let avgAssignment: number | null = null;
        const { data: assignments } = await supabase
          .from("assignments")
          .select("id, max_score")
          .eq("course_id", cert.course_id);

        if (assignments && assignments.length > 0) {
          const assignmentIds = assignments.map((a) => a.id);
          const { data: submissions } = await supabase
            .from("assignment_submissions")
            .select("score, assignment_id")
            .eq("user_id", cert.user_id)
            .in("assignment_id", assignmentIds)
            .not("score", "is", null);

          if (submissions && submissions.length > 0) {
            const totalPct = submissions.reduce((sum, s) => {
              const assignment = assignments.find((a) => a.id === s.assignment_id);
              const maxScore = assignment?.max_score || 100;
              return sum + ((s.score || 0) / maxScore) * 100;
            }, 0);
            avgAssignment = Math.round(totalPct / submissions.length);
          }
        }

        setInfo({
          certificate_number: cert.certificate_number,
          issued_at: cert.issued_at,
          student_name: studentName,
          course_title: courseTitle,
          school,
          avg_quiz_score: avgQuiz,
          avg_assignment_score: avgAssignment,
          completed_date: new Date(cert.issued_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        });
      } catch (err) {
        setError("An error occurred while verifying the certificate.");
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [certNumber]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Award className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Certificate Verification</h1>
          <p className="text-muted-foreground text-sm mt-1">Verify the authenticity of this certificate</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <XCircle className="w-12 h-12 text-destructive" />
              <div>
                <h2 className="text-lg font-semibold text-destructive">Invalid Certificate</h2>
                <p className="text-muted-foreground text-sm mt-1">{error}</p>
              </div>
              <Badge variant="destructive">Not Verified</Badge>
            </CardContent>
          </Card>
        ) : info ? (
          <Card className="border-green-500/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                <div>
                  <CardTitle className="text-base text-green-700 dark:text-green-400">Certificate Verified</CardTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{info.certificate_number}</p>
                </div>
                <Badge className="ml-auto bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                  Authentic
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <InfoRow
                  icon={<User className="w-4 h-4 text-primary" />}
                  label="Student Name"
                  value={info.student_name}
                />
                <InfoRow
                  icon={<BookOpen className="w-4 h-4 text-primary" />}
                  label="Course"
                  value={info.course_title}
                />
                {info.school && (
                  <InfoRow
                    icon={<Award className="w-4 h-4 text-primary" />}
                    label="School"
                    value={info.school}
                  />
                )}
                <InfoRow
                  icon={<Calendar className="w-4 h-4 text-primary" />}
                  label="Completed Date"
                  value={info.completed_date}
                />
                {info.avg_quiz_score !== null && (
                  <InfoRow
                    icon={<BarChart2 className="w-4 h-4 text-primary" />}
                    label="Average Quiz Score"
                    value={`${info.avg_quiz_score}%`}
                  />
                )}
                {info.avg_assignment_score !== null && (
                  <InfoRow
                    icon={<ClipboardList className="w-4 h-4 text-primary" />}
                    label="Average Assignment Score"
                    value={`${info.avg_assignment_score}%`}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
    <span className="shrink-0">{icon}</span>
    <span className="text-sm text-muted-foreground w-40 shrink-0">{label}</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);

export default CertificateVerify;
