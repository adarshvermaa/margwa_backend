-- Migration: Add vehicle seat configuration support
-- Created: 2026-01-13
-- Purpose: Enable drivers to configure seat layouts, pricing, and amenities

-- Create seat configuration table
CREATE TABLE IF NOT EXISTS vehicle_seat_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    seat_id VARCHAR(50) NOT NULL,
    row_number INT NOT NULL,
    position VARCHAR(20) NOT NULL, -- 'left', 'right', 'center'
    is_available BOOLEAN DEFAULT true,
    seat_type VARCHAR(20) NOT NULL, -- 'driver', 'passenger'
    price DECIMAL(10,2),
    amenities JSONB, -- ['ac', 'charging', 'legroom', etc.]
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(vehicle_id, seat_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_seat_config_vehicle_id ON vehicle_seat_configurations(vehicle_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_seat_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seat_config_timestamp
    BEFORE UPDATE ON vehicle_seat_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_seat_config_timestamp();
