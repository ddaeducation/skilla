import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  type: "lesson" | "quiz" | "assignment" | "questions" | "single_lesson" | "single_question" | "editor_content";
  topic: string;
  courseName?: string;
  lessonCount?: number;
  questionCount?: number;
  questionTypes?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  additionalContext?: string;
  existingContent?: string;
  contentContext?: string;
  contentLength?: "short" | "medium" | "detailed";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, topic, courseName, lessonCount = 5, questionCount = 5, questionTypes, difficulty = "intermediate", additionalContext, existingContent, contentContext, contentLength = "medium" } = await req.json() as GenerateRequest;
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
2. A brief description (2-3 sentences, plain text only - NO HTML tags)
3. Detailed content as well-structured HTML (use <h2>, <h3>, <p>, <ul>, <ol>, <strong>, <em> tags). Each paragraph must be a separate <p> block with clear headings.
4. Estimated duration in minutes

Return as JSON array:
[
  {
    "title": "Lesson Title",
    "description": "Plain text brief description without HTML tags",
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
2. A brief description (2-3 sentences, plain text only - NO HTML tags)
3. Detailed content as well-structured HTML (use <h2>, <h3>, <p>, <ul>, <ol>, <strong>, <em> tags)
4. Estimated duration in minutes

Return as JSON object (NOT an array):
{
  "title": "Lesson Title",
  "description": "Plain text brief description without HTML tags",
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
2. Question type (single_choice, multiple_choice, true_false, fill_in, short_answer, matching)
3. Options (for choice questions)
4. Correct answer(s)
5. Explanation
6. Points (1-5 based on difficulty)

IMPORTANT: For "matching" type questions, each option must combine the left item and right item using the delimiter "|||". Example: { "text": "France|||Paris", "is_correct": true }. All matching options must have is_correct set to true.

Return as JSON:
{
  "title": "Quiz Title",
  "description": "Plain text quiz description without HTML tags",
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
      const matchingInstruction = questionType === "matching"
        ? `\nIMPORTANT: For matching questions, each option must combine the left item and right item using "|||" as delimiter. Example: { "text": "France|||Paris", "is_correct": true }. All options must have is_correct: true. Provide 4-6 pairs.`
        : "";
      systemPrompt = `You are an expert assessment designer. Create a single quiz question that effectively tests understanding at the ${difficulty} level. Make it fresh and different from any previous version.`;
      userPrompt = `Create ONE ${questionType} question about "${topic}"${courseName ? ` for the course: ${courseName}` : ""}.
${additionalContext ? `Additional context: ${additionalContext}` : ""}
${existingContent ? `The previous question was: "${existingContent}". Please generate a different question while staying on topic.` : ""}
${matchingInstruction}

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
  "description": "Plain text description of what students will do, no HTML tags",
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

IMPORTANT: For "matching" type questions, each option must combine the left item and right item using the delimiter "|||". For example, if matching capitals to countries, an option would be: { "text": "France|||Paris", "is_correct": true }. All matching options must have is_correct set to true. Provide 4-6 pairs per matching question.

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
  },
  {
    "question_text": "Match the following items:",
    "question_type": "matching",
    "points": 3,
    "explanation": "Explanation of correct matches",
    "options": [
      { "text": "Left Item 1|||Right Item 1", "is_correct": true },
      { "text": "Left Item 2|||Right Item 2", "is_correct": true }
    ]
  }
]`;
    } else if (type === "editor_content") {
      let contextInstruction = "";
      if (contentContext === "assignment_instructions") {
        contextInstruction = `You are writing ASSIGNMENT INSTRUCTIONS for students. Structure the content as clear, step-by-step instructions that tell students exactly what to do.
Use numbered steps (<ol>) for sequential tasks. Include sections like: Overview, Objectives, Requirements, Steps to Complete, Submission Guidelines.`;
      } else if (contentContext === "rubrics") {
        contextInstruction = `You are writing a GRADING RUBRIC for an assignment. Structure it as a clear grading criteria table or list.
Include criteria categories, point breakdowns, and descriptions of what constitutes excellent, good, satisfactory, and poor work for each criterion. Use tables (<table>) or structured lists.`;
      } else {
        contextInstruction = `You are writing LESSON CONTENT for students to study. Structure it as educational material with clear explanations, examples, and key concepts.`;
      }

      const lengthInstruction = contentLength === "short"
        ? "Keep the content concise and brief — 2-3 sections with 1-2 short paragraphs each. Aim for roughly 200-400 words total."
        : contentLength === "detailed"
        ? "Write comprehensive, in-depth content — 5-7 sections with 3-5 well-developed paragraphs each. Include examples, case studies, or analogies. Aim for 800-1500 words total."
        : "Write moderately detailed content — 3-5 sections with 2-3 paragraphs each. Aim for 400-800 words total.";

      systemPrompt = `You are an expert content writer and curriculum designer for online education. ${contextInstruction}

${lengthInstruction}

Write at the ${difficulty} level.

CRITICAL STRUCTURE & FORMATTING RULES:
1. ALWAYS start with a clear <h2> title that summarizes the topic.
2. Follow with an introductory <p> paragraph that provides context and overview.
3. Break the content into 3-5 clearly defined sections, each with its own <h3> subheading.
4. Under each section:
   - Write 2-3 well-developed <p> paragraphs with clear, complete sentences.
   - Use <ul> or <ol> lists where appropriate to organize key points, steps, or examples.
   - Bold <strong> important terms, concepts, or definitions on their first mention.
   - Use <em> for emphasis sparingly.
5. End with a <h3>Summary</h3> or <h3>Key Takeaways</h3> section containing a concise <ul> list of main points.

CONTENT QUALITY RULES:
- Each paragraph must be substantive (3-5 sentences minimum), not just a single sentence.
- Maintain logical flow between sections — use transitions.
- Be educational, clear, and comprehensive.
- Never output raw text without HTML tags. Every piece of text must be inside a proper tag.
- Do NOT wrap in a JSON object or markdown code block. Return ONLY the raw HTML content.
- Do NOT include \`\`\`html or any code fences.`;

      const contextLabel = contentContext === "assignment_instructions" ? "assignment instructions" : contentContext === "rubrics" ? "grading rubric" : "educational content";
      userPrompt = `Write well-organized, comprehensive ${contextLabel} about: "${topic}"${courseName ? ` for the course: ${courseName}` : ""}.
${additionalContext ? `Additional context: ${additionalContext}` : ""}

Return ONLY the HTML content. Start directly with <h2>.`;
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

    // For editor_content, return raw HTML directly
    if (type === "editor_content") {
      // Strip any markdown code fences the model might wrap around HTML
      const cleanedContent = content.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      return new Response(JSON.stringify({ success: true, data: { content_text: cleanedContent } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip HTML from description fields
    const stripHtml = (text: string | null): string | null => {
      if (!text) return null;
      return text.replace(/<[^>]*>/g, '').trim();
    };

    // Extract JSON from the response
    let parsedContent;
    try {
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

    // Clean descriptions in parsed content
    if (Array.isArray(parsedContent)) {
      parsedContent = parsedContent.map((item: any) => ({
        ...item,
        description: stripHtml(item.description),
      }));
    } else if (parsedContent && typeof parsedContent === 'object') {
      if (parsedContent.description) {
        parsedContent.description = stripHtml(parsedContent.description);
      }
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
