-- Add RLS policy for instructors to view enrolled student profiles
CREATE POLICY "Instructors can view enrolled student profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.user_id = profiles.id 
    AND c.instructor_id = auth.uid()
    AND e.payment_status = 'completed'
  )
);

-- Add RLS policy for instructors to view enrollments for their courses
CREATE POLICY "Instructors can view enrollments for their courses" 
ON public.enrollments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM courses 
    WHERE courses.id = enrollments.course_id 
    AND courses.instructor_id = auth.uid()
  )
);