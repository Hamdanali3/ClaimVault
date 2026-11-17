import { z } from 'zod';

export const VaultItemKindSchema = z.enum([
  'PHYSICAL_ASSET',
  'SUBSCRIPTION',
  'UTILITY_BILL',
]);
export type VaultItemKind = z.infer<typeof VaultItemKindSchema>;

export const VaultItemStatusSchema = z.enum([
  'ACTIVE',
  'RETURN_INITIATED',
  'RETURNED_REFUNDED',
  'WARRANTY_CLAIMED',
  'SUBSCRIPTION_CANCELLED',
  'EXPIRED',
]);
export type VaultItemStatus = z.infer<typeof VaultItemStatusSchema>;

export const BillingCycleSchema = z.enum(['NONE', 'MONTHLY', 'YEARLY']);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const PlanTierSchema = z.enum(['FREE', 'PRO_HOUSEHOLD', 'SMB_TEAM']);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export const HouseholdRoleSchema = z.enum(['OWNER', 'EDITOR', 'VIEWER']);
export type HouseholdRole = z.infer<typeof HouseholdRoleSchema>;

export const AlertChannelSchema = z.enum(['IN_APP', 'EMAIL', 'WHATSAPP', 'PUSH']);
export type AlertChannel = z.infer<typeof AlertChannelSchema>;

export const BoundingBoxSchema = z.tuple([
  z.number().min(0).max(1),
  z.number().min(0).max(1),
  z.number().min(0).max(1),
  z.number().min(0).max(1),
]);
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const ExtractionIdentifiersSchema = z.object({
  orderNumber: z.string().nullable().default(null),
  serialNumber: z.string().nullable().default(null),
  imei: z.string().nullable().default(null),
  modelCode: z.string().nullable().default(null),
});
export type ExtractionIdentifiers = z.infer<typeof ExtractionIdentifiersSchema>;

