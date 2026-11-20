import type { SystemStatusDTO } from '@claimvault/shared';
import { env } from './env.js';
import { getDatabaseMode } from './db.js';
import { getWorkerMode } from '../queues/alertWorker.js';

export function getSystemStatus(): SystemStatusDTO {
  let aiMode: SystemStatusDTO['aiMode'] = 'local-hybrid';
  if (env.AI_PRIMARY_PROVIDER !== 'local') {
    if (
      (env.AI_PRIMARY_PROVIDER === 'gemini' || env.AI_PRIMARY_PROVIDER === 'auto') &&
      Boolean(env.GEMINI_API_KEY)
    ) {
      aiMode = 'gemini-vision';
    } else if (
      (env.AI_PRIMARY_PROVIDER === 'openai' || env.AI_PRIMARY_PROVIDER === 'auto') &&
      Boolean(env.OPENAI_API_KEY)
    ) {
      aiMode = 'openai-vision';
    }
  }

  return {
    databaseMode: getDatabaseMode(),
    queueMode: process.env.VERCEL === '1' ? 'vercel-cron' : getWorkerMode(),
    aiMode,
    aiProviders: {
      geminiConfigured: Boolean(env.GEMINI_API_KEY),
      openaiConfigured: Boolean(env.OPENAI_API_KEY),
    },
    storageDriver: env.STORAGE_DRIVER,
    webhooks: {
      whatsappConfigured: Boolean(env.WHATSAPP_WEBHOOK_URL),
      smtpConfigured: Boolean(env.SMTP_URL),
    },
  };
}
