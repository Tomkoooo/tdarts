
import mongoose, { Schema, Document, Model } from "mongoose";

export interface GalleryDocument extends Document {
  clubId: mongoose.Types.ObjectId;
  name: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const gallerySchema = new Schema<GalleryDocument>(
  {
    clubId: { type: Schema.Types.ObjectId, ref: "Club", required: true },
    name: { type: String, required: true },
    images: [{ type: String }],
  },
  { timestamps: true }
);

export const GalleryModel: Model<GalleryDocument> =
  mongoose.models.Gallery || mongoose.model<GalleryDocument>("Gallery", gallerySchema);
