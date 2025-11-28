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

// Middleware
app.use(cors());
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

app.listen(PORT, () => {
  console.log(`✅ Mailg API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/v1/get_expected_state`);
  console.log(`   POST http://localhost:${PORT}/api/v1/get_actual_state`);
});

export default app;
