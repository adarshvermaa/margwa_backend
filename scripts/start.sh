#!/bin/bash

echo "===================================="
echo "Margwa Backend Services Manager"
echo "===================================="
echo ""

# Go to parent directory
cd ..

# Create logs directory if it doesn't exist
mkdir -p logs

echo "Stopping any running services..."
echo ""

# Stop services on all ports
PORTS=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010)
for port in "${PORTS[@]}"; do
    pid=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Stopping process $pid on port $port"
        kill -9 $pid 2>/dev/null
    fi
done

echo ""
echo "===================================="
echo "Starting All Services"
echo "===================================="
echo ""

# Start services in background with logging
echo "Starting API Gateway (Port 3000)..."
(cd services/api-gateway && npm run dev > ../../logs/api-gateway.log 2>&1 &)
sleep 2

echo "Starting Auth Service (Port 3001)..."
(cd services/auth-service && go run main.go > ../../logs/auth-service.log 2>&1 &)
sleep 2

echo "Starting Route Service (Port 3002)..."
(cd services/route-service && npm run dev > ../../logs/route-service.log 2>&1 &)
sleep 2

echo "Starting Driver Service (Port 3003)..."
(cd services/driver-service && go run main.go > ../../logs/driver-service.log 2>&1 &)
sleep 2

echo "Starting Real-time Service (Port 3004)..."
(cd services/realtime-service && npm run dev > ../../logs/realtime-service.log 2>&1 &)
sleep 2

echo "Starting Chat Service (Port 3005)..."
(cd services/chat-service && npm run dev > ../../logs/chat-service.log 2>&1 &)
sleep 2

echo "Starting Notification Service (Port 3006)..."
(cd services/notification-service && npm run dev > ../../logs/notification-service.log 2>&1 &)
sleep 2

echo "Starting Payment Service (Port 3007)..."
(cd services/payment-service && go run main.go > ../../logs/payment-service.log 2>&1 &)
sleep 2

echo "Starting Analytics Service (Port 3008)..."
(cd services/analytics-service && go run main.go > ../../logs/analytics-service.log 2>&1 &)
sleep 2

echo "Starting Places Service (Port 3009)..."
(cd services/places-service && npm run dev > ../../logs/places-service.log 2>&1 &)
sleep 2

echo "Starting Storage Service (Port 3010)..."
(cd services/storage-service && npm run dev > ../../logs/storage-service.log 2>&1 &)
sleep 2

echo ""
echo "===================================="
echo "All services started!"
echo "===================================="
echo ""
echo "Services running:"
echo "- API Gateway:          http://localhost:3000"
echo "- Auth Service:         http://localhost:3001"
echo "- Route Service:        http://localhost:3002"
echo "- Driver Service:       http://localhost:3003"
echo "- Real-time Service:    http://localhost:3004"
echo "- Chat Service:         http://localhost:3005"
echo "- Notification Service: http://localhost:3006"
echo "- Payment Service:      http://localhost:3007"
echo "- Analytics Service:    http://localhost:3008"
echo "- Places Service:       http://localhost:3009"
echo "- Storage Service:      http://localhost:3010"
echo "- MinIO Console:        http://localhost:9001"
echo ""
echo "Logs are available in the logs/ directory"
echo ""
echo "Waiting 5 seconds before running tests..."
sleep 5

# Test services
echo ""
echo "Testing services..."
node scripts/test-api.js

echo ""
echo "Press Enter to view service status or Ctrl+C to exit..."
read

# Show running processes
echo ""
echo "Running service processes:"
for port in "${PORTS[@]}"; do
    pid=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Port $port: PID $pid"
    else
        echo "Port $port: Not running"
    fi
done
