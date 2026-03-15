import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface GenerateFullCourseRequest {
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  modulesCount?: number;
  lessonsPerModule?: number;
  includeQuizzes?: boolean;
  includeAssignments?: boolean;
  difficulty?: "beginner" | "intermediate" | "advanced";
}

async function callAI(apiKey: string, messages: any[], retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      });

      if (response.status === 429) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }
        throw new Error("RATE_LIMIT");
      }
      if (response.status === 402) throw new Error("PAYMENT_REQUIRED");
      if (!response.ok) {
        const errText = await response.text();
        console.error(`AI error (${response.status}):`, errText);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No content generated");

      let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ");
      try {
        return JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error("Failed to parse AI response as JSON");
      }
    } catch (e) {
      if (attempt === retries || (e as Error).message === "RATE_LIMIT" || (e as Error).message === "PAYMENT_REQUIRED") throw e;
    }
  }
}

function stripHtml(text: string | null): string | null {
  if (!text) return null;
  return text.replace(/<[^>]*>/g, "").trim();
}

function buildContentPrompt(difficulty: string, includeQuizzes: boolean, includeAssignments: boolean) {
  return `You are a curriculum designer. Generate detailed, resource-rich lesson content for a ${difficulty}-level course.
Return valid JSON only.

CONTENT RULES:
- Each lesson: 700-1000 words of HTML content using <p>, <h2>, <h3>, <ul>, <ol>, <strong>, <em>, <a>, <blockquote> tags.
- Structure each lesson with these sections in order:

1. <h2>Lesson Title</h2> - Main heading
2. <h3>🎯 Learning Objectives</h3> - 3-4 bullet points of what students will learn
3. <h3>Introduction</h3> - Brief introduction to the topic
4. Core body content with explanations, examples, case studies. Include 3-5 inline hyperlinks using <a href="URL" target="_blank" rel="noopener noreferrer">descriptive text</a> to Wikipedia, official docs, authoritative sources, etc. These links should flow naturally within the text.
5. <h3>📝 Notes</h3> - Additional important notes, tips, or caveats for students
6. <h3>🔗 Useful Tools & Resources</h3> - 2-3 hyperlinks to interactive tools, practice platforms, or reference sites:
   <ul><li><a href="URL" target="_blank" rel="noopener noreferrer">Tool Name - Brief description</a></li></ul>
7. <h3>📝 Key Takeaways</h3> - 3-5 bullet points summarizing the lesson

DO NOT include any of these sections: "Watch & Learn", "More Recommended Videos", "Articles & Reading Materials". Only include inline hyperlinks within the body content.
IMPORTANT: All URLs MUST be real, well-known domains. Do NOT fabricate or guess URLs. If unsure about a specific URL, use the homepage of the relevant site instead.
${includeQuizzes ? "- Generate a quiz with 4-5 questions (single_choice, 4 options each, with detailed explanations)." : ""}
${includeAssignments ? "- Generate an assignment with HTML instructions including links to tools/references." : ""}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAnon.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check AI course generation permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("ai_course_generation_enabled")
      .eq("id", user.id)
      .maybeSingle();

    // Also check if user is admin (admins always have access)
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole && !profile?.ai_course_generation_enabled) {
      throw new Error("AI_ACCESS_DENIED");
    }

    const {
      courseId,
      courseTitle,
      courseDescription,
      modulesCount = 5,
      lessonsPerModule = 5,
      includeQuizzes = true,
      includeAssignments = true,
      difficulty = "intermediate",
    } = await req.json() as GenerateFullCourseRequest;

    // Verify course ownership
    const { data: course } = await supabase
      .from("courses")
      .select("id, instructor_id")
      .eq("id", courseId)
      .maybeSingle();

    if (!course) throw new Error("Course not found");

    const isOwner = course.instructor_id === user.id;
    if (!isOwner) {
      const { data: coInstructor } = await supabase
        .from("course_instructors")
        .select("id")
        .eq("course_id", courseId)
        .eq("instructor_id", user.id)
        .maybeSingle();
      if (!coInstructor) throw new Error("Access denied: you are not an instructor for this course");
    }

    console.log(`Generating course structure for: ${courseTitle}`);

    // Get the max order_index of existing top-level sections to append after them
    const { data: existingSections } = await supabase
      .from("course_sections")
      .select("order_index")
      .eq("course_id", courseId)
      .is("parent_id", null)
      .order("order_index", { ascending: false })
      .limit(1);

    const startModuleIndex = (existingSections?.[0]?.order_index ?? -1) + 1;
    console.log(`Appending new modules starting at order_index ${startModuleIndex}`);

    // STEP 1: Generate course outline
    const outlineData = await callAI(LOVABLE_API_KEY, [
      {
        role: "system",
        content: `You are a curriculum designer. Generate a course outline. Return valid JSON only. Difficulty: ${difficulty}.`,
      },
      {
        role: "user",
        content: `Create an outline for:
Title: "${courseTitle}"
Description: "${courseDescription}"
Modules: ${modulesCount}, Lessons per module: ${lessonsPerModule}

Return JSON:
{
  "modules": [
    {
      "title": "Module 1: Title",
      "description": "2-3 sentence description",
      "units": [
        {
          "title": "Unit 1.1: Title",
          "description": "2-3 sentence description",
          "lesson_titles": ["Lesson 1 Title", "Lesson 2 Title"]
        }
      ]
    }
  ],
  "learning_outcomes": ["Outcome 1", "Outcome 2", "Outcome 3", "Outcome 4", "Outcome 5"]
}

Each module should have 1 unit with exactly ${lessonsPerModule} lesson titles.`,
      },
    ]);

    console.log(`Outline generated: ${outlineData.modules?.length || 0} modules`);

    // STEP 2: Create all module and unit sections in DB first
    const unitJobs: { moduleIndex: number; unitIndex: number; unitSectionId: string; mod: any; unit: any }[] = [];

    for (let mi = 0; mi < (outlineData.modules || []).length; mi++) {
      const mod = outlineData.modules[mi];
      const { data: moduleSection, error: moduleError } = await supabase
        .from("course_sections")
        .insert({
          course_id: courseId,
          title: mod.title,
          description: stripHtml(mod.description) || null,
          order_index: mi,
          section_level: 1,
          parent_id: null,
        })
        .select("id")
        .single();

      if (moduleError) {
        console.error("Module insert error:", moduleError);
        continue;
      }

      for (let ui = 0; ui < (mod.units || []).length; ui++) {
        const unit = mod.units[ui];
        const { data: unitSection, error: unitError } = await supabase
          .from("course_sections")
          .insert({
            course_id: courseId,
            title: unit.title,
            description: stripHtml(unit.description) || null,
            order_index: ui,
            section_level: 2,
            parent_id: moduleSection.id,
          })
          .select("id")
          .single();

        if (unitError) {
          console.error("Unit insert error:", unitError);
          continue;
        }

        unitJobs.push({ moduleIndex: mi, unitIndex: ui, unitSectionId: unitSection.id, mod, unit });
      }
    }

    // STEP 3: Generate content for ALL units IN PARALLEL
    const BATCH_SIZE = 3;
    let totalLessons = 0;
    let totalQuizzes = 0;
    let totalAssignments = 0;

    const systemPrompt = buildContentPrompt(difficulty, includeQuizzes, includeAssignments);

    for (let batchStart = 0; batchStart < unitJobs.length; batchStart += BATCH_SIZE) {
      const batch = unitJobs.slice(batchStart, batchStart + BATCH_SIZE);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (job) => {
          const lessonTitles = job.unit.lesson_titles || job.unit.lessons?.map((l: any) => l.title || l) || [];
          
          try {
            return await callAI(LOVABLE_API_KEY, [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Course: "${courseTitle}"
Module: "${job.mod.title}"
Unit: "${job.unit.title}"

Generate rich content with embedded YouTube videos, articles, tools, and resources for these lessons: ${JSON.stringify(lessonTitles)}

Return JSON:
{
  "lessons": [
    {
      "title": "Lesson Title",
      "description": "Plain text 2-sentence description",
      "content_text": "<h2>Lesson Title</h2><h3>🎯 Learning Objectives</h3><ul><li>...</li></ul><p>Core content with inline links...</p><h3>🎬 Watch & Learn</h3><p><strong>Video Title</strong></p><div style='position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:8px 0 16px 0;'><iframe src='https://www.youtube-nocookie.com/embed/REAL_VIDEO_ID?rel=0&modestbranding=1&iv_load_policy=3&showinfo=0' style='position:absolute;top:0;left:0;width:100%;height:100%;' frameborder='0' allowfullscreen></iframe></div><h3>📹 More Recommended Videos</h3><ul><li><a href='https://www.youtube.com/watch?v=ID' target='_blank'>Title - Channel</a></li></ul><h3>📚 Articles & Reading Materials</h3><ul><li><a href='url' target='_blank'>Title - Source</a></li></ul><h3>🔗 Useful Tools & Resources</h3><ul><li><a href='url' target='_blank'>Tool - Description</a></li></ul><h3>📝 Key Takeaways</h3><ul><li>Point 1</li></ul>",
      "duration_minutes": 25
    }
  ]${includeQuizzes ? `,
  "quiz": {
    "title": "Quiz: Unit Title",
    "description": "Plain text quiz description",
    "passing_score": 70,
    "questions": [
      {
        "question_text": "Question?",
        "question_type": "single_choice",
        "points": 1,
        "explanation": "Detailed explanation of correct answer",
        "options": [
          {"text": "Option A", "is_correct": false},
          {"text": "Option B", "is_correct": true},
          {"text": "Option C", "is_correct": false},
          {"text": "Option D", "is_correct": false}
        ]
      }
    ]
  }` : ""}${includeAssignments ? `,
  "assignment": {
    "title": "Assignment Title",
    "description": "Plain text description",
    "instructions": "<h3>Overview</h3><p>...</p><h3>Requirements</h3><ol><li>...</li></ol><h3>🔗 Helpful Resources</h3><ul><li><a href='url' target='_blank'>Resource</a></li></ul>",
    "max_score": 100
  }` : ""}
}`,
              },
            ]);
          } catch (e) {
            console.error(`Failed to generate content for unit ${job.unit.title}:`, e);
            return {
              lessons: lessonTitles.map((title: string) => ({
                title,
                description: `Lesson on ${title}`,
                content_text: `<h2>${title}</h2><p>Content for this lesson is being prepared. Please check back later or edit this lesson manually.</p>`,
                duration_minutes: 20,
              })),
            };
          }
        })
      );

      // Insert results into DB
      for (let i = 0; i < batch.length; i++) {
        const job = batch[i];
        const result = batchResults[i];
        const unitContent = result.status === "fulfilled" ? result.value : {
          lessons: (job.unit.lesson_titles || []).map((title: string) => ({
            title,
            description: `Lesson on ${title}`,
            content_text: `<h2>${title}</h2><p>Content is being prepared.</p>`,
            duration_minutes: 20,
          })),
        };

        let contentIndex = 0;

        // Insert lessons
        for (const lesson of (unitContent.lessons || [])) {
          const { error: lessonError } = await supabase
            .from("lesson_content")
            .insert({
              course_id: courseId,
              section_id: job.unitSectionId,
              title: lesson.title,
              description: stripHtml(lesson.description) || null,
              content_text: lesson.content_text || null,
              content_type: "text",
              order_index: contentIndex++,
              duration_minutes: lesson.duration_minutes || 25,
            });
          if (!lessonError) totalLessons++;
          else console.error("Lesson insert error:", lessonError);
        }

        // Insert quiz
        if (unitContent.quiz) {
          const { data: quizData, error: quizError } = await supabase
            .from("quizzes")
            .insert({
              course_id: courseId,
              section_id: job.unitSectionId,
              title: unitContent.quiz.title,
              description: stripHtml(unitContent.quiz.description) || null,
              passing_score: unitContent.quiz.passing_score || 70,
              order_index: contentIndex++,
            })
            .select("id")
            .single();

          if (!quizError && quizData) {
            totalQuizzes++;
            for (let qi = 0; qi < (unitContent.quiz.questions || []).length; qi++) {
              const q = unitContent.quiz.questions[qi];
              const { data: questionData, error: qError } = await supabase
                .from("quiz_questions")
                .insert({
                  quiz_id: quizData.id,
                  question_text: q.question_text,
                  question_type: q.question_type || "single_choice",
                  points: q.points || 1,
                  explanation: q.explanation || null,
                  order_index: qi,
                })
                .select("id")
                .single();

              if (!qError && questionData && q.options) {
                for (let oi = 0; oi < q.options.length; oi++) {
                  await supabase.from("quiz_options").insert({
                    question_id: questionData.id,
                    option_text: q.options[oi].text,
                    is_correct: q.options[oi].is_correct || false,
                    order_index: oi,
                  });
                }
              }
            }
          } else if (quizError) {
            console.error("Quiz insert error:", quizError);
          }
        }

        // Insert assignment
        if (unitContent.assignment) {
          const { error: assignError } = await supabase
            .from("assignments")
            .insert({
              course_id: courseId,
              section_id: job.unitSectionId,
              title: unitContent.assignment.title,
              description: stripHtml(unitContent.assignment.description) || null,
              instructions: unitContent.assignment.instructions || null,
              max_score: unitContent.assignment.max_score || 100,
              ai_grading_enabled: true,
              order_index: contentIndex++,
            });
          if (!assignError) totalAssignments++;
          else console.error("Assignment insert error:", assignError);
        }
      }
    }

    // Update learning outcomes
    if (outlineData.learning_outcomes?.length) {
      await supabase
        .from("courses")
        .update({ learning_outcomes: outlineData.learning_outcomes })
        .eq("id", courseId);
    }

    console.log(`Course generated: ${totalLessons} lessons, ${totalQuizzes} quizzes, ${totalAssignments} assignments`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          modules: outlineData.modules?.length || 0,
          lessons: totalLessons,
          quizzes: totalQuizzes,
          assignments: totalAssignments,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate full course error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    let status = 500;
    let userMessage = message;

    if (message === "RATE_LIMIT") {
      status = 429;
      userMessage = "Rate limit exceeded. Please wait a moment and try again.";
    } else if (message === "PAYMENT_REQUIRED") {
      status = 402;
      userMessage = "AI service temporarily unavailable. Please try again later.";
    } else if (message === "AI_ACCESS_DENIED") {
      status = 403;
      userMessage = "You do not have permission to use AI course generation. Please contact an administrator to enable this feature.";
    }

    return new Response(
      JSON.stringify({ error: userMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
