import { Router, Request, Response } from 'express';
import axios from 'axios';
import { errorResponse } from '../../../../shared/utils';
import { ErrorCodes } from '../../../../shared/types';
import { logger } from '../utils/logger';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const ROUTE_SERVICE_URL = process.env.ROUTE_SERVICE_URL || 'http://localhost:3002';

// Create route (drivers only)
router.post('/', authenticate, authorize('driver', 'both'), async (req: Request, res: Response) => {
    try {
        const response = await axios.post(`${ROUTE_SERVICE_URL}/routes`, req.body);
        res.status(response.status).json(response.data);
    } catch (error: any) {
        logger.error('Route service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Route service unavailable'
            )
        );
    }
});

// Get driver routes
router.get('/driver/:driverId', authenticate, async (req: Request, res: Response) => {
    try {
        const { driverId } = req.params;
        const response = await axios.get(`${ROUTE_SERVICE_URL}/routes/driver/${driverId}`);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Route service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Route service unavailable'
            )
        );
    }
});

// Search routes (public)
router.post('/search', async (req: Request, res: Response) => {
    try {
        const response = await axios.post(`${ROUTE_SERVICE_URL}/routes/search`, req.body);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Route service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Route service unavailable'
            )
        );
    }
});

// Get popular routes (public)
router.get('/popular', async (req: Request, res: Response) => {
    try {
        const response = await axios.get(`${ROUTE_SERVICE_URL}/routes/popular/list`);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Route service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Route service unavailable'
            )
        );
    }
});

// Get route by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const response = await axios.get(`${ROUTE_SERVICE_URL}/routes/${id}`);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Route service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Route service unavailable'
            )
        );
    }
});

// Update route (drivers only)
router.put('/:id', authenticate, authorize('driver', 'both'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const response = await axios.put(`${ROUTE_SERVICE_URL}/routes/${id}`, req.body);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Route service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Route service unavailable'
            )
        );
    }
});

// Delete route (drivers only)
router.delete('/:id', authenticate, authorize('driver', 'both'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const response = await axios.delete(`${ROUTE_SERVICE_URL}/routes/${id}`);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Route service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Route service unavailable'
            )
        );
    }
});

export default router;
