# Margwa Backend - Quick Start Scripts

This directory contains convenience scripts for managing the Margwa backend services.

## 🚀 Quick Start

### Windows (PowerShell/CMD)

```batch
# 1. Install all dependencies
install.bat

# 2. Start Docker infrastructure
docker.bat
# Select option 1 (Start infrastructure)

# 3. Setup database
setup-db.bat

# 4. Start all services
start-all.bat
```

### Unix/Linux/macOS

```bash
# Make scripts executable
chmod +x *.sh

# 1. Install all dependencies
./install.sh

# 2. Start Docker infrastructure
./docker.sh
# Select option 1 (Start infrastructure)

# 3. Setup database
./setup-db.sh

# 4. Start all services
./start-all.sh

# To stop services
./stop-all.sh
```

## 📜 Available Scripts

### Installation Scripts

**`install.bat` / `install.sh`**
- Installs dependencies for all services (TypeScript, Go, Rust)
- Creates `.env` file from template
- Downloads Go modules
- Builds Rust release binary

### Service Management Scripts

**`start-all.bat` / `start-all.sh`**
- Starts all 6 microservices concurrently
- Opens each service in a separate window (Windows) or background process (Unix)
- Tests all services after startup

**`stop-all.sh`** (Unix only)
- Stops all running services
- Cleans up PID files

### Docker Management Scripts

**`docker.bat` / `docker.sh`**
- Interactive menu for Docker operations:
  1. Start infrastructure only (Postgres + Redis)
  2. Start all services
  3. Stop all services
  4. View logs
  5. Restart services
  6. Clean up volumes (WARNING: deletes data)
  7. Build services
  8. Exit

### Database Scripts

**`setup-db.bat` / `setup-db.sh`**
- Pushes database schema using Drizzle
- Seeds database with sample data
- Runs API health tests

## 🎯 Complete Setup Workflow

### First Time Setup

```bash
# Windows
install.bat
docker.bat       # Choose option 1
setup-db.bat
start-all.bat

# Unix/Linux
./install.sh
./docker.sh      # Choose option 1
./setup-db.sh
./start-all.sh
```

### Daily Development

```bash
# Windows
docker.bat       # Choose option 1 (if not running)
start-all.bat

# Unix/Linux
./docker.sh      # Choose option 1 (if not running)
./start-all.sh
```

### Stop Everything

```bash
# Windows
# Close service windows, then:
docker.bat       # Choose option 3

# Unix/Linux
./stop-all.sh
./docker.sh      # Choose option 3
```

## 🔧 Manual Service Start

If you prefer to start services individually:

### TypeScript Services

```bash
# API Gateway
cd services/api-gateway && npm run dev

# Route Service
cd services/route-service && npm run dev

# Real-time Service
cd services/realtime-service && npm run dev

# Chat Service
cd services/chat-service && npm run dev
```

### Go Service

```bash
cd services/auth-service && go run main.go
```

### Rust Service

```bash
cd services/analytics-service && cargo run --release
```

## 📊 Service Ports

- **API Gateway**: 3000
- **Auth Service** (Go): 3001
- **Route Service**: 3002
- **Real-time Service** (WebSocket): 3004
- **Chat Service**: 3005
- **Analytics Service** (Rust): 3007

### Infrastructure

- **PostgreSQL**: 5432
- **PgAdmin**: 5050 (http://localhost:5050)
- **Redis**: 6379
- **Redis Commander**: 8081 (http://localhost:8081)

## 🐛 Troubleshooting

### Port Already in Use

**Windows:**
```batch
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Unix:**
```bash
lsof -i :3000
kill <PID>
```

### Dependencies Not Installing

```bash
# Clean install
rm -rf node_modules */*/node_modules
./install.sh
```

### Docker Issues

```bash
# Restart Docker
docker-compose down
docker-compose up -d

# View logs
docker-compose logs -f postgres
```

### Database Connection Errors

```bash
# Check if Postgres is running
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# Re-run setup
./setup-db.sh
```

## 📝 Notes

- **Windows**: Scripts open each service in a new CMD window
- **Unix**: Scripts run services in the background and log to `logs/` directory
- All scripts assume you're in the `margwa_backend` root directory
- Make sure Docker is running before using docker scripts
- Environment variables are loaded from `.env` file

## 🎓 Examples

### Complete Fresh Setup

```bash
# Clone and setup
git clone <repo>
cd margwa_backend

# Windows
install.bat && docker.bat && setup-db.bat && start-all.bat

# Unix
./install.sh && ./docker.sh && ./setup-db.sh && ./start-all.sh
```

### Update Dependencies

```bash
# Windows
install.bat

# Unix
./install.sh
```

### Reset Database

```bash
# Windows
docker.bat  # Choose option 6 (cleanup)
setup-db.bat

# Unix
./docker.sh  # Choose option 6 (cleanup)
./setup-db.sh
```

---

**Happy coding! 🚀**
