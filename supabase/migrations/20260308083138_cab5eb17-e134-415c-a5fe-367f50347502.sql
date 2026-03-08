CREATE POLICY "Instructors can delete enrollments for their courses"
ON public.enrollments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = enrollments.course_id
    AND courses.instructor_id = auth.uid()
  )
);