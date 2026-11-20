import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { ProofBlobModel } from '../models/ProofBlob.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const PROOFS_DIR = isServerless
  ? path.join(os.tmpdir(), 'claimvault-proofs')
  : path.resolve(__dirname, '../../uploads/proofs');

export async function ensureProofStorageReady(): Promise<void> {
  await fs.mkdir(PROOFS_DIR, { recursive: true });
}

export interface StoredProofFile {
  fileUrl: string;
  absolutePath: string;
  mimeType: string;
  fileSizeBytes: number;
}

export async function saveProofBuffer(
  buffer: Buffer,
  sha256Hash: string,
  extension: string,
  mimeType: string,
): Promise<StoredProofFile> {
  const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'webp';
  const fileName = `${sha256Hash.slice(0, 24)}-${Date.now()}.${safeExt}`;
  const absolutePath = path.join(PROOFS_DIR, fileName);

  // Persist durably in MongoDB when connected (critical for stateless Vercel serverless functions)
  if (mongoose.connection.readyState === 1) {
    await ProofBlobModel.findOneAndUpdate(
      { fileName },
      {
        $set: {
          fileName,
          mimeType,
          sha256Hash,
          sizeBytes: buffer.byteLength,
          data: buffer,
        },
      },
      { upsert: true },
    );
  }

  // Also cache on local/tmp filesystem when writable
  try {
    await ensureProofStorageReady();
    await fs.writeFile(absolutePath, buffer);
  } catch (err) {
    if (mongoose.connection.readyState !== 1) {
      throw err;
    }
  }

  return {
    fileUrl: `/uploads/proofs/${fileName}`,
    absolutePath,
    mimeType,
    fileSizeBytes: buffer.byteLength,
  };
}

export function resolveProofFilePath(fileUrl: string): string | null {
  if (!fileUrl.startsWith('/uploads/proofs/')) {
    return null;
  }
  const baseName = path.basename(fileUrl);
  const fullPath = path.resolve(PROOFS_DIR, baseName);
  if (!fullPath.startsWith(PROOFS_DIR)) {
    return null;
  }
  return fullPath;
}

function inferMimeTypeFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/webp';
}

export async function readProofBuffer(
  fileUrl: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!fileUrl.startsWith('/uploads/proofs/')) {
    return null;
  }

  const fileName = path.basename(fileUrl);
  const absPath = resolveProofFilePath(fileUrl);

  // 1. Check local / tmp filesystem cache
  if (absPath) {
    try {
      const diskBuf = await fs.readFile(absPath);
      return { buffer: diskBuf, mimeType: inferMimeTypeFromFileName(fileName) };
    } catch {
      // Fall through to MongoDB durable blob lookup
    }
  }

  // 2. Check durable MongoDB proof_blobs collection
  if (mongoose.connection.readyState === 1) {
    const doc = await ProofBlobModel.findOne({ fileName }).exec();
    if (doc?.data) {
      const buffer = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data);
      return { buffer, mimeType: doc.mimeType || inferMimeTypeFromFileName(fileName) };
    }

    // 3. Self-heal legacy items seeded before MongoDB blob persistence existed
    const { VaultItemModel } = await import('../models/VaultItem.js');
    const matchingItem = await VaultItemModel.findOne({
      'proofFiles.fileUrl': fileUrl,
    }).lean();

    if (matchingItem?.aiMetadata?.rawOcrText) {
      const { renderTextReceiptCardBuffer } = await import('../services/ai/ocrPreprocessor.js');
      const card = await renderTextReceiptCardBuffer(
        matchingItem.aiMetadata.rawOcrText,
        `${matchingItem.merchantName.toUpperCase()} · PROOF ARCHIVE`,
      );
      const primaryProof = matchingItem.proofFiles?.find((p) => p.fileUrl === fileUrl);
      await ProofBlobModel.findOneAndUpdate(
        { fileName },
        {
          $set: {
            fileName,
            mimeType: 'image/webp',
            sha256Hash: primaryProof?.sha256Hash ?? 'rehydrated',
            sizeBytes: card.webpBuffer.byteLength,
            data: card.webpBuffer,
          },
        },
        { upsert: true },
      ).catch(() => undefined);

      return { buffer: card.webpBuffer, mimeType: 'image/webp' };
    }
  }

  return null;
}
