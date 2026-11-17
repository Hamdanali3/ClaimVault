import mongoose from 'mongoose';
import { normalizeMerchantName } from '@claimvault/shared';
import { UserModel } from '../models/User.js';
import { HouseholdModel } from '../models/Household.js';
import { MerchantProfileModel } from '../models/MerchantProfile.js';
import { VaultItemModel } from '../models/VaultItem.js';
import { AuditLogModel } from '../models/AuditLog.js';
import {
  computeTextCanonicalSha256,
  hashPasswordArgon2id,
} from '../services/crypto/sha256FileHasher.js';
import { renderTextReceiptCardBuffer } from '../services/ai/ocrPreprocessor.js';
import { saveProofBuffer } from '../config/storage.js';
import { DEMO_USER_EMAIL } from '../middlewares/jwtAuth.js';
import { addDaysUTC, addMonthsUTC } from '../services/ai/policyResolver.js';

async function createSeedProofArtifact(receiptLines: string[], headerLabel: string) {
  const rawText = receiptLines.join('\n');
  const sha256Hash = computeTextCanonicalSha256(rawText);
  const card = await renderTextReceiptCardBuffer(rawText, headerLabel);
  const stored = await saveProofBuffer(card.webpBuffer, sha256Hash, 'webp', 'image/webp');
  return {
    rawText,
    proofFile: {
      fileUrl: stored.fileUrl,
      mimeType: stored.mimeType,
      sha256Hash,
      fileSizeBytes: stored.fileSizeBytes,
      uploadedAt: new Date(),
    },
  };
}

