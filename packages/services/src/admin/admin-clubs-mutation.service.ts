import mongoose from 'mongoose';
import { connectMongo, ClubModel } from '@tdarts/core';
import { AdminAuditService } from './admin-audit.service';

export class AdminClubsMutationService {
  static async updateFlags(
    actorUserId: string,
    clubId: string,
    patch: { verified?: boolean; isActive?: boolean },
  ): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(clubId)) throw new Error('Invalid club id');
    const before = await ClubModel.findById(clubId).select('verified isActive').lean();
    if (!before) throw new Error('Club not found');
    const $set: Record<string, unknown> = {};
    if (typeof patch.verified === 'boolean') $set.verified = patch.verified;
    if (typeof patch.isActive === 'boolean') $set.isActive = patch.isActive;
    if (Object.keys($set).length === 0) return;
    await ClubModel.updateOne({ _id: clubId }, { $set });
    await AdminAuditService.logAction(actorUserId, 'club.updateFlags', {
      clubId,
      patch,
      snapshotBefore: before,
    });
  }

  static async updateSubscriptionModel(
    actorUserId: string,
    clubId: string,
    subscriptionModel: 'free' | 'basic' | 'pro' | 'enterprise',
  ): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(clubId)) throw new Error('Invalid club id');
    const before = await ClubModel.findById(clubId).select('subscriptionModel').lean();
    if (!before) throw new Error('Club not found');
    const prev = ((before as { subscriptionModel?: string }).subscriptionModel ?? 'free') as string;
    if (prev === subscriptionModel) return;
    await ClubModel.updateOne({ _id: clubId }, { $set: { subscriptionModel } });
    await AdminAuditService.logAction(actorUserId, 'club.updateSubscriptionModel', {
      clubId,
      subscriptionModel,
      snapshotBefore: before,
    });
  }
}
