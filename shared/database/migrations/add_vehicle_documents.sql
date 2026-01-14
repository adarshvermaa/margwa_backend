-- Add PUC and Permit fields to vehicles table

ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS puc_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS puc_expiry DATE,
ADD COLUMN IF NOT EXISTS puc_image_url TEXT,
ADD COLUMN IF NOT EXISTS permit_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS permit_image_url TEXT;
