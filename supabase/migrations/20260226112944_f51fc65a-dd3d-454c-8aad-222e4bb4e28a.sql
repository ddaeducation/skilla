CREATE OR REPLACE FUNCTION public.get_course_curriculum(p_course_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  content_type text,
  duration_minutes integer,
  is_free_preview boolean,
  section_id uuid,
  order_index integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    lc.id,
    lc.title,
    lc.content_type,
    lc.duration_minutes,
    lc.is_free_preview,
    lc.section_id,
    lc.order_index
  FROM lesson_content lc
  WHERE lc.course_id = p_course_id
  ORDER BY lc.order_index;
$$;