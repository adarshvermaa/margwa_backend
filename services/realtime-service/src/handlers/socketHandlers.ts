import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

export function setupSocketHandlers(io: Server, socket: Socket) {
    const user = socket.data.user;

    // Location update (from driver)
    socket.on('location:update', (data: {
        latitude: number;
        longitude: number;
        heading?: number;
        speed?: number;
        rideId?: string;
    }) => {
        logger.info(`Location update from ${user.userId}:`, data);

        // Store in Redis (cache for quick retrieval)
        // In production, also save to database for tracking history

        // Broadcast to all clients in the ride
        if (data.rideId) {
            io.to(`ride:${data.rideId}`).emit('location:updated', {
                driverId: user.userId,
                ...data,
                timestamp: new Date().toISOString(),
            });
        }
    });

    // Join ride room (when ride starts)
    socket.on('ride:join', (rideId: string) => {
        socket.join(`ride:${rideId}`);
        logger.info(`User ${user.userId} joined ride: ${rideId}`);

        socket.emit('ride:joined', {
            rideId,
            timestamp: new Date().toISOString(),
        });
    });

    // Leave ride room
    socket.on('ride:leave', (rideId: string) => {
        socket.leave(`ride:${rideId}`);
        logger.info(`User ${user.userId} left ride: ${rideId}`);
    });

    // Booking notification (new booking request for driver)
    socket.on('booking:notify', (data: {
        driverId: string;
        bookingId: string;
        message: string;
    }) => {
        io.to(`user:${data.driverId}`).emit('booking:new', {
            bookingId: data.bookingId,
            message: data.message,
            timestamp: new Date().toISOString(),
        });
    });

    // Booking status update
    socket.on('booking:status', (data: {
        bookingId: string;
        status: string;
        userId: string;
    }) => {
        io.to(`user:${data.userId}`).emit('booking:updated', {
            bookingId: data.bookingId,
            status: data.status,
            timestamp: new Date().toISOString(),
        });
    });

    // Chat message (handled by chat service, but can relay here)
    socket.on('chat:message', (data: {
        conversationId: string;
        receiverId: string;
        message: string;
    }) => {
        io.to(`user:${data.receiverId}`).emit('chat:message', {
            conversationId: data.conversationId,
            senderId: user.userId,
            message: data.message,
            timestamp: new Date().toISOString(),
        });

        logger.info(`Message sent from ${user.userId} to ${data.receiverId}`);
    });

    // Driver online status
    socket.on('driver:online', () => {
        socket.join('drivers:online');
        io.to('drivers').emit('driver:status', {
            driverId: user.userId,
            online: true,
            timestamp: new Date().toISOString(),
        });

        logger.info(`Driver ${user.userId} is now online`);
    });

    socket.on('driver:offline', () => {
        socket.leave('drivers:online');
        io.to('drivers').emit('driver:status', {
            driverId: user.userId,
            online: false,
            timestamp: new Date().toISOString(),
        });

        logger.info(`Driver ${user.userId} is now offline`);
    });

    // Generic notification
    socket.on('notification:send', (data: {
        userId: string;
        title: string;
        body: string;
        data?: any;
    }) => {
        io.to(`user:${data.userId}`).emit('notification:new', {
            title: data.title,
            body: data.body,
            data: data.data,
            timestamp: new Date().toISOString(),
        });
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
    });
}
