import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { certNumber } = await req.json();
    if (!certNumber) {
      return new Response(JSON.stringify({ error: "No certificate number provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch certificate
    const { data: cert, error: certError } = await supabase
      .from("certificates")
      .select("certificate_number, issued_at, user_id, course_id")
      .eq("certificate_number", certNumber)
      .maybeSingle();

    if (certError || !cert) {
      return new Response(JSON.stringify({ error: "Certificate not found. It may be invalid or revoked." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profile + course in parallel
    const [profileRes, courseRes] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", cert.user_id).maybeSingle(),
      supabase.from("courses").select("title, school, duration").eq("id", cert.course_id).maybeSingle(),
    ]);

    const studentName = profileRes.data?.full_name || "Student";
    const courseTitle = courseRes.data?.title || "Course";
    const school = courseRes.data?.school || "";
    const duration = courseRes.data?.duration || null;

    // Quiz average
    let avgQuiz: number | null = null;
    const { data: quizzes } = await supabase
      .from("quizzes")
      .select("id")
      .eq("course_id", cert.course_id);

    if (quizzes && quizzes.length > 0) {
      const quizIds = quizzes.map((q: any) => q.id);
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("score, max_score, quiz_id")
        .eq("user_id", cert.user_id)
        .not("completed_at", "is", null)
        .in("quiz_id", quizIds);

      if (attempts && attempts.length > 0) {
        const totalPct = attempts.reduce((sum: number, a: any) => {
          const pct = a.max_score && a.max_score > 0 ? (a.score || 0) / a.max_score * 100 : 0;
          return sum + pct;
        }, 0);
        avgQuiz = Math.round(totalPct / attempts.length);
      }
    }

    // Assignment average
    let avgAssignment: number | null = null;
    const { data: assignments } = await supabase
      .from("assignments")
      .select("id, max_score")
      .eq("course_id", cert.course_id);

    if (assignments && assignments.length > 0) {
      const assignmentIds = assignments.map((a: any) => a.id);
      const { data: submissions } = await supabase
        .from("assignment_submissions")
        .select("score, assignment_id")
        .eq("user_id", cert.user_id)
        .in("assignment_id", assignmentIds)
        .not("score", "is", null);

      if (submissions && submissions.length > 0) {
        const totalPct = submissions.reduce((sum: number, s: any) => {
          const assignment = assignments.find((a: any) => a.id === s.assignment_id);
          const maxScore = assignment?.max_score || 100;
          return sum + ((s.score || 0) / maxScore) * 100;
        }, 0);
        avgAssignment = Math.round(totalPct / submissions.length);
      }
    }

    const result = {
      certificate_number: cert.certificate_number,
      issued_at: cert.issued_at,
      student_name: studentName,
      course_title: courseTitle,
      school,
      duration,
      avg_quiz_score: avgQuiz,
      avg_assignment_score: avgAssignment,
      completed_date: new Date(cert.issued_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "An error occurred while verifying the certificate." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
