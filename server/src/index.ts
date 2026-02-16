import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

import { env } from './config/env';
import { logger } from './utils/logger';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import warrantyRoutes from './routes/warranty.routes';
import supportRoutes from './routes/support.routes';
import profileRoutes from './routes/profile.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// ─── GLOBAL MIDDLEWARE ───────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(apiLimiter);

// Ensure upload directory exists
const uploadDir = path.resolve(env.STORAGE_LOCAL_PATH);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── HEALTH CHECK ────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API ROUTES ──────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warranty', warrantyRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

// ─── ERROR HANDLING ──────────────────────────────────────────

app.use(errorHandler);

// ─── 404 ─────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ─── START SERVER ────────────────────────────────────────────

app.listen(env.PORT, () => {
  logger.info(`KomfyAz API server running on port ${env.PORT}`, {
    environment: env.NODE_ENV,
  });
});

export default app;
