import mongoose, { Schema, Document } from 'mongoose';

export interface AnnouncementDocument extends Document {
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isActive: boolean;
  showButton: boolean;
  buttonText?: string;
  buttonAction?: string;
  duration: number; // milliszekundumban
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<AnnouncementDocument>({
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  showButton: {
    type: Boolean,
    default: false
  },
  buttonText: {
    type: String,
    maxlength: 50
  },
  buttonAction: {
    type: String,
    maxlength: 200
  },
  duration: {
    type: Number,
    default: 10000, // 10 másodperc alapértelmezetten
    min: 3000, // Minimum 3 másodperc
    max: 60000 // Maximum 1 perc
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Index az aktív és nem lejárt announcement-okhoz
announcementSchema.index({ isActive: 1, expiresAt: 1 });

export const AnnouncementModel = mongoose.models.Announcement || mongoose.model<AnnouncementDocument>('Announcement', announcementSchema);
