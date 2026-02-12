-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert pending enrollments" ON public.enrollments;

-- Create new policy that allows users to insert their own enrollments (pending or completed for free courses)
CREATE POLICY "Users can insert their own enrollments"
ON public.enrollments
FOR INSERT
WITH CHECK (auth.uid() = user_id);