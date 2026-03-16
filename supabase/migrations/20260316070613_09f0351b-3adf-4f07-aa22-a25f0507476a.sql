
-- Add lock and schedule columns to course_sections (modules)
ALTER TABLE public.course_sections
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlock_at timestamp with time zone DEFAULT NULL;

-- Add lock and schedule columns to lesson_content (lessons)
ALTER TABLE public.lesson_content
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlock_at timestamp with time zone DEFAULT NULL;
