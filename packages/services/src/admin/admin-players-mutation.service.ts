import mongoose from 'mongoose';
import { connectMongo, PlayerModel } from '@tdarts/core';
import { AdminAuditService } from './admin-audit.service';

export class AdminPlayersMutationService {
  static async updateBasics(
    actorUserId: string,
    playerId: string,
    patch: { name?: string; country?: string | null },
  ): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(playerId)) throw new Error('Invalid player id');
    const $set: Record<string, unknown> = {};
    if (typeof patch.name === 'string' && patch.name.trim()) $set.name = patch.name.trim();
    if (patch.country !== undefined) $set.country = patch.country || null;
    if (Object.keys($set).length === 0) throw new Error('No changes');
    await PlayerModel.updateOne({ _id: playerId }, { $set });
    await AdminAuditService.logAction(actorUserId, 'player.updateBasics', { playerId, patch });
  }
}
