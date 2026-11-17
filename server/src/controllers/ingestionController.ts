import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import {
  computeOverallConfidence,
  normalizeMerchantName,
  type IngestExtractResponseDTO,
} from '@claimvault/shared';
import { preprocessUploadedReceipt } from '../services/ai/ocrPreprocessor.js';
import { extractStructuredReceipt } from '../services/ai/structuredExtractor.js';
import { resolvePolicyAndDates } from '../services/ai/policyResolver.js';
import { MerchantProfileModel } from '../models/MerchantProfile.js';
import { VaultItemModel } from '../models/VaultItem.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { AppError } from '../middlewares/errorHandler.js';
import { serializeMerchantProfile, serializeVaultItem } from './serializer.js';
import { scheduleDeadlinesForItem } from '../services/notifications/deadlineScheduler.js';

export async function ingestAndExtract(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const startedAt = Date.now();
  try {
    if (!req.auth) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const rawText = typeof req.body?.rawText === 'string' ? req.body.rawText : '';
    const fileNameHint =
      req.file?.originalname ||
      (typeof req.body?.fileNameHint === 'string' ? req.body.fileNameHint : undefined);
    const allowDuplicate =
      req.body?.allowDuplicate === true || req.body?.allowDuplicate === 'true';
    const captureDurationSeconds = req.body?.captureDurationSeconds
      ? Number(req.body.captureDurationSeconds)
      : undefined;

    if (!req.file && !rawText.trim()) {
      throw new AppError(
        'Provide a receipt image, PDF file, or pasted order text.',
        400,
        'EMPTY_INGESTION_INPUT',
      );
    }

    // Stage 1: Image normalization & SHA-256 hashing
    const t1Start = Date.now();
    const preprocessed = await preprocessUploadedReceipt({
      fileBuffer: req.file?.buffer,
      mimeType: req.file?.mimetype,
      originalName: req.file?.originalname,
      rawText,
    });
    const t1Ms = Date.now() - t1Start;

    // Duplicate receipt check via SHA-256 index
    if (!allowDuplicate) {
      const existingDuplicate = await VaultItemModel.findOne({
        householdId: req.auth.householdId,
        'proofFiles.sha256Hash': preprocessed.sha256Hash,
      });

      if (existingDuplicate) {
        const dto = serializeVaultItem(existingDuplicate);
        const duplicateResponse: IngestExtractResponseDTO = {
          autoCommitted: false,
          duplicateDetected: true,
          duplicateItemId: dto._id,
          item: dto,
          merchantMemoryMatched: Boolean(existingDuplicate.aiMetadata.merchantMemoryApplied),
          merchantProfile: null,
          policyResolution: {
            source: existingDuplicate.aiMetadata.policySource ?? 'FALLBACK_DEFAULT',
            returnWindowDays: existingDuplicate.returnWindowDays,
            warrantyMonths: existingDuplicate.warrantyMonths,
            billingCycle: existingDuplicate.billingCycle,
            preferredAlertChannels: existingDuplicate.alertChannels,
            policyNotes: 'Duplicate receipt detected by SHA-256 cryptographic proof check',
            returnDeadlineISO: dto.dates.returnDeadline,
            warrantyExpiryDateISO: dto.dates.warrantyExpiryDate,
            nextRenewalDateISO: dto.dates.nextRenewalDate,
            cancelByDateISO: dto.dates.cancelByDate,
          },
          lowConfidenceFields: [],
          processingMs: Date.now() - startedAt,
          stages: [
            { key: 'HASHING', label: 'Hashing File', completed: true, durationMs: t1Ms },
            { key: 'READING', label: 'Duplicate Found', completed: true, durationMs: 0 },
            { key: 'DATES_VERIFIED', label: 'Proof Matched', completed: true, durationMs: 0 },
          ],
        };
        res.status(200).json(duplicateResponse);
        return;
      }
    }

    // Stage 2: Parallel Structured Extraction + Household MerchantProfile Preload (<5ms lookup)
    const t2Start = Date.now();
    const [extracted, householdMerchants] = await Promise.all([
      extractStructuredReceipt({
        extractedTextFromFile: preprocessed.extractedTextFromFile,
        ocrReadableImageBuffer: preprocessed.ocrReadableImageBuffer,
        fileNameHint,
      }),
      MerchantProfileModel.find({ householdId: req.auth.householdId }).exec(),
    ]);
    const t2Ms = Date.now() - t2Start;

    const normalizedMerchant = normalizeMerchantName(extracted.extraction.merchantName);
    const matchedProfile =
      householdMerchants.find(
        (m) =>
          m.normalizedMerchantName === normalizedMerchant ||
          normalizedMerchant.includes(m.normalizedMerchantName) ||
          m.normalizedMerchantName.includes(normalizedMerchant),
      ) ?? null;

    // Stage 3: Deterministic Policy & Date Resolver
    const t3Start = Date.now();
    const resolved = resolvePolicyAndDates({
      extraction: extracted.extraction,
      merchantProfile: matchedProfile,
      rawText: extracted.rawOcrText,
    });

    const overallConfidence = computeOverallConfidence(extracted.extraction.fieldConfidence);
    const lowConfidenceFields = Object.entries(extracted.extraction.fieldConfidence)
      .filter(([, score]) => score < 0.9)
      .map(([field]) => field);

    const merchantMemoryMatched = matchedProfile !== null;
    const autoCommitted =
      overallConfidence >= 0.92 &&
      merchantMemoryMatched &&
      lowConfidenceFields.length === 0;

    const token = `${normalizedMerchant.replace(/\s+/g, '-').slice(0, 14) || 'item'}-${crypto.randomBytes(5).toString('hex')}`;

    const vaultItem = await VaultItemModel.create({
      householdId: req.auth.householdId,
      createdBy: req.auth.userId,
      kind: extracted.extraction.kind,
      title: extracted.extraction.title,
      merchantName: extracted.extraction.merchantName,
      normalizedMerchantName: normalizedMerchant || 'merchant',
      category: resolved.resolvedCategory,
      financials: {
        amount: extracted.extraction.purchasePrice,
        currency: resolved.resolvedCurrency,
        paymentMethod: null,
      },
      identifiers: {
        orderNumber: extracted.extraction.identifiers.orderNumber,
        serialNumber: extracted.extraction.identifiers.serialNumber,
        imei: extracted.extraction.identifiers.imei,
        modelCode: extracted.extraction.identifiers.modelCode,
      },
      dates: resolved.dates,
      proofFiles: [
        {
          fileUrl: preprocessed.storedProof.fileUrl,
          mimeType: preprocessed.storedProof.mimeType,
          sha256Hash: preprocessed.storedProof.sha256Hash,
          fileSizeBytes: preprocessed.storedProof.fileSizeBytes,
          uploadedAt: preprocessed.storedProof.uploadedAt,
        },
      ],
      aiMetadata: {
        overallConfidence,
        fieldConfidence: extracted.extraction.fieldConfidence,
        boundingBoxes: extracted.extraction.boundingBoxes,
        rawOcrText: extracted.rawOcrText,
        merchantMemoryApplied: merchantMemoryMatched,
        policySource: resolved.policy.source,
        policyNotes: resolved.policy.policyNotes,
        extractionEngine: extracted.engineUsed,
      },
      alertChannels: resolved.policy.preferredAlertChannels,
      returnWindowDays: resolved.policy.returnWindowDays,
      warrantyMonths: resolved.policy.warrantyMonths,
      billingCycle: resolved.policy.billingCycle,
      status: 'ACTIVE',
      outcome: {
        moneySavedOrRecovered: 0,
        resolvedAt: null,
        resolutionNotes: null,
      },
      publicVerificationToken: token,
      captureDurationSeconds:
        captureDurationSeconds ?? (autoCommitted ? 18 : undefined),
    });

    if (autoCommitted && matchedProfile) {
      matchedProfile.usageCount += 1;
      matchedProfile.lastUsedAt = new Date();
      await matchedProfile.save();
      await scheduleDeadlinesForItem(vaultItem);
    }

    await AuditLogModel.create({
      householdId: req.auth.householdId,
      vaultItemId: vaultItem._id,
      actorUserId: req.auth.userId,
      eventType: 'INGEST_EXTRACTED',
      metadata: {
        autoCommitted,
        merchantMemoryMatched,
        overallConfidence,
        engineUsed: extracted.engineUsed,
        sha256Hash: preprocessed.storedProof.sha256Hash,
      },
    });

    const t3Ms = Date.now() - t3Start;

    const payload: IngestExtractResponseDTO = {
      autoCommitted,
      duplicateDetected: false,
      item: serializeVaultItem(vaultItem),
      merchantMemoryMatched,
      merchantProfile: matchedProfile ? serializeMerchantProfile(matchedProfile) : null,
      policyResolution: resolved.policy,
      lowConfidenceFields,
      processingMs: Date.now() - startedAt,
      stages: [
        { key: 'HASHING', label: 'Hashing File', completed: true, durationMs: t1Ms },
        { key: 'READING', label: 'Reading Receipt', completed: true, durationMs: t2Ms },
        { key: 'DATES_VERIFIED', label: 'Dates Verified', completed: true, durationMs: t3Ms },
      ],
    };

    res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
}
