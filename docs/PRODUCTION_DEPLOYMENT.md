# Production Deployment Guide

Complete guide for deploying Margwa backend to production on GCP or AWS with auto-scaling, load balancing, and cloud-managed services.

## Table of Contents
- [GCP Deployment (GKE)](#gcp-deployment-gke)
- [AWS Deployment (EKS)](#aws-deployment-eks)
- [Post-Deployment Steps](#post-deployment-steps)

---

## GCP Deployment (GKE)

### Prerequisites

1. **Install Google Cloud SDK**
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   gcloud init
   ```

2. **Install kubectl and gke-gcloud-auth-plugin**
   ```bash
   gcloud components install kubectl gke-gcloud-auth-plugin
   ```

3. **Set up GCP Project**
   ```bash
   # Create or select project
   export PROJECT_ID="margwa-production"
   gcloud projects create $PROJECT_ID
   gcloud config set project $PROJECT_ID
   
   # Enable required APIs
   gcloud services enable \
     container.googleapis.com \
     compute.googleapis.com \
     sqladmin.googleapis.com \
     redis.googleapis.com \
     secretmanager.googleapis.com \
     cloudresourcemanager.googleapis.com
   ```

### Step 1: Create GKE Cluster

```bash
# Set variables
export CLUSTER_NAME="margwa-cluster"
export REGION="us-central1"
export ZONE="us-central1-a"

# Create GKE cluster with autoscaling
gcloud container clusters create $CLUSTER_NAME \
  --region=$REGION \
  --num-nodes=1 \
  --min-nodes=3 \
  --max-nodes=10 \
  --enable-autoscaling \
  --machine-type=n1-standard-4 \
  --disk-size=50 \
  --disk-type=pd-standard \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-ip-alias \
  --network=default \
  --subnetwork=default \
  --addons=HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
  --workload-pool=$PROJECT_ID.svc.id.goog \
  --enable-stackdriver-kubernetes

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION
```

### Step 2: Set Up Cloud SQL (PostgreSQL)

```bash
# Create Cloud SQL instance with high availability
gcloud sql instances create margwa-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-custom-4-16384 \
  --region=$REGION \
  --storage-type=SSD \
  --storage-size=50GB \
  --storage-auto-increase \
  --availability-type=REGIONAL \
  --enable-bin-log \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04

# Create database
gcloud sql databases create margwa_db --instance=margwa-postgres

# Create user
export DB_PASSWORD=$(openssl rand -base64 32)
gcloud sql users create margwa_user \
  --instance=margwa-postgres \
  --password=$DB_PASSWORD

# Enable PostGIS extension
gcloud sql instances patch margwa-postgres \
  --database-flags=cloudsql.enable_postgis=on

# Get connection name
export SQL_CONNECTION_NAME=$(gcloud sql instances describe margwa-postgres --format='value(connectionName)')
echo "SQL Connection Name: $SQL_CONNECTION_NAME"
```

### Step 3: Set Up Memorystore (Redis)

```bash
# Create Redis instance
gcloud redis instances create margwa-redis \
  --size=5 \
  --region=$REGION \
  --zone=$ZONE \
  --tier=standard-ha \
  --redis-version=redis_7_0

# Get Redis host and port
export REDIS_HOST=$(gcloud redis instances describe margwa-redis --region=$REGION --format='value(host)')
export REDIS_PORT=$(gcloud redis instances describe margwa-redis --region=$REGION --format='value(port)')
echo "Redis: $REDIS_HOST:$REDIS_PORT"
```

### Step 4: Configure Secret Manager

```bash
# Create secrets in Secret Manager
echo -n "$DB_PASSWORD" | gcloud secrets create postgres-password --data-file=-
echo -n "postgresql://margwa_user:$DB_PASSWORD@/margwa_db?host=/cloudsql/$SQL_CONNECTION_NAME" | gcloud secrets create database-url --data-file=-
echo -n "redis://$REDIS_HOST:$REDIS_PORT" | gcloud secrets create redis-url --data-file=-

# Generate and store JWT secrets
openssl rand -base64 48 | gcloud secrets create jwt-secret --data-file=-
openssl rand -base64 48 | gcloud secrets create jwt-refresh-secret --data-file=-

# Store third-party API keys (replace with actual values)
echo -n "your_stripe_secret_key" | gcloud secrets create stripe-secret-key --data-file=-
echo -n "your_google_maps_api_key" | gcloud secrets create google-maps-api-key --data-file=-
echo -n "your_twilio_auth_token" | gcloud secrets create twilio-auth-token --data-file=-

# Grant GKE access to secrets
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 5: Install Required Components

```bash
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.metrics.enabled=true \
  --set controller.podAnnotations."prometheus\.io/scrape"=true

# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager

# Install External Secrets Operator (for Secret Manager integration)
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

### Step 6: Configure Workload Identity

```bash
# Create Kubernetes service account
kubectl create namespace margwa
kubectl create serviceaccount margwa-ksa -n margwa

# Create Google service account
gcloud iam service-accounts create margwa-gsa \
  --display-name="Margwa Backend Service Account"

# Bind Kubernetes SA to Google SA
gcloud iam service-accounts add-iam-policy-binding \
  margwa-gsa@$PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="serviceAccount:$PROJECT_ID.svc.id.goog[margwa/margwa-ksa]"

# Annotate Kubernetes service account
kubectl annotate serviceaccount margwa-ksa \
  -n margwa \
  iam.gke.io/gcp-service-account=margwa-gsa@$PROJECT_ID.iam.gserviceaccount.com

# Grant permissions to Google SA
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:margwa-gsa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:margwa-gsa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

### Step 7: Create External Secret Store

```bash
# Create SecretStore for GCP Secret Manager
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcp-secret-store
  namespace: margwa
spec:
  provider:
    gcpsm:
      projectID: "$PROJECT_ID"
      auth:
        workloadIdentity:
          clusterLocation: $REGION
          clusterName: $CLUSTER_NAME
          serviceAccountRef:
            name: margwa-ksa
EOF

# Create ExternalSecret to sync secrets from Secret Manager
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: margwa-secrets
  namespace: margwa
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcp-secret-store
    kind: SecretStore
  target:
    name: margwa-secrets
    creationPolicy: Owner
  data:
  - secretKey: POSTGRES_PASSWORD
    remoteRef:
      key: postgres-password
  - secretKey: DATABASE_URL
    remoteRef:
      key: database-url
  - secretKey: REDIS_URL
    remoteRef:
      key: redis-url
  - secretKey: JWT_SECRET
    remoteRef:
      key: jwt-secret
  - secretKey: JWT_REFRESH_SECRET
    remoteRef:
      key: jwt-refresh-secret
  - secretKey: STRIPE_SECRET_KEY
    remoteRef:
      key: stripe-secret-key
  - secretKey: GOOGLE_MAPS_API_KEY
    remoteRef:
      key: google-maps-api-key
  - secretKey: TWILIO_AUTH_TOKEN
    remoteRef:
      key: twilio-auth-token
EOF
```

### Step 8: Update Deployment Manifests for GCP

```bash
# Update PostgreSQL deployment to use Cloud SQL Proxy
cat > k8s/stateful/postgres-gcp.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-proxy
  namespace: margwa
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-proxy
  template:
    metadata:
      labels:
        app: postgres-proxy
    spec:
      serviceAccountName: margwa-ksa
      containers:
      - name: cloud-sql-proxy
        image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:latest
        args:
          - "--structured-logs"
          - "--port=5432"
          - "$SQL_CONNECTION_NAME"
        ports:
        - containerPort: 5432
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: margwa
spec:
  type: ClusterIP
  ports:
  - port: 5432
    targetPort: 5432
  selector:
    app: postgres-proxy
EOF
```

### Step 9: Build and Push Docker Images

```bash
# Configure Docker to use GCR
gcloud auth configure-docker

# Set image registry
export IMAGE_REGISTRY="gcr.io/$PROJECT_ID"

# Build and push all service images
for service in api-gateway auth-service route-service realtime-service chat-service payment-service analytics-service notification-service; do
  echo "Building $service..."
  cd services/$service
  docker build -t $IMAGE_REGISTRY/$service:v1.0.0 .
  docker push $IMAGE_REGISTRY/$service:v1.0.0
  cd ../..
done

# Update deployment manifests with image registry
find k8s/deployments -name "*.yaml" -exec sed -i "s|margwa/|$IMAGE_REGISTRY/|g" {} \;
```

### Step 10: Deploy to GKE

```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

# Deploy Cloud SQL proxy instead of StatefulSet
kubectl apply -f k8s/stateful/postgres-gcp.yaml

# Deploy Redis (using Memorystore, so create service only)
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: margwa
spec:
  type: ExternalName
  externalName: $REDIS_HOST
EOF

# Deploy microservices
kubectl apply -f k8s/deployments/

# Deploy autoscaling
kubectl apply -f k8s/autoscaling/

# Deploy monitoring
kubectl apply -f k8s/monitoring/

# Deploy ingress
kubectl apply -f k8s/ingress.yaml

# Wait for rollout
kubectl wait --for=condition=available --timeout=300s deployment --all -n margwa
```

### Step 11: Configure DNS and SSL

```bash
# Get Load Balancer IP
export LB_IP=$(kubectl get ingress margwa-ingress -n margwa -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Load Balancer IP: $LB_IP"

# Create DNS records in Cloud DNS (or your DNS provider)
gcloud dns managed-zones create margwa-zone \
  --dns-name="margwa.com." \
  --description="Margwa DNS Zone"

# Add A records
gcloud dns record-sets transaction start --zone=margwa-zone
gcloud dns record-sets transaction add $LB_IP \
  --name=margwa.com. \
  --ttl=300 \
  --type=A \
  --zone=margwa-zone
gcloud dns record-sets transaction add $LB_IP \
  --name=www.margwa.com. \
  --ttl=300 \
  --type=A \
  --zone=margwa-zone
gcloud dns record-sets transaction execute --zone=margwa-zone
```

### Step 12: Set Up Monitoring with Cloud Operations

```bash
# Cloud Monitoring and Logging are already enabled with GKE

# Create uptime checks
gcloud monitoring uptime-checks create margwa-health-check \
  --host=margwa.com \
  --http-check-path=/health

# Set up alerts
gcloud alpha monitoring policies create \
  --notification-channels=<CHANNEL_ID> \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s
```

---

## AWS Deployment (EKS)

### Prerequisites

1. **Install AWS CLI**
   ```bash
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   aws configure
   ```

2. **Install eksctl**
   ```bash
   curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
   sudo mv /tmp/eksctl /usr/local/bin
   ```

3. **Install kubectl**
   ```bash
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
   ```

### Step 1: Create EKS Cluster

```bash
# Set variables
export CLUSTER_NAME="margwa-cluster"
export REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create EKS cluster with managed node groups
eksctl create cluster \
  --name $CLUSTER_NAME \
  --region $REGION \
  --version 1.28 \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed \
  --asg-access \
  --external-dns-access \
  --full-ecr-access \
  --alb-ingress-access

# Update kubeconfig
aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME
```

### Step 2: Set Up RDS (PostgreSQL)

```bash
# Create DB subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name margwa-db-subnet \
  --db-subnet-group-description "Margwa DB Subnet Group" \
  --subnet-ids subnet-xxxxx subnet-yyyyy

# Create security group
export VPC_ID=$(aws eks describe-cluster --name $CLUSTER_NAME --query cluster.resourcesVpcConfig.vpcId --output text)
aws ec2 create-security-group \
  --group-name margwa-rds-sg \
  --description "Security group for Margwa RDS" \
  --vpc-id $VPC_ID

export RDS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=margwa-rds-sg" --query "SecurityGroups[0].GroupId" --output text)

# Allow PostgreSQL access from EKS nodes
export EKS_SG_ID=$(aws eks describe-cluster --name $CLUSTER_NAME --query cluster.resourcesVpcConfig.clusterSecurityGroupId --output text)
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $EKS_SG_ID

# Create RDS instance
export DB_PASSWORD=$(openssl rand -base64 32)
aws rds create-db-instance \
  --db-instance-identifier margwa-postgres \
  --db-instance-class db.t3.large \
  --engine postgres \
  --engine-version 15.4 \
  --master-username margwa_user \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 50 \
  --storage-type gp3 \
  --storage-encrypted \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-subnet-group-name margwa-db-subnet \
  --backup-retention-period 7 \
  --multi-az \
  --publicly-accessible false

# Wait for RDS to be available
aws rds wait db-instance-available --db-instance-identifier margwa-postgres

# Get RDS endpoint
export RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier margwa-postgres --query "DBInstances[0].Endpoint.Address" --output text)
echo "RDS Endpoint: $RDS_ENDPOINT"
```

### Step 3: Set Up ElastiCache (Redis)

```bash
# Create cache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name margwa-redis-subnet \
  --cache-subnet-group-description "Margwa Redis Subnet Group" \
  --subnet-ids subnet-xxxxx subnet-yyyyy

# Create security group for Redis
aws ec2 create-security-group \
  --group-name margwa-redis-sg \
  --description "Security group for Margwa Redis" \
  --vpc-id $VPC_ID

export REDIS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=margwa-redis-sg" --query "SecurityGroups[0].GroupId" --output text)

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
  --cache-subnet-group-name margwa-redis-subnet \
  --security-group-ids $REDIS_SG_ID

# Wait for Redis to be available
aws elasticache wait replication-group-available --replication-group-id margwa-redis

# Get Redis endpoint
export REDIS_ENDPOINT=$(aws elasticache describe-replication-groups --replication-group-id margwa-redis --query "ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address" --output text)
echo "Redis Endpoint: $REDIS_ENDPOINT"
```

### Step 4: Configure AWS Secrets Manager

```bash
# Store database credentials
aws secretsmanager create-secret \
  --name margwa/postgres-password \
  --secret-string "$DB_PASSWORD"

aws secretsmanager create-secret \
  --name margwa/database-url \
  --secret-string "postgresql://margwa_user:$DB_PASSWORD@$RDS_ENDPOINT:5432/margwa_db"

aws secretsmanager create-secret \
  --name margwa/redis-url \
  --secret-string "redis://$REDIS_ENDPOINT:6379"

# Generate and store JWT secrets
aws secretsmanager create-secret \
  --name margwa/jwt-secret \
  --secret-string "$(openssl rand -base64 48)"

aws secretsmanager create-secret \
  --name margwa/jwt-refresh-secret \
  --secret-string "$(openssl rand -base64 48)"

# Store third-party API keys (replace with actual values)
aws secretsmanager create-secret \
  --name margwa/stripe-secret-key \
  --secret-string "your_stripe_secret_key"

aws secretsmanager create-secret \
  --name margwa/google-maps-api-key \
  --secret-string "your_google_maps_api_key"

aws secretsmanager create-secret \
  --name margwa/twilio-auth-token \
  --secret-string "your_twilio_auth_token"
```

### Step 5: Set Up IAM Roles for Service Accounts (IRSA)

```bash
# Create IAM policy for Secrets Manager access
cat > secrets-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:$REGION:$AWS_ACCOUNT_ID:secret:margwa/*"
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name MargwaSecretsPolicy \
  --policy-document file://secrets-policy.json

# Create service account with IRSA
eksctl create iamserviceaccount \
  --name margwa-sa \
  --namespace margwa \
  --cluster $CLUSTER_NAME \
  --region $REGION \
  --attach-policy-arn arn:aws:iam::$AWS_ACCOUNT_ID:policy/MargwaSecretsPolicy \
  --approve \
  --override-existing-serviceaccounts
```

### Step 6: Install Required Components

```bash
# Install metrics-server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace
```

### Step 7: Create External Secret Store for AWS

```bash
kubectl create namespace margwa

# Create SecretStore for AWS Secrets Manager
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secret-store
  namespace: margwa
spec:
  provider:
    aws:
      service: SecretsManager
      region: $REGION
      auth:
        jwt:
          serviceAccountRef:
            name: margwa-sa
EOF

# Create ExternalSecret to sync secrets
cat <<EOF | kubectl apply -f -
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: margwa-secrets
  namespace: margwa
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secret-store
    kind: SecretStore
  target:
    name: margwa-secrets
    creationPolicy: Owner
  data:
  - secretKey: POSTGRES_PASSWORD
    remoteRef:
      key: margwa/postgres-password
  - secretKey: DATABASE_URL
    remoteRef:
      key: margwa/database-url
  - secretKey: REDIS_URL
    remoteRef:
      key: margwa/redis-url
  - secretKey: JWT_SECRET
    remoteRef:
      key: margwa/jwt-secret
  - secretKey: JWT_REFRESH_SECRET
    remoteRef:
      key: margwa/jwt-refresh-secret
  - secretKey: STRIPE_SECRET_KEY
    remoteRef:
      key: margwa/stripe-secret-key
  - secretKey: GOOGLE_MAPS_API_KEY
    remoteRef:
      key: margwa/google-maps-api-key
  - secretKey: TWILIO_AUTH_TOKEN
    remoteRef:
      key: margwa/twilio-auth-token
EOF
```

### Step 8: Build and Push Docker Images to ECR

```bash
# Create ECR repositories
for service in api-gateway auth-service route-service realtime-service chat-service payment-service analytics-service notification-service; do
  aws ecr create-repository --repository-name margwa/$service --region $REGION
done

# Login to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build and push images
export IMAGE_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

for service in api-gateway auth-service route-service realtime-service chat-service payment-service analytics-service notification-service; do
  echo "Building $service..."
  cd services/$service
  docker build -t $IMAGE_REGISTRY/margwa/$service:v1.0.0 .
  docker push $IMAGE_REGISTRY/margwa/$service:v1.0.0
  cd ../..
done

# Update deployment manifests
find k8s/deployments -name "*.yaml" -exec sed -i "s|margwa/ |$IMAGE_REGISTRY/margwa/|g" {} \;
```

### Step 9: Update Deployment Manifests for AWS

```bash
# RDS and ElastiCache are managed services, create ExternalName services
cat > k8s/stateful/aws-managed-services.yaml <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: margwa
spec:
  type: ExternalName
  externalName: REPLACE_WITH_RDS_ENDPOINT
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: margwa
spec:
  type: ExternalName
  externalName: REPLACE_WITH_REDIS_ENDPOINT
EOF

# Replace endpoints
sed -i "s/REPLACE_WITH_RDS_ENDPOINT/$RDS_ENDPOINT/g" k8s/stateful/aws-managed-services.yaml
sed -i "s/REPLACE_WITH_REDIS_ENDPOINT/$REDIS_ENDPOINT/g" k8s/stateful/aws-managed-services.yaml
```

### Step 10: Deploy to EKS

```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

# Deploy managed services
kubectl apply -f k8s/stateful/aws-managed-services.yaml

# Update service account in deployments
find k8s/deployments -name "*.yaml" -exec sed -i '/spec:/a\      serviceAccountName: margwa-sa' {} \;

# Deploy microservices
kubectl apply -f k8s/deployments/

# Deploy autoscaling
kubectl apply -f k8s/autoscaling/

# Deploy monitoring
kubectl apply -f k8s/monitoring/

# Update Ingress for AWS ALB
cat > k8s/ingress-aws.yaml <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: margwa-ingress
  namespace: margwa
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:$REGION:$AWS_ACCOUNT_ID:certificate/YOUR_CERT_ARN
spec:
  rules:
  - host: margwa.com
    http:
      paths:
      - path: /api/v1
        pathType: Prefix
        backend:
          service:
            name: api-gateway-service
            port:
              number: 3000
      - path: /ws
        pathType: Prefix
        backend:
          service:
            name: realtime-service
            port:
              number: 3004
EOF

kubectl apply -f k8s/ingress-aws.yaml

# Wait for rollout
kubectl wait --for=condition=available --timeout=300s deployment --all -n margwa
```

### Step 11: Configure DNS with Route 53

```bash
# Get Load Balancer DNS name
export ALB_DNS=$(kubectl get ingress margwa-ingress -n margwa -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "ALB DNS: $ALB_DNS"

# Create hosted zone (if not exists)
aws route53 create-hosted-zone \
  --name margwa.com \
  --caller-reference $(date +%s)

export ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name margwa.com --query "HostedZones[0].Id" --output text)

# Create A record (Alias to ALB)
cat > route53-change.json <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "margwa.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch file://route53-change.json
```

### Step 12: Set Up CloudWatch Monitoring

```bash
# Enable Container Insights
aws eks update-cluster-config \
  --name $CLUSTER_NAME \
  --region $REGION \
  --logging '{"clusterLogging":[{"types":["api","audit","authenticator","controllerManager","scheduler"],"enabled":true}]}'

# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name margwa-high-error-rate \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --metric-name 5XXError \
  --namespace AWS/ApplicationELB \
  --period 300 \
  --statistic Sum \
  --threshold 100

# Create SNS topic for alerts
aws sns create-topic --name margwa-alerts
```

---

## Post-Deployment Steps

### 1. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n margwa

# Check HPA status
kubectl get hpa -n margwa

# Check ingress
kubectl get ingress -n margwa

# Verify secrets are synced
kubectl get secret margwa-secrets -n margwa -o yaml
```

### 2. Initialize Database

```bash
# Port forward to a service pod
kubectl port-forward -n margwa deployment/api-gateway 3000:3000

# In another terminal, run migrations
kubectl exec -it deployment/api-gateway -n margwa -- npm run db:push
kubectl exec -it deployment/api-gateway -n margwa -- npm run db:seed
```

### 3. Run Load Tests

```bash
cd scripts/load-test

# Update BASE_URL to your domain
export BASE_URL=https://margwa.com

# Run load test
k6 run load-test.js

# Run stress test to verify auto-scaling
k6 run stress-test.js

# Watch scaling in action
kubectl get hpa -n margwa --watch
```

### 4. Set Up Monitoring Dashboards

```bash
# Access Grafana
kubectl port-forward -n margwa svc/grafana 3001:3000

# Open http://localhost:3001
# Default credentials: admin / (check secret)

# Import Margwa dashboard
# Upload monitoring/grafana/margwa-dashboard.json
```

### 5. Configure Alerts

Update AlertManager configuration in Prometheus to send alerts to:
- Email
- Slack
- PagerDuty
- SMS (via AWS SNS or GCP)

### 6. Set Up Backup and Disaster Recovery

**For GCP:**
```bash
# Cloud SQL automatic backups are already enabled
# Create manual backup
gcloud sql backups create --instance=margwa-postgres
```

**For AWS:**
```bash
# RDS automated backups are already enabled
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier margwa-postgres \
  --db-snapshot-identifier margwa-manual-backup-$(date +%Y%m%d)
```

### 7. Security Hardening

```bash
# Enable Network Policies
kubectl apply -f k8s/network-policies/

# Set up Pod Security Standards
kubectl label namespaces margwa \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted

# Regular security scanning
trivy image $IMAGE_REGISTRY/margwa/api-gateway:v1.0.0
```

### 8. Cost Optimization

- **GCP**: Use Committed Use Discounts for predictable workloads
- **AWS**: Purchase Reserved Instances or Savings Plans
- Enable cluster autoscaler to scale down during low traffic
- Use Spot/Preemptible instances for non-critical workloads
- Set up budget alerts

### 9. Observability

```bash
# View logs
kubectl logs -f deployment/api-gateway -n margwa

# Check metrics
kubectl top pods -n margwa

# Distributed tracing (if implementing)
# Install Jaeger or use GCP Cloud Trace / AWS X-Ray
```

### 10. CI/CD Integration

Set up automated deployments:
- **GitHub Actions** / **GitLab CI** / **Jenkins**
- Build images on commit
- Run tests
- Deploy to staging
- Manual approval for production
- Automated rollback on failures

---

## Comparison: GCP vs AWS

| Feature | GCP (GKE) | AWS (EKS) |
|---------|-----------|-----------|
| **Managed Kubernetes** | GKE | EKS |
| **Database** | Cloud SQL (PostgreSQL) | RDS (PostgreSQL) |
| **Redis** | Memorystore | ElastiCache |
| **Secrets** | Secret Manager | Secrets Manager |
| **Load Balancer** | Cloud Load Balancing | Application Load Balancer (ALB) |
| **DNS** | Cloud DNS | Route 53 |
| **Monitoring** | Cloud Operations (Stackdriver) | CloudWatch |
| **Image Registry** | GCR / Artifact Registry | ECR |
| **Cost** | Generally 10-15% cheaper | More expensive but better enterprise support |
| **Ease of Setup** | Simpler, fewer steps | More complex, more services to configure |
| **Auto-scaling** | Built-in, works great | Requires additional setup (ALB controller) |

## Cost Estimates

### GCP (Monthly)
- GKE cluster (3 x n1-standard-4): ~$350
- Cloud SQL (db-custom-4-16384): ~$250
- Memorystore Redis (5GB standard-ha): ~$150
- Load Balancer: ~$20
- **Total: ~$770/month**

### AWS (Monthly)
- EKS cluster: $73
- Worker nodes (3 x t3.xlarge): ~$450
- RDS (db.t3.large Multi-AZ): ~$280
- ElastiCache (cache.t3.medium x3): ~$200
- ALB: ~$25
- **Total: ~$1,028/month**

*Note: Costs vary based on actual usage, data transfer, and regional pricing.*

## Troubleshooting

### Secrets not syncing
```bash
# Check External Secrets Operator
kubectl get externalsecrets -n margwa
kubectl describe externalsecret margwa-secrets -n margwa

# Check service account annotations (GCP)
kubectl describe sa margwa-ksa -n margwa

# Check IRSA (AWS)
kubectl describe sa margwa-sa -n margwa
```

### Database connection issues
```bash
# GCP: Check Cloud SQL Proxy logs
kubectl logs deployment/postgres-proxy -n margwa

# AWS: Verify security groups
aws ec2 describe-security-groups --group-ids $RDS_SG_ID
```

### HPA not scaling
```bash
# Verify metrics-server
kubectl top nodes
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml

# Check HPA events
kubectl describe hpa api-gateway-hpa -n margwa
```

## Next Steps

1. Set up production monitoring and alerting
2. Configure automated backups
3. Implement CI/CD pipeline
4. Set up staging environment
5. Configure WAF (Web Application Firewall)
6. Enable DDoS protection
7. Set up log aggregation (ELK/Loki)
8. Implement distributed tracing
9. Create runbooks for common issues
10. Schedule regular security audits
