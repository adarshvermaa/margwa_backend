import { z } from 'zod';

// Validation schemas
export const createRouteSchema = z.object({
    driverId: z.string().uuid(),
    startLocation: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        address: z.string().min(1),
    }),
    endLocation: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        address: z.string().min(1),
    }),
    departureTime: z.string().datetime(), // ISO 8601 datetime string
    arrivalTime: z.string().datetime(), // ISO 8601 datetime string
    price: z.number().positive(),
    totalSeats: z.number().int().positive(),
    availableSeats: z.number().int().positive(),
    vehicleInfo: z.object({
        type: z.string().min(1),
        number: z.string().min(1),
        model: z.string().min(1),
    }),
    status: z.enum(['active', 'inactive', 'completed', 'cancelled']).default('active'),
    genderPreference: z.enum(['any', 'male', 'female']).optional().default('any'),
    pickupRadiusKm: z.number().int().positive().optional().default(5),
    dropRadiusKm: z.number().int().positive().optional().default(5),
    amenities: z.array(z.string()).optional().default([]),
    recurringDays: z.array(z.number().int().min(0).max(6)).optional().default([]),
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
