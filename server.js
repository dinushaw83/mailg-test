// const express = require('express');
// const cors = require('cors');
// const multer = require('multer');
// const path = require('path');
// require('dotenv').config();
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import getActualStateRoute from './src/api/v1/get_actual_state.js';
import getExpectedStateRoute from './src/api/v1/get_expected_state.js';
dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
    if (!origin) {
      console.log('CORS: No origin header, allowing request');
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
      console.log('CORS: Allowing origin:', origin);
      callback(null, true);
    } else {
      // Log for debugging
      console.log('CORS: Blocked origin:', origin);
      console.log('CORS: Allowed origins:', allowedOrigins);
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

// API Routes
// Handle preflight OPTIONS requests for CORS
app.options('/api/v1/get_expected_state', cors(corsOptions));
app.options('/api/v1/get_actual_state', cors(corsOptions));

app.post('/api/v1/get_expected_state', getExpectedStateRoute);
app.post('/api/v1/get_actual_state', upload.single('localStorageDump'), getActualStateRoute);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mailg API server is running' });
});

const PORT = process.env.API_PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`✅ Mailg API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Endpoints:`);
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
