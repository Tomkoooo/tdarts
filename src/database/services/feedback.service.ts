import { connectMongo } from '@/lib/mongoose';
import { FeedbackModel, FeedbackDocument } from '@/database/models/feedback.model';
import { BadRequestError } from '@/middleware/errorHandle';

export interface CreateFeedbackData {
  category: 'bug' | 'feature' | 'improvement' | 'other';
  title: string;
  description: string;
  email: string;
  page?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  userAgent?: string;
  userId?: string;
}

export interface UpdateFeedbackData {
  status?: 'pending' | 'in-progress' | 'resolved' | 'rejected' | 'closed';
  assignedTo?: string;
  adminNotes?: string;
  resolution?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export class FeedbackService {
  static async createFeedback(feedbackData: CreateFeedbackData): Promise<FeedbackDocument> {
    await connectMongo();
    
    const feedback = new FeedbackModel(feedbackData);
    await feedback.save();
    
    return feedback;
  }

  static async getFeedbackById(feedbackId: string): Promise<FeedbackDocument | null> {
    await connectMongo();
    
    return await FeedbackModel.findById(feedbackId)
      .populate('assignedTo', 'name username')
      .populate('resolvedBy', 'name username')
      .populate('userId', 'name username');
  }

  static async getAllFeedback(filters?: {
    status?: string;
    category?: string;
    priority?: string;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ feedback: FeedbackDocument[]; total: number; page: number; totalPages: number }> {
    await connectMongo();
    
    const query: any = {};
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;
    
    if (filters?.status) query.status = filters.status;
    if (filters?.category) query.category = filters.category;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.assignedTo) query.assignedTo = filters.assignedTo;
    
    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    const [feedback, total] = await Promise.all([
      FeedbackModel.find(query)
        .populate('assignedTo', 'name username')
        .populate('resolvedBy', 'name username')
        .populate('userId', 'name username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      FeedbackModel.countDocuments(query)
    ]);

    return {
      feedback,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async updateFeedback(
    feedbackId: string, 
    updates: UpdateFeedbackData, 
    adminUserId: string
  ): Promise<FeedbackDocument> {
    await connectMongo();
    
    const feedback = await FeedbackModel.findById(feedbackId);
    if (!feedback) {
      throw new BadRequestError('Feedback not found');
    }
    
    // Ha státusz változik, frissítjük a resolvedAt és resolvedBy mezőket
    if (updates.status === 'resolved' && feedback.status !== 'resolved') {
      updates.resolvedAt = new Date();
      updates.resolvedBy = adminUserId;
    }
    
    const updatedFeedback = await FeedbackModel.findByIdAndUpdate(
      feedbackId,
      updates,
      { new: true }
    ).populate('assignedTo', 'name username')
     .populate('resolvedBy', 'name username')
     .populate('userId', 'name username');
    
    if (!updatedFeedback) {
      throw new BadRequestError('Failed to update feedback');
    }
    
    return updatedFeedback;
  }

  static async deleteFeedback(feedbackId: string): Promise<void> {
    await connectMongo();
    
    const result = await FeedbackModel.findByIdAndDelete(feedbackId);
    if (!result) {
      throw new BadRequestError('Feedback not found');
    }
  }

  static async getFeedbackStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    rejected: number;
    closed: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    await connectMongo();
    
    const [total, byStatus, byCategory, byPriority] = await Promise.all([
      FeedbackModel.countDocuments(),
      FeedbackModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      FeedbackModel.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      FeedbackModel.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ])
    ]);
    
    const statusCounts = byStatus.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    
    const categoryCounts = byCategory.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    
    const priorityCounts = byPriority.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    
    return {
      total,
      pending: statusCounts.pending || 0,
      inProgress: statusCounts['in-progress'] || 0,
      resolved: statusCounts.resolved || 0,
      rejected: statusCounts.rejected || 0,
      closed: statusCounts.closed || 0,
      byCategory: categoryCounts,
      byPriority: priorityCounts
    };
  }

  static async getFeedbackByEmail(email: string): Promise<FeedbackDocument[]> {
    await connectMongo();
    
    return await FeedbackModel.find({ email })
      .sort({ createdAt: -1 })
      .populate('assignedTo', 'name username')
      .populate('resolvedBy', 'name username');
  }
}
