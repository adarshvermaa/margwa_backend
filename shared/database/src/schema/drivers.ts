import { pgTable, uuid, varchar, text, boolean, timestamp, decimal, integer, pgEnum, date } from 'drizzle-orm/pg-core';
import { users } from './users';

// Enums
export const backgroundCheckStatusEnum = pgEnum('background_check_status', ['pending', 'approved', 'rejected']);
export const vehicleTypeEnum = pgEnum('vehicle_type', ['sedan', 'suv', 'van', 'hatchback']);
export const verificationStatusEnum = pgEnum('verification_status', ['pending', 'verified', 'rejected']);

// Driver Profiles Table
export const driverProfiles = pgTable('driver_profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
    licenseNumber: varchar('license_number', { length: 50 }),
    licenseExpiry: date('license_expiry'),
    licenseImageUrl: text('license_image_url'),
    backgroundCheckStatus: backgroundCheckStatusEnum('background_check_status').notNull().default('pending'),
    totalTrips: integer('total_trips').notNull().default(0),
    totalEarnings: decimal('total_earnings', { precision: 10, scale: 2 }).notNull().default('0'),
    averageRating: decimal('average_rating', { precision: 3, scale: 2 }).notNull().default('0'),
    isOnline: boolean('is_online').notNull().default(false),
    currentLatitude: decimal('current_latitude', { precision: 10, scale: 7 }),
    currentLongitude: decimal('current_longitude', { precision: 10, scale: 7 }),
    lastLocationUpdate: timestamp('last_location_update', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Vehicles Table
export const vehicles = pgTable('vehicles', {
    id: uuid('id').primaryKey().defaultRandom(),
    driverId: uuid('driver_id').notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
    vehicleName: varchar('vehicle_name', { length: 100 }).notNull(),
    vehicleType: vehicleTypeEnum('vehicle_type').notNull(),
    vehicleNumber: varchar('vehicle_number', { length: 20 }).notNull().unique(),
    vehicleColor: varchar('vehicle_color', { length: 50 }),
    manufacturingYear: integer('manufacturing_year'),
    totalSeats: integer('total_seats').notNull(),
    rcNumber: varchar('rc_number', { length: 50 }),
    rcImageUrl: text('rc_image_url'),
    insuranceNumber: varchar('insurance_number', { length: 50 }),
    insuranceExpiry: date('insurance_expiry'),
    insuranceImageUrl: text('insurance_image_url'),
    verificationStatus: verificationStatusEnum('verification_status').notNull().default('pending'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Driver Documents Table
export const driverDocuments = pgTable('driver_documents', {
    id: uuid('id').primaryKey().defaultRandom(),
    driverId: uuid('driver_id').notNull().references(() => driverProfiles.id, { onDelete: 'cascade' }),
    documentType: varchar('document_type', { length: 50 }).notNull(),
    documentUrl: text('document_url').notNull(),
    verificationStatus: verificationStatusEnum('verification_status').notNull().default('pending'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type exports
export type DriverProfile = typeof driverProfiles.$inferSelect;
export type NewDriverProfile = typeof driverProfiles.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type DriverDocument = typeof driverDocuments.$inferSelect;
export type NewDriverDocument = typeof driverDocuments.$inferInsert;
