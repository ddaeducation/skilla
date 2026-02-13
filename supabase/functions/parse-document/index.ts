import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const contentContext = formData.get("contentContext") as string || "lesson";

    if (!file) {
      throw new Error("No file provided");
    }

    console.log(`Parsing document: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Content = btoa(binary);

    // Determine MIME type
    let mimeType = file.type;
    if (!mimeType) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ppt: "application/vnd.ms-powerpoint",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        xls: "application/vnd.ms-excel",
        txt: "text/plain",
        rtf: "application/rtf",
        csv: "text/csv",
        md: "text/markdown",
      };
      mimeType = mimeMap[ext || ""] || "application/octet-stream";
    }

    let contextInstruction = "";
    if (contentContext === "assignment_instructions") {
      contextInstruction = "Format the extracted content as clear assignment instructions with step-by-step structure.";
    } else if (contentContext === "rubrics") {
      contextInstruction = "Format the extracted content as a structured grading rubric with criteria and point values.";
    } else {
      contextInstruction = "Format the extracted content as well-organized educational lesson material.";
    }

    const systemPrompt = `You are an expert document parser and content formatter. Extract and convert the content from the uploaded document into clean, well-structured HTML suitable for a rich text editor.

${contextInstruction}

CRITICAL FORMATTING RULES:
1. Preserve the original document structure as much as possible (headings, paragraphs, lists, tables).
2. Use proper HTML tags: <h2> for main headings, <h3> for subheadings, <p> for paragraphs, <ul>/<ol> for lists, <table> for tabular data.
3. Bold <strong> important terms and use <em> for emphasis where appropriate.
4. Clean up any formatting artifacts from the document conversion.
5. Each paragraph must be a separate <p> block.
6. Return ONLY the raw HTML content - no markdown code fences, no JSON wrapping.
7. Start directly with the first HTML tag.
8. If the document contains images, describe them briefly in italic text.
9. Preserve any mathematical formulas or special notation in a readable format.`;

    const userPrompt = `Extract and convert the content from this uploaded document into well-structured HTML. Preserve all the text content, headings, lists, and tables from the original document.`;

    // Use Gemini with inline_data for document parsing
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
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Content}`,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI processing failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content extracted from document");
    }

    // Strip any markdown code fences
    const cleanedContent = content
      .replace(/^```html?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    console.log(`Successfully parsed document: ${file.name}, extracted ${cleanedContent.length} chars`);

    return new Response(
      JSON.stringify({ success: true, data: { content_text: cleanedContent } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Document parse error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to parse document" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
