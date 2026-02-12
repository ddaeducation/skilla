-- Create course_sections table for hierarchical structure
CREATE TABLE public.course_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;

-- RLS policies for course_sections
CREATE POLICY "Anyone can view course sections"
ON public.course_sections
FOR SELECT
USING (true);

CREATE POLICY "Admins and instructors can manage course sections"
ON public.course_sections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()
  )
);

-- Add section_id to lesson_content
ALTER TABLE public.lesson_content
ADD COLUMN section_id UUID REFERENCES public.course_sections(id) ON DELETE SET NULL;

-- Add section_id to quizzes
ALTER TABLE public.quizzes
ADD COLUMN section_id UUID REFERENCES public.course_sections(id) ON DELETE SET NULL;

-- Add section_id to assignments
ALTER TABLE public.assignments
ADD COLUMN section_id UUID REFERENCES public.course_sections(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_course_sections_course_id ON public.course_sections(course_id);
CREATE INDEX idx_lesson_content_section_id ON public.lesson_content(section_id);
CREATE INDEX idx_quizzes_section_id ON public.quizzes(section_id);
CREATE INDEX idx_assignments_section_id ON public.assignments(section_id);

-- Trigger for updated_at
CREATE TRIGGER update_course_sections_updated_at
BEFORE UPDATE ON public.course_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();