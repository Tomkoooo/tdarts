import { TournamentModel } from '@/database/models/tournament.model';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { MatchModel } from '../models/match.model';
import { TournamentPlayer } from '@/interface/tournament.interface';
import type { MatchDocument } from '@/interface/match.interface';
import mongoose from 'mongoose';

export type UpdateGroupStandingOptions = {
    /**
     * When false, only `groupStanding` is updated from group-stage matches.
     * Use before `finishTournament`, which overwrites embedded `stats` with full-tournament totals.
     * Default true (live group play: keep `stats` aligned with group-only W/L).
     */
    updatePlayerStatsForGroup?: boolean;
};

export class TournamentStatsService {
    /** Recompute group standing (and optionally group-only embedded stats) for each group. */
    static async updateGroupStanding(
        tournamentId: string,
        options?: UpdateGroupStandingOptions
    ): Promise<boolean> {
        const updatePlayerStatsForGroup = options?.updatePlayerStatsForGroup !== false;
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            const groups = tournament.groups || [];
            const allMatchIdStrings = new Set<string>();
            for (const group of groups) {
                for (const ref of group.matches || []) {
                    if (ref == null) continue;
                    allMatchIdStrings.add(ref.toString());
                }
            }

            const uniqueIds = [...allMatchIdStrings].map((id) => new mongoose.Types.ObjectId(id));
            const groupMatchDocs =
                uniqueIds.length === 0
                    ? []
                    : await MatchModel.find({
                          _id: { $in: uniqueIds },
                          type: 'group',
                          tournamentRef: tournament._id,
                      });
            const matchById = new Map(
                groupMatchDocs.map((m: MatchDocument) => [m._id.toString(), m])
            );

            for (const group of groups) {
                const matchDocsForGroup = (group.matches || [])
                    .map((ref: mongoose.Types.ObjectId) => matchById.get(ref.toString()))
                    .filter((m: MatchDocument | undefined): m is MatchDocument => Boolean(m));

                const groupPlayers = tournament.tournamentPlayers.filter(
                    (p: TournamentPlayer) => p.groupId?.toString() === group._id.toString()
                );
                const playerIds = groupPlayers.map((p: TournamentPlayer) => p.playerReference.toString());
                const stats: Record<
                    string,
                    {
                        matchesWon: number;
                        matchesLost: number;
                        legsWon: number;
                        legsLost: number;
                        points: number;
                        headToHead: Record<string, number>;
                    }
                > = {};
                playerIds.forEach((pid: string) => {
                    stats[pid] = {
                        matchesWon: 0,
                        matchesLost: 0,
                        legsWon: 0,
                        legsLost: 0,
                        points: 0,
                        headToHead: {},
                    };
                });

                for (const match of matchDocsForGroup) {
                    const p1 = match.player1.playerId.toString();
                    const p2 = match.player2.playerId.toString();
                    if (!stats[p1] || !stats[p2]) continue;
                    stats[p1].legsWon += match.player1.legsWon;
                    stats[p1].legsLost += match.player2.legsWon;
                    stats[p2].legsWon += match.player2.legsWon;
                    stats[p2].legsLost += match.player1.legsWon;
                    if (match.winnerId?.toString() === p1) {
                        stats[p1].matchesWon += 1;
                        stats[p1].points += 2;
                        stats[p2].matchesLost += 1;
                        stats[p1].headToHead[p2] = 1;
                        stats[p2].headToHead[p1] = 0;
                    } else if (match.winnerId?.toString() === p2) {
                        stats[p2].matchesWon += 1;
                        stats[p2].points += 2;
                        stats[p1].matchesLost += 1;
                        stats[p2].headToHead[p1] = 1;
                        stats[p1].headToHead[p2] = 0;
                    } else {
                        stats[p1].headToHead[p2] = 0;
                        stats[p2].headToHead[p1] = 0;
                    }
                }

                const sorted = [...playerIds].sort((a, b) => {
                    const sa = stats[a],
                        sb = stats[b];
                    const saLegDiff = sa.legsWon - sa.legsLost;
                    const sbLegDiff = sb.legsWon - sb.legsLost;
                    if (sb.points !== sa.points) return sb.points - sa.points;
                    if (sbLegDiff !== saLegDiff) return sbLegDiff - saLegDiff;
                    if (sb.legsWon !== sa.legsWon) return sb.legsWon - sa.legsWon;
                    if (sa.headToHead[b] !== undefined && sb.headToHead[a] !== undefined) {
                        return sb.headToHead[a] - sa.headToHead[b];
                    }
                    return 0;
                });

                let currentRank = 1;
                const ranks: Record<string, number> = {};
                for (let i = 0; i < sorted.length; i++) {
                    if (
                        i > 0 &&
                        stats[sorted[i]].points === stats[sorted[i - 1]].points &&
                        stats[sorted[i]].legsWon - stats[sorted[i]].legsLost ===
                            stats[sorted[i - 1]].legsWon - stats[sorted[i - 1]].legsLost &&
                        stats[sorted[i]].legsWon === stats[sorted[i - 1]].legsWon &&
                        stats[sorted[i]].headToHead[sorted[i - 1]] ===
                            stats[sorted[i - 1]].headToHead[sorted[i]]
                    ) {
                        ranks[sorted[i]] = ranks[sorted[i - 1]];
                    } else {
                        ranks[sorted[i]] = currentRank;
                    }
                    currentRank++;
                }

                tournament.tournamentPlayers = tournament.tournamentPlayers.map((p: TournamentPlayer) => {
                    if (p.groupId?.toString() !== group._id.toString()) {
                        return p;
                    }
                    const s = stats[p.playerReference.toString()];
                    const nextStanding = ranks[p.playerReference.toString()] ?? p.groupStanding;
                    if (!updatePlayerStatsForGroup) {
                        return {
                            ...p,
                            groupStanding: nextStanding,
                        };
                    }
                    return {
                        ...p,
                        groupStanding: nextStanding,
                        stats: {
                            ...p.stats,
                            matchesWon: s.matchesWon,
                            matchesLost: s.matchesLost,
                            legsWon: s.legsWon,
                            legsLost: s.legsLost,
                            avg: p.stats.avg,
                        },
                    };
                });
            }
            await tournament.save();
            return true;
        } catch (err) {
            console.error('updateGroupStanding error:', err);
            return false;
        }
    }
}
