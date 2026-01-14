# Storage Service

MinIO-based object storage service for Margwa platform.

## Features

- **S3-Compatible Storage:** Industry-standard MinIO
- **Automatic Compression:** 70-80% size reduction for images
- **Thumbnail Generation:** Automatic thumbnails for profile images
- **Multiple Buckets:**
  - `avatars` - User profile images (public)
  - `driver-documents` - Driver licenses, permits (private)
  - `vehicle-documents` - RC, Insurance, PUC, Permit (private)
  - `temp-uploads` - Temporary storage for processing

## Environment Variables

```env
STORAGE_SERVICE_PORT=3010
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=margwa_admin
MINIO_SECRET_KEY=margwa_minio_secret_2024
MINIO_USE_SSL=false
```

## API Endpoints

### Upload Avatar
```
POST /api/v1/storage/upload/avatar
Content-Type: multipart/form-data

file: <image file>
```

### Upload Driver Document
```
POST /api/v1/storage/upload/driver-document
Content-Type: multipart/form-data

file: <image/pdf  file>
type: "license" | "permit" | "aadhar"
expiryDate: "2025-12-31" (optional)
```

### Upload Vehicle Document
```
POST /api/v1/storage/upload/vehicle-document
Content-Type: multipart/form-data

file: <image file>
type: "rc" | "insurance" | "puc" | "permit"
vehicleId: <uuid>
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker
```bash
docker-compose up storage-service
```

## MinIO Console

Access the MinIO web console at: **http://localhost:9001**

- Username: `margwa_admin`
- Password: `margwa_minio_secret_2024`

## File Size Limits

- Avatar: 5MB max
- Documents: 10MB max

## Supported File Types

- Images: JPEG, PNG, WebP, HEIC
- Documents: PDF, JPEG, PNG
