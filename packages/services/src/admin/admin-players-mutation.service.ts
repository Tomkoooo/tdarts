import mongoose from 'mongoose';
import { connectMongo, PlayerModel } from '@tdarts/core';
import { AdminAuditService } from './admin-audit.service';

export class AdminPlayersMutationService {
  static async updateBasics(
    actorUserId: string,
    playerId: string,
    patch: {
      name?: string;
      country?: string | null;
      type?: 'individual' | 'pair' | 'team';
      publicConsent?: boolean;
    },
  ): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(playerId)) throw new Error('Invalid player id');
    const $set: Record<string, unknown> = {};
    if (typeof patch.name === 'string' && patch.name.trim()) $set.name = patch.name.trim();
    if (patch.country !== undefined) $set.country = patch.country || null;
    if (patch.type) $set.type = patch.type;
    if (typeof patch.publicConsent === 'boolean') $set.publicConsent = patch.publicConsent;
    if (Object.keys($set).length === 0) throw new Error('No changes');
    await PlayerModel.updateOne({ _id: playerId }, { $set });
    await AdminAuditService.logAction(actorUserId, 'player.updateBasics', { playerId, patch });
  }

  static async updateHonors(
    actorUserId: string,
    playerId: string,
    honors: unknown[],
  ): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(playerId)) throw new Error('Invalid player id');
    await PlayerModel.updateOne({ _id: playerId }, { $set: { honors } });
    await AdminAuditService.logAction(actorUserId, 'player.updateHonors', { playerId });
  }

  static async linkUserRef(actorUserId: string, playerId: string, userId: string | null): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(playerId)) throw new Error('Invalid player id');
    if (userId != null && !mongoose.Types.ObjectId.isValid(userId)) throw new Error('Invalid user id');
    await PlayerModel.updateOne(
      { _id: playerId },
      { $set: { userRef: userId ? new mongoose.Types.ObjectId(userId) : null } },
    );
    await AdminAuditService.logAction(actorUserId, 'player.linkUserRef', { playerId, userId });
  }
}
