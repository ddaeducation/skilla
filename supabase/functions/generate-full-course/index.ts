import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      modulesCount = 5,
      lessonsPerModule = 5,
      includeQuizzes = true,
      includeAssignments = true,
      difficulty = "intermediate",
    } = await req.json() as GenerateFullCourseRequest;

    // Verify course ownership using service role (bypasses RLS)
    const { data: course } = await supabase
      .from("courses")
      .select("id, instructor_id")
      .eq("id", courseId)
      .maybeSingle();

    if (!course) throw new Error("Course not found");

    // Check if user is the course instructor or a course co-instructor
    const isOwner = course.instructor_id === user.id;
    let isCoInstructor = false;
    if (!isOwner) {
      const { data: coInstructor } = await supabase
        .from("course_instructors")
        .select("id")
        .eq("course_id", courseId)
        .eq("instructor_id", user.id)
        .maybeSingle();
      isCoInstructor = !!coInstructor;
    }

    if (!isOwner && !isCoInstructor) throw new Error("Access denied: you are not an instructor for this course");

    console.log(`Generating full course structure for: ${courseTitle}`);

    const systemPrompt = `You are a world-class curriculum designer and subject matter expert. Your task is to generate a comprehensive, university-quality course structure with modules, units, lessons, quizzes, and assignments.
The course is for ${difficulty} level learners.

CONTENT QUALITY REQUIREMENTS:
- Each lesson MUST contain at least 800-1200 words of substantive, educational content.
- Write like a professional textbook author: clear explanations, real-world examples, practical applications.
- Include concrete examples, case studies, analogies, and step-by-step explanations where relevant.
- Use a progressive learning approach: each lesson should build on previous concepts.
- Avoid generic filler text. Every paragraph must teach something specific and valuable.
- Include practical tips, common mistakes to avoid, and industry best practices.
- For technical topics, include code snippets or formulas wrapped in <code> or <pre> tags.
- Each lesson should have clearly defined learning objectives stated at the beginning.

LINKS AND REFERENCES REQUIREMENTS (CRITICAL - MUST INCLUDE):
- EVERY lesson content_text MUST include inline hyperlinks throughout the text using <a href="URL" target="_blank" rel="noopener noreferrer">Link Text</a> tags.
- When mentioning a concept, tool, framework, or resource, link it to a relevant Wikipedia page, official documentation, or authoritative article.
- Include at least 3-5 inline links PER LESSON within the body text (not just in the resources section).
- EVERY lesson MUST end with a <h3>Further Reading & Resources</h3> section containing 3-5 curated links to:
  * Official documentation (MDN, Python docs, W3Schools, etc.)
  * YouTube tutorials or educational videos
  * Wikipedia articles for foundational concepts
  * Khan Academy, Coursera, or other MOOC references
  * Authoritative blog posts or articles from reputable sources
  * Relevant books with links to their publisher or Amazon pages
- All URLs must be real, commonly known, and likely to be valid. Prefer well-known domains.
- Example inline link: <p>The concept of <a href="https://en.wikipedia.org/wiki/Compound_interest" target="_blank" rel="noopener noreferrer">compound interest</a> is fundamental to understanding long-term wealth building.</p>

QUIZ QUALITY REQUIREMENTS:
- Questions must test understanding, not just memorization.
- Include a mix of difficulty levels within each quiz.
- Each question MUST have a detailed explanation of why the correct answer is right and why others are wrong.
- Options should be plausible and well-crafted (avoid obviously wrong answers).
- Generate 4-5 questions per quiz, covering different aspects of the unit.

ASSIGNMENT QUALITY REQUIREMENTS:
- Assignments must be practical, hands-on exercises that apply lesson concepts.
- Instructions should be detailed with clear deliverables, evaluation criteria, and expected outcomes.
- Include context about why the assignment matters and what skills it develops.
- Assignment instructions MUST include links to relevant tools, templates, or reference materials.

CRITICAL: Return ONLY valid JSON, no markdown code fences. The response must be a JSON object.

CRITICAL FORMATTING RULES for all content_text and instructions fields:
- Write as proper HTML with <p>, <h2>, <h3>, <ul>, <ol>, <strong>, <em>, <a>, <blockquote>, <code>, <pre> tags.
- Each paragraph must be a separate <p> block.
- Never output raw text without HTML tags.
- Use <strong> for key terms and <em> for emphasis.
- Use <blockquote> for important notes or quotes.
- Hyperlinks (<a> tags) MUST be used liberally throughout ALL content.`;

    const userPrompt = `Create a complete, high-quality course structure for:
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
      "description": "Plain text module description (2-3 sentences explaining what this module covers and why it matters)",
      "units": [
        {
          "title": "Unit 1.1: Title",
          "description": "Plain text unit description (2-3 sentences) without any HTML tags",
          "lessons": [
            {
              "title": "Lesson Title",
              "description": "2-3 sentence plain text description without any HTML tags",
              "content_text": "<h2>Lesson Title</h2><p><strong>Learning Objectives:</strong></p><ul><li>Objective 1</li><li>Objective 2</li></ul><h3>Introduction</h3><p>Engaging introduction paragraph that hooks the reader and explains why this topic matters...</p><h3>Core Concepts</h3><p>Detailed explanation with examples, at least 3-4 paragraphs...</p><h3>Practical Application</h3><p>Real-world examples, case studies, or step-by-step walkthroughs...</p><h3>Common Pitfalls</h3><p>Mistakes learners often make and how to avoid them...</p><h3>Key Takeaways</h3><ul><li>Takeaway 1</li><li>Takeaway 2</li><li>Takeaway 3</li></ul><h3>Further Reading & Resources</h3><ul><li><a href=\"https://example.com\" target=\"_blank\" rel=\"noopener noreferrer\">Resource Title</a> - Brief description</li></ul>",
              "duration_minutes": 25
            }
          ],
          "quiz": ${includeQuizzes ? `{
            "title": "Quiz: Unit Title",
            "description": "Plain text description testing comprehension of key concepts covered in this unit",
            "passing_score": 70,
            "questions": [
              {
                "question_text": "Clear, specific question that tests understanding?",
                "question_type": "single_choice",
                "points": 1,
                "explanation": "Detailed explanation: The correct answer is B because... Options A, C, and D are incorrect because...",
                "options": [
                  { "text": "Plausible but incorrect option", "is_correct": false },
                  { "text": "Correct answer", "is_correct": true },
                  { "text": "Another plausible distractor", "is_correct": false },
                  { "text": "Yet another distractor", "is_correct": false }
                ]
              }
            ]
          }` : "null"},
          "assignment": ${includeAssignments ? `{
            "title": "Assignment: Descriptive Exercise Title",
            "description": "Plain text brief description of what students will create or accomplish",
            "instructions": "<h3>Overview</h3><p>Context and purpose of this assignment...</p><h3>Requirements</h3><ol><li>Specific requirement 1 with details</li><li>Specific requirement 2 with details</li><li>Specific requirement 3 with details</li></ol><h3>Evaluation Criteria</h3><ul><li>Criterion 1 (weight)</li><li>Criterion 2 (weight)</li></ul><h3>Submission Guidelines</h3><p>What to submit and in what format...</p>",
            "max_score": 100,
            "ai_grading_enabled": true
          }` : "null"}
        }
      ]
    }
  ],
  "learning_outcomes": ["Specific, measurable outcome 1", "Outcome 2", "Outcome 3", "Outcome 4", "Outcome 5"]
}

Generate exactly ${lessonsPerModule} lessons per unit, with 4-5 quiz questions per quiz. 

QUALITY CHECKLIST - Every lesson MUST have:
1. Learning objectives at the start
2. An engaging introduction 
3. Multiple detailed sections with real examples
4. Practical applications or case studies
5. Common pitfalls or mistakes section
6. Key takeaways summary
7. Further reading resources with real URLs

IMPORTANT: All "description" fields MUST be plain text only - NO HTML tags whatsoever. Only "content_text" and "instructions" fields should contain HTML.
Make the content genuinely educational and detailed - imagine writing for a real student who needs to learn this material thoroughly.`;

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
        response_format: { type: "json_object" },
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

    // Parse JSON - handle markdown fences and control characters
    let courseData;
    try {
      // Strip markdown code fences if present
      let cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      // Remove control characters that break JSON parsing (except normal whitespace)
      cleaned = cleaned.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ');
      courseData = JSON.parse(cleaned);
    } catch (e) {
      console.error("Parse error:", e, "Content (first 500):", content.substring(0, 500));
      // Second attempt: extract JSON object
      try {
        let extracted = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
        extracted = extracted.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ' ');
        const jsonMatch = extracted.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found");
        courseData = JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error("Second parse attempt failed:", e2);
        throw new Error("Failed to parse generated course structure. Please try again.");
      }
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
              ai_grading_enabled: unit.assignment.ai_grading_enabled ?? true,
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
