#!/bin/bash

# Mailg Development Servers Startup Script
# Runs both Vite dev server (port 3000) and API server (port 3001)

echo "🚀 Starting Mailg Development Servers..."
echo ""
echo "📦 Frontend (Vite): http://localhost:3000"
echo "🔌 API Server:      http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Start both servers using concurrently
npx concurrently \
  --names "VITE,API" \
  --prefix "[{name}]" \
  --prefix-colors "cyan,green" \
  "npm run dev:vite" \
  "npm run dev:api"
