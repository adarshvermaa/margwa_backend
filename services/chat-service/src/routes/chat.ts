import { Router, Request, Response } from 'express';
import { ChatService, initRealtimeConnection } from '../services/chatService';
import { successResponse, errorResponse, paginatedResponse } from '../../../../shared/utils';
import { ErrorCodes } from '../../../../shared/types';
import { logger } from '../utils/logger';

const router = Router();
const chatService = new ChatService();

// Initialize real-time connection
initRealtimeConnection();

// Create or get conversation
router.post('/conversations', async (req: Request, res: Response) => {
    try {
        const { bookingId, clientId, driverId } = req.body;

        if (!bookingId || !clientId || !driverId) {
            return res.status(400).json(
                errorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing required fields')
            );
        }

        const conversation = await chatService.getOrCreateConversation(bookingId, clientId, driverId);
        res.json(successResponse(conversation, 'Conversation retrieved'));
    } catch (error) {
        logger.error('Create conversation error:', error);
        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create conversation')
        );
    }
});

// Send message
router.post('/messages', async (req: Request, res: Response) => {
    try {
        const { conversationId, senderId, receiverId, messageText, messageType } = req.body;

        if (!conversationId || !senderId || !receiverId || !messageText) {
            return res.status(400).json(
                errorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing required fields')
            );
        }

        const message = await chatService.sendMessage(
            conversationId,
            senderId,
            receiverId,
            messageText,
            messageType || 'text'
        );

        res.status(201).json(successResponse(message, 'Message sent'));
    } catch (error) {
        logger.error('Send message error:', error);
        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to send message')
        );
    }
});

// Get messages for conversation
router.get('/messages/:conversationId', async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        const result = await chatService.getMessages(conversationId, page, limit);

        res.json(paginatedResponse(
            result.messages,
            result.page,
            result.limit,
            result.total
        ));
    } catch (error) {
        logger.error('Get messages error:', error);
        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch messages')
        );
    }
});

// Mark messages as read
router.put('/messages/:conversationId/read', async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json(
                errorResponse(ErrorCodes.VALIDATION_ERROR, 'User ID is required')
            );
        }

        const count = await chatService.markAsRead(conversationId, userId);
        res.json(successResponse({ markedCount: count }, 'Messages marked as read'));
    } catch (error) {
        logger.error('Mark as read error:', error);
        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to mark messages as read')
        );
    }
});

// Get user conversations
router.get('/conversations/user/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const conversations = await chatService.getUserConversations(userId);

        res.json(successResponse(conversations, 'Conversations retrieved'));
    } catch (error) {
        logger.error('Get conversations error:', error);
        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch conversations')
        );
    }
});

// Get unread message count
router.get('/unread/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const count = await chatService.getUnreadCount(userId);

        res.json(successResponse({ unreadCount: count }, 'Unread count retrieved'));
    } catch (error) {
        logger.error('Get unread count error:', error);
        res.status(500).json(
            errorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch unread count')
        );
    }
});

export default router;
