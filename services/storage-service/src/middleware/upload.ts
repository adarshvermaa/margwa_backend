import multer from 'multer';
import { Request } from 'express';

// File type validation
const ALLOWED_MIME_TYPES = {
    images: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    documents: ['application/pdf', 'image/jpeg', 'image/png'],
} as const;

const MAX_FILE_SIZE = {
    avatar: 5 * 1024 * 1024,      // 5MB
    document: 10 * 1024 * 1024,    // 10MB
} as const;

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const uploadType = req.path.includes('avatar') ? 'images' : 'documents';
    const allowedTypes = ALLOWED_MIME_TYPES[uploadType];

    if (allowedTypes.includes(file.mimetype as any)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`));
    }
};

// Multer configuration (memory storage for processing before MinIO)
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE.document, // Max size
    },
    fileFilter,
});

// Validation middleware
export function validateFileSize(maxSize: number) {
    return (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        if (file.size > maxSize) {
            cb(new Error(`File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`));
        } else {
            cb(null, true);
        }
    };
}
