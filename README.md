# Margwa Backend Services

A scalable, high-performance backend infrastructure for the Margwa ride-sharing platform built with TypeScript, Go, and Rust.

## 🏗️ Architecture

**Microservices with Multi-Language Stack:**
- **TypeScript (Node.js)**: API Gateway, Route Service, Real-time Service, Chat Service
- **Go**: Authentication Service, Booking Service (high concurrency)
- **Rust**: Payment Service, Analytics Service (performance-critical)

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 14+ with PostGIS
- Redis 7+
- Go 1.21+ (for Go services)
- Rust 1.75+ (for Rust services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/margwa/backend.git
   cd margwa_backend
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Generate and push database schema**
   ```bash
   cd shared/database
   npm install
   npm run db:generate
   npm run db:push
   ```

6. **Seed initial data (optional)**
   ```bash
   npm run db:seed
   ```

7. **Start services**
   ```bash
   # Start all TypeScript services
   npm run dev:gateway    # Port 3000
   npm run dev:routes     # Port 3002
   npm run dev:realtime   # Port 3004
   npm run dev:chat       # Port 3005
   ```

## 📚 Documentation

- **[Getting Started Guide](./GETTING_STARTED.md)** - Detailed setup instructions
- **[API Documentation](./docs/API.md)** - Complete API reference
- **[Development Workflow](./docs/DEVELOPMENT.md)** - Developer guide
- **[Architecture Plan](../brain/.../implementation_plan.md)** - System design

## 📦 Project Structure

```
margwa_backend/
├── services/
│   ├── api-gateway/          # TypeScript - Main API entry point
│   ├── auth-service/         # Go - Authentication & authorization
│   ├── route-service/        # TypeScript - Route management
│   ├── booking-service/      # Go - Booking & matching
│   ├── realtime-service/     # TypeScript - WebSocket real-time
│   ├── chat-service/         # TypeScript - Chat messaging
│   ├── payment-service/      # Rust - Payment processing
│   ├── analytics-service/    # Rust - Analytics & reporting
│   └── notification-service/ # TypeScript - Push notifications
├── shared/
│   ├── database/             # Drizzle ORM schema
│   ├── types/                # Shared TypeScript types
│   └── utils/                # Common utilities
├── scripts/                  # Setup & utility scripts
├── docker-compose.yml
└── package.json
```

## 🗄️ Database Schema

The database is designed with Drizzle ORM and includes:

- **Users & Authentication**: User profiles, OTP verification, sessions
- **Drivers & Vehicles**: Driver profiles, vehicle registration, documents
- **Routes**: Route definitions, scheduling, instances
- **Bookings**: Booking requests, ride tracking
- **Payments**: Payment processing, earnings
- **Chat**: Conversations, messages
- **Notifications**: Push notifications, in-app alerts
- **Reviews**: Rating & feedback system

### Database Management UIs

- **PgAdmin**: http://localhost:5050 (admin@margwa.com / admin)
- **Redis Commander**: http://localhost:8081

## 🔧 Available Scripts

```bash
# Database
npm run db:generate    # Generate migrations
npm run db:push        # Push schema to database
npm run db:studio      # Open Drizzle Studio
npm run db:seed        # Seed initial data

# Development
npm run dev:gateway    # Start API Gateway
npm run dev:routes     # Start Route Service
npm run dev:realtime   # Start Real-time Service
npm run dev:chat       # Start Chat Service

# Docker
npm run docker:up      # Start all services
npm run docker:down    # Stop all services
npm run docker:logs    # View logs

# Build & Test
npm run build:all      # Build all services
npm run test           # Run tests
```

## 🌐 API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/send-otp` - Send OTP for verification
- `POST /auth/verify-otp` - Verify OTP and login
- `POST /auth/refresh-token` - Refresh access token
- `GET /auth/profile` - Get user profile

### Routes
- `POST /routes` - Create new route (driver)
- `GET /routes` - List driver routes
- `POST /routes/search` - Search available routes
- `GET /routes/:id` - Get route details
- `PUT /routes/:id` - Update route
- `DELETE /routes/:id` - Delete route

### Bookings
- `POST /bookings/request` - Request booking
- `POST /bookings/:id/accept` - Accept booking (driver)
- `POST /bookings/:id/reject` - Reject booking (driver)
- `GET /bookings/client/:id` - Get client bookings
- `GET /bookings/driver/:id` - Get driver bookings

### Real-time (WebSocket)
```
ws://localhost:3004
```
Events: `location:update`, `booking:new`, `booking:accepted`, `chat:message`

## 🔐 Environment Variables

Key configuration variables (see `.env.example` for full list):

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/margwa_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# Services
API_GATEWAY_PORT=3000
ROUTE_SERVICE_PORT=3002
REALTIME_SERVICE_PORT=3004
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run service-specific tests
cd services/api-gateway && npm test
```

## 📊 Monitoring & Observability

- **Health Check**: `GET /health`
- **Metrics**: Prometheus-compatible `/metrics` endpoint
- **Logs**: Structured JSON logs
- **Tracing**: Distributed tracing ready

## 🚢 Deployment

### Docker Production Build
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes
```bash
kubectl apply -f infra/kubernetes/
```

## 📝 Documentation

- [Architecture Overview](./docs/architecture.md)
- [Database Schema](./docs/database.md)
- [API Documentation](./docs/api.md)
- [WebSocket Events](./docs/websocket.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- GitHub Issues: [github.com/margwa/backend/issues](https://github.com/margwa/backend/issues)
- Email: support@margwa.com

---

**Built with ❤️ by the Margwa Team**