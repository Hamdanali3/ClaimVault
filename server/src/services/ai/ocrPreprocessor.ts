import sharp from 'sharp';
import { createRequire } from 'node:module';
import {
  computeSha256Hex,
  computeTextCanonicalSha256,
} from '../crypto/sha256FileHasher.js';
import { saveProofBuffer } from '../../config/storage.js';

const require = createRequire(import.meta.url);

export interface PreprocessedInput {
  inputType: 'IMAGE' | 'PDF' | 'TEXT';
  sha256Hash: string;
  normalizedWebpBuffer: Buffer;
  ocrReadableImageBuffer: Buffer | null;
  extractedTextFromFile: string;
  storedProof: {
    fileUrl: string;
    mimeType: string;
    sha256Hash: string;
    fileSizeBytes: number;
    uploadedAt: Date;
  };
  imageDimensions: { width: number; height: number };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates a high-contrast Swiss ledger receipt image from pasted order/SMS text
 * so pasted receipts retain a visual proof card and coordinate bounding boxes.
 */
export async function renderTextReceiptCardBuffer(
  text: string,
  headerLabel = 'DIGITAL ORDER / MESSAGE PROOF',
): Promise<{ pngBuffer: Buffer; webpBuffer: Buffer; width: number; height: number }> {
  const width = 760;
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l, idx, arr) => l.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .slice(0, 26);

  const wrappedLines: string[] = [];
  for (const line of rawLines) {
    if (line.length <= 68) {
      wrappedLines.push(line);
    } else {
      for (let i = 0; i < line.length; i += 68) {
        wrappedLines.push(line.slice(i, i + 68));
      }
    }
  }
  const finalLines = wrappedLines.slice(0, 28);
  const lineHeight = 28;
  const topPad = 104;
  const height = Math.max(460, topPad + finalLines.length * lineHeight + 70);

  const lineSvg = finalLines
    .map((line, index) => {
      const y = topPad + index * lineHeight;
      return `<text x="48" y="${y}" font-family="monospace" font-size="16" fill="#141413">${escapeXml(line)}</text>`;
    })
    .join('\n');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#FAF9F6" />
      <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="8" fill="#FFFFFF" stroke="#E6E4DD" stroke-width="2" />
      <text x="48" y="58" font-family="sans-serif" font-size="13" font-weight="700" letter-spacing="1.5" fill="#615F59">${escapeXml(headerLabel)}</text>
      <line x1="48" y1="74" x2="${width - 48}" y2="74" stroke="#E6E4DD" stroke-width="1.5" stroke-dasharray="4 4" />
      ${lineSvg}
      <line x1="48" y1="${height - 54}" x2="${width - 48}" y2="${height - 54}" stroke="#E6E4DD" stroke-width="1.5" />
      <text x="48" y="${height - 32}" font-family="monospace" font-size="11" fill="#615F59">CLAIMVAULT CRYPTOGRAPHIC PROOF ARCHIVE · SHA-256 VERIFIED</text>
    </svg>
  `;

  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const webpBuffer = await sharp(pngBuffer).webp({ quality: 90 }).toBuffer();
  return { pngBuffer, webpBuffer, width, height };
}

export async function preprocessUploadedReceipt(params: {
  fileBuffer?: Buffer;
  mimeType?: string;
  originalName?: string;
  rawText?: string;
}): Promise<PreprocessedInput> {
  const { fileBuffer, mimeType = '', rawText = '' } = params;

  if (fileBuffer && fileBuffer.byteLength > 0) {
    const sha256Hash = computeSha256Hex(fileBuffer);
    const isPdf =
      mimeType.includes('pdf') ||
      (params.originalName?.toLowerCase().endsWith('.pdf') ?? false);

    if (isPdf) {
      let pdfText = '';
      try {
        // Import internal module directly to avoid pdf-parse's root test-file side effect
        const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
          buf: Buffer,
        ) => Promise<{ text: string }>;
        const parsed = await pdfParse(fileBuffer);
        pdfText = parsed.text?.trim() ?? '';
      } catch {
        pdfText = fileBuffer.toString('utf8').replace(/[^\x20-\x7E\r\n]/g, ' ').trim();
      }

      const combinedText = [rawText.trim(), pdfText].filter(Boolean).join('\n');
      const card = await renderTextReceiptCardBuffer(
        combinedText || `PDF Receipt (${params.originalName ?? 'invoice.pdf'})`,
        'PDF INVOICE ARCHIVE SNAPSHOT',
      );

      // Persist original PDF bytes AND visual preview if needed; store PDF as primary proof
      const storedProof = await saveProofBuffer(
        fileBuffer,
        sha256Hash,
        'pdf',
        'application/pdf',
      );
      // Also save a companion WebP preview right beside or keep visual buffer for OCR
      return {
        inputType: 'PDF',
        sha256Hash,
        normalizedWebpBuffer: card.webpBuffer,
        ocrReadableImageBuffer: card.pngBuffer,
        extractedTextFromFile: combinedText,
        storedProof: {
          fileUrl: storedProof.fileUrl,
          mimeType: storedProof.mimeType,
          sha256Hash,
          fileSizeBytes: storedProof.fileSizeBytes,
          uploadedAt: new Date(),
        },
        imageDimensions: { width: card.width, height: card.height },
      };
    }

    // Image input: auto-rotate EXIF, adaptive contrast normalize for thermal paper, convert to WebP
    const pipeline = sharp(fileBuffer)
      .rotate()
      .resize({ width: 1600, height: 2200, fit: 'inside', withoutEnlargement: true })
      .normalise()
      .sharpen({ sigma: 0.9 });

    const pngBuffer = await pipeline.clone().png().toBuffer();
    const webpBuffer = await pipeline.clone().webp({ quality: 86 }).toBuffer();
    const metadata = await sharp(webpBuffer).metadata();

    const storedProof = await saveProofBuffer(
      webpBuffer,
      sha256Hash,
      'webp',
      'image/webp',
    );

    return {
      inputType: 'IMAGE',
      sha256Hash,
      normalizedWebpBuffer: webpBuffer,
      ocrReadableImageBuffer: pngBuffer,
      extractedTextFromFile: rawText.trim(),
      storedProof: {
        fileUrl: storedProof.fileUrl,
        mimeType: storedProof.mimeType,
        sha256Hash,
        fileSizeBytes: storedProof.fileSizeBytes,
        uploadedAt: new Date(),
      },
      imageDimensions: {
        width: metadata.width ?? 760,
        height: metadata.height ?? 1000,
      },
    };
  }

  // Raw pasted text input (WhatsApp order confirmation, SMS alert, email snippet)
  const cleanText = rawText.trim();
  const sha256Hash = computeTextCanonicalSha256(cleanText);
  const card = await renderTextReceiptCardBuffer(cleanText);
  const storedProof = await saveProofBuffer(
    card.webpBuffer,
    sha256Hash,
    'webp',
    'image/webp',
  );

  return {
    inputType: 'TEXT',
    sha256Hash,
    normalizedWebpBuffer: card.webpBuffer,
    ocrReadableImageBuffer: card.pngBuffer,
    extractedTextFromFile: cleanText,
    storedProof: {
      fileUrl: storedProof.fileUrl,
      mimeType: storedProof.mimeType,
      sha256Hash,
      fileSizeBytes: storedProof.fileSizeBytes,
      uploadedAt: new Date(),
    },
    imageDimensions: { width: card.width, height: card.height },
  };
}
