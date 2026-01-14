import * as Minio from 'minio';

const MINIO_CONFIG = {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'margwa_admin',
    secretKey: process.env.MINIO_SECRET_KEY || 'margwa_minio_secret_2024',
};

export const minioClient = new Minio.Client(MINIO_CONFIG);

export const BUCKETS = {
    AVATARS: 'avatars',
    DRIVER_DOCUMENTS: 'driver-documents',
    VEHICLE_DOCUMENTS: 'vehicle-documents',
    TEMP_UPLOADS: 'temp-uploads',
} as const;

// Test connection on startup
export async function testMinIOConnection(): Promise<boolean> {
    try {
        const buckets = await minioClient.listBuckets();
        console.log('✅ Connected to MinIO. Buckets:', buckets.map((b: Minio.BucketItemFromList) => b.name).join(', '));
        return true;
    } catch (error) {
        console.error('❌ Failed to connect to MinIO:', error);
        return false;
    }
}
