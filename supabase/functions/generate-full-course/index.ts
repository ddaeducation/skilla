import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Verify user owns the course
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseAnon.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const {
      courseId,
      courseTitle,
      courseDescription,
      modulesCount = 4,
      lessonsPerModule = 3,
      includeQuizzes = true,
      includeAssignments = true,
      difficulty = "intermediate",
    } = await req.json() as GenerateFullCourseRequest;

    // Verify course ownership
    const { data: course } = await supabaseAnon
      .from("courses")
      .select("id, instructor_id")
      .eq("id", courseId)
      .single();

    if (!course) throw new Error("Course not found or access denied");

    console.log(`Generating full course structure for: ${courseTitle}`);

    const systemPrompt = `You are an expert curriculum designer. Generate a complete course structure with modules, units, lessons, quizzes, and assignments. 
The course is for ${difficulty} level learners.

CRITICAL: Return ONLY valid JSON, no markdown code fences. The response must be a JSON object.

CRITICAL FORMATTING RULES for all content_text and instructions fields:
- Write as proper HTML with <p>, <h2>, <h3>, <ul>, <ol>, <strong>, <em>, <a> tags.
- Each paragraph must be a separate <p> block.
- Never output raw text without HTML tags.
- IMPORTANT: At the end of each lesson's content_text, include a <h3>Further Reading & Resources</h3> section with 2-4 real, relevant links to books, articles, documentation, or videos. Use <ul> with <li> items containing <a href="URL" target="_blank" rel="noopener noreferrer">Resource Title</a> tags. Include a mix of free resources (YouTube videos, official docs, Wikipedia, MDN, Khan Academy, etc.) and well-known books. Make sure URLs are real and commonly known (e.g., official documentation sites, popular YouTube channels, well-known publisher pages).`;

    const userPrompt = `Create a complete course structure for:
Title: "${courseTitle}"
Description: "${courseDescription}"
Modules: ${modulesCount}
Lessons per module: ${lessonsPerModule}
Include quizzes: ${includeQuizzes}
Include assignments: ${includeAssignments}
Difficulty: ${difficulty}

Return a JSON object with this exact structure:
{
  "modules": [
    {
      "title": "Module 1: Title",
      "description": "Plain text module description without any HTML tags",
      "units": [
        {
          "title": "Unit 1.1: Title",
          "description": "Plain text unit description without any HTML tags",
          "lessons": [
            {
              "title": "Lesson Title",
              "description": "2-3 sentence plain text description without any HTML tags",
              "content_text": "<h2>Title</h2><p>Detailed lesson content with multiple paragraphs...</p><h3>Section</h3><p>More content...</p><h3>Key Takeaways</h3><ul><li>Point 1</li><li>Point 2</li></ul><h3>Further Reading & Resources</h3><ul><li><a href=\"https://example.com/article\" target=\"_blank\" rel=\"noopener noreferrer\">Relevant Article Title</a> - Brief description</li><li><a href=\"https://youtube.com/watch?v=...\" target=\"_blank\" rel=\"noopener noreferrer\">Video Tutorial Title</a> - Brief description</li></ul>",
              "duration_minutes": 20
            }
          ],
          "quiz": ${includeQuizzes ? `{
            "title": "Quiz: Unit Title",
            "description": "Plain text description without HTML tags",
            "passing_score": 70,
            "questions": [
              {
                "question_text": "Question?",
                "question_type": "single_choice",
                "points": 1,
                "explanation": "Why this is correct",
                "options": [
                  { "text": "Option A", "is_correct": false },
                  { "text": "Option B", "is_correct": true },
                  { "text": "Option C", "is_correct": false },
                  { "text": "Option D", "is_correct": false }
                ]
              }
            ]
          }` : "null"},
          "assignment": ${includeAssignments ? `{
            "title": "Assignment: Practical Exercise",
            "description": "Plain text brief description without HTML tags",
            "instructions": "<h3>Overview</h3><p>Instructions...</p><ol><li>Step 1</li><li>Step 2</li></ol>",
            "max_score": 100
          }` : "null"}
        }
      ]
    }
  ],
  "learning_outcomes": ["Outcome 1", "Outcome 2", "Outcome 3"]
}

Generate ${lessonsPerModule} lessons per unit, with 3-5 quiz questions per quiz. Make content substantive and educational.

IMPORTANT: All "description" fields MUST be plain text only - NO HTML tags whatsoever. Only "content_text" and "instructions" fields should contain HTML.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate course content");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content generated");

    // Parse JSON
    let courseData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      courseData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Parse error:", e, "Content:", content.substring(0, 500));
      throw new Error("Failed to parse generated course structure");
    }

    // Strip HTML tags from descriptions
    const stripHtml = (text: string | null): string | null => {
      if (!text) return null;
      return text.replace(/<[^>]*>/g, '').trim();
    };

    // Now save everything to the database
    let totalLessons = 0;
    let totalQuizzes = 0;
    let totalAssignments = 0;

    for (let mi = 0; mi < courseData.modules.length; mi++) {
      const mod = courseData.modules[mi];

      // Create module (level 1 section)
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

        // Create unit (level 2 section)
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

        // Create lessons
        let contentIndex = 0;
        for (const lesson of (unit.lessons || [])) {
          const { error: lessonError } = await supabase
            .from("lesson_content")
            .insert({
              course_id: courseId,
              section_id: unitSection.id,
              title: lesson.title,
              description: stripHtml(lesson.description) || null,
              content_text: lesson.content_text || null,
              content_type: "text",
              order_index: contentIndex++,
              duration_minutes: lesson.duration_minutes || 20,
            });

          if (!lessonError) totalLessons++;
          else console.error("Lesson insert error:", lessonError);
        }

        // Create quiz
        if (unit.quiz) {
          const { data: quizData, error: quizError } = await supabase
            .from("quizzes")
            .insert({
              course_id: courseId,
              section_id: unitSection.id,
              title: unit.quiz.title,
              description: stripHtml(unit.quiz.description) || null,
              passing_score: unit.quiz.passing_score || 70,
              order_index: contentIndex++,
            })
            .select("id")
            .single();

          if (!quizError && quizData) {
            totalQuizzes++;

            // Insert quiz questions and options
            for (let qi = 0; qi < (unit.quiz.questions || []).length; qi++) {
              const q = unit.quiz.questions[qi];
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

        // Create assignment
        if (unit.assignment) {
          const { error: assignError } = await supabase
            .from("assignments")
            .insert({
              course_id: courseId,
              section_id: unitSection.id,
              title: unit.assignment.title,
              description: stripHtml(unit.assignment.description) || null,
              instructions: unit.assignment.instructions || null,
              max_score: unit.assignment.max_score || 100,
              order_index: contentIndex++,
            });

          if (!assignError) totalAssignments++;
          else console.error("Assignment insert error:", assignError);
        }
      }
    }

    // Update learning outcomes if generated
    if (courseData.learning_outcomes?.length) {
      await supabase
        .from("courses")
        .update({ learning_outcomes: courseData.learning_outcomes })
        .eq("id", courseId);
    }

    console.log(`Course generated: ${totalLessons} lessons, ${totalQuizzes} quizzes, ${totalAssignments} assignments`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          modules: courseData.modules.length,
          lessons: totalLessons,
          quizzes: totalQuizzes,
          assignments: totalAssignments,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate full course error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
