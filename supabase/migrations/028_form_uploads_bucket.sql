-- ============================================
-- Migration 028: Create form-uploads storage bucket
-- Provides file upload storage for form file_upload fields
-- ============================================

-- Create the bucket (public read access for uploaded files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can upload files (public form submissions)
CREATE POLICY "form_uploads_insert" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'form-uploads');

-- Anyone can read uploaded files
CREATE POLICY "form_uploads_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'form-uploads');

-- Only authenticated users can delete files
CREATE POLICY "form_uploads_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'form-uploads');

-- Set file size limit (20 MB) and allowed MIME types
UPDATE storage.buckets SET
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'image/png','image/jpeg','image/gif','image/webp','image/svg+xml',
    'application/pdf',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain','text/csv'
  ]
WHERE id = 'form-uploads';
