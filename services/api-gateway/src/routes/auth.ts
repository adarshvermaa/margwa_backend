import { Router, Request, Response } from 'express';
import axios from 'axios';
import { errorResponse } from '../../../../shared/utils';
import { ErrorCodes } from '../../../../shared/types';
import { logger } from '../utils/logger';

const router = Router();
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// Helper for axios requests
const forwardRequest = async (method: 'post' | 'get' | 'put', path: string, req: Request, res: Response) => {
    try {
        const response = await axios({
            method,
            url: `${AUTH_SERVICE_URL}${path}`,
            data: req.body,
            headers: req.headers.authorization ? { Authorization: req.headers.authorization } : undefined,
            validateStatus: () => true, // Don't throw on error status
        });
        res.status(response.status).json(response.data);
    } catch (error: any) {
        logger.error(`Auth service error [${path}]:`, error.message);
        res.status(500).json(
            errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Authentication service unavailable',
                error.message
            )
        );
    }
};

router.post('/register', (req, res) => forwardRequest('post', '/auth/register', req, res));
router.post('/send-otp', (req, res) => forwardRequest('post', '/auth/send-otp', req, res));
router.post('/verify-otp', (req, res) => forwardRequest('post', '/auth/verify-otp', req, res));
router.post('/refresh-token', (req, res) => forwardRequest('post', '/auth/refresh-token', req, res));
router.post('/logout', (req, res) => forwardRequest('post', '/auth/logout', req, res));
router.get('/profile', (req, res) => forwardRequest('get', '/auth/profile', req, res));
router.put('/profile', (req, res) => forwardRequest('put', '/auth/profile', req, res));

export default router;
