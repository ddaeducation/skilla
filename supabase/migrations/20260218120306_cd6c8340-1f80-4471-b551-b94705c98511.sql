
-- Drop the broken policy
DROP POLICY IF EXISTS "Instructors can view other instructor profiles" ON public.profiles;

-- Recreate with correct has_role function call (requires 2 arguments)
CREATE POLICY "Instructors can view other instructor profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'moderator'::app_role)
  AND (
    has_role(id, 'moderator'::app_role)
    OR has_role(id, 'admin'::app_role)
  )
);
