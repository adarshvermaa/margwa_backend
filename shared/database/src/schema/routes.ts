import { pgTable, uuid, varchar, text, boolean, timestamp, decimal, integer, pgEnum, date, time, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { driverProfiles, vehicles } from './drivers';

// Enums
export const genderPreferenceEnum = pgEnum('gender_preference', ['any', 'male', 'female']);
export const routeStatusEnum = pgEnum('route_status', ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled']);

// Routes Table
export const routes = pgTable('routes', {
    id: uuid('id').primaryKey().defaultRandom(),
    driverId: uuid('driver_id').notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
    vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
    fromCity: varchar('from_city', { length: 100 }).notNull(),
    fromLatitude: decimal('from_latitude', { precision: 10, scale: 7 }),
    fromLongitude: decimal('from_longitude', { precision: 10, scale: 7 }),
    toCity: varchar('to_city', { length: 100 }).notNull(),
    toLatitude: decimal('to_latitude', { precision: 10, scale: 7 }),
    toLongitude: decimal('to_longitude', { precision: 10, scale: 7 }),
    departureTime: time('departure_time').notNull(),
    arrivalTime: time('arrival_time').notNull(),
    estimatedDurationMinutes: integer('estimated_duration_minutes'),
    distanceKm: decimal('distance_km', { precision: 8, scale: 2 }),
    basePricePerSeat: decimal('base_price_per_seat', { precision: 8, scale: 2 }).notNull(),
    totalSeats: integer('total_seats').notNull(),
    genderPreference: genderPreferenceEnum('gender_preference').notNull().default('any'),
    pickupRadiusKm: integer('pickup_radius_km').notNull().default(5),
    dropRadiusKm: integer('drop_radius_km').notNull().default(5),
    amenities: jsonb('amenities').notNull().default(sql`'[]'::jsonb`),
    isActive: boolean('is_active').notNull().default(true),
    recurringDays: integer('recurring_days').array().notNull().default(sql`'{}'::integer[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Route Instances Table (Actual scheduled trips)
export const routeInstances = pgTable('route_instances', {
    id: uuid('id').primaryKey().defaultRandom(),
    routeId: uuid('route_id').notNull().references(() => routes.id, { onDelete: 'cascade' }),
    driverId: uuid('driver_id').notNull().references(() => driverProfiles.id),
    vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
    scheduledDate: date('scheduled_date').notNull(),
    departureTime: timestamp('departure_time', { withTimezone: true }).notNull(),
    arrivalTime: timestamp('arrival_time', { withTimezone: true }),
    actualStartTime: timestamp('actual_start_time', { withTimezone: true }),
    actualEndTime: timestamp('actual_end_time', { withTimezone: true }),
    status: routeStatusEnum('status').notNull().default('scheduled'),
    seatsAvailable: integer('seats_available').notNull(),
    seatsBooked: integer('seats_booked').notNull().default(0),
    pendingRequests: integer('pending_requests').notNull().default(0),
    currentLatitude: decimal('current_latitude', { precision: 10, scale: 7 }),
    currentLongitude: decimal('current_longitude', { precision: 10, scale: 7 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type exports
export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
export type RouteInstance = typeof routeInstances.$inferSelect;
export type NewRouteInstance = typeof routeInstances.$inferInsert;
