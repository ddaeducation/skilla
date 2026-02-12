-- Create certificates storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read their own certificates
CREATE POLICY "Users can view their own certificates"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificates' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow service role to upload certificates
CREATE POLICY "Service role can upload certificates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certificates');