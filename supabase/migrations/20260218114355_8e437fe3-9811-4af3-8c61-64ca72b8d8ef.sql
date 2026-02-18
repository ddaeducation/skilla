
-- Allow instructors (moderators) to view other instructor profiles
-- so they can assign co-instructors and transfer course ownership
CREATE POLICY "Instructors can view other instructor profiles"
ON public.profiles
FOR SELECT
USING (
  -- The viewer is an instructor/moderator
  has_role(auth.uid(), 'moderator'::app_role)
  AND
  -- The profile being viewed belongs to an instructor or admin
  (
    has_role(profiles.id, 'moderator'::app_role)
    OR has_role(profiles.id, 'admin'::app_role)
  )
);
