-- Add image_url column to announcements table
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to announcement_comments table
ALTER TABLE public.announcement_comments ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to discussion_threads table
ALTER TABLE public.discussion_threads ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to discussion_replies table
ALTER TABLE public.discussion_replies ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create a storage bucket for communication uploads if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('communication-uploads', 'communication-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for communication uploads
CREATE POLICY "Anyone can view communication uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'communication-uploads');

CREATE POLICY "Authenticated users can upload to communication"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'communication-uploads' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own communication uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'communication-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);