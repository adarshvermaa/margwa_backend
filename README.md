# Margwa Backend Services

A scalable, high-performance backend infrastructure for the Margwa ride-sharing platform built with TypeScript, Go, and Rust.

## 🏗️ Architecture

**Production-Ready Microservices with Load Balancing & Auto-Scaling:**

- **TypeScript (Node.js)**: API Gateway, Route Service, Real-time Service, Chat Service
- **Go**: Authentication Service, Booking Service (high concurrency)
- **Rust**: Payment Service, Analytics Service (performance-critical)
- **NGINX**: Load balancer and reverse proxy
- **Kubernetes**: Container orchestration with Horizontal Pod Autoscaler (HPA)
- **Monitoring**: Prometheus + Grafana for observability

### Auto-Scaling Capabilities

| Service | Min Replicas | Max Replicas | Scale Trigger |
|---------|--------------|--------------|---------------|
| API Gateway | 3 | 20 | CPU 70%, Memory 80% |
| Auth Service | 2 | 15 | CPU 75%, Memory 80% |
| Route Service | 2 | 8 | CPU 70%, Memory 80% |
| Realtime Service | 2 | 10 | CPU 65%, Memory 75% |
| Chat Service | 2 | 8 | CPU 70% |
| Payment Service | 2 | 5 | CPU 75% |

