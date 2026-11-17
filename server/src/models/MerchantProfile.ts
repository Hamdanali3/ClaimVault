import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { AlertChannel, BillingCycle } from '@claimvault/shared';

export interface IMerchantProfile extends Document {
  _id: Types.ObjectId;
  householdId: Types.ObjectId;
  normalizedMerchantName: string;
  displayName: string;
  defaultCategory: string;
  defaultCurrency: string;
  defaultReturnWindowDays: number;
  defaultWarrantyMonths: number;
  defaultBillingCycle: BillingCycle;
  preferredAlertChannels: AlertChannel[];
  usageCount: number;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantProfileSchema = new Schema<IMerchantProfile>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true },
    normalizedMerchantName: { type: String, required: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    defaultCategory: { type: String, default: 'Electronics' },
    defaultCurrency: { type: String, default: 'PKR' },
    defaultReturnWindowDays: { type: Number, default: 14, min: 0 },
    defaultWarrantyMonths: { type: Number, default: 12, min: 0 },
    defaultBillingCycle: {
      type: String,
      enum: ['NONE', 'MONTHLY', 'YEARLY'],
      default: 'NONE',
    },
    preferredAlertChannels: {
      type: [String],
      enum: ['IN_APP', 'EMAIL', 'WHATSAPP', 'PUSH'],
      default: ['IN_APP', 'EMAIL'],
    },
    usageCount: { type: Number, default: 1 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'merchant_profiles' },
);

// Compound Unique Index — guarantees <5ms lookup during ingestion
MerchantProfileSchema.index(
  { householdId: 1, normalizedMerchantName: 1 },
  { unique: true },
);

export const MerchantProfileModel = mongoose.model<IMerchantProfile>(
  'MerchantProfile',
  MerchantProfileSchema,
);
