import { Router, Request, Response } from 'express';
import axios from 'axios';
import { errorResponse } from '../../../../shared/utils';
import { ErrorCodes } from '../../../../shared/types';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';

const router = Router();
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:3005';

// Create or get conversation
router.post('/conversations', authenticate, async (req: Request, res: Response) => {
    try {
        const response = await axios.post(`${CHAT_SERVICE_URL}/chat/conversations`, req.body);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Chat service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Chat service unavailable'
            )
        );
    }
});

// Send message
router.post('/messages', authenticate, async (req: Request, res: Response) => {
    try {
        const response = await axios.post(`${CHAT_SERVICE_URL}/chat/messages`, req.body);
        res.status(response.status).json(response.data);
    } catch (error: any) {
        logger.error('Chat service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Chat service unavailable'
            )
        );
    }
});

// Get messages
router.get('/messages/:conversationId', authenticate, async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const response = await axios.get(
            `${CHAT_SERVICE_URL}/chat/messages/${conversationId}`,
            { params: req.query }
        );
        res.json(response.data);
    } catch (error: any) {
        logger.error('Chat service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Chat service unavailable'
            )
        );
    }
});

// Mark as read
router.put('/messages/:conversationId/read', authenticate, async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const response = await axios.put(
            `${CHAT_SERVICE_URL}/chat/messages/${conversationId}/read`,
            req.body
        );
        res.json(response.data);
    } catch (error: any) {
        logger.error('Chat service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Chat service unavailable'
            )
        );
    }
});

// Get user conversations
router.get('/conversations/user/:userId', authenticate, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const response = await axios.get(`${CHAT_SERVICE_URL}/chat/conversations/user/${userId}`);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Chat service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Chat service unavailable'
            )
        );
    }
});

// Get unread count
router.get('/unread/:userId', authenticate, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const response = await axios.get(`${CHAT_SERVICE_URL}/chat/unread/${userId}`);
        res.json(response.data);
    } catch (error: any) {
        logger.error('Chat service error:', error.message);
        res.status(error.response?.status || 500).json(
            error.response?.data || errorResponse(
                ErrorCodes.SERVICE_UNAVAILABLE,
                'Chat service unavailable'
            )
        );
    }
});

export default router;
