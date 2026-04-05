import mongoose, { Document, Schema } from 'mongoose';

export interface TodoDocument extends Document {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  category: 'bug' | 'feature' | 'improvement' | 'maintenance' | 'other';
  assignedTo?: mongoose.Types.ObjectId; // userId
  dueDate?: Date;
  tags: string[];
  isPublic: boolean; // Ha true, akkor más adminok is látják
  createdBy: mongoose.Types.ObjectId; // userId
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId; // userId
}

const todoSchema = new Schema<TodoDocument>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  category: {
    type: String,
    enum: ['bug', 'feature', 'improvement', 'maintenance', 'other'],
    default: 'other'
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  dueDate: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexek a gyors kereséshez
todoSchema.index({ status: 1, priority: 1 });
todoSchema.index({ category: 1 });
todoSchema.index({ assignedTo: 1 });
todoSchema.index({ dueDate: 1 });
todoSchema.index({ tags: 1 });
todoSchema.index({ isPublic: 1 });

// Prevent model re-compilation in development
export const TodoModel = mongoose.models.Todo || mongoose.model<TodoDocument>('Todo', todoSchema);
