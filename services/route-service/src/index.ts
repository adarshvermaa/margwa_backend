import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import routeRoutes from './routes/routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config({ path: '../../.env' });

const app: Application = express();
const PORT = process.env.ROUTE_SERVICE_PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'route-service',
    });
});

// Routes
app.use('/routes', routeRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    logger.info(`🚀 Route Service running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
