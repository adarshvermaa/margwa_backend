#!/bin/bash
# deploy-gcp.sh - Quick deployment script for Google Cloud Platform
# This script automates the deployment of Margwa backend to GCP with GKE

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Margwa Backend - GCP Deployment${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Check prerequisites
command -v gcloud >/dev/null 2>&1 || { echo -e "${RED}Error: gcloud CLI is not installed${NC}" >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}Error: kubectl is not installed${NC}" >&2; exit 1; }
command -v helm >/dev/null 2>&1 || { echo -e "${RED}Error: helm is not installed${NC}" >&2; exit 1; }

# Configuration
read -p "Enter GCP Project ID [margwa-production]: " PROJECT_ID
PROJECT_ID=${PROJECT_ID:-margwa-production}

read -p "Enter cluster name [margwa-cluster]: " CLUSTER_NAME
CLUSTER_NAME=${CLUSTER_NAME:-margwa-cluster}

read -p "Enter region [us-central1]: " REGION
REGION=${REGION:-us-central1}

export PROJECT_ID CLUSTER_NAME REGION

echo -e "${YELLOW}Using: Project=$PROJECT_ID, Cluster=$CLUSTER_NAME, Region=$REGION${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Set project
echo -e "${GREEN}Step 1: Configuring GCP project${NC}"
gcloud config set project $PROJECT_ID

# Enable APIs
echo -e "${GREEN}Step 2: Enabling required APIs${NC}"
gcloud services enable \
  container.googleapis.com \
  compute.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com

# Create GKE cluster
echo -e "${GREEN}Step 3: Creating GKE cluster (this may take 10-15 minutes)${NC}"
if ! gcloud container clusters describe $CLUSTER_NAME --region=$REGION >/dev/null 2>&1; then
    gcloud container clusters create $CLUSTER_NAME \
      --region=$REGION \
      --num-nodes=1 \
      --min-nodes=3 \
      --max-nodes=10 \
      --enable-autoscaling \
      --machine-type=n1-standard-4 \
      --enable-autorepair \
      --enable-autoupgrade \
      --workload-pool=$PROJECT_ID.svc.id.goog
else
    echo -e "${YELLOW}Cluster already exists, skipping creation${NC}"
fi

# Get credentials
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION

# Create Cloud SQL
echo -e "${GREEN}Step 4: Creating Cloud SQL PostgreSQL instance${NC}"
if ! gcloud sql instances describe margwa-postgres >/dev/null 2>&1; then
    gcloud sql instances create margwa-postgres \
      --database-version=POSTGRES_15 \
      --tier=db-custom-4-16384 \
      --region=$REGION \
      --storage-type=SSD \
      --storage-size=50GB \
      --availability-type=REGIONAL
    
    # Create database
    gcloud sql databases create margwa_db --instance=margwa-postgres
    
    # Create user
    DB_PASSWORD=$(openssl rand -base64 32)
    gcloud sql users create margwa_user \
      --instance=margwa-postgres \
      --password=$DB_PASSWORD
else
    echo -e "${YELLOW}Cloud SQL instance already exists${NC}"
fi

# Create Redis
echo -e "${GREEN}Step 5: Creating Memorystore Redis instance${NC}"
if ! gcloud redis instances describe margwa-redis --region=$REGION >/dev/null 2>&1; then
    gcloud redis instances create margwa-redis \
      --size=5 \
      --region=$REGION \
      --tier=standard-ha \
      --redis-version=redis_7_0
else
    echo -e "${YELLOW}Redis instance already exists${NC}"
fi

# Install Kubernetes components
echo -e "${GREEN}Step 6: Installing Kubernetes components${NC}"
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer || true

helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace || true

# Deploy application
echo -e "${GREEN}Step 7: Deploying Margwa backend${NC}"
./scripts/deploy-k8s.sh production

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure DNS to point to the load balancer IP:"
echo "   kubectl get ingress margwa-ingress -n margwa"
echo ""
echo "2. Access Grafana for monitoring:"
echo "   kubectl port-forward svc/grafana 3001:3000 -n margwa"
echo ""
echo "3. Run load tests:"
echo "   cd scripts/load-test && k6 run load-test.js"
echo ""
echo "4. View logs:"
echo "   kubectl logs -f deployment/api-gateway -n margwa"
echo ""
echo -e "${GREEN}Documentation: docs/PRODUCTION_DEPLOYMENT.md${NC}"
