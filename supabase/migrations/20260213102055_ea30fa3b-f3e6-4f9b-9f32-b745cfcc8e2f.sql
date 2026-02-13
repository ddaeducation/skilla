
-- Create a public function to get course content counts
CREATE OR REPLACE FUNCTION public.get_course_content_counts(p_course_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'lesson_count', (SELECT count(*) FROM lesson_content WHERE course_id = p_course_id),
    'quiz_count', (SELECT count(*) FROM quizzes WHERE course_id = p_course_id)
  ) INTO result;
  RETURN result;
END;
$$;
