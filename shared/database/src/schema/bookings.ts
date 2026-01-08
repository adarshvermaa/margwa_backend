import { pgTable, uuid, varchar, text, boolean, timestamp, decimal, integer, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { driverProfiles } from './drivers';
import { routeInstances } from './routes';

// Enums
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'cancelled', 'completed']);

// Bookings Table
export const bookings = pgTable('bookings', {
    id: uuid('id').primaryKey().defaultRandom(),
    routeInstanceId: uuid('route_instance_id').notNull().references(() => routeInstances.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').notNull().references(() => users.id),
    driverId: uuid('driver_id').notNull().references(() => driverProfiles.id),
    pickupLatitude: decimal('pickup_latitude', { precision: 10, scale: 7 }).notNull(),
    pickupLongitude: decimal('pickup_longitude', { precision: 10, scale: 7 }).notNull(),
    pickupAddress: text('pickup_address').notNull(),
    dropLatitude: decimal('drop_latitude', { precision: 10, scale: 7 }).notNull(),
    dropLongitude: decimal('drop_longitude', { precision: 10, scale: 7 }).notNull(),
    dropAddress: text('drop_address').notNull(),
    seatsRequested: integer('seats_requested').notNull(),
    bookingAmount: decimal('booking_amount', { precision: 8, scale: 2 }).notNull(),
    status: bookingStatusEnum('status').notNull().default('pending'),
    otpForPickup: varchar('otp_for_pickup', { length: 4 }),
    otpVerifiedAt: timestamp('otp_verified_at', { withTimezone: true }),
    pickupTime: timestamp('pickup_time', { withTimezone: true }),
    dropTime: timestamp('drop_time', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    cancelledBy: uuid('cancelled_by').references(() => users.id),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Ride Tracking Table (Real-time location)
export const rideTracking = pgTable('ride_tracking', {
    id: uuid('id').primaryKey().defaultRandom(),
    routeInstanceId: uuid('route_instance_id').notNull().references(() => routeInstances.id, { onDelete: 'cascade' }),
    driverId: uuid('driver_id').notNull().references(() => driverProfiles.id),
    currentLatitude: decimal('current_latitude', { precision: 10, scale: 7 }).notNull(),
    currentLongitude: decimal('current_longitude', { precision: 10, scale: 7 }).notNull(),
    heading: decimal('heading', { precision: 5, scale: 2 }),
    speedKmh: decimal('speed_kmh', { precision: 5, scale: 2 }),
    etaMinutes: integer('eta_minutes'),
    distanceRemainingKm: decimal('distance_remaining_km', { precision: 8, scale: 2 }),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type exports
export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type RideTracking = typeof rideTracking.$inferSelect;
export type NewRideTracking = typeof rideTracking.$inferInsert;