export async function ensureDemoWorkspaceSeeded(forceReset = false): Promise<{
  seeded: boolean;
  householdId: string;
}> {
  let demoUser = await UserModel.findOne({ email: DEMO_USER_EMAIL });
  let demoHousehold = demoUser
    ? await HouseholdModel.findById(demoUser.activeHouseholdId)
    : null;

  if (demoUser && demoHousehold && !forceReset) {
    const existingCount = await VaultItemModel.countDocuments({
      householdId: demoHousehold._id,
    });
    if (existingCount > 0) {
      return { seeded: false, householdId: demoHousehold._id.toString() };
    }
  }

  if (forceReset && demoHousehold) {
    await Promise.all([
      VaultItemModel.deleteMany({ householdId: demoHousehold._id }),
      MerchantProfileModel.deleteMany({ householdId: demoHousehold._id }),
      AuditLogModel.deleteMany({ householdId: demoHousehold._id }),
    ]);
  }

  if (!demoHousehold) {
    const householdId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const passwordHash = await hashPasswordArgon2id('ClaimVaultDemo!2026');

    demoHousehold = await HouseholdModel.create({
      _id: householdId,
      name: 'Hamdan Household Vault',
      planTier: 'PRO_HOUSEHOLD',
      inboundForwardingAlias: 'hamdan.vault@claimvault.app',
      defaultCurrency: 'PKR',
      members: [
        {
          userId,
          role: 'OWNER',
          joinedAt: new Date(),
        },
      ],
    });

    demoUser = await UserModel.create({
      _id: userId,
      fullName: 'Hamdan Ali',
      email: DEMO_USER_EMAIL,
      passwordHash,
      defaultCurrency: 'PKR',
      timezone: 'Asia/Karachi',
      activeHouseholdId: demoHousehold._id,
      refreshTokens: [],
    });
  }

  const now = new Date();
  const in28Hours = new Date(now.getTime() + 28 * 3600 * 1000);
  const ankerPurchase = addDaysUTC(in28Hours, -14);
  const ankerWarrantyEnd = addMonthsUTC(ankerPurchase, 18);

  const in41Hours = new Date(now.getTime() + 41 * 3600 * 1000);
  const cursorPurchase = addMonthsUTC(in41Hours, -1);

  const laptopPurchase = addDaysUTC(now, -44);
  const laptopReturnEnd = addDaysUTC(laptopPurchase, 7);
  const laptopWarrantyEnd = addMonthsUTC(laptopPurchase, 12);

  const sonyPurchase = addDaysUTC(now, -92);
  const sonyReturnEnd = addDaysUTC(sonyPurchase, 30);
  const sonyWarrantyEnd = addMonthsUTC(sonyPurchase, 12);

  // Create real visual receipt proof images for all 4 core items
  const ankerProof = await createSeedProofArtifact(
    [
      'DARAZ MALL OFFICIAL TAX INVOICE',
      `Order #: DZ-994812`,
      `Date: ${ankerPurchase.toISOString().slice(0, 10)}`,
      'Item: Anker Prime 67W GaN Wall Charger',
      'Model: A2669 | 14-Day Daraz Return Policy',
      'Warranty: 18 Months Official Brand Warranty',
      'Total Paid: PKR 9,850',
      'Payment: SadaPay Visa · Verified Seller',
    ],
    'DARAZ MALL · ORDER #DZ-994812',
  );

  const cursorProof = await createSeedProofArtifact(
    [
      'CURSOR (ANYSPHERE INC.) BILLING NOTICE',
      `Trial Started: ${cursorPurchase.toISOString().slice(0, 10)}`,
      'Plan: Cursor Pro Annual Plan Trial',
      `Auto-Renew Scheduled: ${in41Hours.toISOString().slice(0, 10)}`,
      'Recurring Charge: USD 20.00 / month',
      'Invoice Ref: CUR-2026-8814',
      'Cancel before renewal to avoid automatic card charge.',
    ],
    'SAAS TRIAL · AUTO-RENEWAL NOTICE',
  );

  const laptopProof = await createSeedProofArtifact(
    [
      'PAKLAP LAHORE · HAFEEZ CENTER BRANCH',
      `Invoice #: PL-40819`,
      `Purchase Date: ${laptopPurchase.toISOString().slice(0, 10)}`,
      'Item: Lenovo Legion Slim 5 Laptop (16APH8)',
      'Serial No (S/N): PF4X982L',
      'Policy: 7-Day Check Warranty · 12 Months Official Warranty',
      'Total Paid: PKR 345,000',
    ],
    'PAKLAP LAHORE · HARDWARE INVOICE',
  );

  const sonyProof = await createSeedProofArtifact(
    [
      'SONY CENTER PAKISTAN · OFFICIAL RECEIPT',
      `Order #: SNY-55210`,
      `Purchase Date: ${sonyPurchase.toISOString().slice(0, 10)}`,
      'Item: Sony WH-1000XM5 Headphones',
      'Serial No: S01-4829104-XM5',
      'Warranty: 12 Months Sony Official Warranty',
      'Amount Paid: PKR 82,000',
    ],
    'SONY CENTER · RESOLVED CLAIM ARCHIVE',
  );

  // Seed MerchantProfile Memory (Daraz & PakLap)
  await MerchantProfileModel.insertMany([
    {
      householdId: demoHousehold._id,
      normalizedMerchantName: normalizeMerchantName('Daraz Mall'),
      displayName: 'Daraz Mall',
      defaultCategory: 'Electronics & Retail',
      defaultCurrency: 'PKR',
      defaultReturnWindowDays: 14,
      defaultWarrantyMonths: 12,
      defaultBillingCycle: 'NONE',
      preferredAlertChannels: ['IN_APP', 'WHATSAPP', 'EMAIL'],
      usageCount: 3,
      lastUsedAt: ankerPurchase,
    },
    {
      householdId: demoHousehold._id,
      normalizedMerchantName: normalizeMerchantName('PakLap Lahore'),
      displayName: 'PakLap Lahore',
      defaultCategory: 'Laptops & Computing',
      defaultCurrency: 'PKR',
      defaultReturnWindowDays: 7,
      defaultWarrantyMonths: 12,
      defaultBillingCycle: 'NONE',
      preferredAlertChannels: ['IN_APP', 'EMAIL'],
      usageCount: 1,
      lastUsedAt: laptopPurchase,
    },
  ]);

  // Seed 4 VaultItems matching Section 7.4 exactly
  await VaultItemModel.insertMany([
    {
      householdId: demoHousehold._id,
      createdBy: demoUser!._id,
      kind: 'PHYSICAL_ASSET',
      title: 'Anker Prime 67W GaN Wall Charger',
      merchantName: 'Daraz Mall',
      normalizedMerchantName: normalizeMerchantName('Daraz Mall'),
      category: 'Chargers & Audio',
      financials: {
        amount: 9850,
        currency: 'PKR',
        paymentMethod: 'SadaPay Visa',
      },
      identifiers: {
        orderNumber: 'DZ-994812',
        serialNumber: 'ANK-67W-9948',
        imei: null,
        modelCode: 'A2669',
      },
      dates: {
        purchaseDate: ankerPurchase,
        returnDeadline: in28Hours,
        warrantyExpiryDate: ankerWarrantyEnd,
        nextRenewalDate: null,
        cancelByDate: null,
      },
      proofFiles: [ankerProof.proofFile],
      aiMetadata: {
        overallConfidence: 0.98,
        fieldConfidence: {
          merchantName: 0.99,
          title: 0.98,
          purchasePrice: 0.99,
          purchaseDateISO: 0.97,
          orderNumber: 0.98,
        },
        boundingBoxes: {
          merchantName: [0.06, 0.16, 0.62, 0.23],
          orderNumber: [0.06, 0.24, 0.48, 0.30],
          purchaseDateISO: [0.06, 0.31, 0.44, 0.37],
          title: [0.06, 0.39, 0.85, 0.46],
          purchasePrice: [0.06, 0.65, 0.48, 0.72],
        },
        rawOcrText: ankerProof.rawText,
        merchantMemoryApplied: true,
        policySource: 'MERCHANT_MEMORY',
        policyNotes: 'Daraz Mall 14-day return window · 18-month brand warranty',
        extractionEngine: 'gemini-2.5-flash-structured',
      },
      alertChannels: ['IN_APP', 'WHATSAPP', 'EMAIL'],
      returnWindowDays: 14,
      warrantyMonths: 18,
      billingCycle: 'NONE',
      status: 'ACTIVE',
      outcome: {
        moneySavedOrRecovered: 0,
        resolvedAt: null,
        resolutionNotes: null,
      },
      publicVerificationToken: 'anker-prime-67w-dz994812',
      captureDurationSeconds: 18,
    },
    {
      householdId: demoHousehold._id,
      createdBy: demoUser!._id,
      kind: 'SUBSCRIPTION',
      title: 'Cursor Pro Annual Plan Trial',
      merchantName: 'Cursor',
      normalizedMerchantName: normalizeMerchantName('Cursor'),
      category: 'Developer SaaS',
      financials: {
        amount: 20,
        currency: 'USD',
        paymentMethod: 'Virtual USD Card',
      },
      identifiers: {
        orderNumber: 'CUR-2026-8814',
        serialNumber: null,
        imei: null,
        modelCode: 'PRO-ANNUAL-TRIAL',
      },
      dates: {
        purchaseDate: cursorPurchase,
        returnDeadline: null,
        warrantyExpiryDate: null,
        nextRenewalDate: in41Hours,
        cancelByDate: new Date(in41Hours.getTime() - 24 * 3600 * 1000),
      },
      proofFiles: [cursorProof.proofFile],
      aiMetadata: {
        overallConfidence: 0.96,
        fieldConfidence: {
          merchantName: 0.99,
          title: 0.97,
          purchasePrice: 0.96,
          purchaseDateISO: 0.94,
        },
        boundingBoxes: {
          merchantName: [0.06, 0.16, 0.64, 0.23],
          purchaseDateISO: [0.06, 0.24, 0.56, 0.30],
          title: [0.06, 0.32, 0.72, 0.39],
          purchasePrice: [0.06, 0.49, 0.54, 0.56],
        },
        rawOcrText: cursorProof.rawText,
        merchantMemoryApplied: false,
        policySource: 'MERCHANT_KB',
        policyNotes: 'Active auto-renewal guard · T-48h & T-12h reminder armed',
        extractionEngine: 'gemini-2.5-flash-structured',
      },
      alertChannels: ['IN_APP', 'EMAIL', 'WHATSAPP'],
      returnWindowDays: 0,
      warrantyMonths: 0,
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      outcome: {
        moneySavedOrRecovered: 0,
        resolvedAt: null,
        resolutionNotes: null,
      },
      publicVerificationToken: 'cursor-pro-trial-8814',
      captureDurationSeconds: 59,
    },
    {
      householdId: demoHousehold._id,
      createdBy: demoUser!._id,
      kind: 'PHYSICAL_ASSET',
      title: 'Lenovo Legion Slim 5 Laptop',
      merchantName: 'PakLap Lahore',
      normalizedMerchantName: normalizeMerchantName('PakLap Lahore'),
      category: 'Laptops & Computing',
      financials: {
        amount: 345000,
        currency: 'PKR',
        paymentMethod: 'Bank Transfer IBFT',
      },
      identifiers: {
        orderNumber: 'PL-40819',
        serialNumber: 'PF4X982L',
        imei: null,
        modelCode: '16APH8',
      },
      dates: {
        purchaseDate: laptopPurchase,
        returnDeadline: laptopReturnEnd,
        warrantyExpiryDate: laptopWarrantyEnd,
        nextRenewalDate: null,
        cancelByDate: null,
      },
      proofFiles: [laptopProof.proofFile],
      aiMetadata: {
        overallConfidence: 0.97,
        fieldConfidence: {
          merchantName: 0.99,
          title: 0.97,
          purchasePrice: 0.98,
          purchaseDateISO: 0.96,
          serialNumber: 0.97,
        },
        boundingBoxes: {
          merchantName: [0.06, 0.16, 0.72, 0.23],
          orderNumber: [0.06, 0.24, 0.44, 0.30],
          purchaseDateISO: [0.06, 0.32, 0.52, 0.38],
          title: [0.06, 0.40, 0.84, 0.47],
          serialNumber: [0.06, 0.48, 0.56, 0.55],
          purchasePrice: [0.06, 0.65, 0.52, 0.72],
        },
        rawOcrText: laptopProof.rawText,
        merchantMemoryApplied: false,
        policySource: 'MERCHANT_KB',
        policyNotes: 'PakLap 12-month official distributor hardware warranty · Resale Certificate verified',
        extractionEngine: 'gemini-2.5-flash-structured',
      },
      alertChannels: ['IN_APP', 'EMAIL'],
      returnWindowDays: 7,
      warrantyMonths: 12,
      billingCycle: 'NONE',
      status: 'ACTIVE',
      outcome: {
        moneySavedOrRecovered: 0,
        resolvedAt: null,
        resolutionNotes: null,
      },
      publicVerificationToken: 'legion-slim5-pf4x982l-verified',
      captureDurationSeconds: 56,
    },
    {
      householdId: demoHousehold._id,
      createdBy: demoUser!._id,
      kind: 'PHYSICAL_ASSET',
      title: 'Sony WH-1000XM5 Headphones',
      merchantName: 'Sony Center',
      normalizedMerchantName: normalizeMerchantName('Sony'),
      category: 'Audio & Electronics',
      financials: {
        amount: 82000,
        currency: 'PKR',
        paymentMethod: 'Credit Card',
      },
      identifiers: {
        orderNumber: 'SNY-55210',
        serialNumber: 'S01-4829104-XM5',
        imei: null,
        modelCode: 'WH1000XM5/B',
      },
      dates: {
        purchaseDate: sonyPurchase,
        returnDeadline: sonyReturnEnd,
        warrantyExpiryDate: sonyWarrantyEnd,
        nextRenewalDate: null,
        cancelByDate: null,
      },
      proofFiles: [sonyProof.proofFile],
      aiMetadata: {
        overallConfidence: 0.96,
        fieldConfidence: {
          merchantName: 0.98,
          title: 0.97,
          purchasePrice: 0.96,
          purchaseDateISO: 0.95,
          serialNumber: 0.94,
        },
        boundingBoxes: {
          merchantName: [0.06, 0.16, 0.68, 0.23],
          orderNumber: [0.06, 0.24, 0.45, 0.30],
          purchaseDateISO: [0.06, 0.32, 0.50, 0.38],
          title: [0.06, 0.40, 0.76, 0.47],
          serialNumber: [0.06, 0.48, 0.62, 0.55],
          purchasePrice: [0.06, 0.64, 0.52, 0.72],
        },
        rawOcrText: sonyProof.rawText,
        merchantMemoryApplied: false,
        policySource: 'MERCHANT_KB',
        policyNotes: 'Sony 12-month official warranty — resolved via 1-Click Claim Dossier PDF',
        extractionEngine: 'gemini-2.5-flash-structured',
      },
      alertChannels: ['IN_APP', 'EMAIL'],
      returnWindowDays: 30,
      warrantyMonths: 12,
      billingCycle: 'NONE',
      status: 'WARRANTY_CLAIMED',
      outcome: {
        moneySavedOrRecovered: 82000,
        resolvedAt: addDaysUTC(now, -6),
        resolutionNotes: 'Right hinge micro-fracture replaced free under official warranty using ClaimVault PDF dossier.',
      },
      publicVerificationToken: 'sony-xm5-sny55210-claimed',
      captureDurationSeconds: 59,
    },
  ]);

  return { seeded: true, householdId: demoHousehold._id.toString() };
}
