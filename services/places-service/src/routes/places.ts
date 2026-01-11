import { Router, Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import PlacesService from '../services/placesService';

// Validation schemas
const autocompleteSchema = z.object({
    query: z.string().min(1).max(200),
    sessionToken: z.string().optional(),
});

const placeDetailsSchema = z.object({
    placeId: z.string().min(1),
});

const geocodeSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
});

export default function createPlacesRouter(placesService: PlacesService) {
    const router = Router();

    /**
     * GET /autocomplete
     * Get autocomplete suggestions for a place search query
     */
    router.get('/autocomplete', async (req: Request, res: Response) => {
        try {
            const { query, sessionToken } = autocompleteSchema.parse({
                query: req.query.query,
                sessionToken: req.query.sessionToken,
            });

            const results = await placesService.autocomplete(query, sessionToken);

            res.json({
                success: true,
                data: results,
            });
        } catch (error: any) {
            logger.error('Autocomplete endpoint error', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid request parameters',
                    details: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch autocomplete results',
            });
        }
    });

    /**
     * GET /details/:placeId
     * Get detailed information about a specific place
     */
    router.get('/details/:placeId', async (req: Request, res: Response) => {
        try {
            const { placeId } = placeDetailsSchema.parse({
                placeId: req.params.placeId,
            });

            const details = await placesService.getPlaceDetails(placeId);

            res.json({
                success: true,
                data: details,
            });
        } catch (error: any) {
            logger.error('Place details endpoint error', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid place ID',
                    details: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch place details',
            });
        }
    });

    /**
     * GET /geocode
     * Reverse geocode coordinates to an address
     */
    router.get('/geocode', async (req: Request, res: Response) => {
        try {
            const { lat, lng } = geocodeSchema.parse({
                lat: parseFloat(req.query.lat as string),
                lng: parseFloat(req.query.lng as string),
            });

            const address = await placesService.reverseGeocode(lat, lng);

            res.json({
                success: true,
                data: { address },
            });
        } catch (error: any) {
            logger.error('Geocode endpoint error', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid coordinates',
                    details: error.errors,
                });
            }

            res.status(500).json({
                success: false,
                error: error.message || 'Failed to reverse geocode',
            });
        }
    });

    return router;
}
