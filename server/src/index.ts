import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase, getDatabaseMode } from './config/db.js';
import { ensureProofStorageReady } from './config/storage.js';
import { ensureDemoWorkspaceSeeded } from './seed/demoSeeder.js';
import { startDeadlineAlertWorker, stopDeadlineAlertWorker } from './queues/alertWorker.js';
import { createApp } from './app.js';

async function bootstrap(): Promise<void> {
  await ensureProofStorageReady();
  await connectDatabase();
  const seedResult = await ensureDemoWorkspaceSeeded(false);
  const workerInfo = await startDeadlineAlertWorker();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(
      `[ClaimVault API] Listening on http://localhost:${env.PORT} | DB=${getDatabaseMode()} | Worker=${workerInfo.mode} | DemoSeeded=${seedResult.seeded}`,
    );
  });

  const shutdown = async () => {
    await stopDeadlineAlertWorker();
    await disconnectDatabase();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

bootstrap().catch((err) => {
  console.error('[ClaimVault API] Fatal startup error:', err);
  process.exit(1);
});
