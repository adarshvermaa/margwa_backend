-- Add new vehicle types to the enum if they don't exist
ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'auto';
ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'muv';
