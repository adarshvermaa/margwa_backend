import { Router } from 'express';
import { getDatabase } from '@margwa/database';
import { notifications } from '@margwa/database';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { sendPushNotification } from '../services/firebase';
import { broadcastToUser } from '../services/websocket';

const router = Router();
// db initialization moved to handlers to avoid startup issues with env loading

// Validation schemas
const createNotificationSchema = z.object({
    userId: z.string().uuid(),
    title: z.string().min(1).max(255),
    body: z.string().min(1),
    notificationType: z.string(),
    data: z.record(z.any()).optional(),
    deviceToken: z.string().optional(),
});

// POST /notifications - Create a new notification
router.post('/', async (req, res) => {
    try {
        const payload = createNotificationSchema.parse(req.body);
        const db = getDatabase();

        // Insert notification into database
        const [notification] = await db
            .insert(notifications)
            .values({
                userId: payload.userId,
                title: payload.title,
                body: payload.body,
                notificationType: payload.notificationType,
                data: payload.data || null,
            })
            .returning();

        logger.info('Notification created', { notificationId: notification.id });

        // Send push notification if device token provided
        if (payload.deviceToken) {
            await sendPushNotification(
                payload.deviceToken,
                payload.title,
                payload.body,
                payload.data as Record<string, string> | undefined
            );
        }

        // Broadcast to WebSocket if user is connected
        await broadcastToUser(payload.userId, 'notification:new', notification);

        res.status(201).json({
            success: true,
            data: notification,
            message: 'Notification created successfully',
        });
    } catch (error) {
        logger.error('Error creating notification:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid request data',
                    details: error.errors,
                },
            });
        }
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to create notification',
            },
        });
    }
});

// GET /notifications/:userId - Get all notifications for a user
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const db = getDatabase();
        const limit = parseInt(req.query.limit as string) || 50;
        const unreadOnly = req.query.unreadOnly === 'true';

        const conditions = unreadOnly
            ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
            : eq(notifications.userId, userId);

        const userNotifications = await db
            .select()
            .from(notifications)
            .where(conditions)
            .orderBy(desc(notifications.sentAt))
            .limit(limit);

        res.json({
            success: true,
            data: userNotifications,
            message: 'Notifications retrieved successfully',
        });
    } catch (error) {
        logger.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to fetch notifications',
            },
        });
    }
});

// PUT /notifications/:id/read - Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        const [updatedNotification] = await db
            .update(notifications)
            .set({
                isRead: true,
                readAt: new Date(),
            })
            .where(eq(notifications.id, id))
            .returning();

        if (!updatedNotification) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Notification not found',
                },
            });
        }

        res.json({
            success: true,
            data: updatedNotification,
            message: 'Notification marked as read',
        });
    } catch (error) {
        logger.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update notification',
            },
        });
    }
});

// DELETE /notifications/:id - Delete a notification
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        const deleted = await db
            .delete(notifications)
            .where(eq(notifications.id, id))
            .returning();

        if (deleted.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Notification not found',
                },
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully',
        });
    } catch (error) {
        logger.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to delete notification',
            },
        });
    }
});

export { router as notificationRouter };
