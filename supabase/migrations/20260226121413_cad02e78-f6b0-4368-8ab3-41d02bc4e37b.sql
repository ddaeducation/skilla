
CREATE OR REPLACE FUNCTION public.get_free_preview_lesson(p_lesson_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  content_type text,
  content_url text,
  content_text text,
  order_index integer,
  duration_minutes integer,
  is_free_preview boolean,
  section_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    lc.id,
    lc.title,
    lc.description,
    lc.content_type,
    lc.content_url,
    lc.content_text,
    lc.order_index,
    lc.duration_minutes,
    lc.is_free_preview,
    lc.section_id
  FROM lesson_content lc
  WHERE lc.id = p_lesson_id
    AND lc.is_free_preview = true
  LIMIT 1;
$$;
