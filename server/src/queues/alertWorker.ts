import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { runDeadlineSweeperPass } from '../services/notifications/deadlineScheduler.js';

let redisConnection: Redis | null = null;
let alertQueue: Queue | null = null;
let alertWorker: Worker | null = null;
let inProcessTimer: NodeJS.Timeout | null = null;

export async function startDeadlineAlertWorker(): Promise<{ mode: 'bullmq-redis' | 'in-process-cron' }> {
  if (env.REDIS_URL) {
    try {
      redisConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
      alertQueue = new Queue('claimvault-deadline-alerts', {
        connection: redisConnection as unknown as never,
      });

      alertWorker = new Worker(
        'claimvault-deadline-alerts',
        async () => {
          await runDeadlineSweeperPass();
        },
        { connection: redisConnection as unknown as never },
      );

      await alertQueue.add(
        'deadline-sweep',
        {},
        {
          repeat: { every: 15 * 60 * 1000 },
          removeOnComplete: true,
          removeOnFail: 25,
        },
      );

      return { mode: 'bullmq-redis' };
    } catch {
      // Fall back to deterministic in-process cron scheduler
    }
  }

  // Deterministic in-process sweeper every 15 minutes + initial warm pass
  if (!inProcessTimer && env.NODE_ENV !== 'test') {
    inProcessTimer = setInterval(() => {
      void runDeadlineSweeperPass().catch(() => {});
    }, 15 * 60 * 1000);
    inProcessTimer.unref();
  }

  return { mode: 'in-process-cron' };
}

export async function stopDeadlineAlertWorker(): Promise<void> {
  if (inProcessTimer) {
    clearInterval(inProcessTimer);
    inProcessTimer = null;
  }
  if (alertWorker) {
    await alertWorker.close();
    alertWorker = null;
  }
  if (alertQueue) {
    await alertQueue.close();
    alertQueue = null;
  }
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
