import mongoose from 'mongoose';
import { connectMongo, UserModel, PlayerModel, SubscriptionModel, ClubModel } from '@tdarts/core';

export type AdminUserListRow = {
  _id: string;
  username: string;
  name: string;
  email: string;
  isVerified: boolean;
  isAdmin: boolean;
  adminRoles: string[];
  authProvider?: string;
  lastLogin: string | null;
  isDeleted: boolean;
  createdAt: string;
};

function toRow(doc: Record<string, unknown>): AdminUserListRow {
  return {
    _id: String(doc._id),
    username: String(doc.username ?? ''),
    name: String(doc.name ?? ''),
    email: String(doc.email ?? ''),
    isVerified: Boolean(doc.isVerified),
    isAdmin: Boolean(doc.isAdmin),
    adminRoles: Array.isArray(doc.adminRoles) ? (doc.adminRoles as string[]) : [],
    authProvider: doc.authProvider ? String(doc.authProvider) : undefined,
    lastLogin: doc.lastLogin instanceof Date ? doc.lastLogin.toISOString() : null,
    isDeleted: Boolean(doc.isDeleted),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
  };
}

const USER_SORT_TO_MONGO: Record<string, string> = {
  email: 'email',
  username: 'username',
  name: 'name',
  lastLogin: 'lastLogin',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  auth: 'authProvider',
};

function resolveUserSort(sort?: { key: string; dir: 'asc' | 'desc' }): Record<string, 1 | -1> {
  if (!sort || !USER_SORT_TO_MONGO[sort.key]) return { updatedAt: -1 };
  const field = USER_SORT_TO_MONGO[sort.key];
  const d = sort.dir === 'asc' ? 1 : -1;
  return { [field]: d };
}

export class AdminUsersQueryService {
  static async list(params: {
    q?: string;
    page: number;
    limit: number;
    sort?: { key: string; dir: 'asc' | 'desc' };
  }): Promise<{ total: number; rows: AdminUserListRow[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    const q = params.q?.trim();
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(esc, 'i');
      query.$or = [{ email: rx }, { username: rx }, { name: rx }];
    }

    const sortSpec = resolveUserSort(params.sort);

    const [total, docs] = await Promise.all([
      UserModel.countDocuments(query),
      UserModel.find(query)
        .select(
          'username name email isVerified isAdmin adminRoles authProvider lastLogin isDeleted createdAt updatedAt',
        )
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return { total, rows: (docs as Record<string, unknown>[]).map(toRow) };
  }

  static async getById(
    userId: string,
  ): Promise<(AdminUserListRow & { locale?: string; country?: string | null; googleId?: string }) | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const doc = await UserModel.findById(userId)
      .select(
        'username name email isVerified isAdmin adminRoles authProvider lastLogin isDeleted createdAt updatedAt locale country googleId profilePicture',
      )
      .lean();
    if (!doc) return null;
    const o = doc as Record<string, unknown>;
    return {
      ...toRow(o),
      locale: o.locale ? String(o.locale) : undefined,
      country: o.country != null ? String(o.country) : null,
      googleId: o.googleId ? String(o.googleId) : undefined,
    };
  }

  static async getUserAdminContext(userId: string): Promise<{
    linkedPlayerId: string | null;
    subscriptionCount: number;
    managedClubsCount: number;
  } | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const uid = new mongoose.Types.ObjectId(userId);
    const [player, subscriptionCount, managedClubsCount] = await Promise.all([
      PlayerModel.findOne({ userRef: uid }).select('_id').lean(),
      SubscriptionModel.countDocuments({ userId: uid }),
      ClubModel.countDocuments({ $or: [{ admin: uid }, { moderators: uid }] }),
    ]);
    const p = player as { _id?: unknown } | null;
    return {
      linkedPlayerId: p?._id ? String(p._id) : null,
      subscriptionCount,
      managedClubsCount,
    };
  }
}
