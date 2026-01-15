# Auth Service

OTP-based authentication and user management service for Margwa.

## Overview

Built with **Go** and **Gin framework**, providing:
- Phone number OTP authentication
- JWT token generation and validation
- User profile management
- Session management with Redis
- Refresh token handling

## Port

**3001**

## Technology Stack

- Go 1.21+
- Gin Web Framework
- PostgreSQL (user data)
- Redis (OTP storage, sessions)
- JWT tokens
- Twilio/MSG91 (OTP delivery)

## API Endpoints

### Send OTP
```
POST /auth/send-otp
```

Request:
```json
{
  "phoneNumber": "+919876543210",
  "userType": "client" // or "driver"
}
```

Response:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 300
}
```

### Verify OTP
```
POST /auth/verify-otp
```

Request:
```json
{
  "phoneNumber": "+919876543210",
  "otp": "123456"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "phoneNumber": "+919876543210",
      "userType": "client",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  }
}
```

### Refresh Token
```
POST /auth/refresh-token
```

Request:
```json
{
  "refreshToken": "eyJhbGc..."
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

### Get Profile
```
GET /auth/profile
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "phoneNumber": "+919876543210",
    "fullName": "John Doe",
    "email": "john@example.com",
    "userType": "client"
  }
}
```

### Update Profile
```
PUT /auth/profile
Authorization: Bearer <token>
```

Request:
```json
{
  "fullName": "John Updated",
  "email": "newemail@example.com"
}
```

### Logout
```
POST /auth/logout
Authorization: Bearer <token>
```

## OTP Flow

1. **Send OTP**:
   - Generate 6-digit OTP
   - Store in Redis with 5-minute expiry
   - Send via SMS (Twilio/MSG91)

2. **Verify OTP**:
   - Check OTP from Redis
   - Create user if doesn't exist
   - Generate JWT access token (15 min)
   - Generate refresh token (7 days)
   - Store session in Redis

3. **Token Refresh**:
   - Validate refresh token
   - Generate new access token
   - Extend session

## Environment Variables

```env
# Server
AUTH_SERVICE_PORT=3001

# Database
DATABASE_URL=postgresql://margwa_user:margwa_password@localhost:5432/margwa_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OTP
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=5

# SMS Provider (choose one)
SMS_PROVIDER=twilio  # or msg91
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Or MSG91
MSG91_AUTH_KEY=your-key
MSG91_SENDER_ID=MARGWA
```

## Development

### Prerequisites

- Go 1.21+
- PostgreSQL
- Redis

### Install Dependencies

```bash
cd services/auth-service
go mod download
```

### Run Service

```bash
go run main.go
```

Service runs on http://localhost:3001

### Build

```bash
go build -o auth-service main.go
./auth-service
```

## Testing

### Health Check

```bash
curl http://localhost:3001/health
```

### Test OTP Flow

```bash
# 1. Send OTP
curl -X POST http://localhost:3001/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "userType": "client"}'

# 2. Verify OTP (check Redis or logs for OTP in dev mode)
curl -X POST http://localhost:3001/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "otp": "123456"}'

# 3. Use access token
curl http://localhost:3001/auth/profile \
  -H "Authorization: Bearer <your-access-token>"
```

## Database Schema

### users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  email VARCHAR(255),
  user_type VARCHAR(10) NOT NULL, -- 'client' or 'driver'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Redis Data Structures

### OTP Storage
```
Key: otp:{phoneNumber}
Value: 123456
TTL: 300 seconds (5 minutes)
```

### Session Storage
```
Key: session:{userId}
Value: {refreshToken, deviceInfo, ...}
TTL: 604800 seconds (7 days)
```

## Security

- **Rate Limiting**: 5 OTP requests per phone number per hour
- **OTP Expiry**: 5 minutes
- **Token Rotation**: New access token on refresh
- **Secure Storage**: Hashed tokens in database
- **HTTPS Only**: In production

## Error Handling

Common error responses:

- `400 Bad Request` - Invalid phone number format
- `401 Unauthorized` - Invalid OTP or expired
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Production Deployment

### Docker

```bash
docker build -t margwa-auth-service .
docker run -p 3001:3001 --env-file .env margwa-auth-service
```

### Kubernetes

```bash
kubectl apply -f ../../k8s/deployments/auth-service.yaml
```

---

For integration with mobile apps, see [docs/API_INTEGRATION.md](../../docs/API_INTEGRATION.md).
