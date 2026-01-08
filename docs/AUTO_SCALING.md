# Auto-Scaling Guide

## Overview

Margwa backend uses Kubernetes Horizontal Pod Autoscaler (HPA) to automatically scale microservices based on CPU, memory, and custom metrics. This ensures optimal resource utilization and service availability under varying load conditions.

## How Auto-Scaling Works

HPA monitors metrics and adjusts the number of pod replicas:

1. **Metrics Collection**: Metrics server collects resource usage from pods
2. **Target Evaluation**: HPA compares current metrics against target values
3. **Scaling Decision**: Scales up/down based on stabilization windows
4. **Pod Adjustment**: Deployment controller creates/removes pods

![Auto-Scaling Behavior](../C:/Users/Adarsh%20Verma/.gemini/antigravity/brain/22fbc972-b1c1-4b75-af90-b7b1da04804b/autoscaling_behavior_1767887411274.png)

## Scaling Configuration

### API Gateway

```yaml
minReplicas: 3
maxReplicas: 20
metrics:
  - CPU: 70%
  - Memory: 80%
scaleUp: 60s stabilization
scaleDown: 300s stabilization
```

**Reasoning**:
- **Min 3**: Ensures high availability and handles baseline traffic
- **Max 20**: Supports up to 5000+ concurrent users
- **CPU 70%**: Aggressive scaling for API responsiveness
- **Fast scale-up**: Responds quickly to traffic spikes
- **Slow scale-down**: Prevents thrashing during fluctuating load

### Auth Service

```yaml
minReplicas: 2
maxReplicas: 15
metrics:
  - CPU: 75%
  - Memory: 80%
```

**Reasoning**:
- **Min 2**: Authentication always available
- **CPU 75%**: Higher threshold for token generation workload
- Auth typically has burst patterns during peak hours

### Route Service

```yaml
minReplicas: 2
maxReplicas: 8
metrics:
  - CPU: 70%
  - Memory: 80%
```

**Reasoning**:
- **Max 8**: Route calculations are CPU-intensive but cacheable
- PostGIS queries benefit from connection pooling

### Realtime Service (WebSocket)

```yaml
minReplicas: 2
maxReplicas: 10
metrics:
  - CPU: 65%
  - Memory: 75%
scaleDown: 600s stabilization
```

**Reasoning**:
- **Lower CPU threshold (65%)**: WebSocket connections are stateful
- **Long scale-down (10min)**: Prevents disconnecting active users
- Sticky sessions maintained during scaling

### Chat Service

```yaml
minReplicas: 2
maxReplicas: 8
metrics:
  - CPU: 70%
```

### Payment Service

```yaml
minReplicas: 2
maxReplicas: 5
metrics:
  - CPU: 75%
```

**Reasoning**:
- **Conservative max (5)**: Payment transactions require careful handling
- Lower scale-up to maintain transaction consistency

## Viewing HPA Status

### Current Status

```bash
kubectl get hpa -n margwa
```

Output:
```
NAME                    REFERENCE             TARGETS           MINPODS   MAXPODS   REPLICAS
api-gateway-hpa         Deployment/api...     45%/70%, 60%/80%  3         20        5
auth-service-hpa        Deployment/auth...    50%/75%, 40%/80%  2         15        3
route-service-hpa       Deployment/route...   30%/70%, 25%/80%  2         8         2
```

### Detailed Information

```bash
kubectl describe hpa api-gateway-hpa -n margwa
```

### Watch Real-Time Changes

```bash
kubectl get hpa -n margwa --watch
```

## Scaling Policies

### Scale-Up Behavior

**Fast Response** to increasing load:

```yaml
scaleUp:
  stabilizationWindowSeconds: 60
  policies:
  - type: Percent
    value: 100    # Double pods
    periodSeconds: 60
  - type: Pods
    value: 4      # Or add 4 pods
    periodSeconds: 60
  selectPolicy: Max  # Use whichever is more aggressive
```

**Example**: 
- Current: 3 pods at 85% CPU
- After 60s: Scales to 6 pods (100% increase)

### Scale-Down Behavior

**Conservative** to prevent thrashing:

```yaml
scaleDown:
  stabilizationWindowSeconds: 300
  policies:
  - type: Percent
    value: 50     # Remove half
    periodSeconds: 120
  - type: Pods
    value: 2      # Or remove 2 pods
    periodSeconds: 120
  selectPolicy: Min  # Use whichever is more conservative
```

**Example**:
- Current: 10 pods at 40% CPU
- After 5 minutes: Scales down to 8 pods (removes 2)
- After another 5 minutes: Scales down to 6 pods

