-- Add learning_outcomes column to courses table as a text array
ALTER TABLE public.courses 
ADD COLUMN learning_outcomes text[] DEFAULT '{}'::text[];