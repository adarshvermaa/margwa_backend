import { io, Socket } from 'socket.io-client';
import { logger } from '../utils/logger';

let socket: Socket | null = null;

export function connectToRealtimeService() {
    const realtimeUrl = process.env.REALTIME_SERVICE_URL || 'http://localhost:3004';

    socket = io(realtimeUrl, {
        auth: {
            token: process.env.SERVICE_TOKEN || 'internal-service-token',
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
        logger.info('Connected to realtime service', { socketId: socket?.id });
    });

    socket.on('disconnect', (reason) => {
        logger.warn('Disconnected from realtime service', { reason });
    });

    socket.on('error', (error) => {
        logger.error('Realtime service socket error:', error);
    });
}

export async function broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    if (!socket || !socket.connected) {
        logger.warn('Socket not connected. Cannot broadcast notification.');
        return;
    }

    try {
        socket.emit('broadcast:user', {
            userId,
            event,
            data,
        });
        logger.info('Notification broadcasted via WebSocket', { userId, event });
    } catch (error) {
        logger.error('Failed to broadcast notification:', error);
    }
}

// Initialize connection when module loads
connectToRealtimeService();
