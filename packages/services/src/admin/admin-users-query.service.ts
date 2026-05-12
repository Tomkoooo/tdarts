import mongoose from 'mongoose';
import { connectMongo, UserModel } from '@tdarts/core';

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

export class AdminUsersQueryService {
  static async list(params: {
    q?: string;
    page: number;
    limit: number;
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

    const [total, docs] = await Promise.all([
      UserModel.countDocuments(query),
      UserModel.find(query)
        .select(
          'username name email isVerified isAdmin adminRoles authProvider lastLogin isDeleted createdAt updatedAt',
        )
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return { total, rows: (docs as Record<string, unknown>[]).map(toRow) };
  }

  static async getById(userId: string): Promise<AdminUserListRow & { locale?: string; country?: string | null } | null> {
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
    };
  }
}
