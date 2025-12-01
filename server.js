// const express = require('express');
// const cors = require('cors');
// const multer = require('multer');
// const path = require('path');
// require('dotenv').config();
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import getActualStateRoute from './src/api/v1/get_actual_state.js';
import getExpectedStateRoute from './src/api/v1/get_expected_state.js';
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// CORS configuration - simplified since frontend and backend are on same origin
// Still allow CORS for development and external tools
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://lite.mailg.rlgym.turing.com',
      'https://lite.mailg.rlgym.turing.com',
    ];
    
    // Normalize origin (remove trailing slash, handle default ports)
    const normalizedOrigin = origin.replace(/\/$/, '');
    const originWithoutPort = normalizedOrigin.replace(/:(80|443)$/, '');
    
    // Check if origin is allowed (exact match or without default port)
    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '');
      return normalizedOrigin === normalizedAllowed || 
             originWithoutPort === normalizedAllowed.replace(/:(80|443)$/, '');
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Content-Length', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400, // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import API routes
// const getExpectedStateRoute = require('./src/api/v1/get_expected_state');
// const getActualStateRoute = require('./src/api/v1/get_actual_state');

// API Routes - MUST come before static file serving
// Handle preflight OPTIONS requests for CORS
app.options('/api/v1/get_expected_state', cors(corsOptions));
app.options('/api/v1/get_actual_state', cors(corsOptions));

// Wrap async route handlers to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.post('/api/v1/get_expected_state', asyncHandler(getExpectedStateRoute));
app.post('/api/v1/get_actual_state', upload.single('localStorageDump'), asyncHandler(getActualStateRoute));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mailg API server is running' });
});

// Serve static files from the React app build directory
// This must come AFTER API routes so /api/* routes are handled first
const distPath = path.join(__dirname, 'dist');

// Serve static files (only for non-API routes)
app.use((req, res, next) => {
  // Skip static file serving for API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  express.static(distPath)(req, res, next);
});

// Serve index.html for all non-API routes (React Router will handle routing)
app.use((req, res, next) => {
  // Skip if it's an API route (should have been handled above)
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      // If dist folder doesn't exist (development), return error
      if (err.code === 'ENOENT') {
        return res.status(404).send('Frontend not built. Run "npm run build" first.');
      }
      res.status(500).send('Error serving file');
    }
  });
});

// In development, use port 3001 (Vite uses 3000)
// In production, use port 3000 (serves both frontend and API)
const PORT = process.env.PORT || process.env.API_PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001);

const server = app.listen(PORT, () => {
  console.log(`✅ Mailg server running on http://localhost:${PORT}`);
  console.log(`📊 Serving frontend and API from port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 API Endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/v1/get_expected_state`);
  console.log(`   POST http://localhost:${PORT}/api/v1/get_actual_state`);
  console.log(`\n🔄 Server is listening... (press Ctrl+C to stop)`);
});

// Handle errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => {
    process.exit(0);
  });
});

export default app;
