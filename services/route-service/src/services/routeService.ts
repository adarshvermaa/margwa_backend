import { getDatabase, routes, routeInstances, driverProfiles, vehicles } from '@margwa/database';
import { eq, and, sql, desc } from 'drizzle-orm';
import { CreateRouteInput, UpdateRouteInput, SearchRoutesInput } from '../validators/routeValidator';
import { logger } from '../utils/logger';



export class RouteService {
    // Create a new route
    async createRoute(data: CreateRouteInput) {
        try {
            const db = getDatabase();

            // 1. Find or create vehicle
            // @ts-ignore - Schema has vehicleInfo but inferred type might lag
            const { vehicleInfo, driverId } = data as any;

            let vehicleId: string;

            // Check if vehicle exists
            const [existingVehicle] = await db.select()
                .from(vehicles)
                .where(and(
                    eq(vehicles.driverId, driverId),
                    eq(vehicles.vehicleNumber, vehicleInfo.number)
                ))
                .limit(1);

            if (existingVehicle) {
                vehicleId = existingVehicle.id;
            } else {
                // Create new vehicle
                const [newVehicle] = await db.insert(vehicles).values({
                    driverId: driverId,
                    vehicleType: (vehicleInfo.type.toLowerCase()) as any,
                    vehicleNumber: vehicleInfo.number,
                    vehicleName: vehicleInfo.model,
                    totalSeats: data.totalSeats,
                    isActive: true,
                }).returning();
                vehicleId = newVehicle.id;
            }

            // 2. Create route
            const { startLocation, endLocation, price, status } = data as any;

            const [route] = await db.insert(routes).values({
                driverId: data.driverId,
                vehicleId: vehicleId,
                fromCity: startLocation.address,
                fromLatitude: startLocation.latitude.toString(),
                fromLongitude: startLocation.longitude.toString(),
                toCity: endLocation.address,
                toLatitude: endLocation.latitude.toString(),
                toLongitude: endLocation.longitude.toString(),
                departureTime: data.departureTime,
                arrivalTime: data.arrivalTime,
                // estimatedDurationMinutes: data.estimatedDurationMinutes, // Not provided in new schema yet
                // distanceKm: data.distanceKm?.toString(),
                basePricePerSeat: price.toString(),
                totalSeats: data.totalSeats,
                genderPreference: data.genderPreference,
                pickupRadiusKm: data.pickupRadiusKm,
                dropRadiusKm: data.dropRadiusKm,
                amenities: data.amenities,
                isActive: status === 'active',
                recurringDays: data.recurringDays,
            }).returning();

            logger.info(`Route created: ${route.id}`);
            return route;
        } catch (error) {
            logger.error('Error creating route:', error);
            throw error;
        }
    }

    // Get routes by driver ID
    async getDriverRoutes(driverId: string) {
        try {
            const db = getDatabase();
            const driverRoutes = await db.select().from(routes)
                .where(eq(routes.driverId, driverId))
                .orderBy(desc(routes.createdAt));

            return driverRoutes;
        } catch (error) {
            logger.error('Error fetching driver routes:', error);
            throw error;
        }
    }

    // Get route by ID
    async getRouteById(routeId: string) {
        try {
            const db = getDatabase();
            const [route] = await db.select().from(routes).where(eq(routes.id, routeId));
            return route || null;
        } catch (error) {
            logger.error('Error fetching route:', error);
            throw error;
        }
    }

