-- Add certificate template URL column to courses table
-- This allows admin/instructor to upload a PDF or image template for certificates
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS certificate_template_url text;

-- Add instructor_name column to courses for certificate generation
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS instructor_name text;

-- Add a comment explaining the column
COMMENT ON COLUMN public.courses.certificate_template_url IS 'URL to custom certificate template (PDF or image) for this course';
COMMENT ON COLUMN public.courses.instructor_name IS 'Instructor name to display on certificates';