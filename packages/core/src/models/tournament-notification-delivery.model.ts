import mongoose, { Schema, Document, Types } from 'mongoose';

export type TournamentNotificationDeliveryStatus = 'sent' | 'failed' | 'skipped';

export interface TournamentNotificationDeliveryDocument extends Document {
  tournamentCode: string;
  batchId: string;
  playerId: Types.ObjectId;
  playerName?: string;
  userRef?: Types.ObjectId;
  email?: string;
  subject: string;
  language: 'hu' | 'en';
  senderUserId: Types.ObjectId;
  status: TournamentNotificationDeliveryStatus;
  reason?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tournamentNotificationDeliverySchema = new Schema<TournamentNotificationDeliveryDocument>(
  {
    tournamentCode: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true, index: true },
    playerName: { type: String, trim: true },
    userRef: { type: Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, trim: true, lowercase: true },
    subject: { type: String, required: true, trim: true },
    language: { type: String, enum: ['hu', 'en'], required: true },
    senderUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
      required: true,
    },
    reason: { type: String, trim: true, maxlength: 500 },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

tournamentNotificationDeliverySchema.index({ tournamentCode: 1, playerId: 1, createdAt: -1 });
tournamentNotificationDeliverySchema.index({ tournamentCode: 1, createdAt: -1 });

export const TournamentNotificationDeliveryModel =
  mongoose.models.TournamentNotificationDelivery ||
  mongoose.model<TournamentNotificationDeliveryDocument>(
    'TournamentNotificationDelivery',
    tournamentNotificationDeliverySchema
  );
