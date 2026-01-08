import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import chatRoutes from './routes/chat';
import { errorHandler } from './middleware/errorHandler';

dotenv.config({ path: '../../.env' });

const app: Application = express();
const PORT = process.env.CHAT_SERVICE_PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'chat-service',
    });
});

// Routes
app.use('/chat', chatRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    logger.info(`🚀 Chat Service running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
