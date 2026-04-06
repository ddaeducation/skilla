import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GradeRequest {
  questionText: string;
  questionType: string;
  studentAnswer: string;
  correctAnswer?: string;
  maxPoints: number;
  rubric?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionText, questionType, studentAnswer, correctAnswer, maxPoints, rubric } = await req.json() as GradeRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!studentAnswer || !studentAnswer.trim()) {
      return new Response(JSON.stringify({
        score: 0,
        feedback: "No answer provided.",
        isCorrect: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert educational grader. Your task is to evaluate student answers FAIRLY and GENEROUSLY while providing constructive feedback.

CRITICAL GRADING RULES — follow these strictly:
1. **Semantic equivalence**: If the student's answer conveys the SAME MEANING as the expected answer, award FULL marks — even if the wording, phrasing, capitalization, spelling, or grammar differs. For example "machine learning" and "ML" are equivalent; "Artificial Intelligence" and "AI" are equivalent; "database" and "DB" are equivalent.
2. **Partial credit**: If the answer is partially correct, demonstrates understanding, or covers key concepts, award generous partial credit (50-90% of max points). Never give zero unless the answer is completely wrong or irrelevant.
3. **Short answers**: For short-answer questions, focus on whether the CORE CONCEPT is correct, not on exact wording. Accept synonyms, abbreviations, rephrased versions, and minor variations.
4. **Spelling tolerance**: Minor typos or misspellings should NOT reduce the score if the intended answer is clearly recognizable (e.g., "algorthm" = "algorithm", "databse" = "database").
5. **Case insensitivity**: Never penalize for uppercase/lowercase differences.
6. **Extra detail**: If a student provides MORE detail than the expected answer but is still correct, award full marks.
7. **Only give 0 points** if the answer is completely wrong, blank, or entirely irrelevant to the question.

Be encouraging but honest. Focus on what the student did well and what they can improve.`;

    let userPrompt = `Grade the following ${questionType.replace("_", " ")} question:

**Question:** ${questionText}

**Student's Answer:** "${studentAnswer}"
`;

    if (correctAnswer) {
      userPrompt += `\n**Expected/Correct Answer:** "${correctAnswer}"

IMPORTANT: Compare the student's answer to the expected answer SEMANTICALLY, not literally. If they mean the same thing, give FULL marks. Accept synonyms, abbreviations, reworded versions, and minor spelling errors.`;
    }

    if (rubric) {
      userPrompt += `\n**Grading Rubric:** ${rubric}`;
    }

    userPrompt += `

**Maximum Points:** ${maxPoints}

Evaluate the answer and return a JSON object with:
1. "score": A number from 0 to ${maxPoints}. Use generous partial credit. Only give 0 if completely wrong.
2. "feedback": Constructive feedback (2-4 sentences). Start with what was done well.
3. "isCorrect": true if the answer is correct or substantially correct (score >= 60% of max), false otherwise
4. "strengths": Array of 1-2 things the student did well (if any)
5. "improvements": Array of 1-2 things to improve (if any)

Return ONLY valid JSON, no additional text.`;

    console.log("Grading request for question type:", questionType);

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again in a moment.",
          score: 0,
          feedback: "Unable to grade at this time. Please try again later.",
          isCorrect: false,
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(JSON.stringify({ 
          error: "Service temporarily unavailable.",
          score: 0,
          feedback: "Unable to grade at this time. Please try again later.",
          isCorrect: false,
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to grade answer");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No grading response generated");
    }

    console.log("AI grading response:", content);

    // Parse the JSON response
    let gradeResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        gradeResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      // Return a default response if parsing fails
      return new Response(JSON.stringify({
        score: 0,
        feedback: "Unable to automatically grade this answer. It will be reviewed manually.",
        isCorrect: false,
        needsManualReview: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure score is within bounds
    const score = Math.max(0, Math.min(maxPoints, Number(gradeResult.score) || 0));

    return new Response(JSON.stringify({
      score,
      feedback: gradeResult.feedback || "Answer graded.",
      isCorrect: gradeResult.isCorrect ?? score >= maxPoints * 0.6,
      strengths: gradeResult.strengths || [],
      improvements: gradeResult.improvements || [],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Grading error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      score: 0,
      feedback: "An error occurred while grading. Please try again.",
      isCorrect: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
