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

  /** Replace player1 or player2 slot on a match (admin repair). */
  static async swapPlayer(
    actorUserId: string,
    matchId: string,
    slot: 'player1' | 'player2',
    newPlayerId: string,
  ): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(matchId) || !mongoose.Types.ObjectId.isValid(newPlayerId)) {
      throw new Error('Invalid id');
    }
    const doc = await MatchModel.findById(matchId);
    if (!doc) throw new Error('Match not found');
    const m = doc as mongoose.Document & {
      player1?: { playerId?: mongoose.Types.ObjectId; legsWon?: number; legsLost?: number; average?: number } | null;
      player2?: { playerId?: mongoose.Types.ObjectId; legsWon?: number; legsLost?: number; average?: number } | null;
    };
    const oid = new mongoose.Types.ObjectId(newPlayerId);
    const empty = { playerId: oid, legsWon: 0, legsLost: 0, average: 0 };
    if (slot === 'player1') m.player1 = { ...(m.player1 ?? empty), playerId: oid };
    else m.player2 = { ...(m.player2 ?? empty), playerId: oid };
    await m.save();
    await AdminAuditService.logAction(actorUserId, 'match.swapPlayer', { matchId, slot, newPlayerId });
  }

  /** Update safe admin-editable match metadata. */
  static async updateAdminFields(
    actorUserId: string,
    matchId: string,
    patch: {
      status?: 'pending' | 'ongoing' | 'finished';
      type?: 'group' | 'knockout';
      round?: number;
      boardReference?: number;
    },
  ): Promise<void> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(matchId)) throw new Error('Invalid match id');
    const doc = await MatchModel.findById(matchId);
    if (!doc) throw new Error('Match not found');
    const m = doc as mongoose.Document & {
      status?: string;
      type?: string;
      round?: number;
      boardReference?: number;
    };
    if (patch.status) m.status = patch.status;
    if (patch.type) m.type = patch.type;
    if (patch.round != null && Number.isFinite(patch.round)) m.round = patch.round;
    if (patch.boardReference != null && Number.isFinite(patch.boardReference)) {
      m.boardReference = patch.boardReference;
    }
    await m.save();
    await AdminAuditService.logAction(actorUserId, 'match.updateAdminFields', { matchId, patch });
  }
}
