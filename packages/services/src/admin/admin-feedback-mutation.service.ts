import mongoose from 'mongoose';
import { connectMongo, FeedbackModel } from '@tdarts/core';
import { AdminAuditService } from './admin-audit.service';

export class AdminFeedbackMutationService {
  static async updateStatus(
    actorUserId: string,
    feedbackId: string,
    status: 'pending' | 'in-progress' | 'resolved' | 'rejected' | 'closed',
  ): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(feedbackId)) throw new Error('Invalid id');
    const before = await FeedbackModel.findById(feedbackId).select('status').lean();
    await FeedbackModel.updateOne(
      { _id: feedbackId },
      {
        $set: { status },
        $push: {
          history: {
            action: 'status_change',
            user: new mongoose.Types.ObjectId(actorUserId),
            date: new Date(),
            details: `status → ${status}`,
          },
        },
      },
    );
    await AdminAuditService.logAction(actorUserId, 'feedback.status', { feedbackId, status, before });
  }

  static async addAdminMessage(actorUserId: string, feedbackId: string, content: string, isInternal: boolean): Promise<void> {
    await connectMongo();
    if (!content.trim()) throw new Error('Empty message');
    if (!mongoose.Types.ObjectId.isValid(feedbackId)) throw new Error('Invalid id');
    await FeedbackModel.updateOne(
      { _id: feedbackId },
      {
        $push: {
          messages: {
            sender: new mongoose.Types.ObjectId(actorUserId),
            content: content.trim(),
            createdAt: new Date(),
            isInternal,
          },
          history: {
            action: 'reply',
            user: new mongoose.Types.ObjectId(actorUserId),
            date: new Date(),
            details: isInternal ? 'internal note' : 'reply',
          },
        },
        $set: { isReadByAdmin: true },
      },
    );
    await AdminAuditService.logAction(actorUserId, 'feedback.message', { feedbackId, isInternal });
  }

  static async updateFields(
    actorUserId: string,
    feedbackId: string,
    patch: {
      title?: string;
      category?: string;
      priority?: string;
      status?: string;
      email?: string;
      description?: string;
    },
  ): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(feedbackId)) throw new Error('Invalid id');
    const $set: Record<string, unknown> = {};
    if (typeof patch.title === 'string' && patch.title.trim()) $set.title = patch.title.trim();
    if (typeof patch.category === 'string') $set.category = patch.category;
    if (typeof patch.priority === 'string') $set.priority = patch.priority;
    if (typeof patch.status === 'string') $set.status = patch.status;
    if (typeof patch.email === 'string') $set.email = patch.email.trim();
    if (typeof patch.description === 'string') $set.description = patch.description;
    if (Object.keys($set).length === 0) throw new Error('No changes');
    await FeedbackModel.updateOne({ _id: feedbackId }, { $set });
    await AdminAuditService.logAction(actorUserId, 'feedback.updateFields', { feedbackId, patch });
  }

  static async markAdminRead(actorUserId: string, feedbackId: string, read: boolean): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(feedbackId)) throw new Error('Invalid id');
    await FeedbackModel.updateOne({ _id: feedbackId }, { $set: { isReadByAdmin: read } });
    await AdminAuditService.logAction(actorUserId, 'feedback.read', { feedbackId, read });
  }
}
