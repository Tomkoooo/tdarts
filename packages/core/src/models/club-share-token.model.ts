import mongoose, { Types } from 'mongoose';

export type ClubShareTokenType = 'selected_tournaments';

export interface ClubShareTokenDocument {
  _id: Types.ObjectId;
  token: string;
  clubId: Types.ObjectId;
  type: ClubShareTokenType;
  tournamentIds: string[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const clubShareTokenSchema = new mongoose.Schema<ClubShareTokenDocument>(
  {
    token: { type: String, required: true, unique: true, index: true },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
    type: { type: String, enum: ['selected_tournaments'], required: true, index: true },
    tournamentIds: [{ type: String, required: true }],
    expiresAt: { type: Date, required: true },
  },
  { collection: 'clubShareTokens', timestamps: true }
);

clubShareTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
clubShareTokenSchema.index({ clubId: 1, type: 1, createdAt: -1 });

export const ClubShareTokenModel =
  mongoose.models.ClubShareToken ||
  mongoose.model<ClubShareTokenDocument>('ClubShareToken', clubShareTokenSchema);
