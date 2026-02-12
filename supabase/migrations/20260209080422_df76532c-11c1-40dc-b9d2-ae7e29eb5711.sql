-- Create table for course instructors (primary and co-instructors)
CREATE TABLE public.course_instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'co_instructor' CHECK (role IN ('primary', 'co_instructor')),
    added_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(course_id, instructor_id)
);

-- Enable RLS
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Instructors can view course instructors for their courses"
ON public.course_instructors
FOR SELECT
TO authenticated
USING (
    instructor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.courses 
        WHERE courses.id = course_instructors.course_id 
        AND courses.instructor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Primary instructor or admin can add co-instructors"
ON public.course_instructors
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.courses 
        WHERE courses.id = course_instructors.course_id 
        AND courses.instructor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Primary instructor or admin can update course instructors"
ON public.course_instructors
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.courses 
        WHERE courses.id = course_instructors.course_id 
        AND courses.instructor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Primary instructor or admin can remove co-instructors"
ON public.course_instructors
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.courses 
        WHERE courses.id = course_instructors.course_id 
        AND courses.instructor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
);

-- Create trigger for updated_at
CREATE TRIGGER update_course_instructors_updated_at
BEFORE UPDATE ON public.course_instructors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();