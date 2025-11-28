# Use Node.js LTS version
FROM node:18-alpine

WORKDIR /app

# Copy package files (lockfile recommended)
COPY package*.json ./

# Reproducible install (installs dev deps as well so we can build)
RUN npm ci --include=dev

# Copy application files
COPY . .

RUN npm run build

# Set production env after build
ENV NODE_ENV=production

# Install global tools: pm2 to manage processes, serve to serve static dist
RUN npm install -g pm2 serve

# Expose ports
EXPOSE 3000 3001

# Create a wrapper script for serve command
RUN cat > serve-frontend.sh <<'EOF'
#!/bin/sh
exec serve -s dist -l tcp://0.0.0.0:3000
EOF
RUN chmod +x serve-frontend.sh

# Create PM2 ecosystem config (CommonJS)
RUN cat > ecosystem.config.cjs <<'EOF'
module.exports = {
  apps: [
    {
      name: 'frontend',
      script: '/app/serve-frontend.sh',
      interpreter: '/bin/sh',
      cwd: '/app',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'api',
      script: 'server.js',
      cwd: '/app',
      env: { NODE_ENV: 'production', PORT: 3001 }
    }
  ]
};
EOF

# Start both servers using PM2 in foreground (pm2-runtime keeps container alive)
CMD ["pm2-runtime", "ecosystem.config.cjs"]
