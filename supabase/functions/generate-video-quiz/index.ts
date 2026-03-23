import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lessonId, courseId, durationMinutes } = await req.json();
    if (!lessonId || !courseId) throw new Error("lessonId and courseId are required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch lesson info
    const { data: lesson } = await supabase
      .from("lesson_content")
      .select("title, description, content_text, duration_minutes")
      .eq("id", lessonId)
      .single();

    if (!lesson) throw new Error("Lesson not found");

    const duration = durationMinutes || lesson.duration_minutes || 10;
    const totalSecs = duration * 60;
    const numQuestions = Math.min(Math.max(2, Math.floor(duration / 3)), 6);

    const prompt = `You are generating pop-up quiz questions for a video lesson.

Lesson title: "${lesson.title}"
Lesson description: "${lesson.description || "N/A"}"
${lesson.content_text ? `Lesson content summary (first 500 chars): "${lesson.content_text.replace(/<[^>]*>/g, "").substring(0, 500)}"` : ""}
Video duration: ${duration} minutes (${totalSecs} seconds)

Generate exactly ${numQuestions} quiz questions that should appear at different timestamps throughout the video.
Spread them evenly across the video duration. First question should appear after at least 30 seconds.

Supported question types: single_choice, multiple_choice, true_false, fill_in, short_answer, matching, ordering, drag_drop
- Use a variety of question types
- For matching: options use "Left|||Right" format, all is_correct=true
- For ordering: options in correct order, all is_correct=true
- For drag_drop: options use "Item|||Bucket" format, all is_correct=true

Return a JSON array of objects with this structure:
{
  "questions": [
    {
      "timestamp_seconds": number,
      "question_text": "string",
      "question_type": "single_choice",
      "points": 1,
      "explanation": "string",
      "behavior": "any_answer",
      "options": [
        { "option_text": "string", "is_correct": boolean }
      ]
    }
  ]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a quiz question generator. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_quiz_points",
            description: "Generate video quiz points with questions and options",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      timestamp_seconds: { type: "number" },
                      question_text: { type: "string" },
                      question_type: { type: "string", enum: ["single_choice", "multiple_choice", "true_false", "fill_in", "short_answer", "matching", "ordering", "drag_drop"] },
                      points: { type: "number" },
                      explanation: { type: "string" },
                      behavior: { type: "string", enum: ["must_correct", "any_answer", "skippable"] },
                      options: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            option_text: { type: "string" },
                            is_correct: { type: "boolean" },
                          },
                          required: ["option_text", "is_correct"],
                        },
                      },
                    },
                    required: ["timestamp_seconds", "question_text", "question_type", "points", "explanation", "behavior", "options"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_quiz_points" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — try again later" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted — please add funds" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call response from AI");

    const parsed = JSON.parse(toolCall.function.arguments);
    const questions = parsed.questions || [];

    // Get existing max order_index
    const { data: existing } = await supabase
      .from("video_quiz_points")
      .select("order_index")
      .eq("lesson_id", lessonId)
      .order("order_index", { ascending: false })
      .limit(1);
    let nextOrder = (existing?.[0]?.order_index ?? -1) + 1;

    let count = 0;
    for (const q of questions) {
      const { data: point, error: pErr } = await supabase
        .from("video_quiz_points")
        .insert({
          lesson_id: lessonId,
          course_id: courseId,
          timestamp_seconds: Math.min(q.timestamp_seconds, totalSecs - 5),
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points || 1,
          explanation: q.explanation || null,
          behavior: q.behavior || "any_answer",
          counts_toward_grade: false,
          order_index: nextOrder++,
        })
        .select("id")
        .single();

      if (pErr || !point) continue;

      if (q.options && q.options.length > 0) {
        const opts = q.options.map((o: any, i: number) => ({
          video_quiz_point_id: point.id,
          option_text: o.option_text,
          is_correct: o.is_correct ?? false,
          order_index: i,
        }));
        await supabase.from("video_quiz_point_options").insert(opts);
      }
      count++;
    }

    return new Response(JSON.stringify({ success: true, count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-video-quiz error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
