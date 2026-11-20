import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { runDeadlineSweeperPass } from '../services/notifications/deadlineScheduler.js';

let redisConnection: Redis | null = null;
let alertQueue: Queue | null = null;
let alertWorker: Worker | null = null;
let inProcessTimer: NodeJS.Timeout | null = null;
let activeWorkerMode: 'bullmq-redis' | 'in-process-cron' = 'in-process-cron';

export function getWorkerMode(): 'bullmq-redis' | 'in-process-cron' {
  return activeWorkerMode;
}

async function probeRedisReachable(redisUrl: string): Promise<boolean> {
  const probe = new Redis(redisUrl, {
    maxRetriesPerRequest: 0,
    connectTimeout: 3500,
    enableReadyCheck: true,
    retryStrategy: () => null,
    lazyConnect: true,
  });
  probe.on('error', () => {});
  try {
    await Promise.race([
      (async () => {
        await probe.connect();
        await probe.ping();
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis probe timeout (3.5s)')), 3500),
      ),
    ]);
    await probe.quit().catch(() => probe.disconnect());
    return true;
  } catch {
    probe.disconnect();
    return false;
  }
}

export async function startDeadlineAlertWorker(): Promise<{
  mode: 'bullmq-redis' | 'in-process-cron';
}> {
  if (env.REDIS_URL && env.NODE_ENV !== 'test') {
    const reachable = await probeRedisReachable(env.REDIS_URL);
    if (reachable) {
      try {
        const candidateConn = new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: null,
          connectTimeout: 5000,
          keepAlive: 10000,
          retryStrategy: (times) => Math.min(times * 1500, 30000),
        });
        candidateConn.on('error', (err) => {
          console.warn('[ClaimVault Redis] Connection warning:', err.message);
        });

        redisConnection = candidateConn;

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

        alertWorker.on('error', (err) => {
          console.warn('[ClaimVault BullMQ] Worker warning:', err.message);
        });

        await Promise.race([
          alertQueue.add(
            'deadline-sweep',
            {},
            {
              repeat: { every: 15 * 60 * 1000 },
              removeOnComplete: true,
              removeOnFail: 25,
            },
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('BullMQ repeat schedule timeout')), 3500),
          ),
        ]);

        activeWorkerMode = 'bullmq-redis';
        return { mode: 'bullmq-redis' };
      } catch (err) {
        console.warn(
          '[ClaimVault Worker] Redis BullMQ init failed, falling back to in-process cron:',
          err instanceof Error ? err.message : String(err),
        );
        if (alertWorker) await alertWorker.close().catch(() => {});
        if (alertQueue) await alertQueue.close().catch(() => {});
        if (redisConnection) redisConnection.disconnect();
        alertWorker = null;
        alertQueue = null;
        redisConnection = null;
      }
    } else {
      console.warn('[ClaimVault Worker] Redis probe timed out, using in-process cron fallback');
    }
  }

  // Deterministic in-process sweeper every 15 minutes
  if (!inProcessTimer && env.NODE_ENV !== 'test') {
    inProcessTimer = setInterval(() => {
      void runDeadlineSweeperPass().catch(() => {});
    }, 15 * 60 * 1000);
    inProcessTimer.unref();
  }

  activeWorkerMode = 'in-process-cron';
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
    await redisConnection.quit().catch(() => redisConnection?.disconnect());
    redisConnection = null;
  }
}
