import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { defaultLimiter } from './middleware/rateLimit';

// Routes
import paymentsRouter from './api/payments';
import membershipsRouter from './api/memberships';
import earningsRouter from './api/earnings';
import withdrawalsRouter from './api/withdrawals';
import pointsRouter from './api/points';
import uploadsRouter from './api/uploads';
import webhooksRouter from './api/webhooks';
import debugRouter from './api/debug';
import subscriptionsRouter from './api/subscriptions';

const app = express();

// Security headers
app.use(helmet());

// CORS — restrict to known origin in production
app.use(
  cors({
    origin: config.isProduction
      ? [config.frontendUrl]
      : [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

// Webhook routes need raw body for signature verification — mount BEFORE json parser
app.use('/webhooks', express.raw({ type: 'application/json' }), (req, _res, next) => {
  if (Buffer.isBuffer(req.body)) {
    req.body = JSON.parse(req.body.toString());
  }
  next();
});

// Body parsing for the rest
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging + default rate limit
app.use(requestLogger);
app.use(defaultLimiter);

// Info route
app.get('/', (_req, res) => {
  res.json({
    name: 'LavLay API',
    version: '1.0.0',
    status: 'running',
    environment: config.env,
  });
});

// Health check (no auth, not rate-limited)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// API routes
app.use('/api/payments', paymentsRouter);
app.use('/api/memberships', membershipsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/earnings', earningsRouter);
app.use('/api/withdrawals', withdrawalsRouter);
app.use('/api/points', pointsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/debug', debugRouter);

// Webhook routes (no auth)
app.use('/webhooks', webhooksRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Frontend URL: ${config.frontendUrl}`);
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force exit after 10s if connections don't drain
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason);
});

export default app;
