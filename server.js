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
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment variable
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : [];
    
    // In development, allow localhost
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const localhostOrigins = [
      'http://localhost:3000',
      'http://localhost:5173', // Vite default
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];
    
    // Check if origin is allowed
    if (isDevelopment && localhostOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    if (allowedOrigins.length === 0) {
      // If no origins specified in production, allow all (not recommended for production)
      console.warn('⚠️  WARNING: No ALLOWED_ORIGINS set. Allowing all origins.');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/credentials if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import API routes
// const getExpectedStateRoute = require('./src/api/v1/get_expected_state');
// const getActualStateRoute = require('./src/api/v1/get_actual_state');

// API Routes
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
