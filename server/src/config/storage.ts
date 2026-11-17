import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROOFS_DIR = path.resolve(__dirname, '../../uploads/proofs');

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
  await ensureProofStorageReady();
  const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'webp';
  const fileName = `${sha256Hash.slice(0, 24)}-${Date.now()}.${safeExt}`;
  const absolutePath = path.join(PROOFS_DIR, fileName);
  await fs.writeFile(absolutePath, buffer);
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
