import mongoose from 'mongoose';

export interface IEmailTemplate {
  _id: mongoose.Types.ObjectId;
  key: string;
  locale?: 'hu' | 'en' | 'de';
  name: string;
  description: string;
  category: 'tournament' | 'club' | 'feedback' | 'admin' | 'system' | 'auth';
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  isActive: boolean;
  isDefault: boolean;
  lastModified: Date;
  modifiedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new mongoose.Schema<IEmailTemplate>(
  {
    key: {
      type: String,
      required: true,
      index: true,
      default: () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 4; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      }
    },
    locale: {
      type: String,
      enum: ['hu', 'en', 'de'],
      default: 'hu',
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['tournament', 'club', 'feedback', 'admin', 'system', 'auth'],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    htmlContent: {
      type: String,
      required: true,
    },
    textContent: {
      type: String,
      required: true,
    },
    variables: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

EmailTemplateSchema.index({ key: 1, locale: 1 }, { unique: true });

export const EmailTemplateModel =
  (mongoose.models.EmailTemplate as mongoose.Model<IEmailTemplate>) ||
  mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
