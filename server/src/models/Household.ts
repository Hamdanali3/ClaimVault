import mongoose, { Schema, type Document, type Types } from 'mongoose';
import type { HouseholdRole, PlanTier } from '@claimvault/shared';

export interface IHouseholdMember {
  userId: Types.ObjectId;
  role: HouseholdRole;
  joinedAt: Date;
}

export interface IHousehold extends Document {
  _id: Types.ObjectId;
  name: string;
  planTier: PlanTier;
  inboundForwardingAlias: string;
  defaultCurrency: string;
  members: IHouseholdMember[];
  createdAt: Date;
  updatedAt: Date;
}

const HouseholdMemberSchema = new Schema<IHouseholdMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['OWNER', 'EDITOR', 'VIEWER'], default: 'OWNER' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const HouseholdSchema = new Schema<IHousehold>(
  {
    name: { type: String, required: true, trim: true },
    planTier: {
      type: String,
      enum: ['FREE', 'PRO_HOUSEHOLD', 'SMB_TEAM'],
      default: 'PRO_HOUSEHOLD',
    },
    inboundForwardingAlias: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    defaultCurrency: { type: String, default: 'PKR' },
    members: { type: [HouseholdMemberSchema], default: [] },
  },
  { timestamps: true, collection: 'households' },
);

HouseholdSchema.index({ 'members.userId': 1 });

export const HouseholdModel = mongoose.model<IHousehold>('Household', HouseholdSchema);
