import mongoose from 'mongoose';
import { connectMongo, FeedbackModel, UserModel } from '@tdarts/core';

export type AdminFeedbackThreadItem = {
  id: string;
  role: 'user' | 'staff' | 'system';
  senderLabel: string;
  content: string;
  createdAt: string;
  isInternal?: boolean;
  /** When system message is a status change */
  statusKey?: string;
};

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

function resolveFeedbackSort(sort?: { key: string; dir: 'asc' | 'desc' }): Record<string, 1 | -1> {
  const m: Record<string, string> = {
    title: 'title',
    category: 'category',
    status: 'status',
    priority: 'priority',
    email: 'email',
    created: 'createdAt',
  };
  if (!sort || !m[sort.key]) return { createdAt: -1 };
  const d = sort.dir === 'asc' ? 1 : -1;
  return { [m[sort.key]]: d };
}

export class AdminFeedbackQueryService {
  static async list(params: {
    status?: string;
    priority?: string;
    unreadAdmin?: boolean;
    page: number;
    limit: number;
    sort?: { key: string; dir: 'asc' | 'desc' };
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
        .sort(resolveFeedbackSort(params.sort))
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
    const detail = await AdminFeedbackQueryService.getDetailForAdmin(id);
    return detail;
  }

  static async getDetailForAdmin(id: string): Promise<Record<string, unknown> | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await FeedbackModel.findById(id).lean();
    if (!doc) return null;
    const o = doc as Record<string, unknown>;
    const feedbackUserId = o.userId ? String(o.userId) : null;

    const rawMessages = Array.isArray(o.messages) ? o.messages : [];
    const senderIds = rawMessages
      .map((m) => (m as Record<string, unknown>).sender)
      .filter((s) => s && mongoose.Types.ObjectId.isValid(String(s)))
      .map((s) => new mongoose.Types.ObjectId(String(s)));
    const users =
      senderIds.length > 0
        ? await UserModel.find({ _id: { $in: senderIds } })
            .select('name email username isAdmin')
            .lean()
        : [];
    const userMap = new Map(
      (users as Record<string, unknown>[]).map((u) => [
        String(u._id),
        {
          name: String(u.name || u.username || u.email || 'Staff'),
          email: String(u.email ?? ''),
          isAdmin: Boolean(u.isAdmin),
        },
      ]),
    );

    const thread: AdminFeedbackThreadItem[] = [];

    for (let i = 0; i < rawMessages.length; i++) {
      const m = rawMessages[i] as Record<string, unknown>;
      const sender = String(m.sender ?? '');
      const createdAt =
        m.createdAt instanceof Date
          ? m.createdAt.toISOString()
          : new Date().toISOString();
      if (sender === 'system') {
        thread.push({
          id: `msg-${i}`,
          role: 'system',
          senderLabel: 'Rendszer',
          content: String(m.content ?? ''),
          createdAt,
        });
        continue;
      }
      const isStaff =
        mongoose.Types.ObjectId.isValid(sender) &&
        (userMap.get(sender)?.isAdmin || sender !== feedbackUserId);
      const u = userMap.get(sender);
      thread.push({
        id: `msg-${i}`,
        role: isStaff ? 'staff' : 'user',
        senderLabel: isStaff
          ? u?.name ?? 'Admin'
          : u?.name ?? String(o.email ?? 'Felhasználó'),
        content: String(m.content ?? ''),
        createdAt,
        isInternal: Boolean(m.isInternal),
      });
    }

    const history = Array.isArray(o.history) ? o.history : [];
    for (let i = 0; i < history.length; i++) {
      const h = history[i] as Record<string, unknown>;
      if (String(h.action) !== 'status_change') continue;
      const details = String(h.details ?? '');
      const statusMatch = details.match(/status\s*→\s*(\S+)/i);
      const statusKey = statusMatch?.[1] ?? '';
      const date =
        h.date instanceof Date ? h.date.toISOString() : new Date().toISOString();
      thread.push({
        id: `hist-${i}`,
        role: 'system',
        senderLabel: 'Státusz',
        content: details || 'Státusz változás',
        createdAt: date,
        statusKey,
      });
    }

    thread.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return {
      ...o,
      _id: String(o._id),
      thread,
      messages: rawMessages,
    };
  }
}
