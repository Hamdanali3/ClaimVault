import type {
  PublicCertificateDTO,
  VaultItemDTO,
  MerchantProfileDTO,
} from '@claimvault/shared';
import type { IVaultItem } from '../models/VaultItem.js';
import type { IMerchantProfile } from '../models/MerchantProfile.js';

const CURRENCY_TO_PKR: Record<string, number> = {
  PKR: 1,
  USD: 278,
  EUR: 300,
  GBP: 352,
  AED: 75.7,
};

export function convertToDisplayPkr(amount: number, currency: string): number {
  const rate = CURRENCY_TO_PKR[currency.toUpperCase()] ?? 1;
  return Math.round(amount * rate);
}

export function getNextDeadlineInfo(
  item: Pick<IVaultItem, 'dates' | 'status'>,
  nowMs = Date.now(),
): {
  nextDeadlineType: VaultItemDTO['nextDeadlineType'];
  nextDeadlineDate: string | null;
  hoursRemaining: number | null;
  urgencyLevel: VaultItemDTO['urgencyLevel'];
} {
  if (
    item.status === 'RETURNED_REFUNDED' ||
    item.status === 'WARRANTY_CLAIMED' ||
    item.status === 'SUBSCRIPTION_CANCELLED'
  ) {
    return {
      nextDeadlineType: null,
      nextDeadlineDate: null,
      hoursRemaining: null,
      urgencyLevel: 'RESOLVED',
    };
  }

  const candidates: Array<{ type: 'RETURN' | 'RENEWAL' | 'WARRANTY'; date: Date }> = [];
  if (item.dates.returnDeadline && item.dates.returnDeadline.getTime() > nowMs) {
    candidates.push({ type: 'RETURN', date: item.dates.returnDeadline });
  }
  if (item.dates.nextRenewalDate && item.dates.nextRenewalDate.getTime() > nowMs) {
    candidates.push({ type: 'RENEWAL', date: item.dates.nextRenewalDate });
  }
  if (item.dates.warrantyExpiryDate && item.dates.warrantyExpiryDate.getTime() > nowMs) {
    candidates.push({ type: 'WARRANTY', date: item.dates.warrantyExpiryDate });
  }

  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());
  const next = candidates[0];
  if (!next) {
    return {
      nextDeadlineType: null,
      nextDeadlineDate: null,
      hoursRemaining: null,
      urgencyLevel: 'PROTECTED',
    };
  }

  const hoursRemaining = Number(
    ((next.date.getTime() - nowMs) / (1000 * 3600)).toFixed(1),
  );
  const urgencyLevel: VaultItemDTO['urgencyLevel'] =
    hoursRemaining <= 48
      ? 'CRITICAL'
      : hoursRemaining <= 14 * 24
        ? 'UPCOMING'
        : 'PROTECTED';

  return {
    nextDeadlineType: next.type,
    nextDeadlineDate: next.date.toISOString(),
    hoursRemaining,
    urgencyLevel,
  };
}

