import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  type: "lesson" | "quiz" | "assignment" | "questions" | "single_lesson" | "single_question";
  topic: string;
  courseName?: string;
  lessonCount?: number;
  questionCount?: number;
  questionTypes?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  additionalContext?: string;
  existingContent?: string; // For context when regenerating
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, topic, courseName, lessonCount = 5, questionCount = 5, questionTypes, difficulty = "intermediate", additionalContext, existingContent } = await req.json() as GenerateRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating content - type: ${type}, topic: ${topic}, difficulty: ${difficulty}`);

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "lesson") {
      systemPrompt = `You are an expert curriculum designer for online education. Generate structured lesson content that is engaging, comprehensive, and suitable for ${difficulty} level learners.

CRITICAL FORMATTING RULES for content_text:
- Write content as proper HTML with <p> tags for each paragraph.
- Use <h2> and <h3> tags for section headings within the lesson.
- Leave clear separation between paragraphs — each paragraph must be its own <p> block.
- Use <ul>/<ol> with <li> for lists.
- Use <strong> for key terms and <em> for emphasis.
- Never output raw text without HTML tags. Every block of text must be wrapped in a tag.
- Aim for 4-6 well-developed paragraphs with headings separating major sections.`;
      userPrompt = `Create ${lessonCount} lesson outlines for a course about "${topic}"${courseName ? ` (Course: ${courseName})` : ""}.
${additionalContext ? `Additional context: ${additionalContext}` : ""}

For each lesson, provide:
1. A clear, descriptive title
2. A brief description (2-3 sentences)
3. Detailed content as well-structured HTML (use <h2>, <h3>, <p>, <ul>, <ol>, <strong>, <em> tags). Each paragraph must be a separate <p> block with clear headings.
4. Estimated duration in minutes

Return as JSON array:
[
  {
    "title": "Lesson Title",
    "description": "Brief description",
    "content_text": "<h2>Section Heading</h2><p>First paragraph...</p><p>Second paragraph...</p>",
    "duration_minutes": 30
  }
]`;
    } else if (type === "single_lesson") {
      systemPrompt = `You are an expert curriculum designer for online education. Generate a single, comprehensive lesson that is engaging and suitable for ${difficulty} level learners. Make it fresh and different from any previous version.

CRITICAL FORMATTING RULES for content_text:
- Write content as proper HTML with <p> tags for each paragraph.
- Use <h2> and <h3> tags for section headings within the lesson.
- Leave clear separation between paragraphs — each paragraph must be its own <p> block.
- Use <ul>/<ol> with <li> for lists.
- Use <strong> for key terms and <em> for emphasis.
- Never output raw text without HTML tags. Every block of text must be wrapped in a tag.`;
      userPrompt = `Create ONE lesson about "${topic}"${courseName ? ` for the course: ${courseName}` : ""}.
${additionalContext ? `Additional context: ${additionalContext}` : ""}
${existingContent ? `The previous version was about: ${existingContent}. Please generate something different while staying on topic.` : ""}

Provide:
1. A clear, descriptive title
2. A brief description (2-3 sentences)
3. Detailed content as well-structured HTML (use <h2>, <h3>, <p>, <ul>, <ol>, <strong>, <em> tags)
4. Estimated duration in minutes

Return as JSON object (NOT an array):
{
  "title": "Lesson Title",
  "description": "Brief description",
  "content_text": "<h2>Section Heading</h2><p>First paragraph...</p><p>Second paragraph...</p>",
  "duration_minutes": 30
}`;
    } else if (type === "quiz") {
      systemPrompt = `You are an expert assessment designer. Create quiz questions that effectively test understanding at the ${difficulty} level.`;
      userPrompt = `Create a quiz with ${questionCount} questions about "${topic}"${courseName ? ` (Course: ${courseName})` : ""}.
${additionalContext ? `Additional context: ${additionalContext}` : ""}
${questionTypes?.length ? `Include these question types: ${questionTypes.join(", ")}` : ""}

