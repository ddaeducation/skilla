DROP POLICY "Instructors can view enrolled student profiles" ON public.profiles;

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
      AND e.payment_status IN ('completed', 'pending', 'suspended')
  )
);