import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { logger } from './utils/logger';
import { errorResponse } from '../../../shared/utils';
import { ErrorCodes } from '../../../shared/types';

// Load environment variables
dotenv.config({ path: '../../.env' });

const app: Application = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Redis client for rate limiting and caching
export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Response compression
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined', {
    stream: {
        write: (message: string) => logger.info(message.trim()),
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: errorResponse(
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Too many requests, please try again later'
    ),
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', limiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'api-gateway',
    });
});

// API Routes
app.use('/api/v1/auth', require('./routes/auth').default);
app.use('/api/v1/routes', require('./routes/routes').default);
app.use('/api/v1/bookings', require('./routes/bookings').default);
app.use('/api/v1/chat', require('./routes/chat').default);
app.use('/api/v1/payments', require('./routes/payments').default);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json(
        errorResponse(
            'NOT_FOUND',
            `Route ${req.method} ${req.path} not found`
        )
    );
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error:', err);

    res.status(err.status || 500).json(
        errorResponse(
            err.code || ErrorCodes.INTERNAL_ERROR,
            err.message || 'Internal server error',
            process.env.NODE_ENV === 'development' ? err.stack : undefined
        )
    );
});

// Start server
async function startServer() {
    try {
        // Connect to Redis
        await redisClient.connect();
        logger.info('Connected to Redis');

        app.listen(PORT, () => {
            logger.info(`🚀 API Gateway running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    await redisClient.quit();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');
    await redisClient.quit();
    process.exit(0);
});

startServer();

export default app;
