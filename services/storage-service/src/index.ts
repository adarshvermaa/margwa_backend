import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadRoutes from './routes/upload';
import { testMinIOConnection } from './config/minio';

dotenv.config();

const app = express();
const PORT = process.env.STORAGE_SERVICE_PORT || 3010;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'storage-service' });
});

// Routes
app.use('/api/v1/storage/upload', uploadRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: err.message || 'Internal server error',
        },
    });
});

// Start server
async function startServer() {
    // Test MinIO connection
    const connected = await testMinIOConnection();
    if (!connected) {
        console.error('Failed to connect to MinIO. Please check your configuration.');
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`🚀 Storage Service running on port ${PORT}`);
        console.log(`📦 MinIO Console: http://localhost:9001`);
    });
}

startServer();
