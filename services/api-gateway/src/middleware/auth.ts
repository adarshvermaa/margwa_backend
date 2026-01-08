import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { errorResponse } from '../../../../shared/utils';
import { ErrorCodes, JWTPayload } from '../../../../shared/types';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json(
                errorResponse(
                    ErrorCodes.UNAUTHORIZED,
                    'No authentication token provided'
                )
            );
        }

        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, secret) as JWTPayload;
        req.user = decoded;

        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(
                errorResponse(ErrorCodes.TOKEN_EXPIRED, 'Authentication token expired')
            );
        }

        return res.status(401).json(
            errorResponse(ErrorCodes.UNAUTHORIZED, 'Invalid authentication token')
        );
    }
};

export const authorize = (...userTypes: Array<'client' | 'driver' | 'both'>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json(
                errorResponse(ErrorCodes.UNAUTHORIZED, 'Authentication required')
            );
        }

        if (!userTypes.includes(req.user.userType)) {
            return res.status(403).json(
                errorResponse(
                    'FORBIDDEN',
                    `This action requires ${userTypes.join(' or ')} role`
                )
            );
        }

        next();
    };
};
