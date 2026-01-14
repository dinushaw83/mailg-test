// server.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import getActualStateRoute from './src/api/v1/get_actual_state.js';
import getExpectedStateRoute from './src/api/v1/get_expected_state.js';

dotenv.config();

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// ----------------------
// CORS configuration
// ----------------------
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow tools/postman/same-origin

    const allowedOrigins = [
      /^http:\/\/localhost:\d+$/,    // any localhost port
      /^http:\/\/127\.0\.0\.1:\d+$/, // any 127.0.0.1 port
      'http://lite.mailg.rlgym.turing.com',
      'https://aws-gmail-staging.turing.com',
    ];

    const isAllowed = allowedOrigins.some((allowed) =>
      allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
    );

    if (isAllowed) callback(null, true);
    else callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
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
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 204,
};

// ----------------------
// Middleware
// ----------------------
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------
// API Routes
// ----------------------
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.options('/api/v1/get_expected_state', cors(corsOptions));
app.options('/api/v1/get_actual_state', cors(corsOptions));

app.post('/api/v1/get_expected_state', asyncHandler(getExpectedStateRoute));
app.post('/api/v1/get_actual_state', upload.single('localStorageDump'), asyncHandler(getActualStateRoute));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mailg API server is running' });
});

// Config endpoint to expose backend API URL to frontend
// Note: Using /config instead of /api/config to avoid routing to backend
app.get('/config', (req, res) => {
  // Read API URL from environment variable, with fallback for local development
  const apiUrl = process.env.BACKEND_API_URL || process.env.API_URL || 'http://localhost:8766/api';
  res.json({ 
    apiUrl,
    // Include other config if needed in the future
  });
});

// ----------------------
// Serve Frontend
// ----------------------
const distPath = path.join(__dirname, 'dist');

// Serve static files first
app.use(express.static(distPath));

// For all non-API routes, serve index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      if (err.code === 'ENOENT') return res.status(404).send('Frontend not built.');
      res.status(500).send('Error serving frontend');
    }
  });
});

// ----------------------
// Start server
// ----------------------
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

server.on('error', (err) => console.error('Server error:', err));

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => process.exit(0));
});

export default app;
