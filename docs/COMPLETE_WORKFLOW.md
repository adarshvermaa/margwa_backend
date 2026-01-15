# Margwa Backend - Complete A-Z Workflow

This guide walks you through the entire process from initial setup to production deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Database Setup](#database-setup)
5. [Service Startup](#service-startup)
6. [API Testing](#api-testing)
7. [Docker Deployment](#docker-deployment)
8. [Kubernetes Deployment](#kubernetes-deployment)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** 20+ ([download](https://nodejs.org/))
- **Docker** \& Docker Compose ([download](https://www.docker.com/))
- **PostgreSQL** 14+ with PostGIS (or use Docker)
- **Redis** 7+ (or use Docker)
- **Git** ([download](https://git-scm.com/))

### For Go Services
- **Go** 1.21+ ([download](https://golang.org/))

### For Cloud Deployment
- **kubectl** ([install](https://kubernetes.io/docs/tasks/tools/))
- **gcloud** CLI (for GCP) or **AWS** CLI (for AWS)

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/margwa_backend.git
cd margwa_backend
```

### 2. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://margwa_user:margwa_password@localhost:5432/margwa_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Services Ports
API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
ROUTE_SERVICE_PORT=3002
DRIVER_SERVICE_PORT=3003
REALTIME_SERVICE_PORT=3004
CHAT_SERVICE_PORT=3005
NOTIFICATION_SERVICE_PORT=3006
PAYMENT_SERVICE_PORT=3007
ANALYTICS_SERVICE_PORT=3008
PLACES_SERVICE_PORT=3009
STORAGE_SERVICE_PORT=3010

# MinIO (Object Storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ROOT_USER=margwa_admin
MINIO_ROOT_PASSWORD=margwa_minio_secret_2024
MINIO_USE_SSL=false

# External APIs
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
FIREBASE_PROJECT_ID=your-firebase-project-id
```

### 3. Install Dependencies

**Windows:**
```batch
cd scripts
install.bat
```

**Unix/Linux/macOS:**
```bash
cd scripts
chmod +x *.sh
./install.sh
```

This installs:
- Node.js dependencies for all TypeScript services
- Go modules for all Go services
- Shared database dependencies

---

## Infrastructure Setup

### Option 1: Docker (Recommended for Development)

```bash
# Start PostgreSQL, Redis, MinIO, and management UIs
docker-compose up -d postgres redis minio pgadmin redis-commander

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f postgres redis minio
```

### Option 2: Local Installation

#### PostgreSQL with PostGIS

```bash
# Ubuntu/Debian
sudo apt install postgresql-14 postgresql-14-postgis-3

# macOS (Homebrew)
brew install postgresql@14 postgis

# Windows
# Download from https://www.postgresql.org/download/windows/
```

Create database:
```sql
createdb margwa_db
psql margwa_db -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

#### Redis

```bash
# Ubuntu/Debian
sudo apt install redis-server

# macOS
brew install redis

# Windows
# Download from https://redis.io/download
```

#### MinIO

```bash
# Download and run MinIO
docker run -d \
  -p 9000:9000 -p 9001:9001 \
  --name margwa-minio \
  -e "MINIO_ROOT_USER=margwa_admin" \
  -e "MINIO_ROOT_PASSWORD=margwa_minio_secret_2024" \
  minio/minio server /data --console-address ":9001"
```

### Access Management UIs

- **PgAdmin**: http://localhost:5050
  - Email: `admin@margwa.com`
  - Password: `admin`
- **Redis Commander**: http://localhost:8081
- **MinIO Console**: http://localhost:9001
  - Username: `margwa_admin`
  - Password: `margwa_minio_secret_2024`

---

## Database Setup

### 1. Generate and Push Schema

```bash
cd shared/database
npm install

# Generate Drizzle migrations
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Open Drizzle Studio to visualize database
npm run db:studio
# Opens at http://localhost:4983
```

### 2. Seed Initial Data

```bash
cd ../..
npm run db:seed
```

This creates:
- Sample users (clients and drivers)
- Sample routes
- Sample vehicles
- Sample bookings

---

## Service Startup

### All Services (Automated)

**Windows:**
```batch
cd scripts
start.ps1
```

**Unix/Linux/macOS:**
```bash
cd scripts
./start.sh
```

This starts all 11 services in separate windows/processes.

### Individual Services (Manual)

Open separate terminals for each:

#### TypeScript Services

```bash
# API Gateway (Port 3000)
cd services/api-gateway && npm run dev

# Route Service (Port 3002)
cd services/route-service && npm run dev

# Realtime Service (Port 3004)
cd services/realtime-service && npm run dev

# Chat Service (Port 3005)
cd services/chat-service && npm run dev

# Notification Service (Port 3006)
cd services/notification-service && npm run dev

# Places Service (Port 3009)
cd services/places-service && npm run dev

# Storage Service (Port 3010)
cd services/storage-service && npm run dev
```

#### Go Services

```bash
# Auth Service (Port 3001)
cd services/auth-service && go run main.go

# Driver Service (Port 3003)
cd services/driver-service && go run main.go

# Payment Service (Port 3007)
cd services/payment-service && go run main.go

# Analytics Service (Port 3008)
cd services/analytics-service && go run main.go
```

### Verify All Services

```bash
node scripts/test-api.js
```

Expected output:
```
✅ API Gateway: http://localhost:3000 - OK
✅ Auth Service: http://localhost:3001 - OK
✅ Route Service: http://localhost:3002 - OK
... (all services)
```

---

## API Testing

### Health Checks

```bash
# Test all services
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Route Service
# ... etc
```

### Authentication Flow

```bash
# 1. Send OTP
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "userType": "client"
  }'

# 2. Verify OTP
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+919876543210",
    "otp": "123456"
  }'

# Response includes access_token and refresh_token
```

### Route Search

```bash
curl -X POST http://localhost:3000/api/v1/routes/search \
  -H "Content-Type: application/json" \
  -d '{
    "fromCity": "Indore",
    "toCity": "Bhopal",
    "page": 1,
    "limit": 10
  }'
```

See [API.md](./API.md) for complete API documentation.

---

## Docker Deployment

### Build and Run All Services

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Using Docker Script

**Windows:**
```batch
cd scripts
docker.bat
```

**Unix/Linux/macOS:**
```bash
cd scripts
./docker.sh
```

Menu options:
1. Start infrastructure only (Postgres, Redis, MinIO)
2. Start all services
3. Stop all services
4. View logs
5. Restart services
6. Clean up volumes (⚠️ deletes data)
7. Build services
8. Exit

### Scaling Services

```bash
# Scale API Gateway to 3 instances
docker-compose up -d --scale api-gateway=3

# Scale Route Service to 2 instances
docker-compose up -d --scale route-service=2
```

---

## Kubernetes Deployment

### Local Kubernetes (Minikube)

```bash
# Start Minikube
minikube start --cpus=4 --memory=8192

# Deploy to Kubernetes
cd scripts
./deploy-k8s.sh development

# Check deployments
kubectl get pods -n margwa
kubectl get services -n margwa

# Access API Gateway
minikube service api-gateway -n margwa
```

### Google Cloud Platform (GKE)

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for complete GCP deployment.

Quick start:
```bash
export PROJECT_ID="margwa-production"
export CLUSTER_NAME="margwa-cluster"
export REGION="us-central1"

# Run deployment script
./scripts/deploy-gcp.sh
```

### Amazon Web Services (EKS)

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for complete AWS deployment.

Quick start:
```bash
export CLUSTER_NAME="margwa-cluster"
export REGION="us-east-1"

# Run deployment script
./scripts/deploy-aws.sh
```

---

## Monitoring

### Prometheus + Grafana

```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring/

# Access Grafana
kubectl port-forward -n margwa svc/grafana 3000:80

# Login: admin/admin
# Visit: http://localhost:3000
```

### Application Logs

```bash
# Docker
docker-compose logs -f api-gateway

# Kubernetes
kubectl logs -f -n margwa deployment/api-gateway

# Local development
# Logs are in terminal windows or logs/ directory
```

### Health Monitoring

```bash
# Automated health check script
node scripts/test-api.js

# Individual service health
curl http://localhost:3000/health
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

**Windows:**
```batch
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Unix/Linux/macOS:**
```bash
lsof -i :3000
kill <PID>
```

#### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Verify connection
psql postgresql://margwa_user:margwa_password@localhost:5432/margwa_db
```

#### Redis Connection Error

```bash
# Check if Redis is running
docker-compose ps redis

# Test connection
docker exec -it margwa-redis redis-cli ping
# Should return: PONG

# Restart Redis
docker-compose restart redis
```

#### Service Won't Start

```bash
# Check environment variables
cat .env

# Check dependencies
npm install
go mod download

# Check logs for specific errors
docker-compose logs service-name
```

#### MinIO Buckets Not Created

```bash
# Restart MinIO init container
docker-compose up -d minio-init

# Or manually create buckets
mc alias set myminio http://localhost:9000 margwa_admin margwa_minio_secret_2024
mc mb myminio/avatars
mc mb myminio/driver-documents
mc mb myminio/vehicle-documents
```

### Getting Help

- Check [GETTING_STARTED.md](../GETTING_STARTED.md)
- Check [API documentation](./API.md)
- Review service logs
- Check GitHub Issues

---

## Next Steps

1. ✅ Setup complete - all services running
2. 📱 Integrate mobile apps (client_app, driver_app)
3. 🧪 Write automated tests
4. 🚀 Deploy to staging/production
5. 📊 Set up monitoring and alerts
6. 🔒 Implement security hardening
7. 📈 Performance optimization and load testing

---

**🎉 Congratulations!** Your Margwa backend is now fully operational.

For production deployment, see [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md).
