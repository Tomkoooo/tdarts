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
    // Initialize indexes when the service is first used
    private static indexesInitialized = false;
    
    private static async ensureIndexes() {
        if (this.indexesInitialized) return;
        
        try {
            await connectMongo();
            
            // Ensure tournamentId index exists
            await TournamentModel.collection.createIndex({ tournamentId: 1 }, { unique: true });
            
            // Drop any problematic indexes
            try {
                await TournamentModel.collection.dropIndex('code_1');
            } catch (error) {
                // Index doesn't exist, which is fine
            }
            
            this.indexesInitialized = true;
            console.log('✅ Tournament indexes initialized');
        } catch (error) {
            console.error('❌ Failed to initialize tournament indexes:', error);
        }
    }
    
    static async createTournament(tournament: Partial<Omit<TournamentDocument, keyof Document>>): Promise<TournamentDocument> {
        await this.ensureIndexes();
        await connectMongo();
        
        // Generate a unique tournamentId if not provided
        if (!tournament.tournamentId) {
            let tournamentId: string;
            let isUnique = false;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (!isUnique && attempts < maxAttempts) {
                // Generate a random 4-character alphanumeric string
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                tournamentId = '';
                for (let i = 0; i < 4; i++) {
                    tournamentId += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                
                // Check if this ID already exists
                const existingTournament = await TournamentModel.findOne({ tournamentId });
                if (!existingTournament) {
                    isUnique = true;
                }
                attempts++;
            }
            
            if (!isUnique) {
                throw new Error('Failed to generate unique tournament ID after multiple attempts');
            }
            
            tournament.tournamentId = tournamentId!;
        }
        
        // Ensure no code field is present (to avoid duplicate key errors)
        const tournamentData = { ...tournament };
        delete (tournamentData as any).code;
        
        const newTournament = new TournamentModel(tournamentData);
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
                                { path: 'player2.playerId', model: 'Player' },
                                { path: 'scorer', model: 'Player' }
                            ]
                        },
                        {
                            path: 'nextMatch',
                            model: 'Match',
                            populate: [
                                { path: 'player1.playerId', model: 'Player' },
                                { path: 'player2.playerId', model: 'Player' },
                                { path: 'scorer', model: 'Player' }
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
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentId })
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }
        const player = await PlayerModel.findOne({ userRef: userId });
        const playerStatus = tournament.tournamentPlayers.find(
            (p: TournamentPlayer) => {
                const playerRefId = p.playerReference?.toString() || p.playerReference?.toString();
                return playerRefId === player?._id?.toString();
            }
        );
        return playerStatus?.status;
    }

    //method to add, remove and update tournament players status, the rquest takes the player._id form the player collection
    static async addTournamentPlayer(tournamentId: string, playerId: string): Promise<boolean> {
        try {
            await this.ensureIndexes();
            await connectMongo();
            
            // Check if player exists
            const player = await PlayerModel.findOne({ _id: playerId });
            if (!player) {
                throw new BadRequestError('Player not found');
            }
            
            // Check if player is already in tournament
            const existingPlayer = await TournamentModel.findOne({
                tournamentId: tournamentId,
                'tournamentPlayers.playerReference': player._id
            });
            
            if (existingPlayer) {
                console.log(`Player ${playerId} is already in tournament ${tournamentId}`);
                return true; // Player already exists, consider it success
            }
            
            // Use atomic operation to add player
            const result = await TournamentModel.updateOne(
                { tournamentId: tournamentId },
                { 
                    $push: { 
                        tournamentPlayers: { 
                            playerReference: player._id, 
                            status: 'applied',
                            stats: {
                                matchesWon: 0,
                                matchesLost: 0,
                                legsWon: 0,
                                legsLost: 0,
                                avg: 0,
                                oneEightiesCount: 0,
                                highestCheckout: 0,
                            }
                        } 
                    } 
                }
            );
            
            if (result.matchedCount === 0) {
                throw new BadRequestError('Tournament not found');
            }
            
            return true;
        } catch (err) {
            console.error('addTournamentPlayer error:', err);
            return false;
        }
    }

    static async removeTournamentPlayer(tournamentId: string, playerId: string): Promise<boolean> {
        try {
            await connectMongo();
            
            // Use atomic operation to remove player
            const result = await TournamentModel.updateOne(
                { tournamentId: tournamentId },
                { 
                    $pull: { 
                        tournamentPlayers: { 
                            playerReference: playerId 
                        } 
                    } 
                }
            );
            
            if (result.matchedCount === 0) {
                throw new BadRequestError('Tournament not found');
            }
            
            return true;
        } catch (err) {
            console.error('removeTournamentPlayer error:', err);
            return false;
        }
    }

    static async updateTournamentPlayerStatus(tournamentId: string, playerId: string, status: string): Promise<boolean> {
        try {
            await connectMongo();
            
            // Use atomic operation to update player status
            const result = await TournamentModel.updateOne(
                { 
                    tournamentId: tournamentId,
                    'tournamentPlayers.playerReference': playerId
                },
                { 
                    $set: { 
                        'tournamentPlayers.$.status': status 
                    } 
                }
            );
            
            if (result.matchedCount === 0) {
                throw new BadRequestError('Tournament or player not found');
            }
            
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
                console.log(`Group ${group.board}: ${playerCount} players`);
                
                if (playerCount < 3 || playerCount > 6) {
                    console.log(`Skipping group ${group.board}: playerCount ${playerCount} is not supported (need 3-5)`);
                    continue;
                }

                const rrMatches = roundRobin(playerCount);
                if (!rrMatches) {
                    console.log(`No round robin matches generated for group ${group.board} with ${playerCount} players`);
                    continue;
                }
                
                console.log(`Generated ${rrMatches.length} matches for group ${group.board}`);

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

        // Group players by their groupId for cross-group pairing
        const playersByGroup = new Map();
        playersForFirstRound.forEach(player => {
            const groupId = player.groupId;
            if (!playersByGroup.has(groupId)) {
                playersByGroup.set(groupId, []);
            }
            playersByGroup.get(groupId).push(player);
        });

        // Sort players within each group by their group standing
        playersByGroup.forEach((players, groupId) => {
            players.sort((a: any, b: any) => {
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
        });

        // Create cross-group pairings
        const firstRoundMatches = [];
        const groupIds = Array.from(playersByGroup.keys());
        
        // Pair groups: 1st group vs 2nd group, 3rd vs 4th, etc.
        for (let i = 0; i < groupIds.length; i += 2) {
            const group1Id = groupIds[i];
            const group2Id = groupIds[i + 1];
            
            if (group2Id) {
                const group1Players = playersByGroup.get(group1Id);
                const group2Players = playersByGroup.get(group2Id);
                
                // Pair players: 1st from group1 vs last from group2, 2nd from group1 vs 2nd-last from group2, etc.
                const maxPlayers = Math.max(group1Players.length, group2Players.length);
                
                for (let j = 0; j < maxPlayers; j++) {
                    const player1 = group1Players[j];
                    const player2 = group2Players[group2Players.length - 1 - j];
                    
                    if (player1 && player2) {
                        firstRoundMatches.push({
                            player1: player1.playerReference,
                            player2: player2.playerReference,
                        });
                    }
                }
            }
        }

        // If there's a player with a bye, add them to the second round
        if (playerWithBye) {
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

            console.log('=== FINISH TOURNAMENT DEBUG ===');
            console.log('Tournament ID:', tournament._id);
            console.log('Tournament Code:', tournament.tournamentId);
            console.log('Tournament Settings:', JSON.stringify(tournament.tournamentSettings, null, 2));
            console.log('Tournament Players Count:', tournament.tournamentPlayers?.length || 0);
            console.log('==============================');

            const format = tournament.tournamentSettings?.format || 'group_knockout';
            const tournamentPlayers = tournament.tournamentPlayers || [];
            const checkedInPlayers = tournamentPlayers.filter((p: any) => p.status === 'checked-in');

            if (checkedInPlayers.length === 0) {
                throw new Error('No checked-in players found');
            }

            // Compute final standings
            const standings: { playerId: string; rank: number }[] = [];
            const playerEliminations: Map<string, number> = new Map();

            // Step 1: Identify group stage eliminations
            const totalPlayers = checkedInPlayers.length;
            const nearestPowerOf2 = Math.pow(2, Math.floor(Math.log2(totalPlayers)));
            const playersToEliminate = totalPlayers - nearestPowerOf2;
            const groupCount = tournament.groups?.length || 0;
            const playersPerGroup = groupCount > 0 ? Math.ceil(totalPlayers / groupCount) : 0;
            const eliminationsPerGroup = groupCount > 0 ? Math.ceil(playersToEliminate / groupCount) : 0;

            const playersAdvanced = new Set<string>();

            // Process group standings if groups exist
            if (groupCount > 0) {
                // Get players by group and sort them by groupStanding
                const playersByGroup = new Map<string, any[]>();
                
                checkedInPlayers.forEach((player: any) => {
                    if (player.groupId) {
                        const groupId = player.groupId.toString();
                        if (!playersByGroup.has(groupId)) {
                            playersByGroup.set(groupId, []);
                        }
                        playersByGroup.get(groupId)!.push(player);
                    }
                });

                // Sort players in each group by groupStanding
                for (const [groupId, players] of playersByGroup) {
                    const sortedPlayers = players.sort((a: any, b: any) => {
                        // First sort by groupStanding
                        if (a.groupStanding !== b.groupStanding) {
                            return (a.groupStanding || 999) - (b.groupStanding || 999);
                        }
                        // Then by groupOrdinalNumber
                        return (a.groupOrdinalNumber || 999) - (b.groupOrdinalNumber || 999);
                    });
                    
                    const advanceCount = Math.max(0, playersPerGroup - eliminationsPerGroup);
                    sortedPlayers.slice(0, advanceCount).forEach((player: any) => {
                        const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                        if (playerId) playersAdvanced.add(playerId);
                    });
                }

                // Ensure exactly nearestPowerOf2 players advance
                if (playersAdvanced.size > nearestPowerOf2) {
                    // Sort all players by groupStanding and groupOrdinalNumber
                    const allPlayers = checkedInPlayers.sort((a: any, b: any) => {
                        if (a.groupStanding !== b.groupStanding) {
                            return (a.groupStanding || 999) - (b.groupStanding || 999);
                        }
                        return (a.groupOrdinalNumber || 999) - (b.groupOrdinalNumber || 999);
                    });
                    
                    playersAdvanced.clear();
                    allPlayers.slice(0, nearestPowerOf2).forEach((player: any) => {
                        const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                        if (playerId) playersAdvanced.add(playerId);
                    });
                } else if (playersAdvanced.size < nearestPowerOf2) {
                    throw new Error('Not enough players advanced from groups');
                }

                // Assign ranks to eliminated players
                const groupEliminated = checkedInPlayers
                    .map((p: any) => p.playerReference?._id?.toString() || p.playerReference?.toString())
                    .filter((p: any) => p && !playersAdvanced.has(p));
                groupEliminated.forEach((playerId: string, index: number) => {
                    playerEliminations.set(playerId, nearestPowerOf2 + 1 + index);
                });
            }

            // Step 2: Process knockout rounds
            if (tournament.knockout && Array.isArray(tournament.knockout)) {
                for (let roundIndex = 0; roundIndex < tournament.knockout.length; roundIndex++) {
                    const round = tournament.knockout[roundIndex];
                    const matches = round.matches || [];
                    const isFinalRound = roundIndex === tournament.knockout.length - 1;

                    for (const match of matches) {
                        const matchRef = match.matchReference;
                        if (!matchRef) {
                            throw new Error(`Incomplete match in round ${roundIndex + 1}`);
                        }

                        // Handle both populated and non-populated matchReference
                        const matchRefObj = typeof matchRef === 'object' ? matchRef : null;
                        if (!matchRefObj || !(matchRefObj as any).winnerId) {
                            throw new Error(`Incomplete match in round ${roundIndex + 1}`);
                        }

                        if (!match.player1 || !match.player2) {
                            throw new Error(`Invalid players in match in round ${roundIndex + 1}`);
                        }

                        const winnerId = (matchRefObj as any).winnerId.toString();
                        const player1Id = typeof match.player1 === 'object' ? (match.player1 as any)._id?.toString() : match.player1?.toString();
                        const player2Id = typeof match.player2 === 'object' ? (match.player2 as any)._id?.toString() : match.player2?.toString();
                        const loserId = winnerId === player1Id ? player2Id : player1Id;

                        if (loserId && !playerEliminations.has(loserId)) {
                            if (isFinalRound) {
                                playerEliminations.set(loserId, 2);
                            } else {
                                const playersInRound = nearestPowerOf2 / Math.pow(2, roundIndex);
                                const rankStart = playersInRound / 2 + 1;
                                const rankEnd = playersInRound;
                                playerEliminations.set(
                                    loserId,
                                    rankStart + (playerEliminations.size % (rankEnd - rankStart + 1))
                                );
                            }
                        }
                    }

                    if (isFinalRound) {
                        const finalMatch = matches[0];
                        if (finalMatch.matchReference && typeof finalMatch.matchReference === 'object' && (finalMatch.matchReference as any).winnerId) {
                            const winnerId = (finalMatch.matchReference as any).winnerId.toString();
                            playerEliminations.set(winnerId, 1);
                        } else {
                            throw new Error('Final match is incomplete');
                        }
                    }
                }
            }

            // Verify all players have ranks
            checkedInPlayers.forEach((player: any) => {
                const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                if (playerId && !playerEliminations.has(playerId)) {
                    playerEliminations.set(playerId, nearestPowerOf2);
                }
                if (playerId) {
                    standings.push({ playerId, rank: playerEliminations.get(playerId)! });
                }
            });

            // Step 3: Compute stats for each player
            const playerStats = new Map<string, {
                average: number;
                checkoutRate: number;
                legsWon: number;
                legsPlayed: number;
                matchesWon: number;
                matchesPlayed: number;
                highestCheckout: number;
                oneEighties: number;
            }>();

            // Initialize stats
            checkedInPlayers.forEach((player: any) => {
                const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                if (playerId) {
                    playerStats.set(playerId, {
                        average: 0,
                        checkoutRate: 0,
                        legsWon: 0,
                        legsPlayed: 0,
                        matchesWon: 0,
                        matchesPlayed: 0,
                        highestCheckout: 0,
                        oneEighties: 0,
                    });
                }
            });

            // Aggregate stats from matches
            const allMatches: any[] = [];

            // Add group matches
            if (tournament.groups) {
                for (const group of tournament.groups) {
                    if (group.matches && Array.isArray(group.matches)) {
                        allMatches.push(...group.matches);
                    }
                }
            }

            // Add knockout matches
            if (tournament.knockout) {
                for (const round of tournament.knockout) {
                    if (round.matches && Array.isArray(round.matches)) {
                        for (const match of round.matches) {
                            if (match.matchReference) {
                                allMatches.push(match.matchReference);
                            }
                        }
                    }
                }
            }

            // Process all matches for stats
            for (const match of allMatches) {
                if (!match.player1 || !match.player2) continue;

                const player1Id = match.player1?._id?.toString() || match.player1?.toString();
                const player2Id = match.player2?._id?.toString() || match.player2?.toString();

                if (!player1Id || !player2Id) continue;

                const p1Stats = playerStats.get(player1Id);
                const p2Stats = playerStats.get(player2Id);

                if (!p1Stats || !p2Stats) continue;

                // Update match stats
                p1Stats.matchesPlayed += 1;
                p2Stats.matchesPlayed += 1;

                if (match.winnerId) {
                    const winnerId = match.winnerId.toString();
                    if (winnerId === player1Id) p1Stats.matchesWon += 1;
                    else if (winnerId === player2Id) p2Stats.matchesWon += 1;
                }

                // Initialize stats from match.stats as fallback
                if (match.stats) {
                    p1Stats.average = match.stats.player1?.average || 0;
                    p2Stats.average = match.stats.player2?.average || 0;
                    p1Stats.highestCheckout = match.stats.player1?.highestCheckout || 0;
                    p2Stats.highestCheckout = match.stats.player2?.highestCheckout || 0;
                    p1Stats.oneEighties = match.stats.player1?.oneEightiesCount || 0;
                    p2Stats.oneEighties = match.stats.player2?.oneEightiesCount || 0;
                }

                // Aggregate stats from legs
                if (match.legs && Array.isArray(match.legs)) {
                    for (const leg of match.legs) {
                        p1Stats.legsPlayed += 1;
                        p2Stats.legsPlayed += 1;

                        if (leg.winnerId) {
                            const legWinnerId = leg.winnerId.toString();
                            if (legWinnerId === player1Id) p1Stats.legsWon += 1;
                            else if (legWinnerId === player2Id) p2Stats.legsWon += 1;
                        }

                        // Update highest checkout from leg
                        if (leg.highestCheckout) {
                            const checkoutPlayerId = leg.highestCheckout.playerId?.toString();
                            if (checkoutPlayerId === player1Id) {
                                p1Stats.highestCheckout = Math.max(
                                    p1Stats.highestCheckout,
                                    leg.highestCheckout.score || 0
                                );
                            } else if (checkoutPlayerId === player2Id) {
                                p2Stats.highestCheckout = Math.max(
                                    p2Stats.highestCheckout,
                                    leg.highestCheckout.score || 0
                                );
                            }
                        }

                        // Update one-eighties from leg
                        if (leg.oneEighties) {
                            p1Stats.oneEighties = Math.max(
                                p1Stats.oneEighties,
                                leg.oneEighties.player1?.length || 0
                            );
                            p2Stats.oneEighties = Math.max(
                                p2Stats.oneEighties,
                                leg.oneEighties.player2?.length || 0
                            );
                        }

                        // Compute average from throws
                        if (leg.player1Throws && Array.isArray(leg.player1Throws)) {
                            const p1TotalScore = leg.player1Throws.reduce((sum: number, t: any) => sum + (t.score || 0), 0);
                            const p1Darts = leg.player1Throws.reduce((sum: number, t: any) => sum + (t.darts || 0), 0);
                            if (p1Darts > 0) {
                                const legAverage = p1TotalScore / (p1Darts / 3);
                                p1Stats.average = p1Stats.legsPlayed > 1
                                    ? (p1Stats.average * (p1Stats.legsPlayed - 1) + legAverage) / p1Stats.legsPlayed
                                    : legAverage;
                            }
                        }

                        if (leg.player2Throws && Array.isArray(leg.player2Throws)) {
                            const p2TotalScore = leg.player2Throws.reduce((sum: number, t: any) => sum + (t.score || 0), 0);
                            const p2Darts = leg.player2Throws.reduce((sum: number, t: any) => sum + (t.darts || 0), 0);
                            if (p2Darts > 0) {
                                const legAverage = p2TotalScore / (p2Darts / 3);
                                p2Stats.average = p2Stats.legsPlayed > 1
                                    ? (p2Stats.average * (p2Stats.legsPlayed - 1) + legAverage) / p2Stats.legsPlayed
                                    : legAverage;
                            }
                        }
                    }
                }
            }

            // Step 4: Update tournament players with final standings
            tournament.tournamentPlayers = tournament.tournamentPlayers.map((player: any) => {
                const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                const standing = standings.find(s => s.playerId === playerId);
                
                if (standing) {
                    const stats = playerStats.get(playerId);
                    return {
                        ...player,
                        finalPosition: standing.rank,
                        eliminatedIn: this.getEliminationText(standing.rank, format),
                        finalStats: stats || {}
                    };
                }
                return player;
            });

            // Step 5: Update Player collection statistics
            for (const [playerId, stats] of playerStats) {
                const player = await PlayerModel.findById(playerId);
                if (player) {
                    const placement = playerEliminations.get(playerId) || 999;
                    const isWinner = placement === 1;

                    // Update tournament history
                    const tournamentHistory = {
                        tournamentId: tournament.tournamentId,
                        tournamentName: tournament.tournamentSettings?.name || 'Unknown Tournament',
                        position: placement,
                        eliminatedIn: this.getEliminationText(placement, format),
                        stats: {
                            matchesWon: stats.matchesWon,
                            matchesLost: stats.matchesPlayed - stats.matchesWon,
                            legsWon: stats.legsWon,
                            legsLost: stats.legsPlayed - stats.legsWon,
                            oneEightiesCount: stats.oneEighties,
                            highestCheckout: stats.highestCheckout,
                        },
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
                    if (placement < player.statistics.bestPosition) {
                        player.statistics.bestPosition = placement;
                    }

                    // Update match statistics
                    player.statistics.totalMatchesWon += stats.matchesWon;
                    player.statistics.totalMatchesLost += (stats.matchesPlayed - stats.matchesWon);
                    player.statistics.totalLegsWon += stats.legsWon;
                    player.statistics.totalLegsLost += (stats.legsPlayed - stats.legsWon);
                    player.statistics.total180s += stats.oneEighties;

                    // Update highest checkout
                    if (stats.highestCheckout > player.statistics.highestCheckout) {
                        player.statistics.highestCheckout = stats.highestCheckout;
                    }

                    // Calculate average position
                    const totalPosition = player.tournamentHistory.reduce((sum: number, hist: any) => sum + hist.position, 0);
                    player.statistics.averagePosition = totalPosition / player.tournamentHistory.length;

                    await player.save();
                }
            }

            // Step 6: Update tournament status to finished
            console.log('=== DATABASE UPDATE DEBUG ===');
            console.log('Updating tournament with ID:', tournament._id);
            console.log('Current tournament status:', tournament.tournamentSettings?.status);
            console.log('Current tournamentPlayers count:', tournament.tournamentPlayers?.length || 0);
            console.log('Sample tournamentPlayer:', JSON.stringify(tournament.tournamentPlayers?.[0], null, 2));
            console.log('Updated tournamentPlayers:', JSON.stringify(tournament.tournamentPlayers.slice(0, 2), null, 2)); // Show first 2 players
            console.log('================================');

            const updateResult = await TournamentModel.updateOne(
                { _id: tournament._id },
                { 
                    $set: { 
                        'tournamentSettings.status': 'finished',
                        'tournamentPlayers': tournament.tournamentPlayers
                    } 
                }
            );

            console.log('Update result:', updateResult);
            console.log('Modified count:', updateResult.modifiedCount);
            console.log('Matched count:', updateResult.matchedCount);

            return true;
        } catch (error) {
            console.error('Finish tournament error:', error);
            return false;
        }
    }

    private static getEliminationText(position: number, format: string): string {
        if (position === 1) return 'winner';
        if (position === 2) return 'final';
        if (position === 3 || position === 4) return 'semi-final';
        if (format === 'group' || format === 'group_knockout') return 'group-stage';
        return `${Math.ceil(Math.log2(position))}. kör`;
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
            const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
            if (!knockoutPlayerIds.includes(playerId)) {
                standings.push({
                    playerId: player.playerReference?._id || player.playerReference,
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

    static async getLatestTournamentByClubId(clubId: string): Promise<any> {
        const tournament = await TournamentModel.findOne({ clubId: clubId }).sort({ createdAt: -1 });
        if (!tournament) {
            return null;
        }
        return tournament;
    }
}