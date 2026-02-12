-- Create certificate_templates table to store custom certificate designs
CREATE TABLE public.certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Template',
  background_url TEXT,
  placeholders JSONB NOT NULL DEFAULT '[]',
  width INTEGER NOT NULL DEFAULT 842,
  height INTEGER NOT NULL DEFAULT 595,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage all templates
CREATE POLICY "Admins can manage all templates"
  ON public.certificate_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Instructors can manage templates for their courses
CREATE POLICY "Instructors can manage their course templates"
  ON public.certificate_templates
  FOR ALL
  USING (
    course_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = certificate_templates.course_id 
      AND courses.instructor_id = auth.uid()
    )
  );

-- Anyone can view templates for their enrolled courses
CREATE POLICY "Enrolled users can view templates"
  ON public.certificate_templates
  FOR SELECT
  USING (
    course_id IS NULL OR
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE enrollments.course_id = certificate_templates.course_id 
      AND enrollments.user_id = auth.uid()
      AND enrollments.payment_status = 'completed'
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_certificate_templates_updated_at
  BEFORE UPDATE ON public.certificate_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();