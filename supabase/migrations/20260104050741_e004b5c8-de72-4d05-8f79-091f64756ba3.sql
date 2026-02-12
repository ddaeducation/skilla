-- Drop existing restrictive policies for enrollments SELECT
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Instructors can view enrollments for their courses" ON public.enrollments;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.enrollments;

-- Recreate as PERMISSIVE policies (default, uses OR logic)
CREATE POLICY "Admins can view all enrollments" 
ON public.enrollments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Instructors can view enrollments for their courses" 
ON public.enrollments 
FOR SELECT 
USING (EXISTS ( 
  SELECT 1 FROM courses 
  WHERE courses.id = enrollments.course_id 
  AND courses.instructor_id = auth.uid()
));

CREATE POLICY "Users can view their own enrollments" 
ON public.enrollments 
FOR SELECT 
USING (auth.uid() = user_id);