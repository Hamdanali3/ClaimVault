import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../../..');
const serverDir = path.resolve(__dirname, '../..');

// Load .env.local then .env cleanly (without clobbering explicit process.env overrides e.g. in tests)
if (process.env.NODE_ENV !== 'test') {
  for (const candidate of [
    path.join(serverDir, '.env.local'),
    path.join(serverDir, '.env'),
    path.join(rootDir, '.env.local'),
    path.join(rootDir, '.env'),
  ]) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
    }
  }
}

const defaultClientUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:5173';

const defaultStorageDriver = process.env.VERCEL === '1' ? 'mongodb' : 'local';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().default(defaultClientUrl),
  MONGODB_URI: z.string().optional().default(''),
  MONGODB_USERNAME: z.string().optional().default(''),
  MONGODB_PASSWORD: z.string().optional().default(''),
  REDIS_URL: z.string().optional().default(''),
  REDIS_API_account_key: z.string().optional().default(''),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16)
    .default('claimvault-dev-access-secret-key-2026-secure'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16)
    .default('claimvault-dev-refresh-secret-key-2026-secure'),
  GEMINI_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  AI_PRIMARY_PROVIDER: z.enum(['auto', 'gemini', 'openai', 'local']).default('auto'),
  STORAGE_DRIVER: z.enum(['local', 'mongodb', 's3']).default(defaultStorageDriver),
  S3_BUCKET: z.string().optional().default(''),
  S3_REGION: z.string().optional().default(''),
  WHATSAPP_WEBHOOK_URL: z.string().optional().default(''),
  SMTP_URL: z.string().optional().default(''),
  CRON_SECRET: z.string().optional().default(''),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export const env: AppEnv = EnvSchema.parse(process.env);
