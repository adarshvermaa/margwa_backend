# Margwa Backend - Quick Deployment Reference

## Choose Your Platform

### Option 1: Google Cloud Platform (GCP)
**Recommended for: Easier setup, lower cost (~$770/month)**

```bash
# One-command deployment
chmod +x scripts/deploy-gcp.sh
./scripts/deploy-gcp.sh

# Or manual step-by-step
# See docs/PRODUCTION_DEPLOYMENT.md#gcp-deployment-gke
```

**Services Created:**
- GKE cluster (3-10 nodes, auto-scaling)
- Cloud SQL PostgreSQL (High Availability)
- Memorystore Redis (Clustered)
- Secret Manager
- Cloud Load Balancer
- Cloud DNS

---

### Option 2: Amazon Web Services (AWS)
**Recommended for: Enterprise features, better ecosystem (~$1,028/month)**

```bash
# One-command deployment
chmod +x scripts/deploy-aws.sh
./scripts/deploy-aws.sh

# Or manual step-by-step
# See docs/PRODUCTION_DEPLOYMENT.md#aws-deployment-eks
```

**Services Created:**
- EKS cluster (3-10 nodes, auto-scaling)
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis (Replication)
- Secrets Manager
- Application Load Balancer
- Route 53

---

## What Gets Deployed

### Kubernetes Resources
- **8 Microservices** with auto-scaling (15-70+ pods under load)
- **Load Balancer** (NGINX Ingress)
- **Monitoring** (Prometheus + Grafana)
- **Secrets** (via External Secrets Operator)
- **Databases** (Managed Cloud SQL/RDS + Redis)

### Auto-Scaling Configuration
| Service | Min | Max | Trigger |
|---------|-----|-----|---------|
| API Gateway | 3 | 20 | CPU 70% |
| Auth Service | 2 | 15 | CPU 75% |
| Route Service | 2 | 8 | CPU 70% |
| Realtime | 2 | 10 | CPU 65% |
| Others | 2 | 5-8 | CPU 70% |

**Capacity: 5000+ concurrent users**

---

## Quick Start Commands

### After Deployment

```bash
# 1. Check deployment status
kubectl get pods -n margwa
kubectl get hpa -n margwa

# 2. Get Load Balancer IP/DNS
kubectl get ingress margwa-ingress -n margwa

# 3. Access Grafana monitoring
kubectl port-forward svc/grafana 3001:3000 -n margwa
# Open http://localhost:3001

# 4. View logs
kubectl logs -f deployment/api-gateway -n margwa

# 5. Run load tests
cd scripts/load-test
k6 run load-test.js
```

### Verify Auto-Scaling

```bash
# Watch HPA in real-time
kubectl get hpa -n margwa --watch

# Run stress test to trigger scaling
cd scripts/load-test
k6 run stress-test.js

# Verify scaling script
./scripts/verify-scaling.sh
```

---

## Configuration Required

### Before Deployment

1. **Domain & DNS**
   - Register domain (e.g., margwa.com)
   - Will configure after deployment

2. **Third-Party Services** (Get API keys for):
   - Stripe (payment processing)
   - Google Maps API (routing)
   - Twilio (SMS/OTP)
   - Firebase (push notifications)

3. **Cloud Account**
   - GCP: Create project, enable billing
   - AWS: Configure AWS credentials

### After Deployment

1. **Update DNS** to point to load balancer
2. **Store secrets** in Secret Manager
3. **Run database migrations**
4. **Configure SSL certificates** (Let's Encrypt)
5. **Set up monitoring alerts**

---

## Cost Breakdown

### GCP (~$770/month)
- GKE: $350
- Cloud SQL: $250
- Memorystore: $150
- Load Balancer: $20

### AWS (~$1,028/month)
- EKS: $73
- Nodes: $450
- RDS: $280
- ElastiCache: $200
- ALB: $25

**Save 40-60% with:**
- Reserved Instances (GCP: Committed Use)
- Spot/Preemptible instances for dev/staging
- Right-sizing after monitoring usage

---

## Troubleshooting

### Common Issues

**Pods not starting?**
```bash
kubectl describe pod <pod-name> -n margwa
kubectl logs <pod-name> -n margwa
```

**HPA not scaling?**
```bash
# Check metrics server
kubectl top nodes
kubectl top pods -n margwa
```

**Can't access services?**
```bash
# Check ingress
kubectl get ingress -n margwa
kubectl describe ingress margwa-ingress -n margwa
```

**Database connection failed?**
```bash
# GCP: Check Cloud SQL Proxy
kubectl logs deployment/postgres-proxy -n margwa

# AWS: Verify security groups
aws rds describe-db-instances --db-instance-identifier margwa-postgres
```

---

## Next Steps

1. **[Complete Setup Guide](./docs/PRODUCTION_DEPLOYMENT.md)**
   - Detailed step-by-step instructions
   - GCP and AWS specific configurations
   - Secret management
   - SSL/TLS setup

2. **[Load Balancing Guide](./docs/LOAD_BALANCING.md)**
   - NGINX configuration
   - Performance tuning
   - Health checks

3. **[Auto-Scaling Guide](./docs/AUTO_SCALING.md)**
   - HPA configuration
   - Custom metrics
   - Cost optimization

4. **[Monitoring Guide](./docs/MONITORING.md)**
   - Prometheus setup
   - Grafana dashboards
   - Alerting rules

---

## Support

- **Documentation**: `docs/` folder
- **Scripts**: `scripts/` folder
- **Kubernetes manifests**: `k8s/` folder
- **Load tests**: `scripts/load-test/`

For detailed help, see: **[docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md)**
