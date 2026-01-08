# Margwa Auth Service (Go)

OTP-based authentication service with JWT token generation.

## Features

- Phone number registration
- OTP generation and verification
- JWT access & refresh tokens
- Session management
- Profile management
- Secure password-less authentication

## Getting Started

### Prerequisites
- Go 1.21+
- PostgreSQL
- Redis

### Installation

```bash
cd services/auth-service
go mod download
```

### Run

```bash
go run main.go
```

Service runs on port 3001.

## API Endpoints

```
POST /auth/register       - Register new user
POST /auth/send-otp       - Send OTP to phone
POST /auth/verify-otp     - Verify OTP and login
POST /auth/refresh-token  - Refresh access token
POST /auth/logout         - Logout user
GET  /auth/profile        - Get user profile
PUT  /auth/profile        - Update user profile
```

## Environment Variables

See `.env.example` for required variables.