For each question, provide:
1. Question text
2. Question type (single_choice, multiple_choice, true_false, fill_in, short_answer)
3. Options (for choice questions)
4. Correct answer(s)
5. Explanation
6. Points (1-5 based on difficulty)

Return as JSON:
{
  "title": "Quiz Title",
  "description": "Quiz description",
  "passing_score": 70,
  "questions": [
    {
      "question_text": "Question here?",
      "question_type": "single_choice",
      "points": 1,
      "explanation": "Explanation of correct answer",
      "options": [
        { "text": "Option A", "is_correct": false },
        { "text": "Option B", "is_correct": true }
      ]
    }
  ]
}`;
    } else if (type === "single_question") {
      const questionType = questionTypes?.[0] || "single_choice";
      systemPrompt = `You are an expert assessment designer. Create a single quiz question that effectively tests understanding at the ${difficulty} level. Make it fresh and different from any previous version.`;
      userPrompt = `Create ONE ${questionType} question about "${topic}"${courseName ? ` for the course: ${courseName}` : ""}.
${additionalContext ? `Additional context: ${additionalContext}` : ""}
${existingContent ? `The previous question was: "${existingContent}". Please generate a different question while staying on topic.` : ""}

Provide:
1. Question text
2. Question type: ${questionType}
3. Options (for choice questions, include 4 options with one correct)
4. Explanation for the correct answer
5. Points (1-5 based on difficulty)

Return as JSON object (NOT an array):
{
  "question_text": "Question here?",
  "question_type": "${questionType}",
  "points": 1,
  "explanation": "Why this is the correct answer",
  "options": [
    { "text": "Option A", "is_correct": false },
    { "text": "Option B", "is_correct": true },
    { "text": "Option C", "is_correct": false },
    { "text": "Option D", "is_correct": false }
  ]
}`;
    } else if (type === "assignment") {
      systemPrompt = `You are an expert instructional designer. Create practical, engaging assignments that help students apply their knowledge at the ${difficulty} level.

CRITICAL FORMATTING RULES for instructions field:
- Write instructions as proper HTML with <p> tags for each paragraph/step.
- Use <h3> tags for section headings.
- Use <ol> for numbered steps and <ul> for bullet lists.
- Use <strong> for key terms. Each paragraph must be a separate <p> block.`;
      userPrompt = `Create an assignment about "${topic}"${courseName ? ` (Course: ${courseName})` : ""}.
${additionalContext ? `Additional context: ${additionalContext}` : ""}

Provide:
1. A clear, actionable title
2. Description of the assignment
3. Detailed instructions as well-structured HTML (use <h3>, <p>, <ol>, <ul>, <strong> tags). Each step or paragraph must be clearly separated.
4. Grading criteria/rubric
5. Maximum score (typically 100)

Return as JSON:
{
  "title": "Assignment Title",
  "description": "Brief description of what students will do",
  "instructions": "<h3>Overview</h3><p>Introduction paragraph...</p><h3>Steps</h3><ol><li>Step one...</li></ol>",
  "max_score": 100,
  "rubric": [
    { "criteria": "Criteria name", "points": 25, "description": "What earns full points" }
  ]
}`;
    } else if (type === "questions") {
      systemPrompt = `You are an expert assessment designer. Create diverse, challenging quiz questions at the ${difficulty} level.`;
      userPrompt = `Generate ${questionCount} quiz questions about "${topic}".
${additionalContext ? `Additional context: ${additionalContext}` : ""}
${questionTypes?.length ? `Question types to include: ${questionTypes.join(", ")}` : "Use a variety of question types."}

Return as JSON array:
[
  {
    "question_text": "Question here?",
    "question_type": "single_choice",
    "points": 1,
    "explanation": "Why this is the correct answer",
    "options": [
      { "text": "Option A", "is_correct": false },
      { "text": "Option B", "is_correct": true }
    ]
  }
]`;
    }

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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to generate content" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content generated");
    }

    // Extract JSON from the response
    let parsedContent;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      return new Response(JSON.stringify({ error: "Failed to parse generated content", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: parsedContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Content generator error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
