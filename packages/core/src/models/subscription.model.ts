import mongoose, { Schema, Document } from 'mongoose';

export interface SubscriptionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  clubId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<SubscriptionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clubId: { type: Schema.Types.ObjectId, ref: 'Club', required: true },
  },
  { 
    collection: 'subscriptions',
    timestamps: true 
  }
);

// Unique index to prevent duplicate subscriptions
subscriptionSchema.index({ userId: 1, clubId: 1 }, { unique: true });

export const SubscriptionModel =
  mongoose.models.Subscription || mongoose.model<SubscriptionDocument>('Subscription', subscriptionSchema);
