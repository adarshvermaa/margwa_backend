import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../utils/logger';

const router = Router();
const PLACES_SERVICE_URL = process.env.PLACES_SERVICE_URL || 'http://localhost:3009';

// Forward all requests to places-service
router.all('/*', async (req: Request, res: Response) => {
    try {
        // req.path is like /autocomplete, we need to add /api/v1/places
        const targetUrl = `${PLACES_SERVICE_URL}/api/v1/places${req.path}`;

        logger.debug(`Forwarding to places-service: ${req.method} ${targetUrl}`);

        const response = await axios({
            method: req.method as any,
            url: targetUrl,
            params: req.query,
            data: req.body,
            headers: {
                ...req.headers,
                host: new URL(PLACES_SERVICE_URL).host,
            },
        });

        res.status(response.status).json(response.data);
    } catch (error: any) {
        logger.error('Places service proxy error:', error.message);

        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(502).json({
                success: false,
                error: 'Places service unavailable',
            });
        }
    }
});

export default router;
