import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IRefreshTokenRecord {
  tokenHash: string;
  expiresAt: Date;
  deviceInfo: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  passwordHash: string;
  defaultCurrency: 'PKR' | 'USD';
  timezone: string;
  activeHouseholdId: Types.ObjectId;
  refreshTokens: IRefreshTokenRecord[];
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshTokenRecord>(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    deviceInfo: { type: String, default: 'Web Client' },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    defaultCurrency: { type: String, enum: ['PKR', 'USD'], default: 'PKR' },
    timezone: { type: String, default: 'Asia/Karachi' },
    activeHouseholdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true },
    refreshTokens: { type: [RefreshTokenSchema], default: [] },
  },
  { timestamps: true, collection: 'users' },
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
