import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { getDatabaseMode } from './config/db.js';
import { getSystemStatus } from './config/systemStatus.js';
import { PROOFS_DIR, readProofBuffer } from './config/storage.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { runDeadlineSweeperPass } from './services/notifications/deadlineScheduler.js';
import v1Router from './routes/v1/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CreateAppOptions {
  initMiddleware?: express.RequestHandler;
}

function isAllowedOrigin(origin: string): boolean {
  if (origin === env.CLIENT_URL) return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    return true;
  }
  if (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) {
    return true;
  }
  if (
    process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    origin === `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  ) {
    return true;
  }
  if (process.env.VERCEL === '1' && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }
  return false;
}

export function createApp(options?: CreateAppOptions): express.Express {
  const app = express();

  // Required behind Vercel / reverse proxies so express-rate-limit reads X-Forwarded-For cleanly
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (isAllowedOrigin(origin)) {
          return cb(null, true);
        }
        return cb(null, false);
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  if (options?.initMiddleware) {
    app.use(options.initMiddleware);
  }

  app.get('/api/health', (_req, res) => {
    const systemStatus = getSystemStatus();
    res.json({
      ok: true,
      service: 'claimvault-api',
      databaseMode: getDatabaseMode(),
      aiProviderConfigured: Boolean(env.GEMINI_API_KEY || env.OPENAI_API_KEY),
      systemStatus,
      timestamp: new Date().toISOString(),
    });
  });

  // Vercel Cron Job endpoint for scheduled deadline reminder sweeps
  app.get('/api/v1/cron/deadline-sweep', async (req, res, next) => {
    try {
      if (env.CRON_SECRET) {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
          res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } });
          return;
        }
      }
      const dispatchedCount = await runDeadlineSweeperPass();
      res.json({
        ok: true,
        dispatchedCount,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  });

  app.use('/uploads/proofs', express.static(PROOFS_DIR));
  app.get('/uploads/proofs/:fileName', async (req, res, next) => {
    try {
      const safeName = path.basename(req.params.fileName);
      const proof = await readProofBuffer(`/uploads/proofs/${safeName}`);
      if (!proof) {
        res.status(404).json({ error: { code: 'PROOF_NOT_FOUND', message: 'Proof file not found' } });
        return;
      }
      res.setHeader('Content-Type', proof.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.send(proof.buffer);
    } catch (err) {
      next(err);
    }
  });

  app.use('/api/v1', apiRateLimiter, v1Router);

  // Serve built client bundle in standalone Node production (outside Vercel CDN)
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (process.env.VERCEL !== '1' && fs.existsSync(clientDist)) {
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
