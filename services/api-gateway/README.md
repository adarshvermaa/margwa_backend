# API Gateway Service

Central entry point for all API requests in the Margwa backend.

## Overview

The API Gateway is built with **TypeScript** and **Express.js**, handling:
- Request routing to microservices
- Authentication middleware
- Rate limiting
- CORS handling
- Error handling
- Request/response logging

## Port

**3000**

## Technology Stack

- TypeScript
- Express.js
- Redis (for rate limiting)
- JWT authentication
- Helmet (security headers)
- Compression
- Morgan (logging)

## Routes

The API Gateway proxies requests to the following services:

| Route | Target Service | Port |
|-------|---------------|------|
| `/api/v1/auth/*` | Auth Service | 3001 |
| `/api/v1/driver/*` | Driver Service | 3003 |
| `/api/v1/routes/*` | Route Service | 3002 |
| `/api/v1/chat/*` | Chat Service | 3005 |
| `/api/v1/notifications/*` | Notification Service | 3006 |
| `/api/v1/payments/*` | Payment Service | 3007 |
| `/api/v1/places/*` | Places Service | 3009 |
| `/api/v1/storage/*` | Storage Service | 3010 |

## Middleware

### Authentication

```typescript
import { authenticate } from './middleware/auth';

router.get('/protected', authenticate, handler);
```

The `authenticate` middleware:
1. Extracts JWT token from `Authorization` header
2. Verifies token validity
3. Attaches user data to `req.user`
4. Returns 401 if unauthorized

### Authorization

```typescript
import { authorize } from './middleware/auth';

router.post('/driver-only', authenticate, authorize('driver'), handler);
```

Roles: `'client'`, `'driver'`, `'both'`

### Rate Limiting

- **100 requests per minute** per IP
- Returns `429 Too Many Requests` when exceeded
- Configured via environment variables:
  - `RATE_LIMIT_WINDOW_MS` (default: 60000)
  - `RATE_LIMIT_MAX_REQUESTS` (default: 100)

## Environment Variables

```env
# Server
API_GATEWAY_PORT=3000
NODE_ENV=development

# Database & Cache
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*  # Comma-separated for multiple origins

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Service URLs (for proxying)
AUTH_SERVICE_URL=http://localhost:3001
DRIVER_SERVICE_URL=http://localhost:3003
ROUTE_SERVICE_URL=http://localhost:3002
# ... other services
```

## Development

### Start Service

```bash
cd services/api-gateway
npm install
npm run dev
```

Service runs on http://localhost:3000

### Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "uptime": 3600,
  "service": "api-gateway"
}
```

## Production

### Build

```bash
npm run build
```

### Start

```bash
npm start
```

### Docker

```bash
docker build -t margwa-api-gateway .
docker run -p 3000:3000 --env-file .env margwa-api-gateway
```

## Error Handling

All errors return standardized JSON:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### Common Error Codes

- `UNAUTHORIZED` - Missing or invalid token
- `VALIDATION_ERROR` - Request validation failed
- `SERVICE_UNAVAILABLE` - Downstream service unavailable
- `INTERNAL_ERROR` - Server error
- `NOT_FOUND` - Route not found
- `TOO_MANY_REQUESTS` - Rate limit exceeded

## Logging

Uses Morgan for HTTP request logging:

```
GET /api/v1/routes 200 45.123 ms - 1024
POST /api/v1/auth/send-otp 201 123.456 ms - 256
```

## Testing

```bash
npm test
```

## Architecture

```
Client/App
    ↓
API Gateway (Port 3000)
    ├─→ Auth Service (3001)
    ├─→ Driver Service (3003)
    ├─→ Route Service (3002)
    ├─→ Chat Service (3005)
    ├─→ Notification Service (3006)
    ├─→ Payment Service (3007)
    ├─→ Places Service (3009)
    └─→ Storage Service (3010)
```

## Security Features

- **Helmet**: Security headers (XSS protection, etc.)
- **CORS**: Controlled cross-origin requests
- **Rate Limiting**: Prevent abuse
- **JWT Validation**: Secure authentication
- **Request Size Limits**: 10MB max payload

## Performance

- **Compression**: Gzip response compression
- **Redis Caching**: Rate limit data cached
- **Async Operations**: Non-blocking I/O
- **Connection Pooling**: Efficient Redis connections

---

For complete API documentation, see [/docs/API.md](../../docs/API.md).
