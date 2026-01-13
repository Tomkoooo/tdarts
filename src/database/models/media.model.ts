import mongoose, { Schema, Document } from 'mongoose';

export interface MediaDocument extends Document {
  clubId?: mongoose.Types.ObjectId;
  uploaderId: mongoose.Types.ObjectId;
  data: Buffer;
  mimeType: string;
  filename?: string;
  size: number;
  hash: string;
  usageCount: number;
  createdAt: Date;
}

const mediaSchema = new Schema<MediaDocument>(
  {
    clubId: { type: Schema.Types.ObjectId, ref: 'Club', default: null },
    uploaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    data: { type: Buffer, required: true },
    mimeType: { type: String, required: true },
    filename: { type: String },
    size: { type: Number, required: true },
    hash: { type: String, required: true, index: true },
    usageCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const MediaModel =
  mongoose.models.Media || mongoose.model<MediaDocument>('Media', mediaSchema);
