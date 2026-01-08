import { getDatabase, conversations, messages } from '@margwa/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { io as ioClient } from 'socket.io-client';



// Connect to real-time service for message delivery
const REALTIME_SERVICE_URL = process.env.REALTIME_SERVICE_URL || 'http://localhost:3004';
let realtimeSocket: any = null;

// Initialize connection to real-time service
export function initRealtimeConnection() {
    realtimeSocket = ioClient(REALTIME_SERVICE_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
    });

    realtimeSocket.on('connect', () => {
        logger.info('Connected to real-time service');
    });

    realtimeSocket.on('disconnect', () => {
        logger.warn('Disconnected from real-time service');
    });
}

export class ChatService {
    // Create or get conversation
    async getOrCreateConversation(bookingId: string, clientId: string, driverId: string) {
        try {
            // Check if conversation exists
            const db = getDatabase();
            const [existing] = await db.select()
                .from(conversations)
                .where(
                    and(
                        eq(conversations.bookingId, bookingId),
                        eq(conversations.clientId, clientId),
                        eq(conversations.driverId, driverId)
                    )
                );

            if (existing) {
                return existing;
            }

            // Create new conversation
            const [conversation] = await db.insert(conversations)
                .values({
                    bookingId,
                    clientId,
                    driverId,
                })
                .returning();

            logger.info(`Conversation created: ${conversation.id}`);
            return conversation;
        } catch (error) {
            logger.error('Error creating conversation:', error);
            throw error;
        }
    }

    // Send message
    async sendMessage(
        conversationId: string,
        senderId: string,
        receiverId: string,
        messageText: string,
        messageType: 'text' | 'system' = 'text'
    ) {
        try {
            const db = getDatabase();
            const [message] = await db.insert(messages)
                .values({
                    conversationId,
                    senderId,
                    receiverId,
                    messageText,
                    messageType,
                })
                .returning();

            // Update conversation last message time
            await db.update(conversations)
                .set({ lastMessageAt: new Date() })
                .where(eq(conversations.id, conversationId));

            // Send via real-time service
            if (realtimeSocket) {
                realtimeSocket.emit('chat:message', {
                    conversationId,
                    receiverId,
                    message: {
                        id: message.id,
                        senderId,
                        messageText,
                        messageType,
                        sentAt: message.sentAt,
                    },
                });
            }

            logger.info(`Message sent: ${message.id} from ${senderId} to ${receiverId}`);
            return message;
        } catch (error) {
            logger.error('Error sending message:', error);
            throw error;
        }
    }

    // Get messages for a conversation
    async getMessages(conversationId: string, page: number = 1, limit: number = 50) {
        try {
            const offset = (page - 1) * limit;

            const db = getDatabase();
            const conversationMessages = await db.select()
                .from(messages)
                .where(eq(messages.conversationId, conversationId))
                .orderBy(desc(messages.sentAt))
                .limit(limit)
                .offset(offset);

            // Get total count
            const [countResult] = await db.select({ count: sql<number>`count(*)` })
                .from(messages)
                .where(eq(messages.conversationId, conversationId));

            return {
                messages: conversationMessages.reverse(), // Oldest first
                total: Number(countResult.count),
                page,
                limit,
            };
        } catch (error) {
            logger.error('Error fetching messages:', error);
            throw error;
        }
    }

    // Mark messages as read
    async markAsRead(conversationId: string, userId: string) {
        try {
            const db = getDatabase();
            const result = await db.update(messages)
                .set({ isRead: true, readAt: new Date() })
                .where(
                    and(
                        eq(messages.conversationId, conversationId),
                        eq(messages.receiverId, userId),
                        eq(messages.isRead, false)
                    )
                )
                .returning();

            logger.info(`Marked ${result.length} messages as read for user ${userId}`);
            return result.length;
        } catch (error) {
            logger.error('Error marking messages as read:', error);
            throw error;
        }
    }

    // Get user conversations
    async getUserConversations(userId: string) {
        try {
            const db = getDatabase();
            const userConversations = await db.select()
                .from(conversations)
                .where(
                    sql`${conversations.clientId} = ${userId} OR ${conversations.driverId} = ${userId}`
                )
                .orderBy(desc(conversations.lastMessageAt));

            return userConversations;
        } catch (error) {
            logger.error('Error fetching conversations:', error);
            throw error;
        }
    }

    // Get unread message count
    async getUnreadCount(userId: string) {
        try {
            const db = getDatabase();
            const [result] = await db.select({ count: sql<number>`count(*)` })
                .from(messages)
                .where(
                    and(
                        eq(messages.receiverId, userId),
                        eq(messages.isRead, false)
                    )
                );

            return Number(result.count);
        } catch (error) {
            logger.error('Error fetching unread count:', error);
            throw error;
        }
    }
}