## Metrics Explained

### Resource Metrics

**CPU Utilization**:
```promql
current_cpu / cpu_request * 100
```

**Memory Utilization**:
```promql
current_memory / memory_request * 100
```

### Custom Metrics (Advanced)

For WebSocket connections:

```yaml
metrics:
- type: Pods
  pods:
    metric:
      name: websocket_connections
    target:
      type: AverageValue
      averageValue: "1000"  # Scale at 1000 connections/pod
```

## Testing Auto-Scaling

### 1. Prepare Monitoring

```bash
# Terminal 1: Watch HPA
kubectl get hpa -n margwa --watch

# Terminal 2: Watch pods
kubectl get pods -n margwa --watch

# Terminal 3: Watch metrics
kubectl top pods -n margwa --watch
```

### 2. Run Load Test

```bash
cd scripts/load-test

# Gradual load
k6 run load-test.js

# Stress test (spike)
k6 run stress-test.js
```

### 3. Observe Scaling

You should see:
1. **CPU increases** above threshold (70%)
2. **HPA triggers** scale-up after 60s
3. **New pods created** and become ready
4. **Load distributes** across pods
5. **CPU normalizes** back to target
6. After load ends, **scale-down** after 5-10 minutes

### 4. Verify Results

```bash
# Check scaling events
kubectl get events -n margwa | grep Scaled

# Check final state
./scripts/verify-scaling.sh
```

## Tuning Guidelines

### When to Increase max Replicas

Signs you need more capacity:
- HPA consistently at max replicas
- P95 response times > 500ms even with max pods
- Error rate increases during peak hours

### When to Adjust CPU Threshold

**Lower threshold (60-65%)**:
- Bursty traffic patterns
- Latency-sensitive services
- Need faster response to load

**Higher threshold (75-85%)**:
- Steady traffic patterns
- Cost optimization priority
- Batch processing services

### When to Modify Stabilization Windows

**Shorter scale-up window (30-45s)**:
- Very spiky traffic
- Black Friday / promotional events
- Real-time critical services

**Longer scale-down window (10-15min)**:
- Prevent oscillation
- Stateful services
- Connection-heavy services

## Cost Optimization

### Right-Sizing Resources

Set appropriate requests/limits:

```yaml
resources:
  requests:
    cpu: 250m      # Minimum needed
    memory: 256Mi
  limits:
    cpu: 1000m     # Maximum allowed
    memory: 1Gi
```

### Cluster Autoscaler

For cloud environments, enable cluster autoscaler:

```yaml
# Scales cluster nodes based on pod requirements
minNodes: 3
maxNodes: 20
```

## Troubleshooting

### HPA Not Scaling

**Check metrics server**:
```bash
kubectl top nodes
kubectl top pods -n margwa
```

If not working, install metrics-server:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Pods Stuck in Pending

**Check resource quotas**:
```bash
kubectl describe resourcequota -n margwa
```

**Check node capacity**:
```bash
kubectl describe nodes
```

### Thrashing (Rapid Scale Up/Down)

**Symptoms**: Pods constantly being created/deleted

**Solutions**:
1. Increase stabilization windows
2. Widen gap between scale-up and scale-down thresholds
3. Set min replicas higher

### Not Scaling Fast Enough

**Solutions**:
1. Lower CPU/memory thresholds
2. Reduce stabilization window
3. Increase scale-up policy values

## Monitoring Scaling Events

### Prometheus Queries

```promql
# Current replicas per deployment
kube_deployment_status_replicas{namespace="margwa"}

# Desired replicas from HPA
kube_horizontalpodautoscaler_status_desired_replicas{namespace="margwa"}

# Scaling events
changes(kube_horizontalpodautoscaler_status_current_replicas[10m]) > 0
```

### Grafana Dashboards

Import the Margwa dashboard for:
- Real-time replica counts
- CPU/Memory utilization
- Scaling event timeline
- Request rate correlation

## Best Practices

1. **Always set min replicas ≥ 2** for high availability
2. **Scale-down slower than scale-up** to prevent thrashing
3. **Monitor costs** - set appropriate maxReplicas
4. **Test scaling** before production deployment
5. **Use PodDisruptionBudgets** to maintain availability during scaling
6. **Set resource requests accurately** - HPA bases calculations on requests, not limits
7. **Consider custom metrics** for better scaling decisions
8. **Document threshold rationale** for future tuning

## Next Steps

- Read [Load Balancing Guide](./LOAD_BALANCING.md)
- See [Monitoring Guide](./MONITORING.md)
- Review [Kubernetes Deployment Guide](./KUBERNETES_DEPLOYMENT.md)
