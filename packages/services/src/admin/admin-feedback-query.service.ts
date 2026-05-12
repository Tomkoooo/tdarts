import mongoose from 'mongoose';
import { connectMongo, FeedbackModel } from '@tdarts/core';

export type AdminFeedbackListRow = {
  _id: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  email: string;
  isReadByAdmin: boolean;
  requestId?: string;
  createdAt: string;
};

export class AdminFeedbackQueryService {
  static async list(params: {
    status?: string;
    priority?: string;
    unreadAdmin?: boolean;
    page: number;
    limit: number;
  }): Promise<{ total: number; rows: AdminFeedbackListRow[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};
    if (params.status && params.status !== 'all') match.status = params.status;
    if (params.priority && params.priority !== 'all') match.priority = params.priority;
    if (params.unreadAdmin) match.isReadByAdmin = false;

    const [total, docs] = await Promise.all([
      FeedbackModel.countDocuments(match),
      FeedbackModel.find(match)
        .select('title category status priority email isReadByAdmin requestId createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const rows: AdminFeedbackListRow[] = (docs as Record<string, unknown>[]).map((d) => ({
      _id: String(d._id),
      title: String(d.title ?? ''),
      category: String(d.category ?? ''),
      status: String(d.status ?? ''),
      priority: String(d.priority ?? ''),
      email: String(d.email ?? ''),
      isReadByAdmin: Boolean(d.isReadByAdmin),
      requestId: d.requestId ? String(d.requestId) : undefined,
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
    }));

    return { total, rows };
  }

  static async getById(id: string): Promise<Record<string, unknown> | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FeedbackModel.findById(id).lean();
    if (!doc) return null;
    return doc as Record<string, unknown>;
  }
}
