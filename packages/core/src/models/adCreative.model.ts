import mongoose, { Document, Schema } from 'mongoose';

export type AdCreativeMediaSourceType = 'media_id' | 'external_url';

export interface AdCreativeDocument extends Document {
  campaignId: mongoose.Types.ObjectId;
  name: string;
  viewType: 'block' | 'landscape' | 'popup' | 'inline';
  title: string;
  bodyText?: string;
  ctaLabel?: string;
  destinationUrl: string;
  mediaSource: {
    type: AdCreativeMediaSourceType;
    mediaId?: mongoose.Types.ObjectId;
    externalUrl?: string;
  };
  accessibility: {
    altText: string;
    ariaLabel?: string;
  };
  isActive: boolean;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}

const adCreativeSchema = new Schema<AdCreativeDocument>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'AdCampaign', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 140 },
    viewType: {
      type: String,
      required: true,
      enum: ['block', 'landscape', 'popup', 'inline'],
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    bodyText: { type: String, default: '', maxlength: 400 },
    ctaLabel: { type: String, default: '', maxlength: 60 },
    destinationUrl: { type: String, required: true, trim: true },
    mediaSource: {
      type: {
        type: String,
        required: true,
        enum: ['media_id', 'external_url'],
      },
      mediaId: { type: Schema.Types.ObjectId, ref: 'Media', default: null },
      externalUrl: { type: String, default: '' },
    },
    accessibility: {
      altText: { type: String, required: true, trim: true, maxlength: 220 },
      ariaLabel: { type: String, default: '', maxlength: 220 },
    },
    isActive: { type: Boolean, default: true, index: true },
    weight: { type: Number, default: 1, min: 0, max: 10000 },
  },
  { timestamps: true }
);

adCreativeSchema.index({ campaignId: 1, viewType: 1, isActive: 1 });

export const AdCreativeModel =
  mongoose.models.AdCreative || mongoose.model<AdCreativeDocument>('AdCreative', adCreativeSchema);