export function serializeVaultItem(item: IVaultItem | (Record<string, unknown> & { _id: unknown })): VaultItemDTO {
  const raw = item as IVaultItem;
  const info = getNextDeadlineInfo({
    dates: {
      purchaseDate: new Date(raw.dates.purchaseDate),
      returnDeadline: raw.dates.returnDeadline ? new Date(raw.dates.returnDeadline) : null,
      warrantyExpiryDate: raw.dates.warrantyExpiryDate
        ? new Date(raw.dates.warrantyExpiryDate)
        : null,
      nextRenewalDate: raw.dates.nextRenewalDate ? new Date(raw.dates.nextRenewalDate) : null,
      cancelByDate: raw.dates.cancelByDate ? new Date(raw.dates.cancelByDate) : null,
    },
    status: raw.status,
  });

  return {
    _id: String(raw._id),
    householdId: String(raw.householdId),
    createdBy: String(raw.createdBy),
    kind: raw.kind,
    title: raw.title,
    merchantName: raw.merchantName,
    normalizedMerchantName: raw.normalizedMerchantName,
    category: raw.category,
    financials: {
      amount: raw.financials.amount,
      currency: raw.financials.currency,
      paymentMethod: raw.financials.paymentMethod ?? null,
    },
    identifiers: {
      orderNumber: raw.identifiers?.orderNumber ?? null,
      serialNumber: raw.identifiers?.serialNumber ?? null,
      imei: raw.identifiers?.imei ?? null,
      modelCode: raw.identifiers?.modelCode ?? null,
    },
    dates: {
      purchaseDate: new Date(raw.dates.purchaseDate).toISOString(),
      returnDeadline: raw.dates.returnDeadline
        ? new Date(raw.dates.returnDeadline).toISOString()
        : null,
      warrantyExpiryDate: raw.dates.warrantyExpiryDate
        ? new Date(raw.dates.warrantyExpiryDate).toISOString()
        : null,
      nextRenewalDate: raw.dates.nextRenewalDate
        ? new Date(raw.dates.nextRenewalDate).toISOString()
        : null,
      cancelByDate: raw.dates.cancelByDate
        ? new Date(raw.dates.cancelByDate).toISOString()
        : null,
    },
    proofFiles: (raw.proofFiles ?? []).map((p) => ({
      fileUrl: p.fileUrl,
      mimeType: p.mimeType,
      sha256Hash: p.sha256Hash,
      fileSizeBytes: p.fileSizeBytes,
      uploadedAt: new Date(p.uploadedAt).toISOString(),
    })),
    aiMetadata: {
      overallConfidence: raw.aiMetadata?.overallConfidence ?? 0.9,
      fieldConfidence: raw.aiMetadata?.fieldConfidence ?? {},
      boundingBoxes: raw.aiMetadata?.boundingBoxes ?? {},
      rawOcrText: raw.aiMetadata?.rawOcrText ?? '',
      merchantMemoryApplied: Boolean(raw.aiMetadata?.merchantMemoryApplied),
      policySource: raw.aiMetadata?.policySource,
      policyNotes: raw.aiMetadata?.policyNotes,
      extractionEngine: raw.aiMetadata?.extractionEngine,
    },
    alertChannels: raw.alertChannels ?? ['IN_APP', 'EMAIL'],
    status: raw.status,
    outcome: {
      moneySavedOrRecovered: raw.outcome?.moneySavedOrRecovered ?? 0,
      resolvedAt: raw.outcome?.resolvedAt ? new Date(raw.outcome.resolvedAt).toISOString() : null,
      resolutionNotes: raw.outcome?.resolutionNotes ?? null,
    },
    publicVerificationToken: raw.publicVerificationToken ?? null,
    returnWindowDays: raw.returnWindowDays,
    warrantyMonths: raw.warrantyMonths,
    billingCycle: raw.billingCycle,
    hoursRemaining: info.hoursRemaining,
    urgencyLevel: info.urgencyLevel,
    nextDeadlineType: info.nextDeadlineType,
    nextDeadlineDate: info.nextDeadlineDate,
    createdAt: new Date(raw.createdAt).toISOString(),
    updatedAt: new Date(raw.updatedAt).toISOString(),
  };
}

export function serializeMerchantProfile(profile: IMerchantProfile): MerchantProfileDTO {
  return {
    _id: String(profile._id),
    householdId: String(profile.householdId),
    normalizedMerchantName: profile.normalizedMerchantName,
    displayName: profile.displayName,
    defaultCategory: profile.defaultCategory,
    defaultCurrency: profile.defaultCurrency,
    defaultReturnWindowDays: profile.defaultReturnWindowDays,
    defaultWarrantyMonths: profile.defaultWarrantyMonths,
    defaultBillingCycle: profile.defaultBillingCycle,
    preferredAlertChannels: profile.preferredAlertChannels,
    usageCount: profile.usageCount,
    lastUsedAt: new Date(profile.lastUsedAt).toISOString(),
  };
}

export function serializePublicCertificate(item: IVaultItem): PublicCertificateDTO {
  const nowMs = Date.now();
  const warrantyDate = item.dates.warrantyExpiryDate;
  let warrantyRemainingDays: number | null = null;
  let warrantyStatus: PublicCertificateDTO['warrantyStatus'] = 'NO_WARRANTY';

  if (warrantyDate) {
    const diffDays = Math.ceil((warrantyDate.getTime() - nowMs) / (1000 * 3600 * 24));
    warrantyRemainingDays = Math.max(0, diffDays);
    warrantyStatus = diffDays > 0 ? 'ACTIVE' : 'EXPIRED';
  }

  const serial = item.identifiers?.serialNumber;
  const order = item.identifiers?.orderNumber;
  const primaryProof = item.proofFiles?.[0];

  return {
    token: item.publicVerificationToken ?? '',
    verified: true,
    title: item.title,
    merchantName: item.merchantName,
    category: item.category,
    purchaseDate: item.dates.purchaseDate.toISOString(),
    warrantyExpiryDate: warrantyDate ? warrantyDate.toISOString() : null,
    warrantyRemainingDays,
    warrantyStatus,
    currency: item.financials.currency,
    originalAmount: item.financials.amount,
    identifiers: {
      modelCode: item.identifiers?.modelCode ?? null,
      serialLast4: serial ? `••••${serial.slice(-4)}` : null,
      orderNumberMasked: order ? `••••${order.slice(-4)}` : null,
    },
    proofIntegrity: {
      sha256Hash: primaryProof?.sha256Hash ?? null,
      proofUploadedAt: primaryProof ? primaryProof.uploadedAt.toISOString() : null,
      hashAlgorithm: 'SHA-256',
    },
    issuedAt: new Date().toISOString(),
  };
}
