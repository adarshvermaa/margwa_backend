# Margwa Backend - Docker Deployment Guide

Complete guide for running Margwa backend using Docker and Docker Compose.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Service Configuration](#service-configuration)
5. [Environment Variables](#environment-variables)
6. [Volumes and Persistence](#volumes-and-persistence)
7. [Networking](#networking)
8. [Health Checks](#health-checks)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Margwa backend uses Docker Compose to orchestrate 11 microservices plus infrastructure components.

### Services

**Application Services:**
- API Gateway (TypeScript)
- Auth Service (Go)
- Route Service (TypeScript)
- Driver Service (Go)
- Realtime Service (TypeScript)
- Chat Service (TypeScript)
- Notification Service (TypeScript)
- Payment Service (Go)
- Analytics Service (Go)
- Places Service (TypeScript)
- Storage Service (TypeScript)

**Infrastructure Services:**
- PostgreSQL 15 with PostGIS
- Redis 7
- MinIO (S3-compatible storage)
- PgAdmin (database UI)
- Redis Commander (Redis UI)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Network                        │
│                     (margwa-network)                         │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  PostgreSQL  │    │    Redis     │    │    MinIO     │  │
│  │  (Port 5432) │    │  (Port 6379) │    │  (Port 9000) │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │           │
│         └───────────────────┴───────────────────┘           │
│                          │                                  │
│         ┌────────────────┴────────────────┐                 │
│         │                                 │                 │
│  ┌──────▼──────┐                   ┌──────▼──────┐          │
│  │ TypeScript  │                   │ Go Services │          │
│  │  Services   │                   │             │          │
│  │  (7 svcs)   │                   │  (4 svcs)   │          │
│  └──────┬──────┘                   └──────┬──────┘          │
│         │                                 │                 │
│         └─────────────┬───────────────────┘                 │
│                       │                                     │
│                ┌──────▼──────┐                              │
│                │ API Gateway │                              │
│                │ (Port 3000) │                              │
│                └─────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### 1. Clone and Configure

```bash
git clone <repository-url>
cd margwa_backend
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Infrastructure Only

```bash
# Start PostgreSQL, Redis, MinIO
docker-compose up -d postgres redis minio

# Wait for services to be healthy
docker-compose ps
```

### 3. Setup Database

```bash
# Run database migrations
cd shared/database
npm install
npm run db:push

# Seed data
cd ../..
npm run db:seed
```

### 4. Start All Services

```bash
docker-compose up -d
```

### 5. Verify

```bash
# Check all services are running
docker-compose ps

# Test API
curl http://localhost:3000/health
```

---

## Service Configuration

### docker-compose.yml Structure

```yaml
version: '3.8'

services:
  # Infrastructure
  postgres:
    image: postgis/postgis:15-3.3
    # ... configuration

  redis:
    image: redis:7-alpine
    # ... configuration

  minio:
    image: minio/minio:latest
    # ... configuration

  # Application Services
  api-gateway:
    build: ./services/api-gateway
    # ... configuration

  # ... other services
```

### Build Configuration

Each service has a `Dockerfile`:

**TypeScript Services:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

**Go Services:**
```dockerfile
FROM golang:1.21-alpine
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o service main.go
EXPOSE 3001
CMD ["./service"]
```

---

## Environment Variables

### Global Variables (.env)

```env
# Database
DATABASE_URL=postgresql://margwa_user:margwa_password@postgres:5432/margwa_db

# Redis
REDIS_URL=redis://redis:6379

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ROOT_USER=margwa_admin
MINIO_ROOT_PASSWORD=margwa_minio_secret_2024

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# Service Ports
API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
# ... other ports
```

### Service-Specific Variables

**API Gateway:**
```yaml
environment:
  NODE_ENV: development
  PORT: 3000
  DATABASE_URL: ${DATABASE_URL}
  REDIS_URL: ${REDIS_URL}
  CORS_ORIGIN: "*"
  RATE_LIMIT_WINDOW_MS: 60000
  RATE_LIMIT_MAX_REQUESTS: 100
```

**Auth Service:**
```yaml
environment:
  AUTH_SERVICE_PORT: 3001
  DATABASE_URL: ${DATABASE_URL}
  REDIS_URL: ${REDIS_URL}
  JWT_SECRET: ${JWT_SECRET}
  JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
```

---

## Volumes and Persistence

### Data Volumes

```yaml
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local
  pgadmin_data:
    driver: local
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect margwa_backend_postgres_data

# Backup database
docker exec margwa-postgres pg_dump -U margwa_user margwa_db > backup.sql

# Backup MinIO
docker exec margwa-minio mc mirror /data /backup

# Clean up volumes (⚠️ DATA LOSS)
docker-compose down -v
```

### Development vs Production Volumes

**Development:** Use bind mounts for live reloading
```yaml
volumes:
  - ./services/api-gateway:/app
  - /app/node_modules  # Prevent overwriting
```

**Production:** Use named volumes
```yaml
volumes:
  - api_gateway_data:/app/data
```

---

## Networking

### Network Configuration

```yaml
networks:
  margwa-network:
    driver: bridge
```

### Service Discovery

Services communicate using service names:

```javascript
// From API Gateway to Auth Service
const response = await fetch('http://auth-service:3001/auth/verify');
```

### Port Mapping

```yaml
services:
  api-gateway:
    ports:
      - "3000:3000"  # host:container
```

### Network Commands

```bash
# List networks
docker network ls

# Inspect network
docker network inspect margwa_backend_margwa-network

# Connect to network
docker network connect margwa_backend_margwa-network my-container
```

---

## Health Checks

### PostgreSQL

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U margwa_user -d margwa_db"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Redis

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### MinIO

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
  interval: 30s
  timeout: 20s
  retries: 3
```

### Check Health Status

```bash
# View health status
docker-compose ps

# Check specific service
docker inspect --format='{{.State.Health.Status}}' margwa-postgres
```

---

## Scaling

### Scale Services

```bash
# Scale API Gateway to 3 instances
docker-compose up -d --scale api-gateway=3

# Scale multiple services
docker-compose up -d --scale api-gateway=3 --scale route-service=2
```

### Load Balancing

Add NGINX for load balancing:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf
  depends_on:
    - api-gateway
```

nginx.conf:
```nginx
upstream api_gateway {
    server api-gateway-1:3000;
    server api-gateway-2:3000;
    server api-gateway-3:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://api_gateway;
    }
}
```

---

## Troubleshooting

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api-gateway

# Last 100 lines
docker-compose logs --tail=100 api-gateway

# Since timestamp
docker-compose logs --since 2024-01-15T10:00:00 api-gateway
```

### Common Issues

#### Service Won't Start

```bash
# Check logs
docker-compose logs service-name

# Rebuild service
docker-compose build --no-cache service-name
docker-compose up -d service-name

# Check resource usage
docker stats
```

#### Database Connection Failed

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker exec -it margwa-postgres psql -U margwa_user -d margwa_db

# Restart PostgreSQL
docker-compose restart postgres
```

#### Port Conflicts

```bash
# Check port usage
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Unix/Linux/macOS

# Change port in docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 on host
```

#### Out of Disk Space

```bash
# Check disk usage
docker system df

# Remove unused containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

### Performance Optimization

```bash
# Limit container resources
docker-compose.yml:
  services:
    api-gateway:
      deploy:
        resources:
          limits:
            cpus: '1.0'
            memory: 512M
          reservations:
            memory: 256M
```

### Debug Container

```bash
# Execute command in running container
docker-compose exec api-gateway sh

# Inside container
ps aux
netstat -tuln
env
```

---

## Advanced Configuration

### Multi-Stage Builds

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Environment-Specific Files

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

---

## Best Practices

1. **Use `.dockerignore`** - Exclude unnecessary files
2. **Multi-stage builds** - Reduce image size
3. **Health checks** - Ensure service availability
4. **Resource limits** - Prevent resource exhaustion
5. **Named volumes** - Persist important data
6. **Environment variables** - Never hardcode secrets
7. **Logging** - Use structured JSON logs
8. **Monitoring** - Track container metrics

---

**Next Steps:**
- Deploy to Kubernetes for production: [KUBERNETES_DEPLOYMENT.md](./KUBERNETES_DEPLOYMENT.md)
- Set up monitoring: [MONITORING.md](./MONITORING.md)
- Configure auto-scaling: [AUTO_SCALING.md](./AUTO_SCALING.md)
