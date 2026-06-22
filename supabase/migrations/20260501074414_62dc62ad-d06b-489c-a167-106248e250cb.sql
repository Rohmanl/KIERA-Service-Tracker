
-- Add proof_file_url column to volunteer_hours
ALTER TABLE public.volunteer_hours
ADD COLUMN IF NOT EXISTS proof_file_url text;

-- Create private storage bucket for proof files
INSERT INTO storage.buckets (id, name, public)
VALUES ('hour-proofs', 'hour-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own folder
CREATE POLICY "Users can upload their own proof files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hour-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own proof files
CREATE POLICY "Users can view their own proof files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'hour-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own proof files
CREATE POLICY "Users can delete their own proof files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'hour-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can view all proof files
CREATE POLICY "Admins can view all proof files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'hour-proofs'
  AND public.has_role(auth.uid(), 'admin')
);

-- Organizations can view proof files (for verifying hours)
CREATE POLICY "Organizations can view proof files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'hour-proofs'
  AND EXISTS (SELECT 1 FROM public.organizations WHERE user_id = auth.uid())
);
