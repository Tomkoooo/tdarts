import mongoose, { Schema, Document } from 'mongoose';

export interface FeedbackDocument extends Document {
  category: 'bug' | 'feature' | 'improvement' | 'other';
  title: string;
  description: string;
  email: string;
  page?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  userAgent?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected' | 'closed';
  messages: {
    sender: string; // userId or 'system' or 'admin' 
    content: string;
    createdAt: Date;
    isInternal?: boolean;
    attachment?: string;
  }[];
  isReadByUser: boolean;
  isReadByAdmin: boolean;
  assignedTo?: string; // userId
  adminNotes?: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string; // userId
  userId?: string; // Ha bejelentkezett felhasználó
  createdAt: Date;
  updatedAt: Date;
  history?: {
    action: string;
    user: any;
    date: Date;
    details: string;
  }[];
}

const feedbackSchema = new Schema<FeedbackDocument>({
  category: { 
    type: String, 
    enum: ['bug', 'feature', 'improvement', 'other'], 
    required: true 
  },
  title: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 200 
  },
  description: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 2000 
  },
  email: { 
    type: String, 
    required: true, 
    trim: true 
  },
  page: { 
    type: String, 
    trim: true, 
    maxlength: 100 
  },
  device: { 
    type: String, 
    enum: ['desktop', 'mobile', 'tablet'] 
  },
  browser: { 
    type: String, 
    trim: true 
  },
  userAgent: { 
    type: String, 
    trim: true 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'resolved', 'rejected', 'closed'], 
    default: 'pending' 
  },
  assignedTo: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  adminNotes: { 
    type: String, 
    trim: true, 
    maxlength: 1000 
  },
  resolution: { 
    type: String, 
    trim: true, 
    maxlength: 1000 
  },
  resolvedAt: { 
    type: Date 
  },
  resolvedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // New fields for ticketing system
  messages: {
    type: [{
      sender: { type: Schema.Types.ObjectId, ref: 'User' },
      content: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
      isInternal: { type: Boolean, default: false },
      attachment: { type: String }
    }],
    default: []
  },
  isReadByUser: {
    type: Boolean,
    default: true
  },
  isReadByAdmin: {
    type: Boolean,
    default: false
  },

  history: {
    type: [{
      action: String, // 'status_change', 'reply', 'note', 'create'
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now },
      details: String
    }],
    default: []
  }
}, { timestamps: true });

// Indexek a gyors kereséshez
feedbackSchema.index({ status: 1, priority: 1 });
feedbackSchema.index({ category: 1 });
feedbackSchema.index({ assignedTo: 1 });
feedbackSchema.index({ createdAt: 1 });
feedbackSchema.index({ email: 1 });
feedbackSchema.index({ userId: 1 }); // Index for user tickets
feedbackSchema.index({ isReadByAdmin: 1 }); // For admin dashboard

// Prevent model re-compilation in development
export const FeedbackModel = mongoose.models.Feedback || mongoose.model<FeedbackDocument>('Feedback', feedbackSchema);
