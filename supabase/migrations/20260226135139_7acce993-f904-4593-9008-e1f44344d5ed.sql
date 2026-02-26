
-- Drop the overly permissive "Anyone can view courses" policy
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;

-- Create a new policy: public can only see live/upcoming approved courses
CREATE POLICY "Anyone can view published courses"
ON public.courses
FOR SELECT
USING (
  publish_status IN ('live', 'upcoming') AND approval_status = 'approved'
);

-- Admins can still view ALL courses (already covered by existing admin SELECT via ALL policy)
-- Instructors can still view their own courses (already covered by existing instructor ALL policy)
