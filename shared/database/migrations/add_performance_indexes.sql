-- Performance Optimization Migration
-- Adds indexes to improve query performance for vehicle and driver operations

-- Index for vehicle ownership lookups (used in SaveSeatConfiguration, UpdateVehicle)
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);

-- Index for driver profile user lookups (used in ownership verification)
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);

-- Index for vehicle seat configuration lookups by vehicle_id (already exists from add_seat_configuration.sql)
-- CREATE INDEX IF NOT EXISTS idx_seat_config_vehicle_id ON vehicle_seat_configurations(vehicle_id);

-- Additional useful indexes for common queries

-- Index for finding active vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active) WHERE is_active = true;

-- Index for vehicle verification status filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_verification_status ON vehicles(verification_status);

-- Composite index for driver's active vehicles (common query pattern)
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_active ON vehicles(driver_id, is_active) WHERE is_active = true;

-- Update statistics for query planner
ANALYZE vehicles;
ANALYZE vehicle_seat_configurations;
ANALYZE driver_profiles;

-- Add comments for documentation
COMMENT ON INDEX idx_vehicles_driver_id IS 'Improves ownership verification queries';
COMMENT ON INDEX idx_driver_profiles_user_id IS 'Speeds up driver profile lookups by user ID';
COMMENT ON INDEX idx_vehicles_is_active IS 'Partial index for active vehicle queries';
COMMENT ON INDEX idx_vehicles_verification_status IS 'Improves filtering by verification status';
COMMENT ON INDEX idx_vehicles_driver_active IS 'Composite index for common driver active vehicles query';
