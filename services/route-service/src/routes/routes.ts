import { Router, Request, Response } from 'express';
import { RouteService } from '../services/routeService';
import { createRouteSchema, updateRouteSchema, searchRoutesSchema } from '../validators/routeValidator';
import { successResponse, errorResponse, paginatedResponse } from '../../../../shared/utils';
import { ErrorCodes } from '../../../../shared/types';
import { logger } from '../utils/logger';

const router = Router();
const routeService = new RouteService();

// Create new route
router.post('/', async (req: Request, res: Response) => {
    try {
        const validatedData = createRouteSchema.parse(req.body);
        const route = await routeService.createRoute(validatedData);

        res.status(201).json(successResponse(route, 'Route created successfully'));
    } catch (error: any) {
        logger.error('Create route error:', error);

        if (error.name === 'ZodError') {
            return res.status(400).json(
                errorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', error.errors)
            );
        }

        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create route')
        );
    }
});

// Get driver routes
router.get('/driver/:driverId', async (req: Request, res: Response) => {
    try {
        const { driverId } = req.params;
        const routes = await routeService.getDriverRoutes(driverId);

        res.json(successResponse(routes, 'Driver routes retrieved'));
    } catch (error) {
        logger.error('Get driver routes error:', error);
        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch driver routes')
        );
    }
});

// Get route by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const route = await routeService.getRouteById(id);

        if (!route) {
            return res.status(404).json(
                errorResponse(ErrorCodes.VALIDATION_ERROR, 'Route not found')
            );
        }

        res.json(successResponse(route, 'Route retrieved'));
    } catch (error) {
        logger.error('Get route error:', error);
        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch route')
        );
    }
});

// Update route
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validatedData = updateRouteSchema.parse(req.body);

        const route = await routeService.updateRoute(id, validatedData);

        if (!route) {
            return res.status(404).json(
                errorResponse(ErrorCodes.VALIDATION_ERROR, 'Route not found')
            );
        }

        res.json(successResponse(route, 'Route updated successfully'));
    } catch (error: any) {
        logger.error('Update route error:', error);

        if (error.name === 'ZodError') {
            return res.status(400).json(
                errorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', error.errors)
            );
        }

        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update route')
        );
    }
});

// Delete route
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await routeService.deleteRoute(id);

        res.json(successResponse(null, 'Route deleted successfully'));
    } catch (error) {
        logger.error('Delete route error:', error);
        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete route')
        );
    }
});

// Search routes
router.post('/search', async (req: Request, res: Response) => {
    try {
        const validatedData = searchRoutesSchema.parse(req.body);
        const result = await routeService.searchRoutes(validatedData);

        res.json(paginatedResponse(
            result.routes,
            result.page,
            result.limit,
            result.total
        ));
    } catch (error: any) {
        logger.error('Search routes error:', error);

        if (error.name === 'ZodError') {
            return res.status(400).json(
                errorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', error.errors)
            );
        }

        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to search routes')
        );
    }
});

// Get popular routes
router.get('/popular/list', async (req: Request, res: Response) => {
    try {
        const routes = await routeService.getPopularRoutes();
        res.json(successResponse(routes, 'Popular routes retrieved'));
    } catch (error) {
        logger.error('Get popular routes error:', error);
        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch popular routes')
        );
    }
});

export default router;
