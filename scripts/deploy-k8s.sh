#!/bin/bash

# deploy-k8s.sh - Deploy Margwa backend to Kubernetes
# Usage: ./scripts/deploy-k8s.sh [environment]

set -e

ENVIRONMENT=${1:-production}
NAMESPACE="margwa"

echo "========================================="
echo "Deploying Margwa Backend to Kubernetes"
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "========================================="

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "Error: kubectl is not installed"
    exit 1
fi

# Check cluster connection
echo "Checking cluster connection..."
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: Not connected to a Kubernetes cluster"
    exit 1
fi

echo "✓ Connected to cluster"

# Create namespace
echo ""
echo "Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Apply configmap and secrets
echo ""
echo "Applying configuration..."
kubectl apply -f k8s/configmap.yaml

echo ""
echo "WARNING: Applying secrets..."
echo "In production, use a secret management solution instead of committing secrets to git!"
read -p "Press Enter to continue or Ctrl+C to abort..."
kubectl apply -f k8s/secrets.yaml

# Deploy stateful services (PostgreSQL, Redis)
echo ""
echo "Deploying stateful services..."
kubectl apply -f k8s/stateful/postgres.yaml
kubectl apply -f k8s/stateful/redis.yaml

echo "Waiting for stateful services to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s
echo "✓ Stateful services ready"

# Deploy microservices
echo ""
echo "Deploying microservices..."
kubectl apply -f k8s/deployments/api-gateway.yaml
kubectl apply -f k8s/deployments/auth-service.yaml
kubectl apply -f k8s/deployments/route-service.yaml
kubectl apply -f k8s/deployments/realtime-service.yaml
kubectl apply -f k8s/deployments/chat-service.yaml
kubectl apply -f k8s/deployments/payment-service.yaml
kubectl apply -f k8s/deployments/analytics-service.yaml
kubectl apply -f k8s/deployments/notification-service.yaml

echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment --all -n $NAMESPACE --timeout=300s
echo "✓ All deployments ready"

# Apply autoscaling
echo ""
echo "Applying autoscaling configurations..."
kubectl apply -f k8s/autoscaling/

# Deploy monitoring stack
echo ""
echo "Deploying monitoring stack..."
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana.yaml

# Deploy ingress
echo ""
echo "Deploying ingress..."
kubectl apply -f k8s/ingress.yaml

echo ""
echo "========================================="
echo "Deployment Summary"
echo "========================================="
echo ""

# Show deployment status
echo "Deployments:"
kubectl get deployments -n $NAMESPACE

echo ""
echo "Services:"
kubectl get services -n $NAMESPACE

echo ""
echo "HPA Status:"
kubectl get hpa -n $NAMESPACE

echo ""
echo "Ingress:"
kubectl get ingress -n $NAMESPACE

echo ""
echo "========================================="
echo "✓ Deployment complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Check pod logs: kubectl logs -f <pod-name> -n $NAMESPACE"
echo "2. Monitor HPA: kubectl get hpa -n $NAMESPACE --watch"
echo "3. Access Grafana: kubectl port-forward svc/grafana 3001:3000 -n $NAMESPACE"
echo "4. Access Prometheus: kubectl port-forward svc/prometheus 9090:9090 -n $NAMESPACE"
echo ""
