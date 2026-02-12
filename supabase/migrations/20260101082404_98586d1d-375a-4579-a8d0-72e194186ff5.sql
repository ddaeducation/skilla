-- Create certificates table
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index to prevent duplicate certificates
CREATE UNIQUE INDEX idx_certificates_user_course ON public.certificates(user_id, course_id);

-- Enable Row Level Security
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY "Users can view their own certificates"
ON public.certificates
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all certificates
CREATE POLICY "Admins can manage all certificates"
ON public.certificates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Instructors can view certificates for their courses
CREATE POLICY "Instructors can view certificates for their courses"
ON public.certificates
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM courses
  WHERE courses.id = certificates.course_id
  AND courses.instructor_id = auth.uid()
));

-- System can insert certificates (via service role)
CREATE POLICY "Service role can insert certificates"
ON public.certificates
FOR INSERT
WITH CHECK (true);