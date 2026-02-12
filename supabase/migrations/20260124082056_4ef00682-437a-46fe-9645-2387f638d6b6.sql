-- Add parent_id column to course_sections to support 3-level hierarchy (Month > Week > Day)
ALTER TABLE public.course_sections
ADD COLUMN parent_id UUID REFERENCES public.course_sections(id) ON DELETE CASCADE;

-- Add section_level column to indicate depth (1=Month, 2=Week, 3=Day)
ALTER TABLE public.course_sections
ADD COLUMN section_level INTEGER DEFAULT 1;

-- Create index for faster parent lookups
CREATE INDEX idx_course_sections_parent_id ON public.course_sections(parent_id);

-- Update RLS policies to allow reading hierarchical sections
DROP POLICY IF EXISTS "Sections are viewable by enrolled students" ON public.course_sections;

CREATE POLICY "Sections are viewable by enrolled students" 
ON public.course_sections 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments 
    WHERE enrollments.course_id = course_sections.course_id 
    AND enrollments.user_id = auth.uid()
    AND enrollments.payment_status = 'completed'
  )
  OR EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_sections.course_id 
    AND courses.instructor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);