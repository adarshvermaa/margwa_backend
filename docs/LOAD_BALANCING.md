# Load Balancing Guide

## Overview

The Margwa backend uses NGINX as a reverse proxy and load balancer to distribute incoming traffic across multiple instances of each microservice. This ensures high availability, better resource utilization, and improved performance.

## Architecture

```
Internet → NGINX Load Balancer → Multiple Service Instances → Backend (PostgreSQL/Redis)
```

### Load Balancing Strategies

Different services use different load balancing algorithms based on their characteristics:

| Service | Algorithm | Reason |
|---------|-----------|--------|
| API Gateway | Least Connections | Distributes load evenly based on active connections |
| Auth Service | Least Connections | Even distribution of authentication requests |
| Route Service | Least Connections | Complex queries benefit from connection-based balancing |
| Realtime (WebSocket) | IP Hash | Sticky sessions required for WebSocket connections |
| Chat Service | Least Connections | Message processing benefits from even distribution |
| Payment Service | Least Connections | Transaction processing requires even load |

## NGINX Configuration

### Upstream Groups

Each microservice has an upstream group defined in `nginx/nginx.conf`:

```nginx
upstream api_gateway {
    least_conn;
    server api-gateway-1:3000 max_fails=3 fail_timeout=30s;
    server api-gateway-2:3000 max_fails=3 fail_timeout=30s;
    server api-gateway-3:3000 max_fails=3 fail_timeout=30s;
    keepalive 64;
}
```

### Health Checks

NGINX performs passive health checks:
- **max_fails**: Maximum number of failed attempts before marking server as down (3)
- **fail_timeout**: Time to wait before retrying a downed server (30s)

## Kubernetes Load Balancing

### Service Types

All microservices use **ClusterIP** services for internal load balancing:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
  selector:
    app: api-gateway
```

### Session Affinity

Services requiring sticky sessions (WebSockets) use session affinity:

```yaml
spec:
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

## Health Check Endpoints

All services expose a `/health` endpoint for health checks:

```http
GET /health HTTP/1.1
Host: localhost:3000

Response:
{
  "status": "healthy",
  "timestamp": "2026-01-08T16:00:00.000Z",
  "uptime": 3600,
  "service": "api-gateway"
}
```

## Monitoring Load Distribution

### Check NGINX Status

Access the NGINX status page:

```bash
curl http://localhost/nginx_status
```

### Monitor Backend Connections

```bash
# View active connections to each service
kubectl get endpoints -n margwa

# Check service distribution
kubectl get pods -n margwa -l app=api-gateway -o wide
```

### Prometheus Metrics

Query load balancer metrics in Prometheus:

```promql
# Request rate per pod
rate(http_requests_total[5m])

# Connection pool usage
nginx_upstream_connections
```

## Troubleshooting

### Uneven Load Distribution

**Problem**: One instance receiving more traffic than others

**Solutions**:
1. Check if instances are healthy:
   ```bash
   kubectl get pods -n margwa
   kubectl describe pod <pod-name> -n margwa
   ```

2. Verify HPA is working:
   ```bash
   kubectl get hpa -n margwa
   ```

3. Check NGINX upstream status in logs:
   ```bash
   kubectl logs -n margwa <nginx-pod> | grep upstream
   ```

### Failed Health Checks

**Problem**: NGINX marks instances as down

**Solutions**:
1. Check application logs:
   ```bash
   kubectl logs -f <pod-name> -n margwa
   ```

2. Verify health endpoint:
   ```bash
   kubectl exec -it <pod-name> -n margwa -- curl localhost:3000/health
   ```

3. Adjust health check parameters if needed

### Connection Pool Exhaustion

**Problem**: Database connections exhausted

**Solution**: Use PgBouncer connection pooler (already configured in deployment)

## Configuration Best Practices

### 1. Enable Keepalive

Always enable keepalive connections to backend services:

```nginx
upstream backend {
    keepalive 64; # Keep 64 idle connections
}
```

### 2. Set Appropriate Timeouts

```nginx
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

### 3. Configure Buffer Sizes

```nginx
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 4k;
```

### 4. Use Connection Limits

```nginx
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
limit_conn conn_limit 50;
```

## Performance Tuning

### Worker Processes

Set NGINX worker processes to match CPU cores:

```nginx
worker_processes auto;  # Auto-detect CPU cores
worker_connections 4096; # Max connections per worker
```

### Connection Settings

```nginx
keepalive_timeout 65;
keepalive_requests 100;
tcp_nopush on;
tcp_nodelay on;
```

## Security Considerations

### Rate Limiting

Protect services from DDoS attacks:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req zone=api_limit burst=200 nodelay;
```

### SSL/TLS Termination

NGINX handles SSL termination:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:...';
ssl_prefer_server_ciphers off;
```

## Next Steps

- Read [Auto-Scaling Guide](./AUTO_SCALING.md) for scaling configuration
- See [Monitoring Guide](./MONITORING.md) for observability setup
- Check [Deployment Guide](./KUBERNETES_DEPLOYMENT.md) for deployment instructions
