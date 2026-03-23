

## Fix: AI-Generated Content Formatting to Match Rich Text Editor Output

### Problem
AI-generated lesson content contains extra empty `<p>` tags, blank `<li>` bullets, and excessive whitespace between sections — resulting in a visually broken layout compared to content created manually via the Rich Text Editor.

### Root Cause
1. The AI model inserts empty paragraphs, blank list items, and extra line breaks between sections in the HTML output
2. No post-processing sanitization exists to clean the generated HTML before saving

### Plan

**1. Update AI prompts in both edge functions to forbid empty elements**

Files: `supabase/functions/ai-content-generator/index.ts`, `supabase/functions/generate-full-course/index.ts`

Add explicit rules to all system/user prompts:
- "NEVER insert empty `<p></p>`, `<p>&nbsp;</p>`, `<li></li>`, or `<br>` tags between sections."
- "Content must be compact — no blank lines or spacer elements between headings, paragraphs, or list items."
- "List items must contain text — never output an empty `<li>` bullet."

**2. Add HTML sanitization post-processing in both edge functions**

Before returning or saving AI-generated `content_text`, run a cleanup function that:
- Strips empty `<p>` tags (with or without `&nbsp;`/whitespace)
- Strips empty `<li>` tags
- Removes orphan `<br>` tags between block elements
- Collapses consecutive whitespace

This will be applied in:
- `ai-content-generator/index.ts` — before returning `content_text` in the JSON response (for lessons, single_lesson, editor_content, and assignment instructions)
- `generate-full-course/index.ts` — before inserting lesson content into the database

**3. Add client-side cleanup as a safety net**

In `CourseDetail.tsx`, enhance the existing `normalizeRichTextContent` function to also strip empty `<li>` tags and mid-content empty paragraphs (not just leading ones).

### Files to Modify
- `supabase/functions/ai-content-generator/index.ts` — prompt updates + post-processing
- `supabase/functions/generate-full-course/index.ts` — prompt updates + post-processing  
- `src/pages/CourseDetail.tsx` — enhanced client-side cleanup

