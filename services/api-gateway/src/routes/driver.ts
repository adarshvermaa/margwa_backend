import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '../utils/logger';

const router = Router();

let DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://localhost:3003';

// If it's just a port number (digits only), prepend http://localhost:
if (/^\d+$/.test(DRIVER_SERVICE_URL)) {
    DRIVER_SERVICE_URL = `http://localhost:${DRIVER_SERVICE_URL}`;
}

// Ensure protocol is present
if (!DRIVER_SERVICE_URL.startsWith('http://') && !DRIVER_SERVICE_URL.startsWith('https://')) {
    DRIVER_SERVICE_URL = `http://${DRIVER_SERVICE_URL}`;
}

logger.info(`Driver Service URL: ${DRIVER_SERVICE_URL}`);

// Proxy all /api/v1/driver requests to driver service
router.use(
    '/',
    createProxyMiddleware({
        target: DRIVER_SERVICE_URL,
        changeOrigin: true,
        timeout: 30000, // 30 second timeout
        proxyTimeout: 30000, // 30 second proxy timeout
        pathRewrite: {
            '^/api/v1/driver': '/api/v1/driver',
        },
        onProxyReq: (proxyReq, req, res) => {
            logger.info(`Proxying to Driver Service: ${req.method} ${req.path}`);

            // Restream body if present (fix for express.json() consuming stream)
            const contentType = req.get('Content-Type') || '';
            if (!contentType.includes('multipart/form-data') &&
                req.body &&
                Object.keys(req.body).length > 0 &&
                (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {

                logger.info(`Restreaming JSON body for ${req.path}`);
                const bodyData = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                proxyReq.write(bodyData);
            }
        },
        onError: (err, req, res) => {
            logger.error('Driver service proxy error:', err.message);
            res.status(503).json({
                success: false,
                error: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Driver service is currently unavailable',
                },
            });
        },
    })
);

export default router;
