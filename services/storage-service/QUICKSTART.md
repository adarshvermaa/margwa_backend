# Storage Service - Quick Start

## 1. Install Dependencies
```bash
cd services/storage-service
npm install
```

## 2. Start MinIO
```bash
# From margwa_backend root
cd scripts
.\docker.bat
# Choose option 1 (Start infrastructure)
```

## 3. Start Storage Service
```bash
# Option A: Standalone
cd services/storage-service
npm run dev

# Option B: With all services  
cd scripts
.\start.ps1
```

## 4. Test Upload
```powershell
# Get auth token first from login
$token = "YOUR_JWT_TOKEN"

# Upload avatar
curl -X POST http://localhost:3000/api/v1/storage/upload/avatar `
  -H "Authorization: Bearer $token" `
  -F "file=@C:\path\to\image.jpg"
```

## Environment Variables
Add to `.env`:
```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=margwa_admin
MINIO_SECRET_KEY=margwa_minio_secret_2024
MINIO_USE_SSL=false
STORAGE_SERVICE_PORT=3010
```

## Access MinIO Console
- URL: http://localhost:9001
- Username: `margwa_admin`
- Password: `margwa_minio_secret_2024`

## Troubleshooting

### MinIO not starting
```bash
docker logs margwa-minio
docker-compose restart minio
```

### Buckets not created
```bash
docker logs margwa-minio-init
docker-compose up minio-init
```

### Service can't connect
Check if MinIO is running:
```bash
curl http://localhost:9000/minio/health/live
```

### Install dependencies missing
```bash
npm install minio sharp multer --save
npm install @types/minio @types/multer --save-dev
```
