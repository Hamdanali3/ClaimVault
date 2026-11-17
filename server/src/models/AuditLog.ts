import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type AuditEventType =
  | 'INGEST_EXTRACTED'
  | 'ITEM_CONFIRMED'
  | 'ITEM_RESOLVED'
  | 'ITEM_RESTORED'
  | 'CLAIM_PDF_EXPORTED'
  | 'REMINDER_SCHEDULED'
  | 'REMINDER_DISPATCHED'
  | 'REMINDER_CANCELLED'
  | 'VERIFY_CERTIFICATE_VIEWED';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  householdId: Types.ObjectId;
  vaultItemId?: Types.ObjectId;
  actorUserId?: Types.ObjectId;
  eventType: AuditEventType;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: 'Household', required: true, index: true },
    vaultItemId: { type: Schema.Types.ObjectId, ref: 'VaultItem', index: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    eventType: {
      type: String,
      required: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' },
);

AuditLogSchema.index({ householdId: 1, eventType: 1, createdAt: -1 });

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
