import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

const store: RateLimitStore = {};
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 100; // 100 requests per hour per IP

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!store[clientIp] || now > store[clientIp].resetTime) {
        store[clientIp] = {
            count: 1,
            resetTime: now + WINDOW_MS,
        };
        return next();
    }

    store[clientIp].count++;

    if (store[clientIp].count > MAX_REQUESTS) {
        logger.warn(`Rate limit exceeded for IP: ${clientIp}`);
        return res.status(429).json({
            success: false,
            error: 'Too many requests. Please try again later.',
        });
    }

    next();
};
