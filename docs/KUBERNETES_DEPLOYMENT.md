# Kubernetes Deployment Guide

Complete guide for deploying Margwa backend to Kubernetes with load balancing and auto-scaling.

## Prerequisites

### Required Tools

- **kubectl** (v1.24+)
- **Kubernetes cluster** (v1.24+)
  - Minimum 3 nodes
  - 8 CPU cores and 16GB RAM per node recommended
- **Helm** (v3.0+) - for package management
- **k6** - for load testing

### Optional Tools

- **k9s** - Kubernetes CLI UI
- **kubectx**/**kubens** - Context and namespace switching
- **stern** - Multi-pod log tailing

## Cluster Setup

### Option 1: Local Development (Minikube/Kind)

```bash
# Minikube
minikube start --cpus=4 --memory=8192 --nodes=3

# Enable metrics server
minikube addons enable metrics-server

# Or Kind
kind create cluster --config=k8s/kind-config.yaml
```

### Option 2: Cloud Provider

#### Google Kubernetes Engine (GKE)

```bash
gcloud container clusters create margwa-cluster \
  --num-nodes=3 \
  --machine-type=n1-standard-4 \
  --zone=us-central1-a \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10
```

#### Amazon EKS

```bash
eksctl create cluster \
  --name margwa-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10
```

#### Azure AKS

```bash
az aks create \
  --resource-group margwa-rg \
  --name margwa-cluster \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10
```

## Pre-Deployment Steps

### 1. Install Metrics Server

Required for HPA to function:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Verify:
```bash
kubectl top nodes
```

### 2. Install NGINX Ingress Controller

```bash
# Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Or kubectl
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

### 3. Install cert-manager (for SSL)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### 4. Configure Secrets

**Important**: Never commit secrets to git!

```bash
# Create namespace first
kubectl create namespace margwa

# Create secrets from environment variables or files
kubectl create secret generic margwa-secrets \
  --from-literal=POSTGRES_PASSWORD='your_secure_password' \
  --from-literal=JWT_SECRET='your_jwt_secret_min_32_chars' \
  --from-literal=STRIPE_SECRET_KEY='sk_live_...' \
  -n margwa
```

Or use a secret management solution:

```bash
# External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

## Deployment

### Quick Deploy

Use the provided deployment script:

**Linux/Mac**:
```bash
chmod +x scripts/deploy-k8s.sh
./scripts/deploy-k8s.sh production
```

**Windows**:
```cmd
.\scripts\deploy-k8s.bat production
```

### Manual Deployment

#### Step 1: Create Namespace and Configuration

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
```

#### Step 2: Deploy Stateful Services

```bash
# PostgreSQL with PgBouncer
kubectl apply -f k8s/stateful/postgres.yaml

# Redis cluster
kubectl apply -f k8s/stateful/redis.yaml

# Wait for stateful services to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n margwa --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n margwa --timeout=300s
```

#### Step 3: Deploy Microservices

```bash
# Deploy all services
kubectl apply -f k8s/deployments/

# Wait for deployments to be available
kubectl wait --for=condition=available deployment --all -n margwa --timeout=300s
```

#### Step 4: Apply Auto-Scaling

```bash
kubectl apply -f k8s/autoscaling/
```

#### Step 5: Deploy Monitoring Stack

```bash
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana.yaml
```

#### Step 6: Configure Ingress

```bash
kubectl apply -f k8s/ingress.yaml
```

## Verification

### Check Deployment Status

```bash
# All resources
kubectl get all -n margwa

# Deployments
kubectl get deployments -n margwa

# Pods
kubectl get pods -n margwa

# Services
kubectl get services -n margwa

# HPA status
kubectl get hpa -n margwa

# Ingress
kubectl get ingress -n margwa
```

### Verify Auto-Scaling

```bash
./scripts/verify-scaling.sh
```

### Check Application Health

```bash
# Port forward to API Gateway
kubectl port-forward svc/api-gateway-service 3000:3000 -n margwa

# In another terminal
curl http://localhost:3000/health
```

### View Logs

```bash
# Single pod
kubectl logs -f <pod-name> -n margwa

# All pods of a deployment
kubectl logs -f deployment/api-gateway -n margwa

# All pods with label (using stern)
stern api-gateway -n margwa
```

## Accessing Services

### Port Forwarding

**API Gateway**:
```bash
kubectl port-forward svc/api-gateway-service 3000:3000 -n margwa
# Access at http://localhost:3000
```

**Grafana**:
```bash
kubectl port-forward svc/grafana 3001:3000 -n margwa
# Access at http://localhost:3001
# Default: admin / (password from secret)
```

**Prometheus**:
```bash
kubectl port-forward svc/prometheus 9090:9090 -n margwa
# Access at http://localhost:9090
```

### Load Balancer (Production)

Get external IP:
```bash
kubectl get ingress margwa-ingress -n margwa
```

Configure DNS:
```bash
# Point your domain to the EXTERNAL-IP
margwa.com -> <EXTERNAL-IP>
www.margwa.com -> <EXTERNAL-IP>
```

## Updating Deployments

### Rolling Update

```bash
# Update image
kubectl set image deployment/api-gateway \
  api-gateway=margwa/api-gateway:v1.2.0 \
  -n margwa

# Check rollout status
kubectl rollout status deployment/api-gateway -n margwa

# View rollout history
kubectl rollout history deployment/api-gateway -n margwa
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/api-gateway -n margwa

# Rollback to specific revision
kubectl rollout undo deployment/api-gateway --to-revision=2 -n margwa
```

### Update Configuration

```bash
# Edit configmap
kubectl edit configmap margwa-config -n margwa

# Restart deployments to pick up new config
kubectl rollout restart deployment --all -n margwa
```

## Scaling

### Manual Scaling

```bash
# Scale specific deployment
kubectl scale deployment api-gateway --replicas=10 -n margwa

# Scale multiple deployments
kubectl scale deployment --replicas=5 -l tier=backend -n margwa
```

### Update HPA

```bash
# Edit HPA
kubectl edit hpa api-gateway-hpa -n margwa

# Or update YAML and apply
kubectl apply -f k8s/autoscaling/api-gateway-hpa.yaml
```

## Monitoring

### Prometheus Queries

Access Prometheus UI and run queries:

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Pod CPU usage
sum(rate(container_cpu_usage_seconds_total{namespace="margwa"}[5m])) by (pod)

# HPA current replicas
kube_horizontalpodautoscaler_status_current_replicas{namespace="margwa"}
```

### Grafana Dashboards

1. Access Grafana
2. Import dashboard JSON from `monitoring/grafana/margwa-dashboard.json`
3. View metrics:
   - Request rates
   - Response times
   - Error rates
   - Resource usage
   - Auto-scaling events

## Load Testing

### Run Load Tests

```bash
cd scripts/load-test

# Install k6 if not already installed
# macOS: brew install k6
# Windows: choco install k6
# Linux: See https://k6.io/docs/getting-started/installation/

# Gradual load test
k6 run load-test.js

# Stress test (triggers auto-scaling)
k6 run stress-test.js
```

### Observe Scaling

While test is running:

```bash
# Watch HPA in real-time
kubectl get hpa -n margwa --watch

# Watch pods being created
kubectl get pods -n margwa --watch

# Monitor metrics
kubectl top pods -n margwa
```

## Troubleshooting

### Pods Not Starting

```bash
# Describe pod
kubectl describe pod <pod-name> -n margwa

# Check events
kubectl get events -n margwa --sort-by='.lastTimestamp'

# View logs
kubectl logs <pod-name> -n margwa
```

### Database Connection Issues

```bash
# Check PostgreSQL pod
kubectl exec -it postgres-0 -n margwa -- psql -U margwa_user -d margwa_db

# Test connection from service pod
kubectl exec -it <api-gateway-pod> -n margwa -- \
  curl postgres-service:5432
```

### HPA Not Scaling

```bash
# Check metrics server
kubectl top nodes
kubectl top pods -n margwa

# Check HPA status
kubectl describe hpa api-gateway-hpa -n margwa

# View HPA events
kubectl get events -n margwa | grep HorizontalPodAutoscaler
```

### Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress margwa-ingress -n margwa

# View ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

## Cleanup

### Delete All Resources

```bash
# Delete namespace (removes everything)
kubectl delete namespace margwa

# Or delete individually
kubectl delete -f k8s/ingress.yaml
kubectl delete -f k8s/monitoring/
kubectl delete -f k8s/autoscaling/
kubectl delete -f k8s/deployments/
kubectl delete -f k8s/stateful/
kubectl delete -f k8s/configmap.yaml
kubectl delete -f k8s/secrets.yaml
kubectl delete -f k8s/namespace.yaml
```

### Delete Cluster

**Minikube**:
```bash
minikube delete
```

**GKE**:
```bash
gcloud container clusters delete margwa-cluster --zone=us-central1-a
```

**EKS**:
```bash
eksctl delete cluster --name margwa-cluster
```

**AKS**:
```bash
az aks delete --name margwa-cluster --resource-group margwa-rg
```

## Best Practices

1. **Always use namespaces** to isolate environments
2. **Set resource requests and limits** for all containers
3. **Use ConfigMaps and Secrets** for configuration
4. **Implement health checks** (liveness and readiness probes)
5. **Enable autoscaling** with appropriate thresholds
6. **Use PodDisruptionBudgets** to maintain availability
7. **Tag images with versions**, avoid `:latest`
8. **Monitor resource usage** and adjust limits
9. **Back up stateful data** regularly
10. **Use RBAC** for access control

## Security Checklist

- [ ] Secrets stored securely (not in git)
- [ ] RBAC policies configured
- [ ] Network policies applied
- [ ] Pod security policies/admission controllers enabled
- [ ] Image scanning in CI/CD
- [ ] SSL/TLS certificates configured
- [ ] Database passwords rotated regularly
- [ ] API keys and tokens secured

## Production Checklist

- [ ] High availability: min 3 replicas for critical services
- [ ] Monitoring and alerting configured
- [ ] Log aggregation setup
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] Load testing completed
- [ ] Scaling policies tuned
- [ ] Resource quotas set
- [ ] DNS configured
- [ ] SSL certificates valid

## Next Steps

- Review [Load Balancing Guide](./LOAD_BALANCING.md)
- Read [Auto-Scaling Guide](./AUTO_SCALING.md)
- Set up [Monitoring](./MONITORING.md)
- Configure CI/CD pipeline
- Implement backup and disaster recovery

## Support

For issues or questions:
- Check troubleshooting section above
- Review Kubernetes logs
- Consult [Kubernetes documentation](https://kubernetes.io/docs/)
- Contact DevOps team
