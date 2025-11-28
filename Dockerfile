# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy application files
COPY . .

# Build the Vite frontend
RUN npm run build

# Expose ports
# 3000 - Frontend (Vite preview)
# 3001 - API server
EXPOSE 3000 3001

# Install PM2 to run multiple processes
RUN npm install -g pm2

# Create PM2 ecosystem config
RUN echo "module.exports = { \
  apps: [ \
    { \
      name: 'frontend', \
      script: 'npx', \
      args: 'vite preview --host 0.0.0.0 --port 3000', \
      cwd: '/app' \
    }, \
    { \
      name: 'api', \
      script: 'server.js', \
      cwd: '/app' \
    } \
  ] \
}" > ecosystem.config.js

# Start both servers using PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
