// Application Insights MUST be initialized before any other require
require('dotenv').config();
const { initTelemetry } = require('./config/telemetry');
initTelemetry();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const { getPool } = require('./config/database');

const app = express();

// ── Security headers
app.use(helmet());

// ── CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// ── Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Stricter limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts' },
});
app.use('/api/auth/', authLimiter);

// ── Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('[http]', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      tenantId: req.tenantId || null,
    });
  });
  next();
});

// ── Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/tenant', require('./routes/tenant'));

// ── Health check (used by Azure App Service and load balancer)
app.get('/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1');
    return res.json({ status: 'healthy', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    logger.error('[health] DB check failed', { error: err.message });
    return res.status(503).json({ status: 'unhealthy', db: 'disconnected' });
  }
});

// ── 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler
app.use((err, req, res, next) => {
  logger.error('[unhandled]', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`[server] Listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = app;
