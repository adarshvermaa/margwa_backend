-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes after tables are created by Drizzle
-- These will be run after initial migration

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);

-- Driver profiles indexes
CREATE INDEX IF NOT EXISTS idx_driver_user ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_online ON driver_profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_driver_location ON driver_profiles USING GIST(
  ST_Point(current_longitude::float, current_latitude::float)
) WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

-- Vehicles indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_number ON vehicles(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(verification_status);

-- Routes indexes
CREATE INDEX IF NOT EXISTS idx_routes_driver ON routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active);
CREATE INDEX IF NOT EXISTS idx_routes_cities ON routes(from_city, to_city);

-- Route instances indexes
CREATE INDEX IF NOT EXISTS idx_route_inst_route ON route_instances(route_id);
CREATE INDEX IF NOT EXISTS idx_route_inst_driver ON route_instances(driver_id);
CREATE INDEX IF NOT EXISTS idx_route_inst_date ON route_instances(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_route_inst_status ON route_instances(status);
CREATE INDEX IF NOT EXISTS idx_route_inst_driver_date ON route_instances(driver_id, scheduled_date);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_route_inst ON bookings(route_instance_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_status ON bookings(client_id, status);

-- Ride tracking indexes
CREATE INDEX IF NOT EXISTS idx_tracking_route ON ride_tracking(route_instance_id);
CREATE INDEX IF NOT EXISTS idx_tracking_time ON ride_tracking(route_instance_id, recorded_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, is_read) WHERE is_read = false;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_time ON notifications(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

-- Earnings indexes
CREATE INDEX IF NOT EXISTS idx_earnings_driver ON earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_earnings_date ON earnings(driver_id, payment_date DESC);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token);

-- OTP verifications indexes
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_verifications(user_id);
