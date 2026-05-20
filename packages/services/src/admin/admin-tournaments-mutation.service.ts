import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectMongo, TournamentModel } from '@tdarts/core';
import { AdminAuditService } from './admin-audit.service';

function randomPassword(): string {
  return crypto.randomBytes(6).toString('base64url');
}

export type AdminTournamentFlagsPatch = {
  isArchived?: boolean;
  isSandbox?: boolean;
  isDeleted?: boolean;
  verified?: boolean;
};

export class AdminTournamentsMutationService {
  static async updateFlags(
    actorUserId: string,
    tournamentId: string,
    patch: AdminTournamentFlagsPatch,
  ): Promise<void> {
    await connectMongo();
    const doc = await TournamentModel.findById(tournamentId).lean();
    if (!doc) throw new Error('Tournament not found');
    const $set: Record<string, unknown> = {};
    if (typeof patch.isArchived === 'boolean') $set.isArchived = patch.isArchived;
    if (typeof patch.isSandbox === 'boolean') $set.isSandbox = patch.isSandbox;
    if (typeof patch.isDeleted === 'boolean') $set.isDeleted = patch.isDeleted;
    if (typeof patch.verified === 'boolean') $set.verified = patch.verified;
    if (Object.keys($set).length === 0) return;
    await TournamentModel.updateOne({ _id: tournamentId }, { $set });
    await AdminAuditService.logAction(actorUserId, 'tournament.updateFlags', {
      tournamentId,
      patch,
      snapshotBefore: {
        isArchived: (doc as { isArchived?: boolean }).isArchived,
        isSandbox: (doc as { isSandbox?: boolean }).isSandbox,
        isDeleted: (doc as { isDeleted?: boolean }).isDeleted,
        verified: (doc as { verified?: boolean }).verified,
      },
    });
  }

  static async updateSettings(
    actorUserId: string,
    tournamentId: string,
    patch: {
      name?: string;
      status?: string;
      clubId?: string | null;
    },
  ): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(tournamentId)) throw new Error('Invalid tournament id');
    const $set: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof patch.name === 'string' && patch.name.trim()) {
      $set['tournamentSettings.name'] = patch.name.trim();
    }
    if (typeof patch.status === 'string' && patch.status.trim()) {
      $set['tournamentSettings.status'] = patch.status.trim();
    }
    if (patch.clubId !== undefined) {
      if (patch.clubId == null || patch.clubId === '') {
        throw new Error('clubId is required');
      }
      if (!mongoose.Types.ObjectId.isValid(patch.clubId)) throw new Error('Invalid club id');
      $set.clubId = new mongoose.Types.ObjectId(patch.clubId);
    }
    if (Object.keys($set).length <= 1) throw new Error('No changes');
    await TournamentModel.updateOne({ _id: tournamentId }, { $set });
    await AdminAuditService.logAction(actorUserId, 'tournament.updateSettings', {
      tournamentId,
      patch,
    });
  }

  static async rotateHumanPassword(actorUserId: string, tournamentId: string): Promise<{ newPassword: string }> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(tournamentId)) throw new Error('Invalid tournament id');
    const next = randomPassword();
    await TournamentModel.updateOne(
      { _id: tournamentId },
      { $set: { 'tournamentSettings.tournamentPassword': next, updatedAt: new Date() } },
    );
    await AdminAuditService.logAction(actorUserId, 'tournament.rotatePassword', { tournamentId });
    return { newPassword: next };
  }
}
