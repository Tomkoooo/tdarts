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

  static async markAdminRead(actorUserId: string, feedbackId: string, read: boolean): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(feedbackId)) throw new Error('Invalid id');
    await FeedbackModel.updateOne({ _id: feedbackId }, { $set: { isReadByAdmin: read } });
    await AdminAuditService.logAction(actorUserId, 'feedback.read', { feedbackId, read });
  }
}
