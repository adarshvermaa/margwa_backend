import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import * as Minio from 'minio';
import { minioClient, BUCKETS } from '../config/minio';

export interface UploadResult {
    fileId: string;
    url: string;
    thumbnailUrl?: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
}

export class MinIOService {
    /**
     * Upload file to MinIO
     */
    async uploadFile(
        buffer: Buffer,
        bucket: string,
        fileName: string,
        mimeType: string,
        metadata?: Record<string, string>
    ): Promise<UploadResult> {
        const fileId = `${uuidv4()}_${fileName}`;
        const metaData = {
            'Content-Type': mimeType,
            ...metadata,
        };

        await minioClient.putObject(
            bucket,
            fileId,
            buffer,
            buffer.length,
            metaData
        );

        const url = await this.getPublicUrl(bucket, fileId);

        return {
            fileId,
            url,
            size: buffer.length,
            mimeType,
            uploadedAt: new Date().toISOString(),
        };
    }

    /**
     * Upload and compress image
     */
    async uploadImage(
        buffer: Buffer,
        bucket: string,
        fileName: string,
        options?: { maxWidth?: number; quality?: number; createThumbnail?: boolean }
    ): Promise<UploadResult> {
        const { maxWidth = 2048, quality = 80, createThumbnail = false } = options || {};

        // Compress main image
        const compressedBuffer = await sharp(buffer)
            .resize(maxWidth, maxWidth, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality, progressive: true })
            .toBuffer();

        const result = await this.uploadFile(
            compressedBuffer,
            bucket,
            fileName,
            'image/jpeg'
        );

        // Generate thumbnail if requested
        if (createThumbnail) {
            const thumbnailBuffer = await sharp(buffer)
                .resize(300, 300, { fit: 'cover' })
                .jpeg({ quality: 70 })
                .toBuffer();

            const thumbnailId = `thumb_${result.fileId}`;
            await minioClient.putObject(
                bucket,
                thumbnailId,
                thumbnailBuffer,
                thumbnailBuffer.length,
                { 'Content-Type': 'image/jpeg' }
            );

            result.thumbnailUrl = await this.getPublicUrl(bucket, thumbnailId);
        }

        return result;
    }

    /**
     * Get public URL for a file
     */
    async getPublicUrl(bucket: string, fileId: string): Promise<string> {
        const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
        const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
        const port = process.env.MINIO_PORT || '9000';

        return `${protocol}://${endpoint}:${port}/${bucket}/${fileId}`;
    }

    /**
     * Get signed URL (temporary access)
     */
    async getSignedUrl(bucket: string, fileId: string, expirySeconds: number = 900): Promise<string> {
        return await minioClient.presignedGetObject(bucket, fileId, expirySeconds);
    }

    /**
     * Delete file
     */
    async deleteFile(bucket: string, fileId: string): Promise<void> {
        await minioClient.removeObject(bucket, fileId);
    }

    /**
     * Check if file exists
     */
    async fileExists(bucket: string, fileId: string): Promise<boolean> {
        try {
            await minioClient.statObject(bucket, fileId);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * List files in bucket
     */
    async listFiles(bucket: string, prefix?: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const files: string[] = [];
            const stream = minioClient.listObjects(bucket, prefix, true);

            stream.on('data', (obj: Minio.BucketItem) => {
                if (obj.name) files.push(obj.name);
            });

            stream.on('end', () => resolve(files));
            stream.on('error', reject);
        });
    }
}

export const minioService = new MinIOService();
