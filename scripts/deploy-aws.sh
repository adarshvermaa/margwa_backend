#!/bin/bash
# deploy-aws.sh - Quick deployment script for Amazon Web Services
# This script automates the deployment of Margwa backend to AWS with EKS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Margwa Backend - AWS Deployment${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Check prerequisites
command -v aws >/dev/null 2>&1 || { echo -e "${RED}Error: AWS CLI is not installed${NC}" >&2; exit 1; }
command -v eksctl >/dev/null 2>&1 || { echo -e "${RED}Error: eksctl is not installed${NC}" >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}Error: kubectl is not installed${NC}" >&2; exit 1; }
command -v helm >/dev/null 2>&1 || { echo -e "${RED}Error: helm is not installed${NC}" >&2; exit 1; }

# Configuration
read -p "Enter cluster name [margwa-cluster]: " CLUSTER_NAME
CLUSTER_NAME=${CLUSTER_NAME:-margwa-cluster}

read -p "Enter region [us-east-1]: " REGION
REGION=${REGION:-us-east-1}

export CLUSTER_NAME REGION
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${YELLOW}Using: Account=$AWS_ACCOUNT_ID, Cluster=$CLUSTER_NAME, Region=$REGION${NC}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Create EKS cluster
echo -e "${GREEN}Step 1: Creating EKS cluster (this may take 15-20 minutes)${NC}"
if ! eksctl get cluster --name $CLUSTER_NAME --region $REGION >/dev/null 2>&1; then
    eksctl create cluster \
      --name $CLUSTER_NAME \
      --region $REGION \
      --version 1.28 \
      --nodegroup-name standard-workers \
      --node-type t3.xlarge \
      --nodes 3 \
      --nodes-min 3 \
      --nodes-max 10 \
      --managed
else
    echo -e "${YELLOW}Cluster already exists, skipping creation${NC}"
fi

# Update kubeconfig
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME

# Get VPC ID
export VPC_ID=$(aws eks describe-cluster --name $CLUSTER_NAME --query cluster.resourcesVpcConfig.vpcId --output text)

# Create RDS
echo -e "${GREEN}Step 2: Creating RDS PostgreSQL instance${NC}"
if ! aws rds describe-db-instances --db-instance-identifier margwa-postgres >/dev/null 2>&1; then
    # Create security group for RDS
    RDS_SG_ID=$(aws ec2 create-security-group \
      --group-name margwa-rds-sg \
      --description "Security group for Margwa RDS" \
      --vpc-id $VPC_ID \
      --query 'GroupId' \
      --output text)
    
    # Allow PostgreSQL access from EKS
    EKS_SG_ID=$(aws eks describe-cluster --name $CLUSTER_NAME --query cluster.resourcesVpcConfig.clusterSecurityGroupId --output text)
    aws ec2 authorize-security-group-ingress \
      --group-id $RDS_SG_ID \
      --protocol tcp \
      --port 5432 \
      --source-group $EKS_SG_ID
    
    # Create RDS instance
    DB_PASSWORD=$(openssl rand -base64 32)
    aws rds create-db-instance \
      --db-instance-identifier margwa-postgres \
      --db-instance-class db.t3.large \
      --engine postgres \
      --engine-version 15.4 \
      --master-username margwa_user \
      --master-user-password "$DB_PASSWORD" \
      --allocated-storage 50 \
      --storage-type gp3 \
      --multi-az \
      --vpc-security-group-ids $RDS_SG_ID
    
    echo "Waiting for RDS to be available..."
    aws rds wait db-instance-available --db-instance-identifier margwa-postgres
else
    echo -e "${YELLOW}RDS instance already exists${NC}"
fi

# Create ElastiCache Redis
echo -e "${GREEN}Step 3: Creating ElastiCache Redis cluster${NC}"
if ! aws elasticache describe-replication-groups --replication-group-id margwa-redis >/dev/null 2>&1; then
    # Create security group for Redis
    REDIS_SG_ID=$(aws ec2 create-security-group \
      --group-name margwa-redis-sg \
      --description "Security group for Margwa Redis" \
      --vpc-id $VPC_ID \
      --query 'GroupId' \
      --output text)
    
    # Allow Redis access from EKS
    aws ec2 authorize-security-group-ingress \
      --group-id $REDIS_SG_ID \
      --protocol tcp \
      --port 6379 \
      --source-group $EKS_SG_ID
    
    # Create Redis replication group
    aws elasticache create-replication-group \
      --replication-group-id margwa-redis \
      --replication-group-description "Margwa Redis Cluster" \
      --engine redis \
      --engine-version 7.0 \
      --cache-node-type cache.t3.medium \
      --num-cache-clusters 3 \
      --automatic-failover-enabled \
      --multi-az-enabled \
      --security-group-ids $REDIS_SG_ID
    
    echo "Waiting for Redis to be available..."
    aws elasticache wait replication-group-available --replication-group-id margwa-redis
else
    echo -e "${YELLOW}Redis cluster already exists${NC}"
fi

# Install Kubernetes components
echo -e "${GREEN}Step 4: Installing Kubernetes components${NC}"
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

helm repo add eks https://aws.github.io/eks-charts
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME || true

helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace || true

# Deploy application
echo -e "${GREEN}Step 5: Deploying Margwa backend${NC}"
./scripts/deploy-k8s.sh production

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure Route 53 DNS to point to the ALB:"
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
