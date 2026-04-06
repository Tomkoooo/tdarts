import mongoose, { Schema, Document } from 'mongoose';

export interface PostDocument extends Document {
  clubId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  images: string[];
  video?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<PostDocument>(
  {
    clubId: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    images: [{ type: String }],
    video: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

postSchema.index({ clubId: 1, createdAt: -1 });

export const PostModel =
  mongoose.models.Post || mongoose.model<PostDocument>('Post', postSchema);
