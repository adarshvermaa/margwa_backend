# Development Workflow

## Daily Development

### Starting Your Dev Environment

```bash
# 1. Start infrastructure (first time or after reboot)
docker-compose up -d postgres redis

# 2. In separate terminals, start each service:

# Terminal 1 - API Gateway
cd services/api-gateway && npm run dev

# Terminal 2 - Route Service  
cd services/route-service && npm run dev

# Terminal 3 - Real-time Service
cd services/realtime-service && npm run dev

# Terminal 4 - Chat Service
cd services/chat-service && npm run dev
```

### Stopping Services

```bash
# Stop services (Ctrl+C in each terminal)

# Stop infrastructure
docker-compose down
```

## Database Management

### Applying Schema Changes

```bash
cd shared/database

# 1. Add/modify schema in src/schema/*.ts

# 2. Generate migration
npm run db:generate

# 3. Push to database
npm run db:push

# 4. Verify in Drizzle Studio
npm run db:studio
```

### Seeding Data

```bash
# Seed the database with sample data
npm run db:seed
```

### Viewing Database

**Option 1: Drizzle Studio**
```bash
cd shared/database
npm run db:studio
# Opens at http://localhost:4983
```

**Option 2: PgAdmin**
- Visit http://localhost:5050
- Login: admin@margwa.com / admin
- Add server:
  - Host: postgres
  - Port: 5432
  - Database: margwa_db
  - Username: margwa_user
  - Password: margwa_password

## Testing

### Manual API Testing

```bash
# Run the test script
npm run test:api
```

### Using cURL

```bash
# Search routes
curl -X POST http://localhost:3000/api/v1/routes/search \\
  -H "Content-Type: application/json" \\
  -d '{
    "fromCity": "Indore",
    "toCity": "Bhopal",
    "page": 1
  }'

# Get popular routes
curl http://localhost:3000/api/v1/routes/popular
```

### WebSocket Testing

```javascript
// test-websocket.js
const io = require('socket.io-client');

const socket = io('http://localhost:3004', {
  auth: { token: 'your-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('ping');
});

socket.on('pong', (data) => {
  console.log('Pong:', data);
});
```

## Adding New Features

### Adding a New Database Table

1. Create schema file in `shared/database/src/schema/`
2. Export from `shared/database/src/schema/index.ts`
3. Run `npm run db:generate && npm run db:push`

### Adding a New Service Route

1. Add route in `services/[service]/src/routes/`
2. Import in main `index.ts`
3. Add proxy route in `api-gateway/src/routes/`

### Adding a WebSocket Event

1. Add handler in `realtime-service/src/handlers/socketHandlers.ts`
2. Document in API.md

## Debugging

### Viewing Logs

```bash
# Service logs (in service directory)
npm run dev

# Docker logs
docker-compose logs -f postgres
docker-compose logs -f redis

# All services
docker-compose logs -f
```

### Common Issues

**Port already in use:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port in .env
```

**Database connection error:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart
docker-compose restart postgres
```

**Redis connection error:**
```bash
# Check if Redis is running
docker exec -it margwa-redis redis-cli ping

# Restart
docker-compose restart redis
```

## Code Style

- Use TypeScript for all services
- Follow existing patterns in codebase
- Add validation with Zod
- Include error handling
- Log important events
- Add JSDoc comments for public APIs

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes
git add .
git commit -m "feat: add feature description"

# Push
git push origin feature/your-feature

# Create PR on GitHub
```

## Environment Variables

When adding new env vars:
1. Add to `.env.example` with description
2. Document in README.md
3. Use in code via `process.env.VAR_NAME`
4. Add default values where appropriate
