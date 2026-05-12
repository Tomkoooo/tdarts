import mongoose from 'mongoose';
import { connectMongo, MatchModel } from '@tdarts/core';
import { AdminAuditService } from './admin-audit.service';

export class AdminMatchesMutationService {
  /** Restores `previousState` when a manual admin override exists. */
  static async revertManualOverride(actorUserId: string, matchId: string): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(matchId)) throw new Error('Invalid match id');
    const doc = await MatchModel.findById(matchId);
    if (!doc) throw new Error('Match not found');
    const m = doc as mongoose.Document & {
      manualOverride?: boolean;
      previousState?: {
        player1LegsWon?: number;
        player2LegsWon?: number;
        winnerId?: mongoose.Types.ObjectId;
        status?: string;
      };
      player1?: { legsWon?: number } | null;
      player2?: { legsWon?: number } | null;
      winnerId?: unknown;
      status?: string;
      manualChangeType?: string | null;
      manualChangedBy?: unknown;
    };
    if (!m.manualOverride || !m.previousState) {
      throw new Error('No reversible manual override on this match');
    }
    const ps = m.previousState;
    if (m.player1 && typeof ps.player1LegsWon === 'number') m.player1.legsWon = ps.player1LegsWon;
    if (m.player2 && typeof ps.player2LegsWon === 'number') m.player2.legsWon = ps.player2LegsWon;
    if (ps.winnerId !== undefined) m.winnerId = ps.winnerId as never;
    if (ps.status) m.status = ps.status;
    m.manualOverride = false;
    m.previousState = undefined;
    m.manualChangeType = null;
    m.manualChangedBy = undefined;
    await m.save();
    await AdminAuditService.logAction(actorUserId, 'match.revertManualOverride', { matchId });
  }
}
