import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from '../utils/logger';

const router = Router();

let STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL || 'http://localhost:3010';

// If it's just a port number (digits only), prepend http://localhost:
if (/^\d+$/.test(STORAGE_SERVICE_URL)) {
    STORAGE_SERVICE_URL = `http://localhost:${STORAGE_SERVICE_URL}`;
}

// Ensure protocol is present
if (!STORAGE_SERVICE_URL.startsWith('http://') && !STORAGE_SERVICE_URL.startsWith('https://')) {
    STORAGE_SERVICE_URL = `http://${STORAGE_SERVICE_URL}`;
}

logger.info(`Storage Service URL: ${STORAGE_SERVICE_URL}`);

// Proxy all /api/v1/storage requests to storage service
router.use(
    '/',
    createProxyMiddleware({
        target: STORAGE_SERVICE_URL,
        changeOrigin: true,
        pathRewrite: {
            '^/api/v1/storage': '/api/v1/storage',
        },
        onProxyReq: (proxyReq, req) => {
            logger.info(`Proxying to Storage Service: ${req.method} ${req.path}`);
        },
        onError: (err, req, res: any) => {
            logger.error('Storage service proxy error:', err.message);
            res.status(503).json({
                success: false,
                error: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Storage service is currently unavailable',
                },
            });
        },
    })
);

export default router;
