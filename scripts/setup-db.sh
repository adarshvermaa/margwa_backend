#!/bin/bash

echo "===================================="
echo "Margwa Backend - Database Setup"
echo "===================================="
echo ""

# Go to parent directory
cd "$(dirname "$0")/.."

echo "Setting up database..."
echo ""

echo "[1/3] Pushing schema to database..."
cd shared/database
npm run db:push
echo ""

echo "[2/3] Seeding database with sample data..."
cd ../..
npm run db:seed
echo ""

echo "[3/3] Testing database connection..."
npm run test:api
echo ""

echo "===================================="
echo "Database setup complete!"
echo "===================================="
echo ""
echo "You can now:"
echo "- View database in PgAdmin: http://localhost:5050"
echo "- View database in Drizzle Studio: npm run db:studio"
echo ""
