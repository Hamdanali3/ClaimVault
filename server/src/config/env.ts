import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().optional().default(''),
  REDIS_URL: z.string().optional().default(''),
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
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  S3_BUCKET: z.string().optional().default(''),
  S3_REGION: z.string().optional().default(''),
  WHATSAPP_WEBHOOK_URL: z.string().optional().default(''),
  SMTP_URL: z.string().optional().default(''),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export const env: AppEnv = EnvSchema.parse(process.env);
