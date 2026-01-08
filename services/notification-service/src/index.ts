import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './utils/logger';
import { notificationRouter } from './routes/notifications';
import { initializeFirebase } from './services/firebase';

const app = express();
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3006;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'notification-service',
    });
});

// Routes
app.use('/notifications', notificationRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
        },
    });
});

// Initialize Firebase Admin SDK
initializeFirebase();

// Start server
app.listen(PORT, () => {
    logger.info(`🔔 Notification Service running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
    });
});

export { app };
