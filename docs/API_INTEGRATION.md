# Margwa API Integration Documentation

## 📋 Table of Contents
- [Architecture Overview](#architecture-overview)
- [Authentication & Security](#authentication--security)
- [Services & Endpoints](#services--endpoints)
- [Data Models](#data-models)
- [WebSocket Events](#websocket-events)
- [Frontend Integration](#frontend-integration)
- [Environment Configuration](#environment-configuration)

---

## 🏗️ Architecture Overview

Margwa is a microservices-based bus booking platform with:
- **Frontend**: 2 React Native applications (Client App, Driver App)
- **Backend**: 8 microservices orchestrated via API Gateway
- **Infrastructure**: PostgreSQL, Redis, WebSocket for real-time features

### Service Architecture

```mermaid
graph TB
    ClientApp[Client App<br/>React Native]
    DriverApp[Driver App<br/>React Native]
    Gateway[API Gateway:3000<br/>TypeScript]
    
    Auth[Auth Service:3001<br/>Go]
    Route[Route Service:3002<br/>TypeScript]
    Chat[Chat Service:3005<br/>TypeScript]
    Notif[Notification Service:3006<br/>TypeScript]
    Payment[Payment Service:3007<br/>Go]
    Realtime[Realtime Service:3004<br/>WebSocket]
    Analytics[Analytics Service:3008<br/>Go]
    
    Postgres[(PostgreSQL<br/>Database)]
    Redis[(Redis<br/>Cache/PubSub)]
    
    ClientApp --> Gateway
    DriverApp --> Gateway
    ClientApp --> Realtime
    DriverApp --> Realtime
    
    Gateway --> Auth
    Gateway --> Route
    Gateway --> Chat
    Gateway --> Payment
    
    Auth --> Postgres
    Auth --> Redis
    Route --> Postgres
    Chat --> Postgres
    Payment --> Postgres
    Analytics --> Postgres
    
    Realtime --> Redis
```

---

## 🔐 Authentication & Security

### JWT-Based Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Auth
    participant DB

    Client->>Gateway: POST /auth/register
    Gateway->>Auth: Forward request
    Auth->>DB: Create user
    Auth-->>Gateway: User created
    Gateway-->>Client: Success

    Client->>Gateway: POST /auth/send-otp
    Gateway->>Auth: Forward request
    Auth->>DB: Store OTP
    Auth-->>Client: OTP sent (logged)

    Client->>Gateway: POST /auth/verify-otp
    Gateway->>Auth: Forward with OTP
    Auth->>DB: Verify OTP
    Auth->>Auth: Generate JWT tokens
    Auth-->>Client: {user, tokens}

    Note over Client: Store tokens locally
    Client->>Gateway: GET /auth/profile<br/>Authorization: Bearer {token}
    Gateway->>Auth: Validate & forward
    Auth-->>Client: User profile
```

### Token Types

| Token | Purpose | Expiry | Storage |
|-------|---------|--------|---------|
| **Access Token** | API authentication | 15 minutes | Memory |
| **Refresh Token** | Renew access token | 30 days | AsyncStorage |

---

## 🌐 Services & Endpoints

### 1. Auth Service (Go, Port 3001)

**Base Path**: `/api/v1/auth`

| Endpoint | Method | Auth | Purpose | Request | Response |
|----------|--------|------|---------|---------|----------|
| `/register` | POST | ❌ | Create new user | `{phoneNumber, phoneCountryCode, userType}` | `User` |
| `/send-otp` | POST | ❌ | Send OTP to phone | `{phoneNumber, phoneCountryCode}` | `{otpId, expiresAt, otp}` |
| `/verify-otp` | POST | ❌ | Verify OTP & login | `{phoneNumber, phoneCountryCode, otpCode, deviceId, deviceType}` | `{user, tokens}` |
| `/refresh-token` | POST | ❌ | Refresh access token | `{refreshToken}` | `{accessToken, expiresIn}` |
| `/logout` | POST | ✅ | Invalidate session | `{}` | `{message}` |
| `/profile` | GET | ✅ | Get user profile | - | `User` |
| `/profile` | PUT | ✅ | Update profile | `{fullName?, email?, profileImageUrl?, languagePreference?}` | `User` |

**Key Features**:
- OTP length: 6 digits (configurable via `OTP_LENGTH`)
- OTP expiry: 10 minutes (configurable via `OTP_EXPIRY_MINUTES`)
- Max OTP attempts: 3

---

### 2. Route Service (TypeScript, Port 3002)

**Base Path**: `/api/v1/routes`

| Endpoint | Method | Auth | Purpose | Request | Response |
|----------|--------|------|---------|---------|----------|
| `/` | POST | ✅ (driver) | Create new route | `{startLocation, endLocation, departureTime, ...}` | `Route` |
| `/driver/:driverId` | GET | ✅ | Get driver's routes | - | `Route[]` |
| `/:id` | GET | ✅ | Get route by ID | - | `Route` |
| `/:id` | PUT | ✅ (driver) | Update route | `{...routeUpdates}` | `Route` |
| `/:id` | DELETE | ✅ (driver) | Delete route | - | `{message}` |
| `/search` | POST | ❌ | Search routes | `{from, to, date, seats}` | `Route[]` |
| `/popular/list` | GET | ❌ | Get popular routes | - | `Route[]` |

**Authorization**:
- Create/Update/Delete: Only `driver` or `both` userType
- Read operations: All authenticated users
- Search/Popular: Public (no auth required)

---

### 3. Chat Service (TypeScript, Port 3005)

**Base Path**: `/api/v1/chat`

| Endpoint | Method | Auth | Purpose | Request | Response |
|----------|--------|------|---------|---------|----------|
| `/conversations` | POST | ✅ | Create conversation | `{participant1Id, participant2Id, bookingId?}` | `Conversation` |
| `/messages` | POST | ✅ | Send message | `{conversationId, message, messageType?}` | `Message` |
| `/messages/:conversationId` | GET | ✅ | Get conversation messages | Query: `limit, offset` | `Message[]` |
| `/messages/:conversationId/read` | PUT | ✅ | Mark messages as read | `{}` | `{updated: number}` |
| `/conversations/user/:userId` | GET | ✅ | Get user conversations | - | `Conversation[]` |
| `/unread/:userId` | GET | ✅ | Get unread count | - | `{unreadCount: number}` |

---

### 4. Notification Service (TypeScript, Port 3006)

**Base Path**: `/api/v1/notifications`

| Endpoint | Method | Auth | Purpose | Request | Response |
|----------|--------|------|---------|---------|----------|
| `/` | POST | ✅ | Send notification | `{userId, title, body, type, data?}` | `Notification` |
| `/:userId` | GET | ✅ | Get user notifications | Query: `limit, offset, unreadOnly` | `Notification[]` |
| `/:id/read` | PUT | ✅ | Mark as read | `{}` | `Notification` |
| `/:id` | DELETE | ✅ | Delete notification | - | `{message}` |

**Notification Types**: `booking`, `payment`, `chat`, `ride_update`, `promotional`

---

### 5. Payment Service (Go, Port 3007)

**Base Path**: `/api/v1/payments`

| Endpoint | Method | Auth | Purpose | Request | Response |
|----------|--------|------|---------|---------|----------|
| `/initiate` | POST | ✅ | Initiate payment | `{bookingId, amount, method}` | `{paymentId, orderId, ...}` |
| `/verify` | POST | ✅ | Verify payment | `{paymentId, paymentGatewayId, signature}` | `Payment` |
| `/:bookingId` | GET | ✅ | Get payment by booking | - | `Payment` |
| `/refund` | POST | ✅ | Process refund | `{paymentId, amount, reason}` | `Refund` |
| `/webhook` | POST | ❌ | Payment gateway webhook | Gateway-specific payload | `{status}` |

**Earnings Endpoints** (`/api/v1/earnings`):

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/calculate` | POST | ✅ (driver) | Calculate driver earnings |
| `/driver/:driverId` | GET | ✅ | Get driver earnings summary |
| `/withdraw` | POST | ✅ (driver) | Process withdrawal request |

**Payment Methods**: `razorpay`, `stripe`, `wallet`

---

### 6. Analytics Service (Go, Port 3008)

**Base Path**: `/api/v1/analytics`

| Endpoint | Method | Auth | Purpose | Response |
|----------|--------|------|---------|----------|
| `/driver/:driver_id/stats` | GET | ✅ | Driver statistics | `{totalRides, rating, earnings, ...}` |
| `/driver/:driver_id/earnings` | GET | ✅ | Driver earnings breakdown | `{daily, weekly, monthly}` |
| `/trip/:trip_id` | GET | ✅ | Trip analytics | `{duration, distance, revenue}` |
| `/platform/stats` | GET | ✅ (admin) | Platform-wide stats | `{activeUsers, totalRides, revenue}` |
| `/reports/generate` | POST | ✅ (admin) | Generate custom report | `{type, dateRange, filters}` |
| `/trends/routes` | GET | ✅ | Route popularity trends | `{routes[], metrics}` |

---

### 7. Realtime Service (WebSocket, Port 3004)

**Connection**: `ws://localhost:3004` or `wss://` for production

**Authentication**:
```javascript
const socket = io('ws://localhost:3004', {
  auth: { token: accessToken }
});
```

#### WebSocket Events

**Client→Server Events**:

| Event | Payload | Purpose |
|-------|---------|---------|
| `location:update` | `{latitude, longitude, heading?, speed?, rideId?}` | Driver location update |
| `ride:join` | `rideId` | Join ride room |
| `ride:leave` | `rideId` | Leave ride room |
| `booking:notify` | `{driverId, bookingId, message}` | Notify driver of new booking |
| `booking:status` | `{bookingId, status, userId}` | Update booking status |
| `chat:message` | `{conversationId, receiverId, message}` | Send chat message |
| `driver:online` | - | Mark driver as online |
| `driver:offline` | - | Mark driver as offline |
| `notification:send` | `{userId, title, body, data?}` | Send notification |
| `ping` | - | Health check |

**Server→Client Events**:

| Event | Payload | Purpose |
|-------|---------|---------|
| `location:updated` | `{driverId, latitude, longitude, timestamp, ...}` | Driver location broadcast |
| `ride:joined` | `{rideId, timestamp}` | Ride join confirmation |
| `booking:new` | `{bookingId, message, timestamp}` | New booking notification |
| `booking:updated` | `{bookingId, status, timestamp}` | Booking status change |
| `chat:message` | `{conversationId, senderId, message, timestamp}` | New chat message |
| `driver:status` | `{driverId, online, timestamp}` | Driver online/offline status |
| `notification:new` | `{title, body, data, timestamp}` | New notification |
| `pong` | `{timestamp}` | Health check response |

---

### 8. API Gateway (TypeScript, Port 3000)

**Purpose**: Single entry point for all HTTP requests

**Routes**:
- `/api/v1/auth/*` → Auth Service (3001)
- `/api/v1/routes/*` → Route Service (3002)
- `/api/v1/bookings/*` → Booking Service (3003) [Not yet implemented]
- `/api/v1/chat/*` → Chat Service (3005)
- `/api/v1/payments/*` → Payment Service (3007)

**Built-in Features**:
- ✅ Rate limiting (100 req/min per IP)
- ✅ Request logging (Morgan)
- ✅ Security headers (Helmet)
- ✅ CORS management
- ✅ Response compression
- ✅ Error normalization

---

## 📦 Data Models

### User
```typescript
interface User {
  id: string;                    // UUID
  phoneNumber: string;           // e.g., "7000214280"
  phoneCountryCode: string;      // e.g., "+91"
  fullName?: string;
  email?: string;
  profileImageUrl?: string;
  profileImage?: string;         // Client-side field
  dob?: string;                  // DD/MM/YYYY
  gender?: 'Male' | 'Female' | 'Other';
  memberSince?: string;
  isProfileComplete?: boolean;
  userType: 'client' | 'driver' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  languagePreference: string;    // e.g., "en"
  createdAt: string;             // ISO 8601
  updatedAt: string;
  lastLoginAt?: string;
}
```

### TokenPair
```typescript
interface TokenPair {
  accessToken: string;    // JWT for API auth
  refreshToken: string;   // JWT for token refresh
  expiresIn: string;      // e.g., "15m"
}
```

### Route
```typescript
interface Route {
  id: string;
  driverId: string;
  startLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  endLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  departureTime: string;   // ISO 8601
  arrivalTime: string;
  price: number;
  availableSeats: number;
  totalSeats: number;
  vehicleInfo: {
    type: string;
    number: string;
    model?: string;
  };
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}
```

### Payment
```typescript
interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;          // e.g., "INR"
  method: 'razorpay' | 'stripe' | 'wallet';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🔌 WebSocket Events

### Connection Example

**Client App (React Native)**:
```typescript
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://192.168.31.119:3004', {
  auth: { token: accessToken },
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected to realtime service');
});

socket.on('location:updated', (data) => {
  console.log('Driver location:', data);
});
```

**Driver App Location Updates**:
```typescript
// Send location every 5 seconds
setInterval(() => {
  socket.emit('location:update', {
    latitude: currentPosition.coords.latitude,
    longitude: currentPosition.coords.longitude,
    heading: currentPosition.coords.heading,
    speed: currentPosition.coords.speed,
    rideId: activeRideId,
  });
}, 5000);
```

---

## 📱 Frontend Integration

### Client App API Service

**File**: `margwa/client_app/services/api/auth.ts`

```typescript
import { apiClient, setAuthToken } from './client';

export const authService = {
  register: (data: RegisterRequest) => 
    apiClient.post<User>('/auth/register', data),

  sendOTP: (data: SendOTPRequest) =>
    apiClient.post('/auth/send-otp', data),

  verifyOTP: async (data: VerifyOTPRequest) => {
    const response = await apiClient.post<UserWithTokens>('/auth/verify-otp', data);
    if (response.success && response.data.tokens) {
      await setAuthToken(response.data.tokens.accessToken);
    }
    return response;
  },

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.put<User>('/auth/profile', data),

  logout: async () => {
    await apiClient.post('/auth/logout', {});
    await clearAuthToken();
  },
};
```

### API Client Configuration

**Base URL**: `http://192.168.31.119:3000/api/v1` (Android Emulator)

For iOS Simulator: `http://localhost:3000/api/v1`
For physical devices: Use your machine's LAN IP

**Configuration** (`.env`):
```env
EXPO_PUBLIC_API_URL=http://192.168.31.119:3000/api/v1
```

### Error Handling

All API responses follow this structure:
```typescript
{
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

**Common Error Codes**:
- `USER_NOT_FOUND` - User doesn't exist
- `INVALID_OTP` - Wrong OTP code
- `TOKEN_EXPIRED` - Access token expired
- `VALIDATION_ERROR` - Invalid request data
- `UNAUTHORIZED` - Not authenticated
- `FORBIDDEN` - Insufficient permissions

---

## ⚙️ Environment Configuration

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql://margwa_user:margwa_password@localhost:5432/margwa_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# OTP
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6

# Services
AUTH_SERVICE_PORT=3001
ROUTE_SERVICE_PORT=3002
CHAT_SERVICE_PORT=3005
NOTIFICATION_SERVICE_PORT=3006
PAYMENT_SERVICE_PORT=3007
REALTIME_SERVICE_PORT=3004
ANALYTICS_SERVICE_PORT=3008
API_GATEWAY_PORT=3000

# Service URLs (for API Gateway)
AUTH_SERVICE_URL=http://localhost:3001
ROUTE_SERVICE_URL=http://localhost:3002
# ... (other service URLs)

# Security
CORS_ORIGIN=http://localhost:3000,http://localhost:19006
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Node Environment
NODE_ENV=development
LOG_LEVEL=info
```

### Frontend (.env)

**Client App**:
```env
EXPO_PUBLIC_API_URL=http://192.168.31.119:3000/api/v1
EXPO_PUBLIC_WS_URL=http://192.168.31.119:3004
```

**Driver App**:
```env
EXPO_PUBLIC_API_URL=http://192.168.31.119:3000/api/v1
EXPO_PUBLIC_WS_URL=http://192.168.31.119:3004
```

---

## 🚀 Quick Start Guide

### 1. Start Backend Services

```bash
cd margwa_backend/scripts
.\start.ps1
```

This starts all 8 microservices + PostgreSQL + Redis.

### 2. Start Client App

```bash
cd margwa/client_app
npm run start
```

Press `a` for Android or `i` for iOS.

### 3. Test Authentication Flow

1. Open app → Enter phone number
2. Click "Continue" → OTP sent (check terminal logs)
3. Enter 6-digit OTP → Verify
4. Complete profile → Navigate to home

---

## 📊 API Summary

| Service | Type | Port | Endpoints | Database | Key Features |
|---------|------|------|-----------|----------|--------------|
| **API Gateway** | TypeScript | 3000 | Proxy | - | Rate limiting, CORS, logging |
| **Auth** | Go | 3001 | 7 | PostgreSQL, Redis | JWT, OTP, sessions |
| **Route** | TypeScript | 3002 | 7 | PostgreSQL | Route CRUD, search, popular |
| **Chat** | TypeScript | 3005 | 6 | PostgreSQL | Messages, conversations |
| **Notification** | TypeScript | 3006 | 4 | PostgreSQL | Push notifications |
| **Payment** | Go | 3007 | 8 | PostgreSQL | Razorpay, earnings, refunds |
| **Realtime** | TypeScript | 3004 | WebSocket | Redis | Location, status, chat relay |
| **Analytics** | Go | 3008 | 6 | PostgreSQL | Stats, reports, trends |

**Total HTTP Endpoints**: 47+
**WebSocket Events**: 18 (9 client→server, 9 server→client)

---

## 📝 Notes

- All timestamps use ISO 8601 format
- All IDs are UUIDs
- Phone numbers stored without country code prefix
- Passwords not used (OTP-based authentication)
- JWT tokens must be refreshed before expiry
- WebSocket requires JWT authentication
- API Gateway forwards headers (including Authorization)

---

**Last Updated**: 2026-01-10
**Version**: 1.0.0
