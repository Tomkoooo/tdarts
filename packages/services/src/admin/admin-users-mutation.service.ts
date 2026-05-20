import mongoose from 'mongoose';
import { connectMongo, UserModel } from '@tdarts/core';
import { AdminAuditService } from './admin-audit.service';

export type AdminUserUpdatePatch = {
  name?: string;
  username?: string;
  email?: string;
  locale?: string;
  country?: string | null;
  isAdmin?: boolean;
  isVerified?: boolean;
  isDeleted?: boolean;
  adminRoles?: string[];
};

export class AdminUsersMutationService {
  static async updateUser(actorUserId: string, targetUserId: string, patch: AdminUserUpdatePatch): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) throw new Error('Invalid user id');
    const before = await UserModel.findById(targetUserId).lean();
    if (!before) throw new Error('User not found');

    const $set: Record<string, unknown> = {};
    if (typeof patch.name === 'string') $set.name = patch.name.trim();
    if (typeof patch.username === 'string') {
      const u = patch.username.trim();
      if (/\s/.test(u)) throw new Error('Username cannot contain spaces');
      $set.username = u;
    }
    if (typeof patch.email === 'string') $set.email = patch.email.trim().toLowerCase();
    if (typeof patch.locale === 'string') $set.locale = patch.locale.trim();
    if (patch.country !== undefined) $set.country = patch.country || null;
    if (typeof patch.isAdmin === 'boolean') $set.isAdmin = patch.isAdmin;
    if (typeof patch.isVerified === 'boolean') $set.isVerified = patch.isVerified;
    if (typeof patch.isDeleted === 'boolean') $set.isDeleted = patch.isDeleted;
    if (Array.isArray(patch.adminRoles)) $set.adminRoles = patch.adminRoles.map((r) => String(r).trim()).filter(Boolean);

    if (Object.keys($set).length === 0) return;

    await UserModel.updateOne({ _id: targetUserId }, { $set });
    await AdminAuditService.logAction(actorUserId, 'user.update', {
      targetUserId,
      patch,
      snapshotBefore: {
        isAdmin: (before as { isAdmin?: boolean }).isAdmin,
        isVerified: (before as { isVerified?: boolean }).isVerified,
        isDeleted: (before as { isDeleted?: boolean }).isDeleted,
        adminRoles: (before as { adminRoles?: string[] }).adminRoles,
      },
    });
  }

  /** Sets local password (hashed by User schema pre-save). OAuth-only accounts can receive a password to enable local login. */
  static async setPassword(actorUserId: string, targetUserId: string, newPassword: string): Promise<void> {
    await connectMongo();
    if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) throw new Error('Invalid user id');
    const user = await UserModel.findById(targetUserId);
    if (!user) throw new Error('User not found');
    user.password = newPassword;
    if (user.authProvider !== 'local') {
      user.authProvider = 'local';
    }
    await user.save();
    await AdminAuditService.logAction(actorUserId, 'user.setPassword', { targetUserId });
  }

  static async revertUserPatch(actorUserId: string, targetUserId: string, snapshotBefore: Record<string, unknown>): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) throw new Error('Invalid user id');
    const $set: Record<string, unknown> = {};
    if ('isAdmin' in snapshotBefore) $set.isAdmin = snapshotBefore.isAdmin;
    if ('isVerified' in snapshotBefore) $set.isVerified = snapshotBefore.isVerified;
    if ('isDeleted' in snapshotBefore) $set.isDeleted = snapshotBefore.isDeleted;
    if ('adminRoles' in snapshotBefore && Array.isArray(snapshotBefore.adminRoles)) {
      $set.adminRoles = snapshotBefore.adminRoles;
    }
    if (Object.keys($set).length === 0) throw new Error('Nothing to revert');
    await UserModel.updateOne({ _id: targetUserId }, { $set });
    await AdminAuditService.logAction(actorUserId, 'user.revert', { targetUserId, snapshotBefore });
  }
}
