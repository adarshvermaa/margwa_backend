@echo off
REM deploy-k8s.bat - Deploy Margwa backend to Kubernetes (Windows)
REM Usage: .\scripts\deploy-k8s.bat [environment]

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=production
set NAMESPACE=margwa

echo =========================================
echo Deploying Margwa Backend to Kubernetes
echo Environment: %ENVIRONMENT%
echo Namespace: %NAMESPACE%
echo =========================================
echo.

REM Check if kubectl is installed
where kubectl >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: kubectl is not installed
    exit /b 1
)

REM Check cluster connection
echo Checking cluster connection...
kubectl cluster-info >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Not connected to a Kubernetes cluster
    exit /b 1
)
echo - Connected to cluster
echo.

REM Create namespace
echo Creating namespace...
kubectl apply -f k8s\namespace.yaml
echo.

REM Apply configmap and secrets
echo Applying configuration...
kubectl apply -f k8s\configmap.yaml
echo.

echo WARNING: Applying secrets...
echo In production, use a secret management solution!
pause
kubectl apply -f k8s\secrets.yaml
echo.

REM Deploy stateful services
echo Deploying stateful services...
kubectl apply -f k8s\stateful\postgres.yaml
kubectl apply -f k8s\stateful\redis.yaml
echo.

echo Waiting for stateful services to be ready...
kubectl wait --for=condition=ready pod -l app=postgres -n %NAMESPACE% --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n %NAMESPACE% --timeout=300s
echo - Stateful services ready
echo.

REM Deploy microservices
echo Deploying microservices...
kubectl apply -f k8s\deployments\api-gateway.yaml
kubectl apply -f k8s\deployments\auth-service.yaml
kubectl apply -f k8s\deployments\route-service.yaml
kubectl apply -f k8s\deployments\realtime-service.yaml
kubectl apply -f k8s\deployments\chat-service.yaml
kubectl apply -f k8s\deployments\payment-service.yaml
kubectl apply -f k8s\deployments\analytics-service.yaml
kubectl apply -f k8s\deployments\notification-service.yaml
echo.

echo Waiting for deployments to be ready...
kubectl wait --for=condition=available deployment --all -n %NAMESPACE% --timeout=300s
echo - All deployments ready
echo.

REM Apply autoscaling
echo Applying autoscaling configurations...
kubectl apply -f k8s\autoscaling\
echo.

REM Deploy monitoring
echo Deploying monitoring stack...
kubectl apply -f k8s\monitoring\prometheus.yaml
kubectl apply -f k8s\monitoring\grafana.yaml
echo.

REM Deploy ingress
echo Deploying ingress...
kubectl apply -f k8s\ingress.yaml
echo.

echo =========================================
echo Deployment Summary
echo =========================================
echo.

echo Deployments:
kubectl get deployments -n %NAMESPACE%
echo.

echo Services:
kubectl get services -n %NAMESPACE%
echo.

echo HPA Status:
kubectl get hpa -n %NAMESPACE%
echo.

echo Ingress:
kubectl get ingress -n %NAMESPACE%
echo.

echo =========================================
echo Deployment complete!
echo =========================================
echo.
echo Next steps:
echo 1. Check pod logs: kubectl logs -f [pod-name] -n %NAMESPACE%
echo 2. Monitor HPA: kubectl get hpa -n %NAMESPACE% --watch
echo 3. Access Grafana: kubectl port-forward svc/grafana 3001:3000 -n %NAMESPACE%
echo 4. Access Prometheus: kubectl port-forward svc/prometheus 9090:9090 -n %NAMESPACE%
echo.

endlocal
