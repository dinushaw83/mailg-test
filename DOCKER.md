# Docker Setup for Mailg

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and start
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Using Docker CLI

```bash
# Build the image
docker build -t mailg .

# Run the container
docker run -d \
  -p 3000:3000 \
  -p 3001:3001 \
  --name mailg-app \
  --env-file .env \
  mailg

# View logs
docker logs -f mailg-app

# Stop and remove
docker stop mailg-app
docker rm mailg-app
```

---

## Access the Application

Once running, access:

- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001
- **API Health:** http://localhost:3001/api/health

---

## What's Running Inside the Container

The Docker container runs **TWO processes** using PM2:

1. **Frontend (Vite Preview)** - Port 3000

   - Serves the built static files
   - Production-optimized build

2. **API Server (Express)** - Port 3001
   - Handles verification endpoints
   - Processes assertions

---

## Environment Variables

The container reads from `.env` file. Make sure to set:

```env
# Required
API_PORT=3001
VITE_RUN_MODE=localstorage

# CORS Configuration (Required for production deployment)
# Add your deployed frontend domain(s) - comma-separated
# Example: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com

# For LLM-based assertions (optional)
OPENROUTER_API_KEY=your_key_here
OPENROUTER_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### CORS Configuration

When deploying to a domain, you **must** set `ALLOWED_ORIGINS` to your frontend domain(s):

- **Option 1:** Add to `.env` file (recommended)
  ```env
  ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  ```

- **Option 2:** Add to `docker-compose.yml` environment section
  ```yaml
  environment:
    - ALLOWED_ORIGINS=https://yourdomain.com
  ```

- **Option 3:** Set when running Docker directly
  ```bash
  docker run -e ALLOWED_ORIGINS=https://yourdomain.com ...
  ```

**Note:** In development (localhost), CORS automatically allows localhost origins. In production, if `ALLOWED_ORIGINS` is not set, all origins are allowed (not recommended for security).

---

## Architecture

```
┌─────────────────────────────────────┐
│     Docker Container (Node 18)      │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │   Frontend   │  │  API Server │ │
│  │ Vite Preview │  │   Express   │ │
│  │   :3000      │  │    :3001    │ │
│  └──────────────┘  └─────────────┘ │
│           ▲                ▲        │
│           │                │        │
│           └────── PM2 ─────┘        │
└─────────────────────────────────────┘
         │              │
         │              │
    Port 3000      Port 3001
    (Frontend)       (API)
```

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs

# Or for direct docker
docker logs mailg-app
```

### Port already in use

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9
```

### Rebuild from scratch

```bash
# Remove old containers and images
docker-compose down --rmi all

# Rebuild
docker-compose up --build
```

### Check health

```bash
# Using docker-compose
docker-compose ps

# Using docker CLI
docker ps
curl http://localhost:3001/api/health
```

---

## Key Changes from Original Dockerfile

### ❌ OLD (Not Working)

- Used nginx
- Exposed port 80
- Only served static files
- No API server

### ✅ NEW (Working)

- Uses Node.js directly
- Exposes ports 3000 & 3001
- Runs both frontend AND API
- Uses PM2 for process management
- No nginx required

---

## Development vs Production

### Development (Local)

```bash
npm run dev
```

Runs Vite dev server + API with hot reload

### Production (Docker)

```bash
docker-compose up
```

Runs built static files + API server

---

## Build Details

1. **Base Image:** `node:18-alpine` (lightweight)
2. **Build Step:** `npm run build` (creates `dist/` folder)
3. **Frontend Server:** `vite preview` (serves built files)
4. **API Server:** `node server.js` (Express server)
5. **Process Manager:** PM2 (keeps both processes running)

---

## Monitoring

### View PM2 processes inside container

```bash
# Enter container
docker exec -it mailg-app sh

# View PM2 status
pm2 status

# View logs
pm2 logs

# Exit container
exit
```

---

## Cleaning Up

```bash
# Stop and remove everything
docker-compose down --volumes --rmi all

# Or manually
docker stop mailg-app
docker rm mailg-app
docker rmi mailg
```

---

## Notes

- The container includes both development and production dependencies because we need to build the frontend
- PM2 ensures both servers restart if they crash
- Health check monitors API server availability
- Frontend is built during image creation for faster startup
- No nginx means simpler architecture and easier debugging
- Use Docker Compose if necessary
