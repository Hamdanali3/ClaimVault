import mongoose from 'mongoose';
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let memoryServer: { stop: () => Promise<boolean>; getUri: () => string } | null = null;
let connectedMode: 'atlas' | 'memory-server' = 'atlas';
let connectPromise: Promise<void> | null = null;

export function getDatabaseMode(): 'atlas' | 'memory-server' {
  return connectedMode;
}

async function ensureSrvDnsResolvable(uri: string): Promise<void> {
  if (!uri.startsWith('mongodb+srv://')) return;
  try {
    const parsed = new URL(uri.replace('mongodb+srv://', 'https://'));
    const srvHost = `_mongodb._tcp.${parsed.hostname}`;
    await Promise.race([
      dns.promises.resolveSrv(srvHost),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SRV DNS probe timeout')), 1500),
      ),
    ]);
  } catch {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
}

async function connectAtlasWithDnsFallback(uri: string): Promise<void> {
  await ensureSrvDnsResolvable(uri);
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const opts: mongoose.ConnectOptions = {
    maxPoolSize: isServerless ? 10 : 20,
    minPoolSize: isServerless ? 0 : 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };
  await mongoose.connect(uri, opts);
}

export async function connectDatabase(overrideUri?: string): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (connectPromise && !overrideUri) {
    return connectPromise;
  }

  const runConnect = async () => {
    if (mongoose.connection.readyState === 1) {
      return;
    }

    const requestedUri = (overrideUri ?? env.MONGODB_URI).trim();
    const useEmbedded = !requestedUri || requestedUri === 'memory';

    if (useEmbedded) {
      if (process.env.VERCEL) {
        throw new Error(
          'MONGODB_URI environment variable is required when running on Vercel.',
        );
      }
      // Indirect specifier prevents serverless bundlers from tracing dev-only mongodb-memory-server
      const memoryPkg = 'mongodb-memory-server';
      const { MongoMemoryServer } = (await import(
        /* @vite-ignore */ memoryPkg
      )) as typeof import('mongodb-memory-server');
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
          memoryServer = await MongoMemoryServer.create({
            instance: { dbName: 'claimvault' },
          });
        }
      } else {
        memoryServer = await MongoMemoryServer.create({
          instance: { dbName: 'claimvault_test' },
        });
      }
      const uriToConnect = memoryServer.getUri();
      connectedMode = 'memory-server';
      await mongoose.connect(uriToConnect, {
        maxPoolSize: 20,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 8000,
      });
      return;
    }

    connectedMode = 'atlas';
    await connectAtlasWithDnsFallback(requestedUri);
  };

  if (overrideUri) {
    await runConnect();
    return;
  }

  connectPromise = runConnect().finally(() => {
    connectPromise = null;
  });
  await connectPromise;
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
