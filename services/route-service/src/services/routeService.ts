import { getDatabase, routes, routeInstances, driverProfiles, vehicles } from '@margwa/database';
import { eq, and, sql, desc } from 'drizzle-orm';
import { CreateRouteInput, UpdateRouteInput, SearchRoutesInput } from '../validators/routeValidator';
import { logger } from '../utils/logger';



export class RouteService {
    // Create a new route
    async createRoute(data: CreateRouteInput) {
        try {
            const db = getDatabase();
            const [route] = await db.insert(routes).values({
                driverId: data.driverId,
                vehicleId: data.vehicleId,
                fromCity: data.fromCity,
                fromLatitude: data.fromLatitude?.toString(),
                fromLongitude: data.fromLongitude?.toString(),
                toCity: data.toCity,
                toLatitude: data.toLatitude?.toString(),
                toLongitude: data.toLongitude?.toString(),
                departureTime: data.departureTime,
                arrivalTime: data.arrivalTime,
                estimatedDurationMinutes: data.estimatedDurationMinutes,
                distanceKm: data.distanceKm?.toString(),
                basePricePerSeat: data.basePricePerSeat.toString(),
                totalSeats: data.totalSeats,
                genderPreference: data.genderPreference,
                pickupRadiusKm: data.pickupRadiusKm,
                dropRadiusKm: data.dropRadiusKm,
                amenities: data.amenities,
                isActive: data.isActive,
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

            if (data.fromCity) updateData.fromCity = data.fromCity;
            if (data.toCity) updateData.toCity = data.toCity;
            if (data.departureTime) updateData.departureTime = data.departureTime;
            if (data.arrivalTime) updateData.arrivalTime = data.arrivalTime;
            if (data.basePricePerSeat !== undefined) updateData.basePricePerSeat = data.basePricePerSeat.toString();
            if (data.totalSeats) updateData.totalSeats = data.totalSeats;
            if (data.genderPreference) updateData.genderPreference = data.genderPreference;
            if (data.pickupRadiusKm) updateData.pickupRadiusKm = data.pickupRadiusKm;
            if (data.amenities) updateData.amenities = data.amenities;
            if (data.isActive !== undefined) updateData.isActive = data.isActive;
            if (data.recurringDays) updateData.recurringDays = data.recurringDays;

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
