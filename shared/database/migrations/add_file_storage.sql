-- Add file tracking table for all uploads
CREATE TABLE IF NOT EXISTS uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bucket VARCHAR(100) NOT NULL,
    file_key VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_uploaded_files_user ON uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_bucket ON uploaded_files(bucket);
CREATE INDEX idx_uploaded_files_deleted ON uploaded_files(is_deleted) WHERE NOT is_deleted;

-- Add avatar URL to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add file metadata columns to driver_documents
ALTER TABLE driver_documents 
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add file size columns to vehicles table
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS rc_file_size BIGINT,
  ADD COLUMN IF NOT EXISTS insurance_file_size BIGINT,
  ADD COLUMN IF NOT EXISTS puc_file_size BIGINT,
  ADD COLUMN IF NOT EXISTS permit_file_size BIGINT;

COMMENT ON TABLE uploaded_files IS 'Tracks all files uploaded to MinIO for audit and cleanup';
COMMENT ON COLUMN users.avatar_url IS 'URL to user profile image in MinIO';
