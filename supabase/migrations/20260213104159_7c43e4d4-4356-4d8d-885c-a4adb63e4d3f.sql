
-- Create the assignment-submissions storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-submissions', 'assignment-submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own submission files
CREATE POLICY "Students can upload assignment submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignment-submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow students to view their own submission files
CREATE POLICY "Students can view their own submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow students to update/overwrite their own submission files
CREATE POLICY "Students can update their own submissions"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'assignment-submissions' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow instructors to view submissions for their courses
CREATE POLICY "Instructors can view assignment submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-submissions'
  AND EXISTS (
    SELECT 1 FROM courses c
    WHERE c.instructor_id = auth.uid()
  )
);

-- Allow admins to view all submission files
CREATE POLICY "Admins can view all assignment submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignment-submissions'
  AND has_role(auth.uid(), 'admin'::app_role)
);
