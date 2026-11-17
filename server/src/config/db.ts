import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let memoryServer: { stop: () => Promise<boolean>; getUri: () => string } | null = null;
let connectedMode: 'atlas' | 'memory-server' = 'atlas';

export function getDatabaseMode(): 'atlas' | 'memory-server' {
  return connectedMode;
}

export async function connectDatabase(overrideUri?: string): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const requestedUri = (overrideUri ?? env.MONGODB_URI).trim();
  const useEmbedded = !requestedUri || requestedUri === 'memory';

  let uriToConnect = requestedUri;

  if (useEmbedded) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const isTest = env.NODE_ENV === 'test';
    if (!isTest) {
      const dbPath = path.resolve(__dirname, '../../.mongodb-local');
      fs.mkdirSync(dbPath, { recursive: true });
      try {
        memoryServer = await MongoMemoryServer.create({
          instance: {
            dbPath,
            storageEngine: 'wiredTiger',
            dbName: 'claimvault',
          },
        });
      } catch {
        // Fallback to pure ephemeral memory if local lockfile or binary path conflicts
        memoryServer = await MongoMemoryServer.create({
          instance: { dbName: 'claimvault' },
        });
      }
    } else {
      memoryServer = await MongoMemoryServer.create({
        instance: { dbName: 'claimvault_test' },
      });
    }
    uriToConnect = memoryServer.getUri();
    connectedMode = 'memory-server';
  } else {
    connectedMode = 'atlas';
  }

  await mongoose.connect(uriToConnect, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 8000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

/**
 * Executes a callback inside a Mongoose session/transaction when connected to a replica set
 * (e.g., MongoDB Atlas), and seamlessly executes directly on standalone MongoDB instances
 * (such as local dev mongod or standalone MongoMemoryServer) without throwing IllegalOperation.
 */
export async function runWithOptionalTransaction<T>(
  work: (session: mongoose.ClientSession | null) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: number }).code;
    if (
      code === 20 ||
      message.includes('Transaction numbers are only allowed on a replica set') ||
      message.includes('sessions are not supported')
    ) {
      return await work(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}