export const ExtractionResultSchema = z.object({
  kind: VaultItemKindSchema,
  merchantName: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1).default('Electronics'),
  purchasePrice: z.number().nonnegative(),
  currency: z.string().min(3).max(5).default('PKR'),
  purchaseDateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  identifiers: ExtractionIdentifiersSchema.default({
    orderNumber: null,
    serialNumber: null,
    imei: null,
    modelCode: null,
  }),
  explicitReturnDaysOnReceipt: z.number().int().nonnegative().nullable().default(null),
  explicitWarrantyMonthsOnReceipt: z.number().int().nonnegative().nullable().default(null),
  billingCycle: BillingCycleSchema.default('NONE'),
  fieldConfidence: z.record(z.string(), z.number().min(0).max(1)).default({}),
  boundingBoxes: z.record(z.string(), BoundingBoxSchema).default({}),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export type PolicyResolutionSource =
  | 'MERCHANT_MEMORY'
  | 'RECEIPT_EXPLICIT'
  | 'MERCHANT_KB'
  | 'FALLBACK_DEFAULT';

export const PolicyResolutionSchema = z.object({
  source: z.enum([
    'MERCHANT_MEMORY',
    'RECEIPT_EXPLICIT',
    'MERCHANT_KB',
    'FALLBACK_DEFAULT',
  ]),
  returnWindowDays: z.number().int().nonnegative(),
  warrantyMonths: z.number().int().nonnegative(),
  billingCycle: BillingCycleSchema,
  preferredAlertChannels: z.array(AlertChannelSchema).default(['IN_APP', 'EMAIL']),
  policyNotes: z.string(),
  returnDeadlineISO: z.string().nullable(),
  warrantyExpiryDateISO: z.string().nullable(),
  nextRenewalDateISO: z.string().nullable(),
  cancelByDateISO: z.string().nullable(),
});
export type PolicyResolution = z.infer<typeof PolicyResolutionSchema>;

export interface ProofFileDTO {
  fileUrl: string;
  mimeType: string;
  sha256Hash: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface VaultItemDTO {
  _id: string;
  householdId: string;
  createdBy: string;
  kind: VaultItemKind;
  title: string;
  merchantName: string;
  normalizedMerchantName: string;
  category: string;
  financials: {
    amount: number;
    currency: string;
    paymentMethod?: string | null;
  };
  identifiers: {
    orderNumber: string | null;
    serialNumber: string | null;
    imei: string | null;
    modelCode: string | null;
  };
  dates: {
    purchaseDate: string;
    returnDeadline: string | null;
    warrantyExpiryDate: string | null;
    nextRenewalDate: string | null;
    cancelByDate: string | null;
  };
  proofFiles: ProofFileDTO[];
  aiMetadata: {
    overallConfidence: number;
    fieldConfidence: Record<string, number>;
    boundingBoxes: Record<string, BoundingBox>;
    rawOcrText: string;
    merchantMemoryApplied: boolean;
    policySource?: PolicyResolutionSource;
    policyNotes?: string;
    extractionEngine?: string;
  };
  alertChannels: AlertChannel[];
  status: VaultItemStatus;
  outcome: {
    moneySavedOrRecovered: number;
    resolvedAt: string | null;
    resolutionNotes: string | null;
  };
  publicVerificationToken?: string | null;
  returnWindowDays?: number;
  warrantyMonths?: number;
  billingCycle?: BillingCycle;
  hoursRemaining?: number | null;
  urgencyLevel?: 'CRITICAL' | 'UPCOMING' | 'PROTECTED' | 'RESOLVED';
  nextDeadlineType?: 'RETURN' | 'RENEWAL' | 'WARRANTY' | null;
  nextDeadlineDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantProfileDTO {
  _id: string;
  householdId: string;
  normalizedMerchantName: string;
  displayName: string;
  defaultCategory: string;
  defaultCurrency: string;
  defaultReturnWindowDays: number;
  defaultWarrantyMonths: number;
  defaultBillingCycle: BillingCycle;
  preferredAlertChannels: AlertChannel[];
  usageCount: number;
  lastUsedAt: string;
}

export interface DashboardMetricsDTO {
  moneyAtRiskNext14Days: number;
  moneyAtRiskByCurrency: Record<string, number>;
  totalProtectedAssetValue: number;
  protectedValueByCurrency: Record<string, number>;
  totalMoneySavedOrRecovered: number;
  savedByCurrency: Record<string, number>;
  repeatVelocityAvgSeconds: number;
  firstVisitAvgSeconds: number;
  activeCount: number;
  urgentCount: number;
  resolvedCount: number;
}

export interface DashboardResponseDTO {
  urgentItems: VaultItemDTO[];
  allActiveItems: VaultItemDTO[];
  resolvedItems: VaultItemDTO[];
  merchantProfiles: MerchantProfileDTO[];
  metrics: DashboardMetricsDTO;
  household: {
    _id: string;
    name: string;
    planTier: PlanTier;
    inboundForwardingAlias: string;
    defaultCurrency: string;
    memberCount: number;
  };
}

export interface IngestExtractResponseDTO {
  autoCommitted: boolean;
  duplicateDetected: boolean;
  duplicateItemId?: string;
  item: VaultItemDTO;
  merchantMemoryMatched: boolean;
  merchantProfile: MerchantProfileDTO | null;
  policyResolution: PolicyResolution;
  lowConfidenceFields: string[];
  processingMs: number;
  stages: Array<{
    key: 'HASHING' | 'READING' | 'DATES_VERIFIED';
    label: string;
    completed: boolean;
    durationMs: number;
  }>;
}

export const ConfirmVaultItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  merchantName: z.string().min(1).max(120).optional(),
  kind: VaultItemKindSchema.optional(),
  category: z.string().min(1).max(80).optional(),
  amount: z.number().nonnegative().optional(),
  currency: z.string().min(3).max(5).optional(),
  paymentMethod: z.string().max(80).nullable().optional(),
  purchaseDateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  returnWindowDays: z.number().int().min(0).max(365).optional(),
  warrantyMonths: z.number().int().min(0).max(240).optional(),
  billingCycle: BillingCycleSchema.optional(),
  orderNumber: z.string().max(120).nullable().optional(),
  serialNumber: z.string().max(120).nullable().optional(),
  imei: z.string().max(60).nullable().optional(),
  modelCode: z.string().max(120).nullable().optional(),
  alertChannels: z.array(AlertChannelSchema).min(1).optional(),
  rememberMerchantDefaults: z.boolean().default(true),
  captureDurationSeconds: z.number().nonnegative().max(600).optional(),
});
export type ConfirmVaultItemInput = z.infer<typeof ConfirmVaultItemSchema>;

export const ResolveVaultItemSchema = z.object({
  status: z.enum([
    'RETURN_INITIATED',
    'RETURNED_REFUNDED',
    'WARRANTY_CLAIMED',
    'SUBSCRIPTION_CANCELLED',
  ]),
  moneySavedOrRecovered: z.number().nonnegative().optional(),
  resolutionNotes: z.string().max(500).optional(),
});
export type ResolveVaultItemInput = z.infer<typeof ResolveVaultItemSchema>;

export const RegisterSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  defaultCurrency: z.enum(['PKR', 'USD']).default('PKR'),
  timezone: z.string().default('Asia/Karachi'),
  householdName: z.string().min(2).max(100).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export interface PublicCertificateDTO {
  token: string;
  verified: boolean;
  title: string;
  merchantName: string;
  category: string;
  purchaseDate: string;
  warrantyExpiryDate: string | null;
  warrantyRemainingDays: number | null;
  warrantyStatus: 'ACTIVE' | 'EXPIRED' | 'NO_WARRANTY';
  currency: string;
  originalAmount: number;
  identifiers: {
    modelCode: string | null;
    serialLast4: string | null;
    orderNumberMasked: string | null;
  };
  proofIntegrity: {
    sha256Hash: string | null;
    proofUploadedAt: string | null;
    hashAlgorithm: 'SHA-256';
  };
  issuedAt: string;
}

export function normalizeMerchantName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(pvt|ltd|inc|llc|corp|co|store|mall|official|pakistan|online)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function computeOverallConfidence(fieldConfidence: Record<string, number>): number {
  const coreKeys = ['merchantName', 'title', 'purchasePrice', 'purchaseDateISO'];
  const values = coreKeys
    .map((k) => fieldConfidence[k])
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (values.length === 0) return 0.75;
  const minCore = Math.min(...values);
  const avgCore = values.reduce((sum, v) => sum + v, 0) / values.length;
  return Number((minCore * 0.4 + avgCore * 0.6).toFixed(3));
}
