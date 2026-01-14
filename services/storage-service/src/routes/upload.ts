import { Router, Request, Response } from 'express';
import { upload } from '../middleware/upload';
import { minioService } from '../services/minioService';
import { BUCKETS } from '../config/minio';

const router = Router();

/**
 * Upload avatar/profile image
 * POST /api/v1/storage/upload/avatar
 */
router.post('/avatar', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: { code: 'NO_FILE', message: 'No file uploaded' },
            });
        }

        const userId = (req as any).userId; // From auth middleware
        const fileName = `${userId}_${Date.now()}.jpg`;

        const result = await minioService.uploadImage(
            req.file.buffer,
            BUCKETS.AVATARS,
            fileName,
            { maxWidth: 1024, quality: 85, createThumbnail: true }
        );

        res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'UPLOAD_FAILED', message: error.message },
        });
    }
});

/**
 * Upload driver document (license, permit, etc.)
 * POST /api/v1/storage/upload/driver-document
 */
router.post('/driver-document', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: { code: 'NO_FILE', message: 'No file uploaded' },
            });
        }

        const { type, expiryDate } = req.body;
        if (!type) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_TYPE', message: 'Document type is required' },
            });
        }

        const userId = (req as any).userId;
        const fileName = `${type}/${userId}_${Date.now()}.jpg`;

        const result = await minioService.uploadImage(
            req.file.buffer,
            BUCKETS.DRIVER_DOCUMENTS,
            fileName,
            { maxWidth: 2048, quality: 80 }
        );

        res.json({
            success: true,
            data: {
                ...result,
                documentType: type,
                expiryDate: expiryDate || null,
            },
        });
    } catch (error: any) {
        console.error('Driver document upload error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'UPLOAD_FAILED', message: error.message },
        });
    }
});

/**
 * Upload vehicle document (RC, Insurance, PUC, Permit)
 * POST /api/v1/storage/upload/vehicle-document
 */
router.post('/vehicle-document', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: { code: 'NO_FILE', message: 'No file uploaded' },
            });
        }

        const { type, vehicleId } = req.body;
        if (!type || !vehicleId) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_DATA', message: 'Document type and vehicle ID are required' },
            });
        }

        const fileName = `${type}/${vehicleId}_${Date.now()}.jpg`;

        const result = await minioService.uploadImage(
            req.file.buffer,
            BUCKETS.VEHICLE_DOCUMENTS,
            fileName,
            { maxWidth: 2048, quality: 80 }
        );

        res.json({
            success: true,
            data: {
                ...result,
                documentType: type,
                vehicleId,
            },
        });
    } catch (error: any) {
        console.error('Vehicle document upload error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'UPLOAD_FAILED', message: error.message },
        });
    }
});

export default router;