**Supports 5000+ concurrent users with <300ms p95 response time**

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 14+ with PostGIS
- Redis 7+
- Go 1.21+ (for Go services)
- Rust 1.75+ (for Rust services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/margwa/backend.git
   cd margwa_backend
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Generate and push database schema**
   ```bash
   cd shared/database
   npm install
   npm run db:generate
   npm run db:push
   ```

6. **Seed initial data (optional)**
   ```bash
   npm run db:seed
   ```

7. **Start services**
   ```bash
   # Start all TypeScript services
   npm run dev:gateway    # Port 3000
   npm run dev:routes     # Port 3002
   npm run dev:realtime   # Port 3004
   npm run dev:chat       # Port 3005
   ```

## 📚 Documentation

### Setup & Development
- **[Getting Started Guide](./GETTING_STARTED.md)** - Detailed setup instructions
- **[API Documentation](./docs/API.md)** - Complete API reference
- **[Development Workflow](./docs/DEVELOPMENT.md)** - Developer guide

### Production Deployment
- **[Kubernetes Deployment Guide](./docs/KUBERNETES_DEPLOYMENT.md)** - Complete K8s deployment
- **[Load Balancing Guide](./docs/LOAD_BALANCING.md)** - NGINX configuration and tuning
- **[Auto-Scaling Guide](./docs/AUTO_SCALING.md)** - HPA configuration and optimization
- **[Monitoring Guide](./docs/MONITORING.md)** - Prometheus and Grafana setup

## 📦 Project Structure

```
margwa_backend/
├── services/                 # Microservices
│   ├── api-gateway/          # TypeScript - Main API entry point
│   ├── auth-service/         # Go - Authentication & authorization
│   ├── route-service/        # TypeScript - Route management
│   ├── realtime-service/     # TypeScript - WebSocket real-time
│   ├── chat-service/         # TypeScript - Chat messaging
│   ├── payment-service/      # Rust - Payment processing
│   ├── analytics-service/    # Rust - Analytics & reporting
│   └── notification-service/ # TypeScript - Push notifications
├── k8s/                      # Kubernetes manifests
│   ├── deployments/          # Service deployments
│   ├── autoscaling/          # HPA configurations
│   ├── stateful/             # PostgreSQL, Redis StatefulSets
│   ├── monitoring/           # Prometheus, Grafana
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   └── ingress.yaml
├── nginx/                    # NGINX load balancer
│   ├── nginx.conf
│   └── Dockerfile
├── monitoring/               # Monitoring configuration
│   ├── prometheus/
│   └── grafana/
├── shared/
│   ├── database/             # Drizzle ORM schema
│   ├── types/                # Shared TypeScript types
│   └── utils/                # Common utilities
├── scripts/                  # Deployment & utility scripts
│   ├── deploy-k8s.sh         # Kubernetes deployment
│   ├── verify-scaling.sh     # Verify auto-scaling
│   └── load-test/            # K6 load testing scripts
├── docs/                     # Documentation
├── docker-compose.yml
└── package.json
```

## 🗄️ Database Schema

The database is designed with Drizzle ORM and includes:

- **Users & Authentication**: User profiles, OTP verification, sessions
- **Drivers & Vehicles**: Driver profiles, vehicle registration, documents
- **Routes**: Route definitions, scheduling, instances
- **Bookings**: Booking requests, ride tracking
- **Payments**: Payment processing, earnings
- **Chat**: Conversations, messages
- **Notifications**: Push notifications, in-app alerts
- **Reviews**: Rating & feedback system

### Database Management UIs

- **PgAdmin**: http://localhost:5050 (admin@margwa.com / admin)
- **Redis Commander**: http://localhost:8081

## 🔧 Available Scripts

```bash
# Database
npm run db:generate    # Generate migrations
npm run db:push        # Push schema to database
npm run db:studio      # Open Drizzle Studio
npm run db:seed        # Seed initial data

# Development
npm run dev:gateway    # Start API Gateway
npm run dev:routes     # Start Route Service
npm run dev:realtime   # Start Real-time Service
npm run dev:chat       # Start Chat Service

# Docker
npm run docker:up      # Start all services
npm run docker:down    # Stop all services
npm run docker:logs    # View logs

# Build & Test
npm run build:all      # Build all services
npm run test           # Run tests
```

## 🌐 API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/send-otp` - Send OTP for verification
- `POST /auth/verify-otp` - Verify OTP and login
- `POST /auth/refresh-token` - Refresh access token
- `GET /auth/profile` - Get user profile

### Routes
- `POST /routes` - Create new route (driver)
- `GET /routes` - List driver routes
- `POST /routes/search` - Search available routes
- `GET /routes/:id` - Get route details
- `PUT /routes/:id` - Update route
- `DELETE /routes/:id` - Delete route

### Bookings
- `POST /bookings/request` - Request booking
- `POST /bookings/:id/accept` - Accept booking (driver)
- `POST /bookings/:id/reject` - Reject booking (driver)
- `GET /bookings/client/:id` - Get client bookings
- `GET /bookings/driver/:id` - Get driver bookings

### Real-time (WebSocket)
```
ws://localhost:3004
```
Events: `location:update`, `booking:new`, `booking:accepted`, `chat:message`

## 🔐 Environment Variables

Key configuration variables (see `.env.example` for full list):

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/margwa_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# Services
API_GATEWAY_PORT=3000
ROUTE_SERVICE_PORT=3002
REALTIME_SERVICE_PORT=3004
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run service-specific tests
cd services/api-gateway && npm test
```

## 📊 Monitoring & Observability

- **Health Check**: `GET /health`
- **Metrics**: Prometheus-compatible `/metrics` endpoint
- **Logs**: Structured JSON logs
- **Tracing**: Distributed tracing ready


## 🚢 Production Deployment

### Cloud Platforms

Margwa backend is designed for production deployment on **Google Cloud Platform (GCP)** or **Amazon Web Services (AWS)** with full auto-scaling and load balancing.

#### Quick Start: GCP (Google Kubernetes Engine)

```bash
# Prerequisites: gcloud CLI, kubectl installed
export PROJECT_ID="margwa-production"
export CLUSTER_NAME="margwa-cluster"
export REGION="us-central1"

# 1. Create GKE cluster with autoscaling
gcloud container clusters create $CLUSTER_NAME \
  --region=$REGION \
  --num-nodes=1 \
  --min-nodes=3 \
  --max-nodes=10 \
  --enable-autoscaling \
  --machine-type=n1-standard-4

# 2. Set up managed services
# Cloud SQL (PostgreSQL), Memorystore (Redis), Secret Manager
gcloud sql instances create margwa-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-custom-4-16384 \
  --region=$REGION \
  --availability-type=REGIONAL

gcloud redis instances create margwa-redis \
  --size=5 \
  --region=$REGION \
  --tier=standard-ha

# 3. Deploy to Kubernetes
./scripts/deploy-k8s.sh production
```

#### Quick Start: AWS (Elastic Kubernetes Service)

```bash
# Prerequisites: AWS CLI, eksctl, kubectl installed
export CLUSTER_NAME="margwa-cluster"
export REGION="us-east-1"

# 1. Create EKS cluster
eksctl create cluster \
  --name $CLUSTER_NAME \
  --region $REGION \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10

# 2. Set up managed services
# RDS (PostgreSQL), ElastiCache (Redis), Secrets Manager
aws rds create-db-instance \
  --db-instance-identifier margwa-postgres \
  --db-instance-class db.t3.large \
  --engine postgres \
  --multi-az

aws elasticache create-replication-group \
  --replication-group-id margwa-redis \
  --engine redis \
  --num-cache-clusters 3

# 3. Deploy to Kubernetes
./scripts/deploy-k8s.sh production
```

### Complete Deployment Guide

**📘 [Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT.md)** - Comprehensive guide covering:

#### GCP Deployment
- ✅ GKE cluster setup with auto-scaling (3-10 nodes)
- ✅ Cloud SQL (PostgreSQL) with high availability
- ✅ Memorystore (Redis) with clustering
- ✅ Secret Manager integration
- ✅ Cloud Load Balancing
- ✅ Cloud DNS and SSL certificates
- ✅ Workload Identity for secure access
- ✅ Cloud Operations monitoring

#### AWS Deployment
- ✅ EKS cluster setup with managed node groups
- ✅ RDS (PostgreSQL) Multi-AZ
- ✅ ElastiCache (Redis) with replication
- ✅ Secrets Manager integration
- ✅ Application Load Balancer (ALB)
- ✅ Route 53 and ACM certificates
- ✅ IAM Roles for Service Accounts (IRSA)
- ✅ CloudWatch monitoring

#### Infrastructure Features
- **Auto-Scaling**: Supports 5000+ concurrent users
- **High Availability**: Multi-AZ deployment with 99.9% uptime
- **Performance**: <300ms p95 response time under load
- **Security**: Secrets encrypted at rest, TLS 1.2+
- **Monitoring**: Prometheus + Grafana + Cloud native tools
- **Cost**: ~$770/month (GCP) or ~$1,028/month (AWS)

### Local Development

For local development and testing:

```bash
# Docker Compose (simplified)
docker-compose up -d

# Or local Kubernetes (Minikube/Kind)
minikube start --cpus=4 --memory=8192
./scripts/deploy-k8s.sh development
```

### CI/CD Pipeline

Set up automated deployments:

```yaml
# Example GitHub Actions workflow
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push images
        run: |
          docker build -t gcr.io/$PROJECT_ID/api-gateway:$SHA .
          docker push gcr.io/$PROJECT_ID/api-gateway:$SHA
      - name: Deploy to GKE
        run: ./scripts/deploy-k8s.sh production
```

### Deployment Checklist

Before deploying to production:

- [ ] Domain registered and DNS configured
- [ ] SSL certificates obtained
- [ ] Secrets configured in Secret Manager
- [ ] Database initialized and migrated
- [ ] Environment variables set in ConfigMap
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Disaster recovery plan documented

### Cost Optimization Tips

1. **Use Reserved Instances**: Save 40-60% on compute costs
2. **Right-size resources**: Monitor actual usage and adjust
3. **Enable cluster autoscaler**: Scale down during low traffic
4. **Use managed services**: Save on operational overhead
5. **Implement caching**: Reduce database load with Redis
6. **Compress responses**: Save bandwidth with gzip
7. **CDN for static assets**: CloudFlare, Cloud CDN, or CloudFront

### Support & Troubleshooting

See the [Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT.md) for:
- Detailed step-by-step instructions
- Troubleshooting common issues
- Security hardening checklist
- Backup and disaster recovery
- Scaling and performance tuning



## 📝 Documentation

- [Architecture Overview](./docs/architecture.md)
- [Database Schema](./docs/database.md)
- [API Documentation](./docs/api.md)
- [WebSocket Events](./docs/websocket.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- GitHub Issues: [github.com/margwa/backend/issues](https://github.com/margwa/backend/issues)
- Email: support@margwa.com

---

**Built with ❤️ by the Margwa Team**