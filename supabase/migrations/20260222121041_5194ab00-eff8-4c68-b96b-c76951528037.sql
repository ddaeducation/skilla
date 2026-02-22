
-- Allow users to update their own instructor application bio
CREATE POLICY "Users can update their own application bio"
ON public.instructor_applications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