    // Update route
    async updateRoute(routeId: string, data: UpdateRouteInput) {
        try {
            const updateData: any = {};
            const input = data as any; // Cast to access nested fields safely

            // Map input fields to DB columns
            if (input.startLocation) {
                updateData.fromCity = input.startLocation.address;
                updateData.fromLatitude = input.startLocation.latitude.toString();
                updateData.fromLongitude = input.startLocation.longitude.toString();
            }

            if (input.endLocation) {
                updateData.toCity = input.endLocation.address;
                updateData.toLatitude = input.endLocation.latitude.toString();
                updateData.toLongitude = input.endLocation.longitude.toString();
            }

            if (input.departureTime) updateData.departureTime = input.departureTime;
            if (input.arrivalTime) updateData.arrivalTime = input.arrivalTime;

            if (input.price !== undefined) updateData.basePricePerSeat = input.price.toString();

            if (input.totalSeats) updateData.totalSeats = input.totalSeats;
            if (input.genderPreference) updateData.genderPreference = input.genderPreference;
            if (input.pickupRadiusKm) updateData.pickupRadiusKm = input.pickupRadiusKm;
            if (input.amenities) updateData.amenities = input.amenities;

            if (input.status) updateData.isActive = input.status === 'active';

            if (input.recurringDays) updateData.recurringDays = input.recurringDays;

            updateData.updatedAt = new Date();

            const db = getDatabase();
            const [updatedRoute] = await db.update(routes)
                .set(updateData)
                .where(eq(routes.id, routeId))
                .returning();

            logger.info(`Route updated: ${routeId}`);
            return updatedRoute;
        } catch (error) {
            logger.error('Error updating route:', error);
            throw error;
        }
    }

    // Delete route
    async deleteRoute(routeId: string) {
        try {
            const db = getDatabase();
            await db.delete(routes).where(eq(routes.id, routeId));
            logger.info(`Route deleted: ${routeId}`);
            return true;
        } catch (error) {
            logger.error('Error deleting route:', error);
            throw error;
        }
    }

    // Search routes
    async searchRoutes(params: SearchRoutesInput) {
        try {
            const { fromCity, toCity, page, limit } = params;
            const offset = (page - 1) * limit;

            // Base query
            const db = getDatabase();
            let query = db.select({
                route: routes,
                driver: driverProfiles,
                vehicle: vehicles,
            })
                .from(routes)
                .leftJoin(driverProfiles, eq(routes.driverId, driverProfiles.id))
                .leftJoin(vehicles, eq(routes.vehicleId, vehicles.id))
                .where(
                    and(
                        eq(routes.fromCity, fromCity),
                        eq(routes.toCity, toCity),
                        eq(routes.isActive, true)
                    )
                )
                .limit(limit)
                .offset(offset);

            const results = await query;

            // Get total count
            const [countResult] = await db.select({ count: sql<number>`count(*)` })
                .from(routes)
                .where(
                    and(
                        eq(routes.fromCity, fromCity),
                        eq(routes.toCity, toCity),
                        eq(routes.isActive, true)
                    )
                );

            return {
                routes: results,
                total: Number(countResult.count),
                page,
                limit,
            };
        } catch (error) {
            logger.error('Error searching routes:', error);
            throw error;
        }
    }

    // Get popular routes (most searched/booked)
    async getPopularRoutes() {
        try {
            // For now, return some common routes
            // In production, this would be based on booking statistics
            const db = getDatabase();
            const popularRoutes = await db.select().from(routes)
                .where(eq(routes.isActive, true))
                .limit(10);

            return popularRoutes;
        } catch (error) {
            logger.error('Error fetching popular routes:', error);
            throw error;
        }
    }

    // Create route instances for upcoming days (scheduled job)
    async createRouteInstances(routeId: string, date: Date) {
        try {
            const route = await this.getRouteById(routeId);
            if (!route) {
                throw new Error('Route not found');
            }

            const dayOfWeek = date.getDay(); // 0-6 (Sunday-Saturday)

            // Check if route is scheduled for this day
            if (!route.recurringDays.includes(dayOfWeek)) {
                return null;
            }

            // Create route instance
            const db = getDatabase();
            const [instance] = await db.insert(routeInstances).values({
                routeId: route.id,
                driverId: route.driverId,
                vehicleId: route.vehicleId,
                scheduledDate: date.toISOString().split('T')[0],
                departureTime: new Date(`${date.toISOString().split('T')[0]}T${route.departureTime}`),
                seatsAvailable: route.totalSeats,
                status: 'scheduled',
            }).returning();

            logger.info(`Route instance created: ${instance.id} for date: ${date.toISOString()}`);
            return instance;
        } catch (error) {
            logger.error('Error creating route instance:', error);
            throw error;
        }
    }
}
