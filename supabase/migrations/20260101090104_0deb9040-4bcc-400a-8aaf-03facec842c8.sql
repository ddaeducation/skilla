-- Create storage bucket for course materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files (instructors/admins)
CREATE POLICY "Instructors and admins can upload course materials"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-materials' AND
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  )
);

-- Allow instructors and admins to update their uploads
CREATE POLICY "Instructors and admins can update course materials"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-materials' AND
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  )
);

-- Allow instructors and admins to delete materials
CREATE POLICY "Instructors and admins can delete course materials"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-materials' AND
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  )
);

-- Anyone can view course materials (public bucket)
CREATE POLICY "Anyone can view course materials"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'course-materials');