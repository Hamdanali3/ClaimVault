import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { getDatabaseMode } from './config/db.js';
import { PROOFS_DIR } from './config/storage.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import v1Router from './routes/v1/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): express.Express {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (
          origin === env.CLIENT_URL ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:')
        ) {
          return cb(null, true);
        }
        return cb(null, false);
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'claimvault-api',
      databaseMode: getDatabaseMode(),
      aiProviderConfigured: Boolean(env.GEMINI_API_KEY || env.OPENAI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/uploads/proofs', express.static(PROOFS_DIR));
  app.use('/api/v1', apiRateLimiter, v1Router);

  // Serve built client bundle in production when present
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        next();
        return;
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
