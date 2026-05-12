import mongoose, { Document, Schema } from 'mongoose';

export type AdCampaignStatus = 'draft' | 'active' | 'paused' | 'ended';
export type AdViewType = 'block' | 'landscape' | 'popup' | 'inline';
export type AdActorType = 'user' | 'session';

export interface AdCampaignDocument extends Document {
  name: string;
  status: AdCampaignStatus;
  priority: number;
  startAt: Date;
  endAt: Date;
  audienceRoles: string[];
  allowedViewTypes: AdViewType[];
  frequencyCap: {
    maxImpressionsPerActor: number;
    windowHours: number;
  };
  abTest: {
    experimentKey: string;
    variants: Array<{ key: string; weight: number }>;
    stickyScope: AdActorType;
  };
  noFillRate: number;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const adCampaignSchema = new Schema<AdCampaignDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 140 },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'ended'],
      default: 'draft',
      index: true,
    },
    priority: { type: Number, required: true, default: 100, min: 0, max: 100000, index: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    audienceRoles: { type: [String], default: [], index: true },
    allowedViewTypes: {
      type: [String],
      enum: ['block', 'landscape', 'popup', 'inline'],
      default: ['block', 'landscape', 'popup', 'inline'],
      index: true,
    },
    frequencyCap: {
      maxImpressionsPerActor: { type: Number, default: 8, min: 1, max: 1000 },
      windowHours: { type: Number, default: 24, min: 1, max: 24 * 365 },
    },
    abTest: {
      experimentKey: { type: String, default: 'default' },
      variants: {
        type: [{ key: { type: String, required: true }, weight: { type: Number, required: true, min: 0 } }],
        default: [{ key: 'A', weight: 1 }],
      },
      stickyScope: { type: String, enum: ['user', 'session'], default: 'session' },
    },
    noFillRate: { type: Number, default: 0, min: 0, max: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  },
  { timestamps: true }
);

adCampaignSchema.index({ status: 1, startAt: 1, endAt: 1, priority: -1 });

export const AdCampaignModel =
  mongoose.models.AdCampaign || mongoose.model<AdCampaignDocument>('AdCampaign', adCampaignSchema);
