import type { RequestHandler } from 'express';
import { connectDatabase } from './config/db.js';
import { ensureProofStorageReady } from './config/storage.js';
import { ensureDemoWorkspaceSeeded } from './seed/demoSeeder.js';
import { createApp } from './app.js';

let initPromise: Promise<void> | null = null;

async function ensureServerlessInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await ensureProofStorageReady();
      await connectDatabase();
      await ensureDemoWorkspaceSeeded(false);
    })().catch((err) => {
      console.error('[ClaimVault Vercel Init Error]', err);
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

const initMiddleware: RequestHandler = async (_req, _res, next) => {
  try {
    await ensureServerlessInitialized();
    next();
  } catch (err) {
    next(err);
  }
};

const app = createApp({
  initMiddleware,
  ensureInitialized: ensureServerlessInitialized,
});

export default app;
