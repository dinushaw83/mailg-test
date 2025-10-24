# -------- Build Stage --------
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
# Or if using yarn:
# COPY package.json yarn.lock ./

# Install dependencies
RUN npm install
# Or: RUN yarn install

# Copy the rest of the app
COPY . .

# Build the app
RUN npm run build
# Or: RUN yarn build

# -------- Production Stage --------
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output to nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
