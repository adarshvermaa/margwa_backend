#!/bin/bash

echo "===================================="
echo "Margwa Backend - Setup Script"
echo "===================================="
echo ""

# Go to parent directory
cd "$(dirname "$0")/.."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please update .env with your configuration"
    echo ""
fi

echo "Installing dependencies for all services..."
echo ""

# Install root dependencies
echo "[1/10] Installing root dependencies..."
npm install
echo ""

# Install shared database dependencies
echo "[2/10] Installing shared database dependencies..."
cd shared/database
npm install
cd ../..
echo ""

# Install API Gateway dependencies
echo "[3/10] Installing API Gateway dependencies..."
cd services/api-gateway
npm install
cd ../..
echo ""

# Install Route Service dependencies
echo "[4/10] Installing Route Service dependencies..."
cd services/route-service
npm install
cd ../..
echo ""

# Install Real-time Service dependencies
echo "[5/10] Installing Real-time Service dependencies..."
cd services/realtime-service
npm install
cd ../..
echo ""

# Install Chat Service dependencies
echo "[6/10] Installing Chat Service dependencies..."
cd services/chat-service
npm install
cd ../..
echo ""

# Install Go Auth Service dependencies
echo "[7/10] Installing Go Auth Service dependencies..."
cd services/auth-service
go mod download
cd ../..
echo ""

# Install Notification Service dependencies
echo "[8/10] Installing Notification Service dependencies..."
cd services/notification-service
npm install
cd ../..
echo ""

# Install Go Payment Service dependencies
echo "[9/10] Installing Go Payment Service dependencies..."
cd services/payment-service
go mod download
cd ../..
echo ""

# Install Go Analytics Service dependencies
echo "[10/10] Installing Go Analytics Service dependencies..."
cd services/analytics-service
go mod download
cd ../..
echo ""

echo "===================================="
echo "Setup Complete!"
echo "===================================="
echo ""
echo "Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Start infrastructure: ./scripts/docker.sh (choose option 1)"
echo "3. Setup database: ./scripts/setup-db.sh"
echo "4. Start services: ./scripts/start-all.sh"
echo ""
