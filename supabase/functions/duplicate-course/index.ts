import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth client – validate the user
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client – unrestricted for cross-table writes
    const admin = createClient(supabaseUrl, serviceKey);

    const { courseId, newTitle, options } = await req.json();

    if (!courseId || !newTitle) {
      return new Response(JSON.stringify({ error: "courseId and newTitle are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller owns (or is admin on) the source course
    const { data: sourceCourse, error: courseErr } = await admin
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseErr || !sourceCourse) {
      return new Response(JSON.stringify({ error: "Source course not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"])
      .maybeSingle();

    const isAdmin = !!roleRow;
    if (sourceCourse.instructor_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "You don't have permission to duplicate this course" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ──────────────────────────────────────────────
    // 1. Duplicate the course row
    // ──────────────────────────────────────────────
    const { id: _oldId, created_at: _ca, ...rest } = sourceCourse;
    const { data: newCourse, error: newCourseErr } = await admin
      .from("courses")
      .insert({
        ...rest,
        title: newTitle,
        publish_status: "draft",
        instructor_id: user.id,
        instructor_name: sourceCourse.instructor_name,
      })
      .select()
      .single();

    if (newCourseErr || !newCourse) {
      throw new Error(newCourseErr?.message || "Failed to create new course");
    }

    const newCourseId = newCourse.id;

    // ──────────────────────────────────────────────
    // 2. Sections
    // ──────────────────────────────────────────────
    // Maps old section id → new section id
    const sectionIdMap = new Map<string, string>();

    if (options?.sections) {
      const { data: sections } = await admin
        .from("course_sections")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");

      if (sections && sections.length > 0) {
        // Insert level 1 first, then level 2 (so parent_id refs are valid)
        const level1 = sections.filter(s => (s.section_level ?? 1) === 1);
        const level2 = sections.filter(s => (s.section_level ?? 1) === 2);

        for (const s of level1) {
          const { id: _sid, course_id: _cid, created_at: _sc, updated_at: _su, ...sRest } = s;
          const { data: newSection } = await admin
            .from("course_sections")
            .insert({ ...sRest, course_id: newCourseId, parent_id: null })
            .select()
            .single();
          if (newSection) sectionIdMap.set(s.id, newSection.id);
        }

        for (const s of level2) {
          const { id: _sid, course_id: _cid, created_at: _sc, updated_at: _su, ...sRest } = s;
          const newParentId = s.parent_id ? sectionIdMap.get(s.parent_id) ?? null : null;
          const { data: newSection } = await admin
            .from("course_sections")
            .insert({ ...sRest, course_id: newCourseId, parent_id: newParentId })
            .select()
            .single();
          if (newSection) sectionIdMap.set(s.id, newSection.id);
        }
      }
    }

    // ──────────────────────────────────────────────
    // 3. Lessons
    // ──────────────────────────────────────────────
    if (options?.lessons) {
      const { data: lessons } = await admin
        .from("lesson_content")
        .select("*")
        .eq("course_id", courseId);

      if (lessons && lessons.length > 0) {
        const lessonRows = lessons.map(({ id: _lid, course_id: _cid, created_at: _lc, updated_at: _lu, ...lRest }) => ({
          ...lRest,
          course_id: newCourseId,
          section_id: lRest.section_id ? (sectionIdMap.get(lRest.section_id) ?? null) : null,
        }));
        await admin.from("lesson_content").insert(lessonRows);
      }
    }

    // ──────────────────────────────────────────────
    // 4. Quizzes + questions + options
    // ──────────────────────────────────────────────
    if (options?.quizzes) {
      const { data: quizzes } = await admin
        .from("quizzes")
        .select("*")
        .eq("course_id", courseId);

      if (quizzes && quizzes.length > 0) {
        for (const quiz of quizzes) {
          const { id: oldQuizId, course_id: _cid, created_at: _qc, ...qRest } = quiz;
          const { data: newQuiz } = await admin
            .from("quizzes")
            .insert({
              ...qRest,
              course_id: newCourseId,
              section_id: qRest.section_id ? (sectionIdMap.get(qRest.section_id) ?? null) : null,
              lesson_id: null, // lesson IDs have changed; skip linking
            })
            .select()
            .single();

          if (!newQuiz) continue;

          // Copy questions
          const { data: questions } = await admin
            .from("quiz_questions")
            .select("*")
            .eq("quiz_id", oldQuizId);

          if (questions && questions.length > 0) {
            for (const q of questions) {
              const { id: oldQId, quiz_id: _qid, created_at: _qc2, ...qRestu } = q;
              const { data: newQ } = await admin
                .from("quiz_questions")
                .insert({ ...qRestu, quiz_id: newQuiz.id })
                .select()
                .single();

              if (!newQ) continue;

              // Copy options
              const { data: opts } = await admin
                .from("quiz_options")
                .select("*")
                .eq("question_id", oldQId);

              if (opts && opts.length > 0) {
                const optRows = opts.map(({ id: _oid, question_id: _qid2, ...oRest }) => ({
                  ...oRest,
                  question_id: newQ.id,
                }));
                await admin.from("quiz_options").insert(optRows);
              }
            }
          }
        }
      }
    }

    // ──────────────────────────────────────────────
    // 5. Assignments
    // ──────────────────────────────────────────────
    if (options?.assignments) {
      const { data: assignments } = await admin
        .from("assignments")
        .select("*")
        .eq("course_id", courseId);

      if (assignments && assignments.length > 0) {
        const aRows = assignments.map(({ id: _aid, course_id: _cid, created_at: _ac, ...aRest }) => ({
          ...aRest,
          course_id: newCourseId,
          section_id: aRest.section_id ? (sectionIdMap.get(aRest.section_id) ?? null) : null,
          lesson_id: null,
          due_date: null, // reset due date on copy
        }));
        await admin.from("assignments").insert(aRows);
      }
    }

    return new Response(
      JSON.stringify({ success: true, newCourseId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("duplicate-course error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
