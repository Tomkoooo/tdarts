import { TournamentModel } from '@/database/models/tournament.model';
import { TournamentDocument } from '@/interface/tournament.interface';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { PlayerModel } from '../models/player.model';
import { TournamentPlayerDocument } from '@/interface/tournament.interface';
import mongoose from 'mongoose';
import { roundRobin } from '@/lib/utils';
import { MatchModel } from '../models/match.model';
import { ClubService } from './club.service';

export class TournamentService {
    static async createTournament(tournament: Partial<Omit<TournamentDocument, keyof Document>>): Promise<TournamentDocument> {
        await connectMongo();
        const newTournament = new TournamentModel(tournament);
        return await newTournament.save();
    }

    static async getTournament(tournamentId: string): Promise<TournamentDocument> {
        await connectMongo();
        let tournament = await TournamentModel.findOne({ tournamentId: tournamentId })
            .populate({
                path: 'clubId',
                populate: {
                    path: 'boards',
                    populate: [
                        {
                            path: 'currentMatch',
                            model: 'Match',
                            populate: [
                                { path: 'player1.playerId', model: 'Player' },
                                { path: 'player2.playerId', model: 'Player' }
                            ]
                        },
                        {
                            path: 'nextMatch',
                            model: 'Match',
                            populate: [
                                { path: 'player1.playerId', model: 'Player' },
                                { path: 'player2.playerId', model: 'Player' }
                            ]
                        }
                    ]
                }
            })
            .populate('tournamentPlayers.playerReference')
            .populate('groups.matches');
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }
        // Deep populate matches' player fields
        for (const group of tournament.groups) {
            if (group.matches && Array.isArray(group.matches)) {
                for (let i = 0; i < group.matches.length; i++) {
                    const match = group.matches[i];
                    if (match && match.populate) {
                        await match.populate('player1.playerId');
                        await match.populate('player2.playerId');
                        await match.populate('scorer');
                    }
                }
            }
        }
        return tournament;
    }

    static async getPlayerStatusInTournament(tournamentId: string, userId: string): Promise<string> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }
        const player = await PlayerModel.findOne({ userRef: userId });
        const playerStatus = tournament.tournamentPlayers.find(
            (p: TournamentPlayerDocument) => {
                return p.playerReference?.toString() === player?._id?.toString()
            }
        );
        return playerStatus?.status;
    }

    //method to add, remove and update tournament players status, the rquest takes the player._id form the player collection
    static async addTournamentPlayer(tournamentId: string, playerId: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }
            const player = await PlayerModel.findOne({ _id: playerId });
            if (!player) {
                throw new BadRequestError('Player not found');
            }
            tournament.tournamentPlayers = [...tournament.tournamentPlayers, { playerReference: player._id, status: 'applied' }];
            await tournament.save();
            return true;
        } catch (err) {
            console.error('addTournamentPlayer error:', err);
            return false;
        }
    }

    static async removeTournamentPlayer(tournamentId: string, playerId: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }
            tournament.tournamentPlayers = tournament.tournamentPlayers.filter((player: any) => player.playerReference.toString() !== playerId);
            await tournament.save();
            return true;
        } catch (err) {
            console.error('removeTournamentPlayer error:', err);
            return false;
        }
    }

    static async updateTournamentPlayerStatus(tournamentId: string, playerId: string, status: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            tournament.tournamentPlayers = tournament.tournamentPlayers.map((player: TournamentPlayerDocument) => player.playerReference.toString() === playerId ? { ...player, status: status } : player);
            await tournament.save();
            return true;
        } catch (err) {
            console.error('updateTournamentPlayerStatus error:', err);
            return false;
        }
    }

    static async generateGroups(tournamentId: string): Promise<boolean> {
        try {
            await connectMongo();
            const club = await TournamentModel.findOne({ tournamentId: tournamentId }).populate('clubId').select('boards');
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }
            if (!club.clubId.boards) {
                throw new BadRequestError('Club boards not found');
            }

            const groupCount = club.clubId.boards.length;
            const players = tournament.tournamentPlayers.filter(
                (p: TournamentPlayerDocument) => p.status === 'checked-in'
            );

            if (!players || players.length === 0) {
                throw new BadRequestError('No players found');
            }
            if (players.length < groupCount * 3) {
                throw new BadRequestError('Not enough players to generate groups');
            }

            // Prepare groups array with matches as ObjectId[] (not empty array)
            const groups: {
                _id: mongoose.Types.ObjectId;
                board: number;
                matches: mongoose.Types.ObjectId[];
            }[] = club.clubId.boards.map((board: any) => ({
                _id: new mongoose.Types.ObjectId(),
                board: board.boardNumber,
                matches: []
            }));

            // Assign groups to tournament (replace, don't push)
            tournament.groups = groups as any;

            // Shuffle players
            const randomizedPlayers = [...players].sort(() => Math.random() - 0.5);

            // Distribute players to groups and assign groupOrdinalNumber
            const groupOrdinalCounters: number[] = Array(groupCount).fill(0);

            randomizedPlayers.forEach((player: any, index: number) => {
                const groupIndex = index % groupCount;
                const group = groups[groupIndex];
                player.groupId = group._id;
                player.groupOrdinalNumber = groupOrdinalCounters[groupIndex];
                groupOrdinalCounters[groupIndex]++;
            });

            await tournament.save();

            // For each group, generate matches and assign ObjectIds to matches array
            for (const group of groups) {
                // Get players in this group, sorted by groupOrdinalNumber
                const groupPlayers = tournament.tournamentPlayers
                    .filter((p: any) => p.groupId?.toString() === group._id.toString())
                    .sort((a: any, b: any) => a.groupOrdinalNumber - b.groupOrdinalNumber);

                const playerCount = groupPlayers.length;
                if (playerCount < 3 || playerCount > 5) continue;

                const rrMatches = roundRobin(playerCount);
                if (!rrMatches) continue;

                for (const rrMatch of rrMatches) {
                    const player1 = groupPlayers[rrMatch.player1 - 1];
                    const player2 = groupPlayers[rrMatch.player2 - 1];
                    const scorer = groupPlayers[rrMatch.scorer - 1];

                    if (!player1 || !player2 || !scorer) continue;

                    const matchDoc = await MatchModel.create({
                        boardReference: group.board,
                        tournamentRef: tournament._id,
                        type: 'group',
                        round: 1,
                        player1: {
                            playerId: player1.playerReference,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        },
                        player2: {
                            playerId: player2.playerReference,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        },
                        scorer: scorer.playerReference,
                        status: 'pending',
                        legs: [],
                    });

                    group.matches.push(matchDoc._id);
                }

                //update the club board status to waiting and add the nextMatch as the first match in group
                // Properly update the club's board in the database to reflect the new status and nextMatch
                const boardNumberToUpdate = group.board;
                const nextMatchId = group.matches[0]?._id;

                if (club && club.clubId && Array.isArray(club.clubId.boards)) {
                    const boardIndex = club.clubId.boards.findIndex((board: any) => board.boardNumber === boardNumberToUpdate);
                    if (boardIndex !== -1) {
                        club.clubId.boards[boardIndex].status = 'waiting';
                        club.clubId.boards[boardIndex].nextMatch = nextMatchId;
                        // Mark the boards array as modified for Mongoose
                        if (typeof club.clubId.markModified === 'function') {
                            club.clubId.markModified('boards');
                        }
                        await club.clubId.save();
                    }
                }
               
            }

            // Assign updated groups (with matches) back to tournament
            tournament.groups = groups as any;

            await tournament.save();
            return true;
        } catch (err) {
            console.error('generateGroups error:', err);
            return false;
        }
    }

    //re calculate the group standing for each group
    static async updateGroupStanding(tournamentId: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }
            for (const group of tournament.groups) {
                // 1. Get all matches for this group
                const matchDocs = await MatchModel.find({ _id: { $in: group.matches } });
                // 2. Get all playerIds in this group
                const groupPlayers = tournament.tournamentPlayers.filter((p: TournamentPlayerDocument) => p.groupId?.toString() === group._id.toString());
                const playerIds = groupPlayers.map((p: TournamentPlayerDocument) => p.playerReference.toString());
                // 3. Build stats
                const stats: Record<string, {
                    matchesWon: number;
                    matchesLost: number;
                    legsWon: number;
                    legsLost: number;
                    points: number;
                    headToHead: Record<string, number>;
                }> = {};
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
                // 4. Process matches
                for (const match of matchDocs) {
                    const p1 = match.player1.playerId.toString();
                    const p2 = match.player2.playerId.toString();
                    if (!stats[p1] || !stats[p2]) continue;
                    // Legek
                    stats[p1].legsWon += match.player1.legsWon;
                    stats[p1].legsLost += match.player2.legsWon;
                    stats[p2].legsWon += match.player2.legsWon;
                    stats[p2].legsLost += match.player1.legsWon;
                    // Győztes
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
                        // Döntetlen (ha van ilyen)
                        stats[p1].headToHead[p2] = 0;
                        stats[p2].headToHead[p1] = 0;
                    }
                }
                // 5. Sort by points, legDiff, legsWon, head-to-head
                const sorted = [...playerIds].sort((a, b) => {
                    const sa = stats[a], sb = stats[b];
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
                // 6. Assign ranks (handle ties)
                let currentRank = 1;
                const ranks: Record<string, number> = {};
                for (let i = 0; i < sorted.length; i++) {
                    if (
                        i > 0 &&
                        stats[sorted[i]].points === stats[sorted[i - 1]].points &&
                        (stats[sorted[i]].legsWon - stats[sorted[i]].legsLost) === (stats[sorted[i - 1]].legsWon - stats[sorted[i - 1]].legsLost) &&
                        stats[sorted[i]].legsWon === stats[sorted[i - 1]].legsWon &&
                        stats[sorted[i]].headToHead[sorted[i - 1]] === stats[sorted[i - 1]].headToHead[sorted[i]]
                    ) {
                        ranks[sorted[i]] = ranks[sorted[i - 1]];
                    } else {
                        ranks[sorted[i]] = currentRank;
                    }
                    currentRank++;
                }
                // 7. Update TournamentPlayers
                tournament.tournamentPlayers = tournament.tournamentPlayers.map((p: TournamentPlayerDocument) => {
                    if (p.groupId?.toString() === group._id.toString()) {
                        const s = stats[p.playerReference.toString()];
                        return {
                            ...p,
                            groupStanding: ranks[p.playerReference.toString()] ?? p.groupStanding,
                            stats: {
                                ...p.stats,
                                matchesWon: s.matchesWon,
                                matchesLost: s.matchesLost,
                                legsWon: s.legsWon,
                                legsLost: s.legsLost,
                                // avg: ... (ha van adat)
                                avg: p.stats.avg,
                            },
                        };
                    }
                    return p;
                });
            }
            await tournament.save();
            return true;
        } catch (err) {
            console.error('updateGroupStanding error:', err);
            return false;
        }
    }

    static async validateTournamentByPassword(tournamentId: string, password: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }
            if (tournament.tournamentSettings.tournamentPassword !== password) {
                throw new BadRequestError('Invalid password');
            }
            return true;
        } catch (err) {
            console.error('validateTournamentByPassword error:', err);
            return false;
        }
    }

    static async getBoards(tournamentId: string): Promise<any> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }
        const club = await ClubService.getClub(tournament.clubId);
        if (!club) {
            throw new BadRequestError('Club not found');
        }
        return club.boards;
    }
}