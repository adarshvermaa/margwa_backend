import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { errorResponse } from '../../../../shared/utils';
import { ErrorCodes } from '../../../../shared/types';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    const statusCode = err.statusCode || 500;
    const code = err.code || ErrorCodes.INTERNAL_ERROR;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json(
        errorResponse(code, message, process.env.NODE_ENV === 'development' ? err.stack : undefined)
    );
};
