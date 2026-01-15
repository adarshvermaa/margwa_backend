# Storage Service

MinIO-based object storage service for Margwa platform with image processing.

## Overview

Built with **TypeScript** and **Express.js**, providing:
- S3-compatible object storage via MinIO
- Image upload and compression (70-80% size reduction)
- Automatic thumbnail generation
- Document storage (licenses, permits, etc.)
- Secure file access control

## Port

**3010**

## Architecture

```mermaid
graph TD
    A[Mobile App] -->|Upload File| B[API Gateway]
    B --> C[Storage Service]
    C -->|Process Image| D[Sharp]
    D -->|Compress| E[Optimized Image]
    D -->|Generate| F[Thumbnail]
    C -->|Store| G[(MinIO)]
    G -->|URL| C
    C -->|File URL| B
    B -->|URL| A
```

## Upload Flow

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant Gateway as API Gateway
    participant Storage as Storage Service
    participant Sharp as Image Processor
    participant MinIO as MinIO Storage

    App->>Gateway: POST /storage/upload/avatar
    Gateway->>Storage: Forward multipart/form-data
    Storage->>Storage: Validate file type/size
    Storage->>Sharp: Compress image
    Sharp-->>Storage: Optimized (70-80% smaller)
    Storage->>Sharp: Generate thumbnail (200x200)
    Sharp-->>Storage: Thumbnail
    Storage->>MinIO: Upload original
    Storage->>MinIO: Upload thumbnail
    MinIO-->>Storage: File URLs
    Storage-->>Gateway: Success + URLs
    Gateway-->>App: {fileUrl, thumbnailUrl}
```

## API Endpoints

### Upload Avatar
```
POST /api/v1/storage/upload/avatar
Content-Type: multipart/form-data
```

### Upload Driver Document
```
POST /api/v1/storage/upload/driver-document
```

### Upload Vehicle Document
```
POST /api/v1/storage/upload/vehicle-document
```

## Buckets

- `avatars` - User profile images (public)
- `driver-documents` - Driver licenses, permits (private)
- `vehicle-documents` - RC, Insurance, PUC (private)
- `temp-uploads` - Temporary storage

## Environment Variables

```env
STORAGE_SERVICE_PORT=3010
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=margwa_admin
MINIO_SECRET_KEY=margwa_minio_secret_2024
MINIO_USE_SSL=false
```

## Development

```bash
cd services/storage-service
npm install
npm run dev
```

## MinIO Console

Access at: http://localhost:9001
- Username: `margwa_admin`
- Password: `margwa_minio_secret_2024`

---

Complete docs: [QUICKSTART.md](./QUICKSTART.md)
