import { Router, Request, Response } from 'express';
import axios from 'axios';
import { errorResponse } from '../../../../shared/utils';
import { ErrorCodes } from '../../../../shared/types';
import { logger } from '../utils/logger';

const router = Router();
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// Forward requests to Auth Service
router.post('/register', async (req: Request, res: Response) => {
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/auth/register`, req.body);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Auth service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Authentication service unavailable'
            )
        );
    }
});

router.post('/send-otp', async (req: Request, res: Response) => {
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/auth/send-otp`, req.body);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Auth service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Authentication service unavailable'
            )
        );
    }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/auth/verify-otp`, req.body);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Auth service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Authentication service unavailable'
            )
        );
    }
});

router.post('/refresh-token', async (req: Request, res: Response) => {
    try {
        const response = await axios.post(`${AUTH_SERVICE_URL}/auth/refresh-token`, req.body);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Auth service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Authentication service unavailable'
            )
        );
    }
});

router.post('/logout', async (req: Request, res: Response) => {
    try {
        const response = await axios.post(
            `${AUTH_SERVICE_URL}/auth/logout`,
            req.body,
            { headers: { Authorization: req.headers.authorization } }
        );
        res.json(response.data);
    } catch (error: any) {
        logger.error('Auth service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Authentication service unavailable'
            )
        );
    }
});

export default router;
