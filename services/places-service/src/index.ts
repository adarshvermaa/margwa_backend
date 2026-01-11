// Load .env FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '../../.env');
console.log('[DEBUG] Loading .env from:', envPath);
console.log('[DEBUG] File exists:', require('fs').existsSync(envPath));
const envResult = dotenv.config({ path: envPath });
if (envResult.error) {
    console.error('[DEBUG] Failed to load .env:', envResult.error);
} else {
    console.log('[DEBUG] .env loaded successfully');
    console.log('[DEBUG] GOOGLE_PLACES_API_KEY present:', !!process.env.GOOGLE_PLACES_API_KEY);
    console.log('[DEBUG] GOOGLE_PLACES_API_KEY length:', process.env.GOOGLE_PLACES_API_KEY?.length || 0);
}

// Now import everything else
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import createPlacesRouter from './routes/places';
import PlacesServiceClass from './services/placesService';
import { rateLimiter } from './middleware/rateLimiter';
import logger from './utils/logger';

// Create PlacesService instance AFTER dotenv has loaded
const placesService = new PlacesServiceClass();

const app = express();
const PORT = process.env.PLACES_SERVICE_PORT || 3009;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'places-service' });
});

// Apply rate limiter to all routes except health
app.use('/api/v1/places', rateLimiter);

// Routes - pass placesService instance to router factory
app.use('/api/v1/places', createPlacesRouter(placesService));

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
    logger.error('Unhandled error', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
});

// Initialize and start server
async function start() {
    try {
        await placesService.initialize();

        app.listen(PORT, () => {
            logger.info(`Places Service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start Places Service', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await placesService.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await placesService.disconnect();
    process.exit(0);
});

start();
