
-- Clean up orphaned lessons (section was deleted, section_id set to NULL)
DELETE FROM public.lesson_content WHERE section_id IS NULL AND course_id IN (
  SELECT DISTINCT course_id FROM public.lesson_content WHERE section_id IS NULL
);

-- Clean up orphaned quizzes
DELETE FROM public.quizzes WHERE section_id IS NULL AND course_id IN (
  SELECT DISTINCT course_id FROM public.quizzes WHERE section_id IS NULL
);

-- Clean up orphaned assignments
DELETE FROM public.assignments WHERE section_id IS NULL AND course_id IN (
  SELECT DISTINCT course_id FROM public.assignments WHERE section_id IS NULL
);

-- Change FK to CASCADE for lesson_content
ALTER TABLE public.lesson_content DROP CONSTRAINT IF EXISTS lesson_content_section_id_fkey;
ALTER TABLE public.lesson_content ADD CONSTRAINT lesson_content_section_id_fkey 
  FOREIGN KEY (section_id) REFERENCES public.course_sections(id) ON DELETE CASCADE;

-- Change FK to CASCADE for quizzes
ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_section_id_fkey;
ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_section_id_fkey 
  FOREIGN KEY (section_id) REFERENCES public.course_sections(id) ON DELETE CASCADE;

-- Change FK to CASCADE for assignments
ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_section_id_fkey;
ALTER TABLE public.assignments ADD CONSTRAINT assignments_section_id_fkey 
  FOREIGN KEY (section_id) REFERENCES public.course_sections(id) ON DELETE CASCADE;

-- Update the RPC to only count items that belong to existing sections
CREATE OR REPLACE FUNCTION public.get_course_content_counts(p_course_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'lesson_count', (SELECT count(*) FROM lesson_content WHERE course_id = p_course_id AND section_id IS NOT NULL),
    'quiz_count', (SELECT count(*) FROM quizzes WHERE course_id = p_course_id AND section_id IS NOT NULL)
  ) INTO result;
  RETURN result;
END;
$function$;
