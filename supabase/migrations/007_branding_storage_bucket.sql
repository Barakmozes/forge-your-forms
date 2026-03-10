-- Migration: Create branding storage bucket + policies
-- Agent 2, Prompt 2.4

-- Create the branding bucket (public, for logo uploads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to branding bucket
CREATE POLICY "branding_upload_authenticated"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding');

-- Allow authenticated users to update their uploads
CREATE POLICY "branding_update_authenticated"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding');

-- Allow authenticated users to delete their uploads
CREATE POLICY "branding_delete_authenticated"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding');

-- Allow public read access (logos are displayed on public forms)
CREATE POLICY "branding_read_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'branding');
