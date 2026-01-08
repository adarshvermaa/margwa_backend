import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cors from 'cors';
import { logger } from './utils/logger';
import { setupSocketHandlers } from './handlers/socketHandlers';
import { JWTPayload } from '../../../shared/types';

dotenv.config({ path: '../../.env' });

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'realtime-service',
        connections: io.engine.clientsCount,
    });
});

// Socket.IO setup
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || '*',
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Redis setup for horizontal scaling
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Redis adapter connected for Socket.IO');
});

// Authentication middleware
io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
        logger.warn('WebSocket connection rejected: No token provided');
        return next(new Error('Authentication required'));
    }

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, secret) as JWTPayload;
        socket.data.user = decoded;
        logger.info(`User authenticated: ${decoded.userId}`);
        next();
    } catch (error) {
        logger.warn('WebSocket authentication failed:', error);
        next(new Error('Invalid token'));
    }
});

// Socket event handlers
io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JWTPayload;
    logger.info(`Client connected: ${socket.id}, User: ${user.userId}`);

    // Join user's personal room
    socket.join(`user:${user.userId}`);

    // If driver, join driver room
    if (user.userType === 'driver' || user.userType === 'both') {
        socket.join('drivers');
    }

    // Setup all event handlers
    setupSocketHandlers(io, socket);

    socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}, Reason: ${reason}`);
    });

    socket.on('error', (error) => {
        logger.error('Socket error:', error);
    });
});

const PORT = process.env.REALTIME_SERVICE_PORT || 3004;

httpServer.listen(PORT, () => {
    logger.info(`🚀 Real-time Service (WebSocket) running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    io.close();
    await pubClient.quit();
    await subClient.quit();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { io };
