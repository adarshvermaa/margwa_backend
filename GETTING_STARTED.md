# Margwa Backend - Getting Started Guide

## Prerequisites

- **Node.js** 20+ 
- **Docker & Docker Compose**
- **Git**

## Installation Steps

### 1. Clone & Setup

```bash
cd margwa_backend
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file with your database credentials (already set for local development):

```env
DATABASE_URL=postgresql://margwa_user:margwa_password@localhost:5432/margwa_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-this
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be healthy (check with)
docker-compose ps
```

### 4. Setup Database

```bash
# Navigate to database module
cd shared/database

# Install dependencies
npm install

# Generate Drizzle migrations
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Open Drizzle Studio to view database
npm run db:studio
```

### 5. Install Root Dependencies

```bash
# Go back to root
cd ../..

# Install all workspace dependencies
npm install
```

### 6. Start Services

Open 3 terminal windows:

**Terminal 1 - API Gateway:**
```bash
cd services/api-gateway
npm install
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - Route Service:**
```bash
cd services/route-service
npm install
npm run dev
# Runs on http://localhost:3002
```

**Terminal 3 - Real-time Service:**
```bash
cd services/realtime-service
npm install
npm run dev
# WebSocket on ws://localhost:3004
```

## Verification

### Check Services

1. **API Gateway**: http://localhost:3000/health
2. **Route Service**: http://localhost:3002/health
3. **Real-time Service**: http://localhost:3004/health

### Access Management UIs

- **PgAdmin**: http://localhost:5050
  - Email: `admin@margwa.com`
  - Password: `admin`
  - Add server: hostname=`postgres`, username=`margwa_user`, password=`margwa_password`

- **Redis Commander**: http://localhost:8081

## Testing the API

### Create a Route (Example)

```bash
curl -X POST http://localhost:3000/api/v1/routes \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "driver-uuid-here",
    "vehicleId": "vehicle-uuid-here",
    "fromCity": "Indore",
    "toCity": "Bhopal",
    "departureTime": "09:00:00",
    "arrivalTime": "12:00:00",
    "basePricePerSeat": 450,
    "totalSeats": 6,
    "genderPreference": "any",
    "amenities": ["AC", "WiFi", "Music"],
    "recurringDays": [1, 3, 5]
  }'
```

### Search Routes

```bash
curl -X POST http://localhost:3000/api/v1/routes/search \
  -H "Content-Type: application/json" \
  -d '{
    "fromCity": "Indore",
    "toCity": "Bhopal",
    "page": 1,
    "limit": 20
  }'
```

## WebSocket Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3004', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket');
  
  // Join a ride
  socket.emit('ride:join', 'ride-id-here');
  
  // Listen for location updates
  socket.on('location:updated', (data) => {
    console.log('Driver location:', data);
  });
});
```

## Troubleshooting

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart if needed
docker-compose restart postgres
```

### Redis Connection Error

```bash
# Check if Redis is running
docker-compose ps redis

# Test connection
docker exec -it margwa-redis redis-cli ping
# Should return: PONG
```

### Port Already in Use

```bash
# Find process using port 3000 (or other port)
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <PID> /F

# Or change port in .env file
```

## Next Steps

1. **Build Auth Service** (Go) - for OTP authentication
2. **Build Booking Service** (Go) - for ride bookings
3. **Build Chat Service** (TypeScript) - for messaging
4. **Add seed data** - for testing with realistic data
5. **Write tests** - unit and integration tests

## Useful Commands

```bash
# View all running containers
docker-compose ps

# View logs for all services
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild a service
docker-compose build api-gateway

# Run database migrations
cd shared/database && npm run db:generate && npm run db:push
```

## Project Structure Overview

```
margwa_backend/
├── services/
│   ├── api-gateway/      ✅ RUNNING (Port 3000)
│   ├── route-service/    ✅ RUNNING (Port 3002)
│   ├── realtime-service/ ✅ RUNNING (Port 3004)
│   ├── chat-service/     ⏳ To be started
│   └── (Go/Rust services to be built)
├── shared/
│   ├── database/         ✅ Schema created
│   ├── types/            ✅ Type definitions
│   └── utils/            ✅ Utilities
└── docker-compose.yml    ✅ Infrastructure running
```

---

**You're all set! 🎉** The core backend infrastructure is now running and ready for development.
