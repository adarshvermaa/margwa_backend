# MinIO Object Storage Setup Guide

## Quick Start

### 1. Start MinIO (via Docker)
```bash
cd margwa_backend
docker-compose up -d minio minio-init
```

This will:
- Start MinIO on ports 9000 (API) and 9001 (Console)
- Create 4 buckets automatically:
  - `avatars` (public read)
  - `driver-documents` (private)
  - `vehicle-documents` (private)
  - `temp-uploads` (private)

### 2. Access MinIO Console
- URL: http://localhost:9001
- Username: `margwa_admin`
- Password: `margwa_minio_secret_2024`

### 3. Install Storage Service
```bash
cd scripts
.\install.bat
```

### 4. Start Storage Service
```bash
cd scripts  
.\start.ps1
```

The storage service will be available at: http://localhost:3010

---

## Testing Uploads

### Test Avatar Upload
```bash
curl -X POST http://localhost:3000/api/v1/storage/upload/avatar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@path/to/image.jpg"
```

### Test Document Upload
```bash
curl -X POST http://localhost:3000/api/v1/storage/upload/driver-document \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@path/to/license.jpg" \
  -F "type=license" \
  -F "expiryDate=2025-12-31"
```

---

## Database Migration

Run this to add file tracking:
```bash
psql -U margwa_user -d margwa_db -f shared/database/migrations/add_file_storage.sql
```

---

## Integration Example: Update Driver Service

Replace base64 upload with MinIO upload:

```go
// OLD: Accept base64 in request
type UploadDocumentRequest struct {
    DocumentType string `json:"documentType"`
    DocumentData string `json:"documentData"` // base64
}

// NEW: Forward multipart upload to storage service
func (h *DocumentHandler) UploadDocument(c *gin.Context) {
    file, _ := c.FormFile("file")
    documentType := c.PostForm("type")
    
    // Forward to storage service
    storageURL := os.Getenv("STORAGE_SERVICE_URL")
    url := uploadToStorageService(file, storageURL, documentType)
    
    // Save URL to database (not base64)
    _, err := h.db.Exec(
        `INSERT INTO driver_documents (driver_id, document_type, document_url)
         VALUES ($1, $2, $3)`,
        driverID, documentType, url,
    )
}
```

---

## Production Deployment

### Enable SSL
```yaml
# docker-compose.yml
minio:
  environment:
    MINIO_SERVER_URL: https://storage.margwa.com
```

### Add CDN (CloudFlare)
1. Point CloudFlare to MinIO endpoint
2. Enable caching for `avatars` bucket
3. Set cache TTL to 1 week for static files

### Backup Strategy
```bash
# Backup MinIO data
docker run --rm -v margwa_minio_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz /data
```

---

## Monitoring

### Check Storage Usage
```bash
docker exec margwa-minio du -sh /data/*
```

### View Bucket Stats
Access MinIO Console → Metrics

### Set Up Alerts
- Storage > 80% capacity
- Upload failures > 5% in 10 min
- Unusual file sizes (potential attack)

---

## Troubleshooting

### MinIO Not Starting
```bash
docker logs margwa-minio
docker-compose restart minio
```

### Buckets Not Created
```bash
docker logs margwa-minio-init
docker-compose up minio-init
```

### Storage Service Can't Connect
Check environment variables in `.env`:
```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=margwa_admin
MINIO_SECRET_KEY=margwa_minio_secret_2024
```

---

## Files Created

```
✅ docker-compose.yml (MinIO service)
✅ services/storage-service/ (Complete TypeScript service)
✅ services/api-gateway/src/routes/storage.ts (Proxy route)
✅ shared/database/migrations/add_file_storage.sql (DB migration)
✅ scripts/start.ps1 (Updated with storage service)
✅ scripts/install.bat (Updated with storage service)
```

**Storage service is production-ready!** 🚀
