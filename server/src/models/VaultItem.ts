import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type {
  AlertChannel,
  BillingCycle,
  BoundingBox,
  PolicyResolutionSource,
  VaultItemKind,
  VaultItemStatus,
} from '@claimvault/shared';

export interface IProofFile {
  fileUrl: string;
  mimeType: string;
  sha256Hash: string;
  fileSizeBytes: number;
  uploadedAt: Date;
}

export interface IVaultItem extends Document {
  _id: Types.ObjectId;
  householdId: Types.ObjectId;
  createdBy: Types.ObjectId;
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
    purchaseDate: Date;
    returnDeadline: Date | null;
    warrantyExpiryDate: Date | null;
    nextRenewalDate: Date | null;
    cancelByDate: Date | null;
  };
  proofFiles: IProofFile[];
  aiMetadata: {
    overallConfidence: number;
    fieldConfidence: Record<string, number>;
    boundingBoxes: Record<string, BoundingBox>;
    rawOcrText: string;
    merchantMemoryApplied: boolean;
    policySource: PolicyResolutionSource;
    policyNotes: string;
    extractionEngine: string;
  };
  alertChannels: AlertChannel[];
  returnWindowDays: number;
  warrantyMonths: number;
  billingCycle: BillingCycle;
  status: VaultItemStatus;
  outcome: {
    moneySavedOrRecovered: number;
    resolvedAt: Date | null;
    resolutionNotes: string | null;
  };
  publicVerificationToken?: string;
  captureDurationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProofFileSchema = new Schema<IProofFile>(
  {
    fileUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    sha256Hash: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const VaultItemSchema = new Schema<IVaultItem>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: {
      type: String,
      enum: ['PHYSICAL_ASSET', 'SUBSCRIPTION', 'UTILITY_BILL'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    merchantName: { type: String, required: true, trim: true },
    normalizedMerchantName: { type: String, required: true, lowercase: true, trim: true },
    category: { type: String, default: 'Electronics', trim: true },
    financials: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, default: 'PKR' },
      paymentMethod: { type: String, default: null },
    },
    identifiers: {
      orderNumber: { type: String, default: null },
      serialNumber: { type: String, default: null },
      imei: { type: String, default: null },
      modelCode: { type: String, default: null },
    },
    dates: {
      purchaseDate: { type: Date, required: true },
      returnDeadline: { type: Date, default: null },
      warrantyExpiryDate: { type: Date, default: null },
      nextRenewalDate: { type: Date, default: null },
      cancelByDate: { type: Date, default: null },
    },
    proofFiles: { type: [ProofFileSchema], default: [] },
    aiMetadata: {
      overallConfidence: { type: Number, default: 0.9 },
      fieldConfidence: { type: Schema.Types.Mixed, default: {} },
      boundingBoxes: { type: Schema.Types.Mixed, default: {} },
      rawOcrText: { type: String, default: '' },
      merchantMemoryApplied: { type: Boolean, default: false },
      policySource: {
        type: String,
        enum: ['MERCHANT_MEMORY', 'RECEIPT_EXPLICIT', 'MERCHANT_KB', 'FALLBACK_DEFAULT'],
        default: 'FALLBACK_DEFAULT',
      },
      policyNotes: { type: String, default: '' },
      extractionEngine: { type: String, default: 'hybrid-deterministic-v1' },
    },
    alertChannels: {
      type: [String],
      enum: ['IN_APP', 'EMAIL', 'WHATSAPP', 'PUSH'],
      default: ['IN_APP', 'EMAIL'],
    },
    returnWindowDays: { type: Number, default: 14, min: 0 },
    warrantyMonths: { type: Number, default: 12, min: 0 },
    billingCycle: {
      type: String,
      enum: ['NONE', 'MONTHLY', 'YEARLY'],
      default: 'NONE',
    },
    status: {
      type: String,
      enum: [
        'ACTIVE',
        'RETURN_INITIATED',
        'RETURNED_REFUNDED',
        'WARRANTY_CLAIMED',
        'SUBSCRIPTION_CANCELLED',
        'EXPIRED',
      ],
      default: 'ACTIVE',
    },
    outcome: {
      moneySavedOrRecovered: { type: Number, default: 0 },
      resolvedAt: { type: Date, default: null },
      resolutionNotes: { type: String, default: null },
    },
    publicVerificationToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    captureDurationSeconds: { type: Number, default: undefined },
  },
  { timestamps: true, collection: 'vault_items' },
);

// 1. Deadline Sweeper Index
VaultItemSchema.index({
  status: 1,
  'dates.returnDeadline': 1,
  'dates.warrantyExpiryDate': 1,
  'dates.nextRenewalDate': 1,
});

// 2. Household Dashboard Sort Index
VaultItemSchema.index({
  householdId: 1,
  status: 1,
  'dates.returnDeadline': 1,
});

// 3. Full-Text Search Index
VaultItemSchema.index({
  title: 'text',
  merchantName: 'text',
  'identifiers.serialNumber': 'text',
  'identifiers.orderNumber': 'text',
  'aiMetadata.rawOcrText': 'text',
});

// 4. Duplicate Receipt SHA-256 Guard Index
VaultItemSchema.index({
  householdId: 1,
  'proofFiles.sha256Hash': 1,
});

export const VaultItemModel = mongoose.model<IVaultItem>('VaultItem', VaultItemSchema);
