import { z } from 'zod';

// Validation schemas
export const createRouteSchema = z.object({
    driverId: z.string().uuid(),
    vehicleId: z.string().uuid(),
    fromCity: z.string().min(1),
    fromLatitude: z.number().min(-90).max(90).optional(),
    fromLongitude: z.number().min(-180).max(180).optional(),
    toCity: z.string().min(1),
    toLatitude: z.number().min(-90).max(90).optional(),
    toLongitude: z.number().min(-180).max(180).optional(),
    departureTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
    arrivalTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
    estimatedDurationMinutes: z.number().int().positive().optional(),
    distanceKm: z.number().positive().optional(),
    basePricePerSeat: z.number().positive(),
    totalSeats: z.number().int().positive(),
    genderPreference: z.enum(['any', 'male', 'female']).default('any'),
    pickupRadiusKm: z.number().int().positive().default(5),
    dropRadiusKm: z.number().int().positive().default(5),
    amenities: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
    recurringDays: z.array(z.number().int().min(0).max(6)).default([]),
});

export const updateRouteSchema = createRouteSchema.partial();

export const searchRoutesSchema = z.object({
    fromCity: z.string().min(1),
    toCity: z.string().min(1),
    date: z.string().optional(),
    timeFilter: z.enum(['all', 'morning', 'afternoon', 'evening']).optional(),
    genderFilter: z.enum(['all', 'male', 'female']).optional(),
    vehicleType: z.string().optional(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(50).default(20),
});

export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type SearchRoutesInput = z.infer<typeof searchRoutesSchema>;
