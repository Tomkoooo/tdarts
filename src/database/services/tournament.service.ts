import { TournamentModel } from '@/database/models/tournament.model';
import { TournamentDocument } from '@/interface/tournament.interface';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { PlayerModel } from '../models/player.model';
import { TournamentPlayer } from '@/interface/tournament.interface';
import mongoose from 'mongoose';
import { roundRobin } from '@/lib/utils';
import { MatchModel } from '../models/match.model';
import { ClubService } from './club.service';
import { ClubModel } from '../models/club.model';

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
            .populate('groups.matches')
            .populate('knockout.matches.player1')
            .populate('knockout.matches.player2')
            .populate({
                path: 'knockout.matches.matchReference',
                model: 'Match',
                populate: [
                    { path: 'player1.playerId', model: 'Player' },
                    { path: 'player2.playerId', model: 'Player' },
                    { path: 'scorer', model: 'Player' }
                ]
            });
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
            (p: TournamentPlayer) => {
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

            tournament.tournamentPlayers = tournament.tournamentPlayers.map((player: TournamentPlayer) => player.playerReference.toString() === playerId ? { ...player, status: status } : player);
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
                (p: TournamentPlayer) => p.status === 'checked-in'
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
            tournament.tournamentSettings.status = 'group-stage';
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
                const groupPlayers = tournament.tournamentPlayers.filter((p: TournamentPlayer) => p.groupId?.toString() === group._id.toString());
                const playerIds = groupPlayers.map((p: TournamentPlayer) => p.playerReference.toString());
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
                tournament.tournamentPlayers = tournament.tournamentPlayers.map((p: TournamentPlayer) => {
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

    static async generateKnockout(tournamentCode: string, options: {
        playersCount?: number;
        useSeededPlayers: boolean;
        seededPlayersCount: number;
    }): Promise<boolean> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new Error('Tournament not found');
            }

            // Check if tournament format allows knockout generation from current status
            const format = tournament.tournamentSettings?.format || 'group_knockout';
            const status = tournament.tournamentSettings?.status;
            
            if (format === 'knockout') {
                // For knockout-only tournaments, allow generation from pending status
                if (status !== 'pending') {
                    throw new Error('Knockout tournaments can only be generated from pending status');
                }
            } else {
                // For group_knockout tournaments, require group-stage status
                if (status !== 'group-stage') {
                    throw new Error('Knockout can only be generated after group stage');
                }
            }

            // Get checked-in players
            const checkedInPlayers = tournament.tournamentPlayers.filter(
                (player: any) => player.status === 'checked-in'
            );

            if (checkedInPlayers.length < 2) {
                throw new Error(`Not enough checked-in players. Need at least 2, have ${checkedInPlayers.length}`);
            }

            // For knockout-only tournaments, use all checked-in players
            // For group_knockout tournaments, use players from groups
            let groupPlayers: any[] = [];
            
            if (format === 'knockout') {
                // Use all checked-in players for knockout-only tournaments
                groupPlayers = checkedInPlayers;
            } else {
                // Use players from groups for group_knockout tournaments
                groupPlayers = checkedInPlayers.filter((player: any) => player.groupId);
                
                if (groupPlayers.length < (options.playersCount || 0)) {
                    throw new Error(`Not enough players from groups. Need ${options.playersCount}, have ${groupPlayers.length}`);
                }
            }

            // Sort players by group standing (for group_knockout) or randomly (for knockout)
            const allPlayers = [...groupPlayers];
            if (format === 'group_knockout') {
                allPlayers.sort((a: any, b: any) => {
                    if (a.groupStanding !== b.groupStanding) {
                        return (a.groupStanding || 0) - (b.groupStanding || 0);
                    }
                    const aStats = a.stats || {};
                    const bStats = b.stats || {};
                    const aPoints = (aStats.matchesWon || 0) * 2;
                    const bPoints = (bStats.matchesWon || 0) * 2;
                    if (aPoints !== bPoints) return bPoints - aPoints;
                    
                    const aLegDiff = (aStats.legsWon || 0) - (aStats.legsLost || 0);
                    const bLegDiff = (bStats.legsWon || 0) - (bStats.legsLost || 0);
                    return bLegDiff - aLegDiff;
                });
            } else {
                // Random shuffle for knockout-only tournaments
                allPlayers.sort(() => Math.random() - 0.5);
            }

            let advancingPlayers: any[] = [];
            
            if (format === 'knockout') {
                // For knockout format, use all players
                advancingPlayers = allPlayers;
            } else {
                // For group_knockout format, use specified count
                advancingPlayers = allPlayers.slice(0, options.playersCount);
                
                if (advancingPlayers.length !== (options.playersCount || 0)) {
                    throw new Error(`Expected ${options.playersCount} players but got ${advancingPlayers.length}`);
                }
            }

            const shuffledPlayers = [...advancingPlayers].sort(() => Math.random() - 0.5);
            const knockoutRounds = this.generateKnockoutRounds(shuffledPlayers);

            // Create matches for the first round
            const firstRoundMatches = knockoutRounds[0].matches;
            const createdMatches: any[] = [];

            // Get available boards
            const club = await ClubModel.findById(tournament.clubId);
            if (!club || !club.boards) {
                throw new Error('Club boards not found');
            }

            // Filter active boards
            const availableBoards = club.boards.filter((board: any) => board.isActive);
            if (availableBoards.length === 0) {
                throw new Error('No active boards available');
            }

            // Assign matches to boards in round-robin fashion
            for (let i = 0; i < firstRoundMatches.length; i++) {
                const matchData = firstRoundMatches[i];
                if (matchData.player1 && matchData.player2) {
                    const boardIndex: number = i % availableBoards.length;
                    const assignedBoard: any = availableBoards[boardIndex];

                    const match = await MatchModel.create({
                        boardReference: assignedBoard.boardNumber,
                        tournamentRef: tournament._id,
                        type: 'knockout',
                        round: 1,
                        player1: {
                            playerId: matchData.player1,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        },
                        player2: {
                            playerId: matchData.player2,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        },
                        scorer: matchData.player1, // Default scorer
                        status: 'pending',
                        legs: [],
                    });
                    createdMatches.push(match);

                    // Update the knockout structure with match reference
                    const firstRoundIndex = knockoutRounds.findIndex((r: any) => r.round === 1);
                    if (firstRoundIndex !== -1) {
                        const matchIndex = knockoutRounds[firstRoundIndex].matches.findIndex((m: any) => 
                            m.player1?.toString() === matchData.player1?.toString() && 
                            m.player2?.toString() === matchData.player2?.toString()
                        );
                        if (matchIndex !== -1) {
                            knockoutRounds[firstRoundIndex].matches[matchIndex].matchReference = match._id;
                        }
                    }

                    // Update board status
                    const boardToUpdate = club.boards.find((b: any) => b.boardNumber === assignedBoard.boardNumber);
                    if (boardToUpdate) {
                        boardToUpdate.status = 'waiting';
                        boardToUpdate.nextMatch = match._id;
                        boardToUpdate.currentMatch = null;
                    }
                }
            }

            // If there's a second round with a bye player, don't create a match for it yet
            // The match will be created when the first round is finished

            // Update tournament
            tournament.knockout = knockoutRounds;
            tournament.tournamentSettings.status = 'knockout';
            tournament.tournamentSettings.knockoutMethod = 'automatic';

            await tournament.save();

            // Save club with updated board statuses
            await club.save();

            return true;
        } catch (error) {
            console.error('Generate knockout error:', error);
            throw error;
        }
    }

    private static generateKnockoutRounds(advancingPlayers: any[]): any[] {
        const rounds: any[] = [];

        // Handle odd number of players by giving a bye to the last player
        let playersForFirstRound = [...advancingPlayers];
        let playerWithBye = null;
        
        if (playersForFirstRound.length % 2 !== 0) {
            // Remove the last player and they get a bye (will join in the second round)
            playerWithBye = playersForFirstRound.pop();
        }

        // First round: advancing players play each other
        const firstRoundMatches = [];
        for (let i = 0; i < playersForFirstRound.length; i += 2) {
            if (i + 1 < playersForFirstRound.length) {
                firstRoundMatches.push({
                    player1: playersForFirstRound[i].playerReference,
                    player2: playersForFirstRound[i + 1].playerReference,
                });
            }
        }

        // If there's a player with a bye, add them to the second round
        if (playerWithBye) {
            // Create a second round with just the bye player
            rounds.push({ 
                round: 1, 
                matches: firstRoundMatches 
            });
            rounds.push({ 
                round: 2, 
                matches: [{
                    player1: playerWithBye.playerReference,
                    player2: null, // Will be filled when first round is finished
                }]
            });
        } else {
            // No bye player, just create first round
            rounds.push({ 
                round: 1, 
                matches: firstRoundMatches 
            });
        }

        return rounds;
    }

    static async generateNextKnockoutRound(tournamentId: string, currentRound: number): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Get current round matches
            const currentRoundMatches = tournament.knockout.find((r: any) => r.round === currentRound);
            if (!currentRoundMatches) {
                throw new BadRequestError(`Round ${currentRound} not found`);
            }

            // Get all finished matches from current round
            const matchIds = currentRoundMatches.matches
                .map((m: any) => m.matchReference)
                .filter(Boolean)
                .map((ref: any) => typeof ref === 'object' ? ref._id : ref);
            
            console.log('Current round matches:', currentRoundMatches.matches);
            console.log('Match IDs to check:', matchIds);
            
            const finishedMatches = await MatchModel.find({
                _id: { $in: matchIds },
                status: 'finished'
            });

            console.log('Found finished matches:', finishedMatches.length);

            // For manual mode, allow generating next round even with no finished matches
            if (tournament.tournamentSettings.knockoutMethod === 'manual' && finishedMatches.length === 0) {
                // Create empty next round for manual mode
                const nextRound = currentRound + 1;
                const existingNextRound = tournament.knockout.find((r: any) => r.round === nextRound);
                if (!existingNextRound) {
                    tournament.knockout.push({
                        round: nextRound,
                        matches: [],
                    });
                    await tournament.save();
                }
                return true;
            }

            // For automatic mode, require finished matches
            if (tournament.tournamentSettings.knockoutMethod === 'automatic' && finishedMatches.length === 0) {
                throw new BadRequestError('No finished matches in current round');
            }

            // Get winners
            const winners = finishedMatches
                .filter(match => match.winnerId)
                .map(match => match.winnerId);

            // For the first round, check if there was a player with a bye
            let playersForNextRound = [...winners];
            if (currentRound === 1) {
                const format = tournament.tournamentSettings?.format || 'group_knockout';
                if (format === 'knockout') {
                    // Check if there was a player with a bye (odd number of players)
                    const totalPlayers = tournament.tournamentPlayers.filter((p: any) => p.status === 'checked-in').length;
                    if (totalPlayers % 2 !== 0) {
                        // Find the player who got a bye (the last one in the original list)
                        const allCheckedInPlayers = tournament.tournamentPlayers
                            .filter((p: any) => p.status === 'checked-in')
                            .sort(() => Math.random() - 0.5); // Same random order as in generateKnockout
                        
                        const playerWithBye = allCheckedInPlayers[allCheckedInPlayers.length - 1];
                        if (playerWithBye) {
                            playersForNextRound.push(playerWithBye.playerReference);
                        }
                    }
                }
            }

            if (playersForNextRound.length < 2) {
                throw new BadRequestError('Not enough players to generate next round');
            }

            // Generate next round matches
            const nextRound = currentRound + 1;
            const nextRoundMatches: any[] = [];
            const club = await ClubModel.findById(tournament.clubId);
            const availableBoards = club?.boards?.filter((board: any) => board.isActive) || [];

            if (availableBoards.length === 0) {
                throw new BadRequestError('No active boards available');
            }

            // Check if there's already a second round with a bye player
            const existingNextRound = tournament.knockout.find((r: any) => r.round === nextRound);
            if (existingNextRound && existingNextRound.matches.length > 0) {
                // There's already a second round with a bye player
                const byeMatch = existingNextRound.matches[0];
                if (byeMatch.player1 && !byeMatch.player2) {
                    // This is a bye player waiting for an opponent
                    // Find the first winner to pair with the bye player
                    if (winners.length > 0) {
                        const byePlayer = byeMatch.player1;
                        const opponent = winners[0];
                        const remainingWinners = winners.slice(1);

                        // Create match for bye player vs first winner
                        const boardIndex: number = 0 % availableBoards.length;
                        const assignedBoard: any = availableBoards[boardIndex];

                        const byePlayerMatch: any = await MatchModel.create({
                            boardReference: assignedBoard.boardNumber,
                            tournamentRef: tournament._id,
                            type: 'knockout',
                            round: nextRound,
                            player1: {
                                playerId: byePlayer,
                                legsWon: 0,
                                legsLost: 0,
                                average: 0,
                            },
                            player2: {
                                playerId: opponent,
                                legsWon: 0,
                                legsLost: 0,
                                average: 0,
                            },
                            scorer: byePlayer, // Default scorer
                            status: 'pending',
                            legs: [],
                        });

                        // Update the existing bye match
                        byeMatch.player2 = opponent;
                        byeMatch.matchReference = byePlayerMatch._id;

                        // Update board status for bye player match
                        const boardToUpdate = club.boards.find((b: any) => b.boardNumber === assignedBoard.boardNumber);
                        if (boardToUpdate) {
                            boardToUpdate.status = 'waiting';
                            boardToUpdate.nextMatch = byePlayerMatch._id;
                            boardToUpdate.currentMatch = null;
                        }

                        // Create matches for remaining winners
                        for (let i = 0; i < remainingWinners.length; i += 2) {
                            if (i + 1 < remainingWinners.length) {
                                const player1 = remainingWinners[i];
                                const player2 = remainingWinners[i + 1];
                                const boardIndex: number = (nextRoundMatches.length + 1) % availableBoards.length;
                                const assignedBoard: any = availableBoards[boardIndex];

                                const match: any = await MatchModel.create({
                                    boardReference: assignedBoard.boardNumber,
                                    tournamentRef: tournament._id,
                                    type: 'knockout',
                                    round: nextRound,
                                    player1: {
                                        playerId: player1,
                                        legsWon: 0,
                                        legsLost: 0,
                                        average: 0,
                                    },
                                    player2: {
                                        playerId: player2,
                                        legsWon: 0,
                                        legsLost: 0,
                                        average: 0,
                                    },
                                    scorer: player1, // Default scorer
                                    status: 'pending',
                                    legs: [],
                                });

                                nextRoundMatches.push({
                                    player1: player1,
                                    player2: player2,
                                    matchReference: match._id,
                                });

                                // Update board status
                                const boardToUpdate = club.boards.find((b: any) => b.boardNumber === assignedBoard.boardNumber);
                                if (boardToUpdate) {
                                    boardToUpdate.status = 'waiting';
                                    boardToUpdate.nextMatch = match._id;
                                    boardToUpdate.currentMatch = null;
                                }
                            }
                        }

                        // Update tournament knockout structure
                        existingNextRound.matches = [byeMatch, ...nextRoundMatches];
                        await tournament.save();
                        await club.save();
                        return true;
                    }
                }
            }

            // Create matches for next round (normal case)
            for (let i = 0; i < playersForNextRound.length; i += 2) {
                if (i + 1 < playersForNextRound.length) {
                    const player1 = playersForNextRound[i];
                    const player2 = playersForNextRound[i + 1];
                    const boardIndex: number = (nextRoundMatches.length) % availableBoards.length;
                    const assignedBoard: any = availableBoards[boardIndex];

                    const match: any = await MatchModel.create({
                        boardReference: assignedBoard.boardNumber,
                        tournamentRef: tournament._id,
                        type: 'knockout',
                        round: nextRound,
                        player1: {
                            playerId: player1,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        },
                        player2: {
                            playerId: player2,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        },
                        scorer: player1, // Default scorer
                        status: 'pending',
                        legs: [],
                    });

                    nextRoundMatches.push({
                        player1: player1,
                        player2: player2,
                        matchReference: match._id,
                    });

                    // Update board status
                    const boardToUpdate = club.boards.find((b: any) => b.boardNumber === assignedBoard.boardNumber);
                    if (boardToUpdate) {
                        boardToUpdate.status = 'waiting';
                        boardToUpdate.nextMatch = match._id;
                        boardToUpdate.currentMatch = null;
                    }
                }
            }

            // Update tournament knockout structure
            if (existingNextRound) {
                existingNextRound.matches = nextRoundMatches;
            } else {
                tournament.knockout.push({
                    round: nextRound,
                    matches: nextRoundMatches,
                });
            }

            await tournament.save();
            await club.save();

            return true;
        } catch (err) {
            console.error('generateNextKnockoutRound error:', err);
            return false;
        }
    }

    static async updateBoardStatusAfterMatch(matchId: string): Promise<boolean> {
        try {
            await connectMongo();
            const match = await MatchModel.findById(matchId);
            if (!match) {
                throw new BadRequestError('Match not found');
            }

            const tournament = await TournamentModel.findById(match.tournamentRef);
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            const club = await ClubModel.findById(tournament.clubId);
            if (!club) {
                throw new BadRequestError('Club not found');
            }

            // Find the board that had this match
            const board = club.boards.find((b: any) => b.boardNumber === match.boardReference);
            if (!board) {
                throw new BadRequestError('Board not found');
            }

            // Update board status based on match status
            if (match.status === 'finished') {
                // Check if there are more matches in the current round
                const currentRound = tournament.knockout.find((r: any) => 
                    r.matches.some((m: any) => {
                        const matchRef = typeof m.matchReference === 'object' ? m.matchReference._id : m.matchReference;
                        return matchRef?.toString() === matchId;
                    })
                );

                if (currentRound) {
                    const unfinishedMatches = currentRound.matches.filter((m: any) => {
                        const matchRef = typeof m.matchReference === 'object' ? m.matchReference._id : m.matchReference;
                        return matchRef && matchRef.toString() !== matchId;
                    });

                    if (unfinishedMatches.length > 0) {
                        // Set board to idle until next match is assigned
                        board.status = 'idle';
                        board.currentMatch = null;
                        board.nextMatch = null;
                    } else {
                        // All matches in this round are finished, check if we need to generate next round
                        const matchIds = currentRound.matches
                            .map((m: any) => m.matchReference)
                            .filter(Boolean)
                            .map((ref: any) => typeof ref === 'object' ? ref._id : ref);
                        
                        const allMatchesFinished = await MatchModel.find({
                            _id: { $in: matchIds },
                            status: 'finished'
                        });

                        if (allMatchesFinished.length === currentRound.matches.length) {
                            // Generate next round if there are enough winners
                            const winners = allMatchesFinished
                                .filter(m => m.winnerId)
                                .map(m => m.winnerId);

                            if (winners.length >= 2) {
                                await this.generateNextKnockoutRound(tournament.tournamentId, currentRound.round);
                            } else {
                                // Tournament finished
                                board.status = 'idle';
                                board.currentMatch = null;
                                board.nextMatch = null;
                            }
                        }
                    }
                } else {
                    // Match not found in knockout structure, set board to idle
                    board.status = 'idle';
                    board.currentMatch = null;
                    board.nextMatch = null;
                }
            } else if (match.status === 'ongoing') {
                board.status = 'playing';
                board.currentMatch = match._id;
                board.nextMatch = null;
            }

            await club.save();
            return true;
        } catch (err) {
            console.error('updateBoardStatusAfterMatch error:', err);
            return false;
        }
    }

    static async generateManualKnockout(tournamentCode: string): Promise<boolean> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new Error('Tournament not found');
            }

            // Check if tournament format allows knockout generation from current status
            const format = tournament.tournamentSettings?.format || 'group_knockout';
            const status = tournament.tournamentSettings?.status;
            
            if (format === 'knockout') {
                // For knockout-only tournaments, allow generation from pending status
                if (status !== 'pending') {
                    throw new Error('Knockout tournaments can only be generated from pending status');
                }
            } else {
                // For group_knockout tournaments, require group-stage status
                if (status !== 'group-stage') {
                    throw new Error('Knockout can only be generated after group stage');
                }
            }

            // Create empty first round for manual knockout
            const emptyRound = {
                round: 1,
                matches: []
            };

            // Update tournament
            tournament.knockout = [emptyRound];
            tournament.tournamentSettings.status = 'knockout';
            tournament.tournamentSettings.knockoutMethod = 'manual';

            await tournament.save();

            return true;
        } catch (error) {
            console.error('Generate manual knockout error:', error);
            throw error;
        }
    }

    static async addManualMatch(tournamentId: string, matchData: {
        round: number;
        player1Id: string;
        player2Id: string;
    }): Promise<any> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Validate players exist in tournament
            const player1 = tournament.tournamentPlayers.find((p: any) => 
                p.playerReference.toString() === matchData.player1Id
            );
            const player2 = tournament.tournamentPlayers.find((p: any) => 
                p.playerReference.toString() === matchData.player2Id
            );

            if (!player1 || !player2) {
                throw new BadRequestError('One or both players not found in tournament');
            }

            // Find the round
            const round = tournament.knockout.find((r: any) => r.round === matchData.round);
            if (!round) {
                throw new BadRequestError(`Round ${matchData.round} not found`);
            }

            // Get available boards
            const club = await ClubModel.findById(tournament.clubId);
            if (!club || !club.boards) {
                throw new BadRequestError('Club boards not found');
            }

            const availableBoards = club.boards.filter((board: any) => board.isActive);
            if (availableBoards.length === 0) {
                throw new BadRequestError('No active boards available');
            }

            // Assign board in round-robin fashion
            const boardIndex = round.matches.length % availableBoards.length;
            const assignedBoard = availableBoards[boardIndex];

            // Create match
            const match = await MatchModel.create({
                boardReference: assignedBoard.boardNumber,
                tournamentRef: tournament._id,
                type: 'knockout',
                round: matchData.round,
                player1: {
                    playerId: matchData.player1Id,
                    legsWon: 0,
                    legsLost: 0,
                    average: 0,
                },
                player2: {
                    playerId: matchData.player2Id,
                    legsWon: 0,
                    legsLost: 0,
                    average: 0,
                },
                scorer: matchData.player1Id, // Default scorer
                status: 'pending',
                legs: [],
            });

            // Add match to round
            round.matches.push({
                player1: matchData.player1Id,
                player2: matchData.player2Id,
                matchReference: match._id,
            });

            // Update board status
            const boardToUpdate = club.boards.find((b: any) => b.boardNumber === assignedBoard.boardNumber);
            if (boardToUpdate) {
                boardToUpdate.status = 'waiting';
                boardToUpdate.nextMatch = match._id;
                boardToUpdate.currentMatch = null;
            }

            await tournament.save();
            await club.save();

            return match;
        } catch (err) {
            console.error('addManualMatch error:', err);
            return false;
        }
    }

    static async finishTournament(tournamentCode: string): Promise<boolean> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new Error('Tournament not found');
            }

            const format = tournament.tournamentSettings?.format || 'group_knockout';
            const tournamentPlayers = tournament.tournamentPlayers || [];
            const finalStandings: any[] = [];

            // Calculate final standings based on tournament format
            if (format === 'group' || format === 'group_knockout') {
                // For group tournaments, calculate standings from groups
                await this.updateGroupStanding(tournament.tournamentId);
                
                // Get updated tournament with group standings
                const updatedTournament = await this.getTournament(tournamentCode);
                
                // Sort players by group standing and group ordinal
                const sortedPlayers = updatedTournament.tournamentPlayers
                    .filter((p: any) => p.status === 'checked-in')
                    .sort((a: any, b: any) => {
                        // First sort by group standing
                        if (a.groupStanding !== b.groupStanding) {
                            return (a.groupStanding || 999) - (b.groupStanding || 999);
                        }
                        // Then by group ordinal number
                        return (a.groupOrdinalNumber || 999) - (b.groupOrdinalNumber || 999);
                    });

                // Assign final positions
                sortedPlayers.forEach((player: any, index: number) => {
                    finalStandings.push({
                        playerId: player.playerReference,
                        position: index + 1,
                        eliminatedIn: 'group-stage',
                        stats: player.stats || {}
                    });
                });
            }

            if (format === 'knockout' || format === 'group_knockout') {
                // For knockout tournaments, calculate standings from knockout rounds
                if (tournament.knockout && tournament.knockout.length > 0) {
                    const knockoutStandings = this.calculateKnockoutStandings(tournament);
                    finalStandings.push(...knockoutStandings);
                }
            }

            // If no knockout data, use group standings
            if (finalStandings.length === 0 && (format === 'group' || format === 'group_knockout')) {
                const sortedPlayers = tournamentPlayers
                    .filter((p: any) => p.status === 'checked-in')
                    .sort((a: any, b: any) => {
                        if (a.groupStanding !== b.groupStanding) {
                            return (a.groupStanding || 999) - (b.groupStanding || 999);
                        }
                        return (a.groupOrdinalNumber || 999) - (b.groupOrdinalNumber || 999);
                    });

                sortedPlayers.forEach((player: any, index: number) => {
                    finalStandings.push({
                        playerId: player.playerReference,
                        position: index + 1,
                        eliminatedIn: 'group-stage',
                        stats: player.stats || {}
                    });
                });
            }

            // Update tournament players with final standings
            tournament.tournamentPlayers = tournament.tournamentPlayers.map((player: any) => {
                const finalStanding = finalStandings.find((standing: any) => 
                    standing.playerId?.toString() === player.playerReference?.toString()
                );
                
                if (finalStanding) {
                    return {
                        ...player,
                        finalPosition: finalStanding.position,
                        eliminatedIn: finalStanding.eliminatedIn,
                        finalStats: finalStanding.stats
                    };
                }
                return player;
            });

            // Update player collection statistics
            for (const standing of finalStandings) {
                const player = await PlayerModel.findById(standing.playerId);
                if (player) {
                    // Update tournament history
                    const tournamentHistory = {
                        tournamentId: tournament.tournamentId,
                        tournamentName: tournament.tournamentSettings?.name || 'Unknown Tournament',
                        position: standing.position,
                        eliminatedIn: standing.eliminatedIn,
                        stats: standing.stats,
                        date: new Date()
                    };

                    if (!player.tournamentHistory) {
                        player.tournamentHistory = [];
                    }
                    player.tournamentHistory.push(tournamentHistory);

                    // Update overall statistics
                    if (!player.statistics) {
                        player.statistics = {
                            tournamentsPlayed: 0,
                            bestPosition: 999,
                            totalMatchesWon: 0,
                            totalMatchesLost: 0,
                            totalLegsWon: 0,
                            totalLegsLost: 0,
                            total180s: 0,
                            highestCheckout: 0,
                            averagePosition: 0
                        };
                    }

                    // Update tournament count
                    player.statistics.tournamentsPlayed += 1;

                    // Update best position
                    if (standing.position < player.statistics.bestPosition) {
                        player.statistics.bestPosition = standing.position;
                    }

                    // Update match statistics
                    player.statistics.totalMatchesWon += standing.stats.matchesWon || 0;
                    player.statistics.totalMatchesLost += standing.stats.matchesLost || 0;
                    player.statistics.totalLegsWon += standing.stats.legsWon || 0;
                    player.statistics.totalLegsLost += standing.stats.legsLost || 0;
                    player.statistics.total180s += standing.stats.oneEightiesCount || 0;

                    // Update highest checkout
                    if (standing.stats.highestCheckout && standing.stats.highestCheckout > player.statistics.highestCheckout) {
                        player.statistics.highestCheckout = standing.stats.highestCheckout;
                    }

                    // Calculate average position
                    const totalPosition = player.tournamentHistory.reduce((sum: number, hist: any) => sum + hist.position, 0);
                    player.statistics.averagePosition = totalPosition / player.tournamentHistory.length;

                    await player.save();
                }
            }

            // Update tournament status to finished
            tournament.tournamentSettings.status = 'finished';
            await tournament.save();

            return true;
        } catch (error) {
            console.error('Finish tournament error:', error);
            return false;
        }
    }

    private static calculateKnockoutStandings(tournament: any): any[] {
        const standings: any[] = [];
        const knockout = tournament.knockout || [];
        const totalRounds = knockout.length;

        // Find the winner (last round, first match winner)
        if (totalRounds > 0) {
            const finalRound = knockout[totalRounds - 1];
            if (finalRound.matches && finalRound.matches.length > 0) {
                const finalMatch = finalRound.matches[0];
                if (finalMatch.matchReference && finalMatch.matchReference.winnerId) {
                    standings.push({
                        playerId: finalMatch.matchReference.winnerId,
                        position: 1,
                        eliminatedIn: 'final',
                        stats: this.getPlayerStatsFromMatch(finalMatch.matchReference, finalMatch.matchReference.winnerId)
                    });
                }
            }
        }

        // Find runner-up (last round, first match loser)
        if (totalRounds > 0) {
            const finalRound = knockout[totalRounds - 1];
            if (finalRound.matches && finalRound.matches.length > 0) {
                const finalMatch = finalRound.matches[0];
                if (finalMatch.matchReference) {
                    const winnerId = finalMatch.matchReference.winnerId;
                    const loserId = winnerId === finalMatch.player1?.toString() ? 
                        finalMatch.player2?.toString() : finalMatch.player1?.toString();
                    
                    if (loserId) {
                        standings.push({
                            playerId: loserId,
                            position: 2,
                            eliminatedIn: 'final',
                            stats: this.getPlayerStatsFromMatch(finalMatch.matchReference, loserId)
                        });
                    }
                }
            }
        }

        // Find players eliminated in semi-finals (second to last round)
        if (totalRounds > 1) {
            const semiFinalRound = knockout[totalRounds - 2];
            if (semiFinalRound.matches) {
                semiFinalRound.matches.forEach((match: any) => {
                    if (match.matchReference) {
                        const winnerId = match.matchReference.winnerId;
                        const loserId = winnerId === match.player1?.toString() ? 
                            match.player2?.toString() : match.player1?.toString();
                        
                        if (loserId && !standings.find(s => s.playerId?.toString() === loserId)) {
                            standings.push({
                                playerId: loserId,
                                position: standings.length + 1,
                                eliminatedIn: 'semi-final',
                                stats: this.getPlayerStatsFromMatch(match.matchReference, loserId)
                            });
                        }
                    }
                });
            }
        }

        // Find players eliminated in earlier rounds
        for (let roundIndex = 0; roundIndex < totalRounds - 2; roundIndex++) {
            const round = knockout[roundIndex];
            if (round.matches) {
                round.matches.forEach((match: any) => {
                    if (match.matchReference) {
                        const winnerId = match.matchReference.winnerId;
                        const loserId = winnerId === match.player1?.toString() ? 
                            match.player2?.toString() : match.player1?.toString();
                        
                        if (loserId && !standings.find(s => s.playerId?.toString() === loserId)) {
                            standings.push({
                                playerId: loserId,
                                position: standings.length + 1,
                                eliminatedIn: `${round.round}. kör`,
                                stats: this.getPlayerStatsFromMatch(match.matchReference, loserId)
                            });
                        }
                    }
                });
            }
        }

        // Add players who didn't participate in knockout (if any)
        const knockoutPlayerIds = standings.map(s => s.playerId?.toString());
        const allCheckedInPlayers = tournament.tournamentPlayers.filter((p: any) => p.status === 'checked-in');
        
        allCheckedInPlayers.forEach((player: any) => {
            const playerId = player.playerReference?.toString();
            if (!knockoutPlayerIds.includes(playerId)) {
                standings.push({
                    playerId: player.playerReference,
                    position: standings.length + 1,
                    eliminatedIn: 'group-stage',
                    stats: player.stats || {}
                });
            }
        });

        return standings;
    }

    private static getPlayerStatsFromMatch(matchReference: any, playerId: string): any {
        if (!matchReference) return {};

        const playerIdStr = playerId?.toString();
        const player1Id = matchReference.player1?.playerId?.toString();
        const player2Id = matchReference.player2?.playerId?.toString();

        if (playerIdStr === player1Id) {
            return {
                matchesWon: matchReference.winnerId?.toString() === playerIdStr ? 1 : 0,
                matchesLost: matchReference.winnerId?.toString() === playerIdStr ? 0 : 1,
                legsWon: matchReference.player1?.legsWon || 0,
                legsLost: matchReference.player1?.legsLost || 0,
                oneEightiesCount: matchReference.player1?.oneEightiesCount || 0,
                highestCheckout: matchReference.player1?.highestCheckout || 0
            };
        } else if (playerIdStr === player2Id) {
            return {
                matchesWon: matchReference.winnerId?.toString() === playerIdStr ? 1 : 0,
                matchesLost: matchReference.winnerId?.toString() === playerIdStr ? 0 : 1,
                legsWon: matchReference.player2?.legsWon || 0,
                legsLost: matchReference.player2?.legsLost || 0,
                oneEightiesCount: matchReference.player2?.oneEightiesCount || 0,
                highestCheckout: matchReference.player2?.highestCheckout || 0
            };
        }

        return {};
    }
}