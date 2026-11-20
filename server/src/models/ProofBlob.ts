import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IProofBlob extends Document {
  fileName: string;
  mimeType: string;
  sha256Hash: string;
  sizeBytes: number;
  data: Buffer;
  createdAt: Date;
}

const ProofBlobSchema = new Schema<IProofBlob>(
  {
    fileName: { type: String, required: true, unique: true, index: true },
    mimeType: { type: String, required: true },
    sha256Hash: { type: String, required: true, index: true },
    sizeBytes: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'proof_blobs' },
);

export const ProofBlobModel: Model<IProofBlob> =
  (mongoose.models.ProofBlob as Model<IProofBlob> | undefined) ??
  mongoose.model<IProofBlob>('ProofBlob', ProofBlobSchema);
