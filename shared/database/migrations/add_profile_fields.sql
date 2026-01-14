-- Add DOB, Gender, and IsProfileComplete columns to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS dob TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false;

-- Update existing users to have is_profile_complete = true if they have fullName and email
UPDATE users 
SET is_profile_complete = true 
WHERE full_name IS NOT NULL AND email IS NOT NULL;
