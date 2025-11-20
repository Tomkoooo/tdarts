import { TournamentModel } from '@/database/models/tournament.model';
import { TournamentDocument, TournamentSettings } from '@/interface/tournament.interface';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { PlayerModel } from '../models/player.model';
import { TournamentPlayer, TournamentPlayerDocument } from '@/interface/tournament.interface';
import mongoose from 'mongoose';
import { roundRobin } from '@/lib/utils';
import { MatchModel } from '../models/match.model';

import { AuthorizationService } from './authorization.service';
import { SubscriptionService } from './subscription.service';
import { MMRService } from './mmr.service';

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
                console.log(error)
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
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
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
                throw new BadRequestError('Failed to generate unique tournament ID after multiple attempts', 'tournament');
            }
            
            tournament.tournamentId = tournamentId!;
        }
        
        // Ensure no code field is present (to avoid duplicate key errors)
        const tournamentData = { ...tournament };
        delete (tournamentData as any).code;
        
        console.log('=== CREATE TOURNAMENT SERVICE DEBUG ===');
        console.log('Tournament data boards:', JSON.stringify(tournamentData.boards, null, 2));
        console.log('Tournament data boardCount:', tournamentData.tournamentSettings?.boardCount);
        
        const newTournament = new TournamentModel(tournamentData);
        const savedTournament = await newTournament.save();
        
        console.log('Saved tournament boards:', JSON.stringify(savedTournament.boards, null, 2));
        console.log('Saved tournament boardCount:', savedTournament.tournamentSettings?.boardCount);
        console.log('=======================================');
        
        return savedTournament;
    }

    static async getManualGroupsContext(tournamentCode: string): Promise<{
        boards: Array<{ boardNumber: number; isUsed: boolean }>,
        availablePlayers: Array<{ _id: string; name: string }>
    }> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode })
            .populate('tournamentPlayers.playerReference');
        if (!tournament) {
            throw new BadRequestError('Tournament not found', 'tournament', {
              tournamentCode
            });
        }
        if (!tournament.boards || tournament.boards.length === 0) {
            throw new BadRequestError('No boards found for tournament', 'tournament', {
              tournamentCode
            });
        }
        const tournamentBoards = tournament.boards.filter((board: any) => board.isActive);
        const usedBoardNumbers = new Set(
            (tournament.groups || []).map((g: any) => g.board)
        );
        const boards = tournamentBoards.map((b: any) => ({
            boardNumber: b.boardNumber,
            isUsed: usedBoardNumbers.has(b.boardNumber)
        }));
        // Build available players (_id, name) from checked-in tournament players
        const availablePlayers = (tournament.tournamentPlayers || [])
            .filter((p: any) => p.status === 'checked-in')
            .map((p: any) => {
                const playerRef: any = p.playerReference;
                const idStr = playerRef?._id?.toString?.() ?? playerRef?.toString?.() ?? String(playerRef);
                const nameStr = playerRef?.name ?? '';
                return { _id: idStr, name: nameStr };
            });
        return { boards, availablePlayers };
    }

    static async createManualGroup(tournamentCode: string, requesterId: string, params: {
        boardNumber: number;
        // Player document ids
        playerIds: string[];
    }): Promise<{
        groupId: string;
        matchIds: string[];
    }> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        // Check authorization
        const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
        if (!isAuthorized) {
            throw new BadRequestError('Only club admins or moderators can create manual groups');
        }

        const { boardNumber, playerIds } = params;
        if (!Array.isArray(playerIds) || playerIds.length === 0) {
            throw new BadRequestError('playerIds are required');
        }
        if (playerIds.length < 3 || playerIds.length > 6) {
            throw new BadRequestError('Players per group must be between 3 and 6');
        }
        // Ensure board belongs to this tournament and is active
        const board = tournament.boards.find((b: any) => b.boardNumber === boardNumber && b.isActive);
        if (!board) {
            throw new BadRequestError('Board not available for this tournament');
        }
        // Ensure no existing group already uses this board
        const boardAlreadyUsed = (tournament.groups || []).some((g: any) => g.board === boardNumber);
        if (boardAlreadyUsed) {
            throw new BadRequestError('This board already has a group');
        }
        // Validate players exist in tournament, checked-in, and not assigned
        const selectedPlayers: TournamentPlayerDocument[] = [];
        
        for (const playerId of playerIds) {
            // Find tournament player by playerReference (player document _id)
            const tp = tournament.tournamentPlayers.find((p: TournamentPlayerDocument) => p.playerReference?.toString() === playerId);
            if (!tp) throw new BadRequestError(`Player ${playerId} not found in tournament`);
            if (tp.status !== 'checked-in') throw new BadRequestError(`Player ${playerId} is not checked-in`);
            // Temporarily disable groupId check
            // if (tp.groupId) throw new BadRequestError(`Player ${playerId} already assigned to a group`);
            selectedPlayers.push(tp);
        }
        
        // Create group
        const newGroupId = new mongoose.Types.ObjectId();
        
        // Update tournament players with group assignment and reset standings/stats
        for (const tp of selectedPlayers) {
            (tp as any).groupId = newGroupId;
            (tp as any).groupOrdinalNumber = selectedPlayers.indexOf(tp);
            (tp as any).groupStanding = null;
            if ((tp as any).stats) {
                (tp as any).stats.matchesWon = 0;
                (tp as any).stats.matchesLost = 0;
                (tp as any).stats.legsWon = 0;
                (tp as any).stats.legsLost = 0;
                (tp as any).stats.avg = 0;
                (tp as any).stats.oneEightiesCount = 0;
                (tp as any).stats.highestCheckout = 0;
            }
        }
        
        const group: { _id: mongoose.Types.ObjectId; board: number; matches: mongoose.Types.ObjectId[] } = {
            _id: newGroupId,
            board: boardNumber,
            matches: []
        };
        // Push group to tournament
        (tournament.groups as any) = [...(tournament.groups || []), group as any];
        // Generate matches with roundRobin
        const rrMatches = roundRobin(playerIds.length);
        if (!rrMatches) {
            throw new BadRequestError(`Round-robin not supported for ${playerIds.length} players. Supported: 3-6 players.`);
        }
        const createdMatchIds: mongoose.Types.ObjectId[] = [];
        for (const rr of rrMatches) {
            const p1 = selectedPlayers[rr.player1 - 1];
            const p2 = selectedPlayers[rr.player2 - 1];
            const scorer = selectedPlayers[rr.scorer - 1];
            if (!p1 || !p2 || !scorer) continue;
            const matchDoc = await MatchModel.create({
                boardReference: boardNumber,
                tournamentRef: tournament._id,
                type: 'group',
                round: 1,
                player1: { playerId: p1.playerReference, legsWon: 0, legsLost: 0, average: 0 },
                player2: { playerId: p2.playerReference, legsWon: 0, legsLost: 0, average: 0 },
                scorer: scorer.playerReference,
                status: 'pending',
                legs: [],
            });
            createdMatchIds.push(matchDoc._id);
        }
        // Attach matches to the group in tournament
        const groupIndex = (tournament.groups as any[]).findIndex((g: any) => g._id.toString() === newGroupId.toString());
        if (groupIndex !== -1) {
            (tournament.groups as any[])[groupIndex].matches = createdMatchIds as any;
        }
        // Note: Board status update is handled by createManualGroups to avoid overwriting
        // Set status to group-stage
        tournament.tournamentSettings.status = 'group-stage';
        await tournament.save();
        return { groupId: newGroupId.toString(), matchIds: createdMatchIds.map((id) => id.toString()) };
    }

    static async createManualGroups(
        tournamentCode: string,
        requesterId: string,
        groups: Array<{ boardNumber: number; playerIds: string[] }>
    ): Promise<Array<{ boardNumber: number; groupId: string; matchIds: string[] }>> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        // Check authorization
        const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
        if (!isAuthorized) {
            throw new BadRequestError('Only club admins or moderators can create manual groups');
        }

        if (!Array.isArray(groups) || groups.length === 0) {
            throw new BadRequestError('No groups provided');
        }
        
        // Create all groups first without updating board status
        const results: Array<{ boardNumber: number; groupId: string; matchIds: string[] }> = [];
        const boardFirstMatches = new Map<number, string>(); // Track first match for each board
        
        for (const g of groups) {
            const res = await this.createManualGroup(tournamentCode, requesterId, { boardNumber: g.boardNumber, playerIds: g.playerIds });
            results.push({ boardNumber: g.boardNumber, ...res });
            
            // Track the first match for each board
            if (res.matchIds.length > 0) {
                boardFirstMatches.set(g.boardNumber, res.matchIds[0]);
            }
        }
        
        // Update board status only with the first match for each board
        for (const [boardNumber, firstMatchId] of boardFirstMatches) {
            const boardIndex = tournament.boards.findIndex((b: any) => b.boardNumber === boardNumber);
            if (boardIndex !== -1) {
                tournament.boards[boardIndex].status = 'waiting';
                tournament.boards[boardIndex].nextMatch = firstMatchId as any;
                tournament.boards[boardIndex].currentMatch = undefined;
            }
        }
        
        await tournament.save();
        
        return results;
    }

    static async getTournament(tournamentId: string): Promise<TournamentDocument> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentId })
            .populate('clubId')
            .populate('tournamentPlayers.playerReference')
            .populate('waitingList.playerReference')
            .populate('waitingList.addedBy', 'name username')
            .populate('notificationSubscribers.userRef', 'name username email')
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
            })
            .populate({
                path: 'boards.currentMatch',
                            model: 'Match',
                            populate: [
                                { path: 'player1.playerId', model: 'Player' },
                                { path: 'player2.playerId', model: 'Player' },
                                { path: 'scorer', model: 'Player' }
                            ]
            })
            .populate({
                path: 'boards.nextMatch',
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
            
            // Get tournament to check current player count
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            const currentPlayers = tournament.tournamentPlayers.length;
            const maxPlayers = tournament.tournamentSettings.maxPlayers;
            
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
            
            // Calculate free spots after removal
            const freeSpots = maxPlayers - (currentPlayers - 1);
            
            // Trigger notifications if spots become available
            if (freeSpots > 0 && freeSpots <= 10) {
                // Run notification in background (don't await to avoid blocking)
                this.notifySubscribersAboutAvailableSpots(tournamentId, freeSpots)
                    .catch(err => console.error('Failed to notify subscribers:', err));
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

    static async generateGroups(tournamentId: string, requesterId: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can generate groups');
            }
            
            // Get tournament boards
            if (!tournament.boards || tournament.boards.length === 0) {
                throw new BadRequestError('No boards assigned to this tournament');
            }

            const tournamentBoards = tournament.boards.filter((board: any) => board.isActive);
            
            if (tournamentBoards.length === 0) {
                throw new BadRequestError('No active boards available for this tournament');
            }

            const groupCount = tournamentBoards.length;
            const players = tournament.tournamentPlayers.filter(
                (p: TournamentPlayer) => p.status === 'checked-in'
            );

            if (!players || players.length === 0) {
                throw new BadRequestError('No players found');
            }
            if (players.length < groupCount * 3) {
                throw new BadRequestError('Not enough players to generate groups');
            }
            // Check if roundRobin can handle the player count per group
            const playersPerGroup = Math.ceil(players.length / tournamentBoards.length);
            if(playersPerGroup < 3 || playersPerGroup > 6){
                throw new BadRequestError(`Invalid players per group: ${playersPerGroup}. Must be between 3-6.`);
            }

            // Prepare groups array with matches as ObjectId[] (not empty array)
            const groups: {
                _id: mongoose.Types.ObjectId;
                board: number;
                matches: mongoose.Types.ObjectId[];
            }[] = tournamentBoards.map((board: any) => ({
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
                player.groupStanding = null;
                if (player.stats) {
                    player.stats.matchesWon = 0;
                    player.stats.matchesLost = 0;
                    player.stats.legsWon = 0;
                    player.stats.legsLost = 0;
                    player.stats.avg = 0;
                    player.stats.oneEightiesCount = 0;
                    player.stats.highestCheckout = 0;
                }
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

                // Update the tournament board status to waiting and add the nextMatch as the first match in group
                const boardNumberToUpdate = group.board;
                const nextMatchId = group.matches[0];

                if (nextMatchId) {
                    const boardIndex = tournament.boards.findIndex((b: any) => b.boardNumber === boardNumberToUpdate);
                    if (boardIndex !== -1) {
                        tournament.boards[boardIndex].status = 'waiting';
                        tournament.boards[boardIndex].nextMatch = nextMatchId as any;
                        tournament.boards[boardIndex].currentMatch = undefined;
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
        return tournament.boards || [];
    }

    static async generateKnockout(tournamentCode: string, requesterId: string, options: {
        playersCount?: number;
    }): Promise<boolean> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new Error('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId._id.toString());
            if (!isAuthorized) {
                throw new Error('Only club admins or moderators can generate knockout');
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
                (player) => player.status === 'checked-in'
            );

            if (checkedInPlayers.length < 2) {
                throw new Error(`Not enough checked-in players. Need at least 2, have ${checkedInPlayers.length}`);
            }

            // For knockout-only tournaments, use all checked-in players
            // For group_knockout tournaments, use players from groups
            let groupPlayers: TournamentPlayerDocument[] = [];
            
            if (format === 'knockout') {
                // Use all checked-in players for knockout-only tournaments
                groupPlayers = checkedInPlayers;
            } else {
                // Use players from groups for group_knockout tournaments
                groupPlayers = checkedInPlayers.filter((player) => player.groupId);
                
                if (groupPlayers.length < (options.playersCount || 0)) {
                    throw new Error(`Not enough players from groups. Need ${options.playersCount}, have ${groupPlayers.length}`);
                }
            }

            // Sort players by group standing (for group_knockout) or randomly (for knockout)
            const allPlayers = [...groupPlayers];
            if (format === 'group_knockout') {
                allPlayers.sort((a, b) => (a.groupStanding || 1) - (b.groupStanding || 1));
            } else {
                // Random shuffle for knockout-only tournaments
                allPlayers.sort(() => Math.random() - 0.5);
            }

            let advancingPlayers: TournamentPlayerDocument[] = [];
            
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

            // Generate knockout rounds with proper cross-group pairings
            const knockoutRounds = await this.generateKnockoutRounds(advancingPlayers, format, tournament);

            // Create matches for the first round - combine all matches from all rounds
            // NEW: Only create matches if at least one player is present
            const allFirstRoundMatches = knockoutRounds.flatMap(round => round.matches);
            const createdMatches: any[] = [];
            const boardFirstMatches = new Map<number, mongoose.Types.ObjectId>(); // Track first match for each board

            // Get available boards for this tournament
            const availableBoards = tournament.boards.filter((board: any) => board.isActive);
            if (availableBoards.length === 0) {
                throw new Error('No active boards available for this tournament');
            }

            // Assign matches to boards in round-robin fashion
            // NEW: Create match only if at least one player exists
            let matchesCreated = 0;
            for (let i = 0; i < allFirstRoundMatches.length; i++) {
                const matchData = allFirstRoundMatches[i];
                
                // NEW: Check if at least one player exists
                if (matchData.player1 || matchData.player2) {
                    const boardIndex: number = matchesCreated % availableBoards.length;
                    const assignedBoard: any = availableBoards[boardIndex];

                    const match = await MatchModel.create({
                        boardReference: assignedBoard.boardNumber,
                        tournamentRef: tournament._id,
                        type: 'knockout',
                        round: 1,
                        player1: matchData.player1 ? {
                            playerId: matchData.player1,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        } : null,
                        player2: matchData.player2 ? {
                            playerId: matchData.player2,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        } : null,
                        scorer: matchData.player1 || matchData.player2, // Default scorer to first available player
                        status: 'pending',
                        legs: [],
                    });
                    createdMatches.push(match);
                    matchesCreated++;

                    // Track the first match for each board
                    if (!boardFirstMatches.has(assignedBoard.boardNumber)) {
                        boardFirstMatches.set(assignedBoard.boardNumber, match._id);
                    }

                    // Update the knockout structure with match reference
                    // Find the round that contains this match
                    for (const round of knockoutRounds) {
                        const matchIndex = round.matches.findIndex((m: any) => {
                            const p1Match = m.player1?.toString() === matchData.player1?.toString();
                            const p2Match = m.player2?.toString() === matchData.player2?.toString();
                            // Match if both players match (or both are null/undefined)
                            return (p1Match || (!m.player1 && !matchData.player1)) && 
                                   (p2Match || (!m.player2 && !matchData.player2));
                        });
                        if (matchIndex !== -1) {
                            round.matches[matchIndex].matchReference = match._id;
                            break;
                        }
                    }
                } else {
                    // NEW: Empty pair - no match created yet, will be created when players are added
                    console.log(`Empty pair at index ${i} - no match created`);
                }
            }

            // Update board status only with the first match for each board
            for (const [boardNumber, firstMatchId] of boardFirstMatches) {
                const boardIndex = tournament.boards.findIndex((b: any) => b.boardNumber === boardNumber);
                if (boardIndex !== -1) {
                    tournament.boards[boardIndex].status = 'waiting';
                    tournament.boards[boardIndex].nextMatch = firstMatchId as any;
                    tournament.boards[boardIndex].currentMatch = undefined;
                }
            }

            // Update tournament
            tournament.knockout = knockoutRounds;
            tournament.tournamentSettings.status = 'knockout';
            tournament.tournamentSettings.knockoutMethod = 'automatic';

            await tournament.save();

            return true;
        } catch (error) {
            console.error('Generate knockout error:', error);
            throw error;
        }
    }

    private static async generateKnockoutRounds(advancingPlayers: any[], format: string = 'group_knockout', tournament?: any): Promise<any[]> {
 
        if (format === 'group_knockout') {
            const groups = new Map<string, TournamentPlayerDocument[]>();
            for (const player of advancingPlayers) {
                const groupId = player.groupId?.toString();
                if (!groupId) {
                    console.warn(`Player ${player.playerReference} has no groupId`);
                    continue;
                }
                if (!groups.has(groupId)) {
                    groups.set(groupId, []);
                }
                groups.get(groupId)!.push(player);
            }
            const groupIds = Array.from(groups.keys());
            const groupCount = groupIds.length;
            if (groupCount % 2 !== 0) {
                throw new Error('Group count must be even');
            }
            return await this.generateStandardKnockoutRounds( groups, groupIds, tournament);
        } else {
            // For knockout-only format, create simple random pairings
            return this.generateSimpleKnockoutRounds(advancingPlayers);
        }
    }

    private static async generateStandardKnockoutRounds( groups: Map<string, TournamentPlayerDocument[]>, groupIds: string[], tournament?: any) {
        function generatePairingsBetweenTwoGroups(group1: TournamentPlayerDocument[], group2: TournamentPlayerDocument[]) {
            group1.sort((a, b) => a.groupStanding! - b.groupStanding!);
            group2.sort((a, b) => a.groupStanding! - b.groupStanding!);

            const pairings: {player1: mongoose.Types.ObjectId, player2: mongoose.Types.ObjectId}[] = [];
            
            // Mirror párosítás: 1st vs last, 2nd vs second-to-last, etc.
            const minPlayers = Math.min(group1.length, group2.length);
            
            for (let i = 0; i < minPlayers; i++) {
                const player1 = group1[i];
                const player2 = group2[group2.length - 1 - i]; // Mirror index - NE használj reverse()!
                
            
                if (player1 && player2) {
                    pairings.push({
                        player1: player1.playerReference,
                        player2: player2.playerReference,
                    });
                }
            }
            
            return pairings;
        }

        // Párosítsuk a csoportokat cross-group párosításra
        // Használjunk Set-et a duplikációk elkerülésére
        const groupPairs: [TournamentPlayerDocument[], TournamentPlayerDocument[]][] = [];
        const usedGroups = new Set<string>();
        
        
        
        // Rendezzük a groupIds-t a tournament.groups array sorrendje alapján
        let orderedGroupIds = groupIds;
        if (tournament && tournament.groups && Array.isArray(tournament.groups)) {
            // Rendezzük a groupIds-t a tournament.groups array sorrendje alapján
            orderedGroupIds = tournament.groups
                .map((group: any) => group._id.toString())
                .filter((id: string) => groupIds.includes(id));
            
            console.log('=== GROUP PAIRING DEBUG ===');
            console.log('Original groupIds:', groupIds);
            console.log('Tournament groups order:', tournament.groups.map((g: any, i: number) => `${i}: ${g._id}`));
            console.log('Ordered groupIds:', orderedGroupIds);
        }

        // Különböző párosítási stratégiák a csoportok száma alapján
        if (orderedGroupIds.length === 2) {
            // 2 csoport: A-B
            groupPairs.push([groups.get(orderedGroupIds[0])!, groups.get(orderedGroupIds[1])!]);
            console.log('2 csoport párosítás:', orderedGroupIds[0], 'vs', orderedGroupIds[1]);
        } else {
            // 3+ csoport: A-D, B-C, E-H, F-G stb. (first with last pairing)
            const groupCount = orderedGroupIds.length;
            console.log(`${groupCount} csoport párosítás (first-last):`);
            
            for (let i = 0; i < Math.floor(groupCount / 2); i++) {
                const group1Index = i;
                const group2Index = groupCount - 1 - i; // Changed: pair with last instead of middle
                
                if (group1Index < group2Index) {
                    const group1Id = orderedGroupIds[group1Index];
                    const group2Id = orderedGroupIds[group2Index];
                    
                    groupPairs.push([groups.get(group1Id)!, groups.get(group2Id)!]);
                    usedGroups.add(group1Id);
                    usedGroups.add(group2Id);
                    
                    console.log(`Párosítás ${i + 1}: ${group1Index} (${group1Id}) vs ${group2Index} (${group2Id})`);
                }
            }
        }

        // Collect all pairings from all group pairs into a single round
        const allMatches: {player1: mongoose.Types.ObjectId, player2: mongoose.Types.ObjectId}[] = [];
        
        // Generate all pairings from each group pair
        const pairingsByGroupPair: {
            pairing: {player1: mongoose.Types.ObjectId, player2: mongoose.Types.ObjectId},
            groupPairIndex: number,
            rankInGroupPair: number,
            hasGroupWinner: boolean,
            winnerGroupIndex: number // which group in the pair has the winner
        }[][] = [];
        
        for (let groupPairIndex = 0; groupPairIndex < groupPairs.length; groupPairIndex++) {
            const groupPair = groupPairs[groupPairIndex];
            const pairings = generatePairingsBetweenTwoGroups(groupPair[0], groupPair[1]);
            
            pairingsByGroupPair[groupPairIndex] = pairings.map((pairing, index) => {
                // Determine if this pairing has a group winner (rank 1)
                // In mirror pairing: first few matches have rank 1 from first group, last few from second group
                const hasGroupWinner = index === 0 || index === pairings.length - 1;
                const winnerGroupIndex = index === 0 ? 0 : 1; // 0 for first group, 1 for second group
                
                return {
                    pairing,
                    groupPairIndex,
                    rankInGroupPair: index,
                    hasGroupWinner,
                    winnerGroupIndex
                };
            });
        }
        
        // Check if we should use constraint-based ordering or simple interleaving
        // Use constraint-based ordering when:
        // 1. We have power-of-2 groups (2, 4, 8, etc.)
        // 2. Each group has enough players to make the constraints meaningful
        const groupCount = groupPairs.length * 2;
        const isPowerOfTwo = (groupCount & (groupCount - 1)) === 0 && groupCount > 0;
        const playersPerGroup = pairingsByGroupPair[0]?.length || 0;
        const useConstraintBasedOrdering = isPowerOfTwo && playersPerGroup >= 2 && groupCount >= 4;
        
        if (useConstraintBasedOrdering && groupCount === 4 && playersPerGroup >= 2) {
            // NEW ALGORITHM for 4 groups with constraint-based ordering
            // Each consecutive pair of matches should:
            // 1. Have exactly one group winner (rank 1)
            // 2. Represent all groups exactly once
            
            const matches0 = pairingsByGroupPair[0]; // e.g., A/D pairings: a1-d4, a2-d3, a3-d2, a4-d1
            const matches1 = pairingsByGroupPair[1]; // e.g., B/C pairings: b1-c4, b2-c3, b3-c2, b4-c1
            
            // Pattern for 4 groups: a1/d4 - b2/c3 - d1/a4 - c2/b3 - b1/c4 - a2/d3 - c1/b4 - d2/a3
            // Breakdown:
            // Pair 0 (matches 0-1): A/D[0] as-is,     B/C[1] as-is
            // Pair 1 (matches 2-3): A/D[3] flipped,   B/C[2] flipped
            // Pair 2 (matches 4-5): B/C[0] as-is,     A/D[1] as-is
            // Pair 3 (matches 6-7): B/C[3] flipped,   A/D[2] flipped
            
            const numPairs = playersPerGroup; // Number of consecutive match pairs
            
            for (let pairIdx = 0; pairIdx < numPairs; pairIdx++) {
                let match1, match2;
                
                if (pairIdx === 0) {
                    // Pair 0: A/D[0] as-is, B/C[1] as-is
                    match1 = matches0[0].pairing;
                    match2 = matches1[1].pairing;
                } else if (pairIdx === 1) {
                    // Pair 1: A/D[3] flipped, B/C[2] flipped
                    const m1 = matches0[3].pairing;
                    match1 = { player1: m1.player2, player2: m1.player1 };
                    const m2 = matches1[2].pairing;
                    match2 = { player1: m2.player2, player2: m2.player1 };
                } else if (pairIdx === 2) {
                    // Pair 2: B/C[0] as-is, A/D[1] as-is
                    match1 = matches1[0].pairing;
                    match2 = matches0[1].pairing;
                } else if (pairIdx === 3) {
                    // Pair 3: B/C[3] flipped, A/D[2] flipped
                    const m1 = matches1[3].pairing;
                    match1 = { player1: m1.player2, player2: m1.player1 };
                    const m2 = matches0[2].pairing;
                    match2 = { player1: m2.player2, player2: m2.player1 };
                } else {
                    // For more than 4 players per group, extend the pattern
                    // This is a simplified extension - may need refinement for specific cases
                    const mod = pairIdx % 4;
                    if (mod === 0) {
                        const idx = Math.floor(pairIdx / 4);
                        if (idx < matches0.length && idx + 1 < matches1.length) {
                            match1 = matches0[idx].pairing;
                            match2 = matches1[idx + 1].pairing;
                        }
                    } else if (mod === 1) {
                        const idx = Math.floor(pairIdx / 4);
                        const idx0 = matches0.length - 1 - idx;
                        const idx1 = matches1.length - 2 - idx;
                        if (idx0 >= 0 && idx0 < matches0.length && idx1 >= 0 && idx1 < matches1.length) {
                            const m1 = matches0[idx0].pairing;
                            match1 = { player1: m1.player2, player2: m1.player1 };
                            const m2 = matches1[idx1].pairing;
                            match2 = { player1: m2.player2, player2: m2.player1 };
                        }
                    } else if (mod === 2) {
                        const idx = Math.floor(pairIdx / 4);
                        if (idx < matches1.length && idx + 1 < matches0.length) {
                            match1 = matches1[idx].pairing;
                            match2 = matches0[idx + 1].pairing;
                        }
                    } else {
                        const idx = Math.floor(pairIdx / 4);
                        const idx0 = matches1.length - 1 - idx;
                        const idx1 = matches0.length - 2 - idx;
                        if (idx0 >= 0 && idx0 < matches1.length && idx1 >= 0 && idx1 < matches0.length) {
                            const m1 = matches1[idx0].pairing;
                            match1 = { player1: m1.player2, player2: m1.player1 };
                            const m2 = matches0[idx1].pairing;
                            match2 = { player1: m2.player2, player2: m2.player1 };
                        }
                    }
                }
                
                if (match1 && match2) {
                    allMatches.push(match1);
                    allMatches.push(match2);
                }
            }
            
            console.log('=== CONSTRAINT-BASED KNOCKOUT PAIRING (4 groups) ===');
            console.log('Generated matches:', allMatches.length);
        } else if (useConstraintBasedOrdering && isPowerOfTwo && groupCount > 4) {
            // For 8+ groups, use simple interleaving as suggested by user
            console.log(`=== USING SIMPLE INTERLEAVING for ${groupCount} groups ===`);
            
            const maxPairings = Math.max(...pairingsByGroupPair.map(gp => gp.length));
            
            for (let pairingIndex = 0; pairingIndex < maxPairings; pairingIndex++) {
                for (let groupIndex = 0; groupIndex < pairingsByGroupPair.length; groupIndex++) {
                    if (pairingIndex < pairingsByGroupPair[groupIndex].length) {
                        allMatches.push(pairingsByGroupPair[groupIndex][pairingIndex].pairing);
                    }
                }
            }
        } else {
            // Fallback: simple interleaving for edge cases
            console.log('=== USING FALLBACK INTERLEAVING ===');
            
            const maxPairings = Math.max(...pairingsByGroupPair.map(gp => gp.length));
            
            for (let pairingIndex = 0; pairingIndex < maxPairings; pairingIndex++) {
                for (let groupIndex = 0; groupIndex < pairingsByGroupPair.length; groupIndex++) {
                    if (pairingIndex < pairingsByGroupPair[groupIndex].length) {
                        allMatches.push(pairingsByGroupPair[groupIndex][pairingIndex].pairing);
                    }
                }
            }
        }

        // Return single round with all matches
        return [{
            round: 1,
            matches: allMatches
        }];
    }


    /**
     * Generate simple knockout rounds for knockout-only tournaments
     * 
     * FUTURE - LUCKY LOSER IMPLEMENTATION:
     * Lucky loser brackets give eliminated players a second chance.
     * In darts, this typically works as follows:
     * 
     * 1. Main Bracket: Standard single-elimination
     * 2. Consolation Bracket: Losers from early rounds (usually first 1-2 rounds)
     * 3. Lucky Loser Advancement: Winner(s) of consolation bracket may:
     *    - Re-enter main bracket at a specific point (e.g., semi-finals)
     *    - Compete for 3rd place
     *    - Win a separate consolation prize
     * 
     * Implementation considerations:
     * - Add 'bracketType' field: 'main' | 'consolation' | 'lucky_loser'
     * - Track which round losers enter consolation bracket
     * - Define re-entry points for lucky losers
     * - Handle bracket merging logic
     * - UI: Display both brackets side-by-side or stacked
     * 
     * Example structure:
     * tournament.knockout = [
     *   { round: 1, bracketType: 'main', matches: [...] },
     *   { round: 1, bracketType: 'consolation', matches: [...] },
     *   { round: 2, bracketType: 'main', matches: [...] },
     *   ...
     * ]
     */
    private static generateSimpleKnockoutRounds(advancingPlayers: any[]): any[] {
        const rounds: any[] = [];
        const firstRoundMatches: any[] = [];

        // Create simple random pairings
        for (let i = 0; i < advancingPlayers.length; i += 2) {
            if (i + 1 < advancingPlayers.length) {
                firstRoundMatches.push({
                    player1: advancingPlayers[i].playerReference,
                    player2: advancingPlayers[i + 1].playerReference,
                });
            }
        }

        // Handle odd number of players with bye
        let playerWithBye = null;
        if (firstRoundMatches.length * 2 < advancingPlayers.length) {
            const matchedPlayers = new Set();
            firstRoundMatches.forEach(match => {
                matchedPlayers.add(match.player1.toString());
                matchedPlayers.add(match.player2.toString());
            });

            for (const player of advancingPlayers) {
                if (!matchedPlayers.has(player.playerReference.toString())) {
                    playerWithBye = player;
                    break;
                }
            }
        }

        // Create rounds
        if (playerWithBye) {
            rounds.push({ 
                round: 1, 
                matches: firstRoundMatches 
            });
            rounds.push({ 
                round: 2, 
                matches: [{
                    player1: playerWithBye.playerReference,
                    player2: null,
                }]
            });
        } else {
            rounds.push({ 
                round: 1, 
                matches: firstRoundMatches 
            });
        }

        return rounds;
    }



    static async generateNextKnockoutRound(tournamentId: string, requesterId: string, currentRound: number): Promise<boolean> {
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

            // For manual mode, handle differently
            if (tournament.tournamentSettings.knockoutMethod === 'manual') {
                return await this.generateNextManualKnockoutRound(tournament, currentRound, currentRoundMatches);
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

            // For automatic mode, require finished matches
            if (finishedMatches.length === 0) {
                throw new BadRequestError('No finished matches in current round');
            }

            // Get winners
            const winners = finishedMatches
                .filter(match => match.winnerId)
                .map(match => match.winnerId);

            // For the first round, check if there was a player with a bye
            const playersForNextRound = [...winners];
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
            const availableBoards = tournament.boards.filter((board: any) => board.isActive);

            if (availableBoards.length === 0) {
                throw new BadRequestError('No active boards available for this tournament');
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
                        // Use round-robin assignment for automatic generation
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
                        const byeMatchBoardIndex = tournament.boards.findIndex((b: any) => b.boardNumber === assignedBoard.boardNumber);
                        if (byeMatchBoardIndex !== -1) {
                            tournament.boards[byeMatchBoardIndex].status = 'waiting';
                            tournament.boards[byeMatchBoardIndex].nextMatch = byePlayerMatch._id;
                            tournament.boards[byeMatchBoardIndex].currentMatch = undefined;
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
                                const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === assignedBoard.boardNumber);
                                if (boardIdx !== -1) {
                                    tournament.boards[boardIdx].status = 'waiting';
                                    tournament.boards[boardIdx].nextMatch = match._id;
                                    tournament.boards[boardIdx].currentMatch = undefined;
                                }
                            }
                        }

                        // Update tournament knockout structure
                        existingNextRound.matches = [byeMatch, ...nextRoundMatches];
                        await tournament.save();
                        return true;
                    }
                }
            }

            // Create matches for next round (normal case)
            const boardFirstMatches = new Map<number, mongoose.Types.ObjectId>(); // Track first match for each board
            
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

                    // Track the first match for each board
                    if (!boardFirstMatches.has(assignedBoard.boardNumber)) {
                        boardFirstMatches.set(assignedBoard.boardNumber, match._id);
                    }
                } else {
                    // Odd number of players - create a match with single player (bye)
                    const player1 = playersForNextRound[i];
                    
                    nextRoundMatches.push({
                        player1: player1,
                        player2: null, // Will be filled when next round is generated
                        matchReference: null, // No match created yet
                    });
                }
            }

            // Update board status only with the first match for each board
            for (const [boardNumber, firstMatchId] of boardFirstMatches) {
                const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === boardNumber);
                if (boardIdx !== -1) {
                    tournament.boards[boardIdx].status = 'waiting';
                    tournament.boards[boardIdx].nextMatch = firstMatchId as any;
                    tournament.boards[boardIdx].currentMatch = undefined;
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

            return true;
        } catch (err) {
            console.error('generateNextKnockoutRound error:', err);
            return false;
        }
    }

    private static async generateNextManualKnockoutRound(tournament: TournamentDocument, currentRound: number, currentRoundMatches: any): Promise<boolean> {
        try {
            // Collect all players from current round matches
            const playersForNextRound: any[] = [];
            
            for (const match of currentRoundMatches.matches) {
                // Check if match has a matchReference (actual match created)
                if (match.matchReference) {
                    const matchDoc = await MatchModel.findById(match.matchReference);
                    if (matchDoc) {
                        // Check if this is a bye match (player2 is null or undefined)
                        if (matchDoc.player2?.playerId === null || matchDoc.player2?.playerId === undefined) {
                            // Bye match - automatically advance player1
                            playersForNextRound.push(matchDoc.player1.playerId);
                        } else if (matchDoc.status === 'finished' && matchDoc.winnerId) {
                            // Regular finished match - add winner
                            playersForNextRound.push(matchDoc.winnerId);
                        }
                    }
                } else {
                    // Handle matches without actual match documents (manual mode)
                    if (match.player1 && !match.player2) {
                        // Single player match (bye) - automatically advance this player
                        playersForNextRound.push(match.player1);
                    } else if (match.player1 && match.player2) {
                        // Both players assigned but no match created yet
                        // This shouldn't happen in normal flow, but handle gracefully
                        console.warn('Match with both players but no matchReference found');
                    }
                }
            }

            // For manual mode, allow generating next round even with single player
            if (playersForNextRound.length === 0) {
                throw new BadRequestError('Nincs játékos a következő körre');
            }

            // Generate next round matches
            const nextRound = currentRound + 1;
            const nextRoundMatches: any[] = [];
            const availableBoards = tournament.boards.filter((board: any) => board.isActive);

            if (availableBoards.length === 0) {
                throw new BadRequestError('No active boards available for this tournament');
            }

            // Create matches for next round
            const boardFirstMatches = new Map<number, mongoose.Types.ObjectId>(); // Track first match for each board
            
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

                    // Track the first match for each board
                    if (!boardFirstMatches.has(assignedBoard.boardNumber)) {
                        boardFirstMatches.set(assignedBoard.boardNumber, match._id);
                    }
                } else {
                    // Odd number of players - create a match with single player (bye)
                    const player1 = playersForNextRound[i];
                    
                    nextRoundMatches.push({
                        player1: player1,
                        player2: null, // Will be filled when next round is generated
                        matchReference: null, // No match created yet
                    });
                }
            }

            // Update board status only with the first match for each board
            for (const [boardNumber, firstMatchId] of boardFirstMatches) {
                const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === boardNumber);
                if (boardIdx !== -1) {
                    tournament.boards[boardIdx].status = 'waiting';
                    tournament.boards[boardIdx].nextMatch = firstMatchId as any;
                    tournament.boards[boardIdx].currentMatch = undefined;
                }
            }

            // Update tournament knockout structure
            const existingNextRound = tournament.knockout.find((r: any) => r.round === nextRound);
            if (existingNextRound) {
                existingNextRound.matches = nextRoundMatches;
            } else {
                tournament.knockout.push({
                    round: nextRound,
                    matches: nextRoundMatches,
                });
            }

            await tournament.save();
            return true;
        } catch (err) {
            console.error('generateNextManualKnockoutRound error:', err);
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
                        const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === match.boardReference);
                        if (boardIdx !== -1) {
                            tournament.boards[boardIdx].status = 'idle';
                            tournament.boards[boardIdx].currentMatch = undefined;
                            tournament.boards[boardIdx].nextMatch = undefined;
                            await tournament.save();
                        }
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
                                // Note: This is an automatic call, no requesterId needed
                                // The authorization is handled at the API level
                                await this.generateNextKnockoutRound(tournament.tournamentId, 'system', currentRound.round);
                            } else {
                                // Tournament finished
                                const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === match.boardReference);
                                if (boardIdx !== -1) {
                                    tournament.boards[boardIdx].status = 'idle';
                                    tournament.boards[boardIdx].currentMatch = undefined;
                                    tournament.boards[boardIdx].nextMatch = undefined;
                                    await tournament.save();
                                }
                            }
                        }
                    }
                } else {
                    // Match not found in knockout structure, set board to idle
                    const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === match.boardReference);
                    if (boardIdx !== -1) {
                        tournament.boards[boardIdx].status = 'idle';
                        tournament.boards[boardIdx].currentMatch = undefined;
                        tournament.boards[boardIdx].nextMatch = undefined;
                        await tournament.save();
                    }
                }
            } else if (match.status === 'ongoing') {
                const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === match.boardReference);
                if (boardIdx !== -1) {
                    tournament.boards[boardIdx].status = 'playing';
                    tournament.boards[boardIdx].currentMatch = match._id as any;
                    tournament.boards[boardIdx].nextMatch = undefined;
                    await tournament.save();
                }
            }
            return true;
        } catch (err) {
            console.error('updateBoardStatusAfterMatch error:', err);
            return false;
        }
    }

    static async generateManualKnockout(tournamentCode: string, requesterId: string): Promise<boolean> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new Error('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId._id.toString());
            if (!isAuthorized) {
                throw new Error('Only club admins or moderators can generate manual knockout');
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

    static async generateAutomaticPairingsForManualKnockout(tournamentCode: string, requesterId: string, options: {
        playersCount?: number;
        useSeededPlayers: boolean;
        seededPlayersCount: number;
    }): Promise<boolean> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new Error('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId._id.toString());
            if (!isAuthorized) {
                throw new Error('Only club admins or moderators can generate automatic pairings');
            }

            // Ensure tournament is in manual knockout mode
            if (tournament.tournamentSettings.knockoutMethod !== 'manual') {
                throw new Error('Tournament must be in manual knockout mode');
            }

            const format = tournament.tournamentSettings?.format || 'group_knockout';

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
            const knockoutRounds = await this.generateKnockoutRounds(shuffledPlayers, format);

            console.log('=== MANUAL KNOCKOUT AUTOMATIC PAIRINGS DEBUG ===');
            console.log('Tournament format:', format);
            console.log('Advancing players count:', advancingPlayers.length);
            console.log('Shuffled players count:', shuffledPlayers.length);
            console.log('Knockout rounds:', knockoutRounds.length);
            console.log('First round matches count:', knockoutRounds[0]?.matches?.length || 0);
            console.log('First round matches:', knockoutRounds[0]?.matches || []);

            // Update tournament with generated rounds (but don't create matches yet)
            tournament.knockout = knockoutRounds;
            await tournament.save();

            return true;
        } catch (error) {
            console.error('Generate automatic pairings for manual knockout error:', error);
            throw error;
        }
    }

    static async generateEmptyKnockoutRounds(tournamentCode: string, requesterId: string, roundsCount: number = 2): Promise<boolean> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new Error('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId._id.toString());
            if (!isAuthorized) {
                throw new Error('Only club admins or moderators can generate empty knockout rounds');
            }

            // Ensure tournament is in manual knockout mode
            if (tournament.tournamentSettings.knockoutMethod !== 'manual') {
                throw new Error('Tournament must be in manual knockout mode');
            }

            // Generate empty rounds
            const newRounds = [];
            const existingRounds = tournament.knockout || [];
            const maxExistingRound = existingRounds.length > 0 ? Math.max(...existingRounds.map(r => r.round)) : 0;

            for (let i = 1; i <= roundsCount; i++) {
                const roundNumber = maxExistingRound + i;
                newRounds.push({
                    round: roundNumber,
                    matches: []
                });
            }

            // Add new rounds to existing knockout structure
            tournament.knockout = [...existingRounds, ...newRounds];
            await tournament.save();

            return true;
        } catch (error) {
            console.error('Generate empty knockout rounds error:', error);
            throw error;
        }
    }

    static async addPartialMatch(tournamentId: string, requesterId: string, matchData: {
        round: number;
        player1Id?: string;
        player2Id?: string;
        scorerId?: string;
        boardNumber?: number;
    }): Promise<any> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can add partial matches');
            }

            // At least one player must be specified
            if (!matchData.player1Id && !matchData.player2Id) {
                throw new BadRequestError('At least one player must be specified');
            }

            // Validate players exist in tournament if provided
            if (matchData.player1Id) {
                const player1 = tournament.tournamentPlayers.find((p: any) => 
                    p.playerReference.toString() === matchData.player1Id
                );
                if (!player1) {
                    throw new BadRequestError('Player 1 not found in tournament');
                }
            }

            if (matchData.player2Id) {
                const player2 = tournament.tournamentPlayers.find((p: any) => 
                    p.playerReference.toString() === matchData.player2Id
                );
                if (!player2) {
                    throw new BadRequestError('Player 2 not found in tournament');
                }
            }

            // Validate scorer if provided
            let scorerId = matchData.player1Id || matchData.player2Id; // Default to first available player
            if (matchData.scorerId) {
                const scorer = tournament.tournamentPlayers.find((p: any) => 
                    p.playerReference.toString() === matchData.scorerId
                );
                if (!scorer) {
                    throw new BadRequestError('Scorer not found in tournament');
                }
                scorerId = matchData.scorerId;
            }

            // Find the round
            const round = tournament.knockout.find((r: any) => r.round === matchData.round);
            if (!round) {
                throw new BadRequestError(`Round ${matchData.round} not found`);
            }

            // Get available boards for this tournament
            const availableBoards = tournament.boards.filter((board: any) => board.isActive);
            if (availableBoards.length === 0) {
                throw new BadRequestError('No active boards available for this tournament');
            }

            // Assign board: use provided board number if valid, otherwise use round-robin
            let assignedBoard;
            if (matchData.boardNumber) {
                // Validate that the provided board number is available for this tournament
                assignedBoard = availableBoards.find((board: any) => board.boardNumber === matchData.boardNumber);
                if (!assignedBoard) {
                    throw new BadRequestError(`Board ${matchData.boardNumber} is not available for this tournament`);
                }
                
                // For manual board selection, we allow assignment even if board is busy
                // The user explicitly chose this board, so we respect their choice
                console.log(`Manual partial match board assignment: Board ${matchData.boardNumber} selected by user`);
            } else {
                // Assign board in round-robin fashion if no specific board requested
                const boardIndex = round.matches.length % availableBoards.length;
                assignedBoard = availableBoards[boardIndex];
                console.log(`Auto partial match board assignment: Board ${assignedBoard.boardNumber} assigned by round-robin`);
            }

            // Create match with partial players
            const match = await MatchModel.create({
                boardReference: assignedBoard.boardNumber,
                tournamentRef: tournament._id,
                type: 'knockout',
                round: matchData.round,
                player1: matchData.player1Id ? {
                    playerId: matchData.player1Id,
                    legsWon: 0,
                    legsLost: 0,
                    average: 0,
                } : null,
                player2: matchData.player2Id ? {
                    playerId: matchData.player2Id,
                    legsWon: 0,
                    legsLost: 0,
                    average: 0,
                } : null,
                scorer: scorerId || null,
                status: 'pending',
                legs: [],
            });

            // Add match to round - use null for missing players to ensure proper database storage
            round.matches.push({
                player1: matchData.player1Id || null,
                player2: matchData.player2Id || null,
                matchReference: match._id,
            });

            // Update board status only if this is NOT a bye match (both players must exist)
            // and only if the board doesn't already have a nextMatch
            const isByeMatch = !matchData.player1Id || !matchData.player2Id;
            const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === assignedBoard.boardNumber);
            
            if (boardIdx !== -1 && !isByeMatch && !tournament.boards[boardIdx].nextMatch) {
                tournament.boards[boardIdx].status = 'waiting';
                tournament.boards[boardIdx].nextMatch = match._id as any;
                tournament.boards[boardIdx].currentMatch = undefined;
            }

            await tournament.save();

            return match;
        } catch (err) {
            console.error('addPartialMatch error:', err);
            return false;
        }
    }

    /**
     * Add an empty knockout pair (no players, no match reference)
     * This is used for manual knockout brackets where pairs can be created first
     * and players added later
     */
    static async addEmptyKnockoutPair(tournamentId: string, requesterId: string, pairData: {
        round: number;
    }): Promise<any> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can add empty pairs');
            }

            // Find the round
            let round = tournament.knockout.find((r: any) => r.round === pairData.round);
            if (!round) {
                // Create the round if it doesn't exist
                tournament.knockout.push({
                    round: pairData.round,
                    matches: []
                });
                round = tournament.knockout.find((r: any) => r.round === pairData.round);
            }

            // Create an empty pair (no players, no match reference)
            const emptyPair = {
                player1: null,
                player2: null,
                matchReference: null
            };

            // Add the empty pair to the round
            round.matches.push(emptyPair);

            await tournament.save();

            console.log(`✅ Empty pair added to round ${pairData.round} in tournament ${tournamentId}`);
            return emptyPair;
        } catch (err) {
            console.error('addEmptyKnockoutPair error:', err);
            return false;
        }
    }

    /**
     * Update an empty knockout pair to a match with players
     */
    static async updateEmptyPairToMatch(tournamentId: string, requesterId: string, matchData: {
        round: number;
        pairIndex: number;
        player1Id?: string;
        player2Id?: string;
        scorerId?: string;
        boardNumber?: number;
    }): Promise<any> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can update pairs');
            }

            // At least one player must be specified
            if (!matchData.player1Id && !matchData.player2Id) {
                throw new BadRequestError('At least one player must be specified');
            }

            // Find the round
            const round = tournament.knockout.find((r: any) => r.round === matchData.round);
            if (!round) {
                throw new BadRequestError(`Round ${matchData.round} not found`);
            }

            // Find the pair
            if (matchData.pairIndex < 0 || matchData.pairIndex >= round.matches.length) {
                throw new BadRequestError(`Invalid pair index ${matchData.pairIndex}`);
            }

            const pair = round.matches[matchData.pairIndex];

            // Validate players exist in tournament if provided
            if (matchData.player1Id) {
                const player1 = tournament.tournamentPlayers.find((p: any) => 
                    p.playerReference.toString() === matchData.player1Id
                );
                if (!player1) {
                    throw new BadRequestError('Player 1 not found in tournament');
                }
            }

            if (matchData.player2Id) {
                const player2 = tournament.tournamentPlayers.find((p: any) => 
                    p.playerReference.toString() === matchData.player2Id
                );
                if (!player2) {
                    throw new BadRequestError('Player 2 not found in tournament');
                }
            }

            // Validate scorer if provided
            let scorerId = matchData.player1Id || matchData.player2Id; // Default to first available player
            if (matchData.scorerId) {
                const scorer = tournament.tournamentPlayers.find((p: any) => 
                    p.playerReference.toString() === matchData.scorerId
                );
                if (!scorer) {
                    throw new BadRequestError('Scorer not found in tournament');
                }
                scorerId = matchData.scorerId;
            }

            // Get available boards for this tournament
            const availableBoards = tournament.boards.filter((board: any) => board.isActive);
            if (availableBoards.length === 0) {
                throw new BadRequestError('No active boards available for this tournament');
            }

            // Assign board
            let assignedBoard;
            if (matchData.boardNumber) {
                assignedBoard = availableBoards.find((board: any) => board.boardNumber === matchData.boardNumber);
                if (!assignedBoard) {
                    throw new BadRequestError(`Board ${matchData.boardNumber} is not available for this tournament`);
                }
            } else {
                // Assign board in round-robin fashion
                const boardIndex = round.matches.length % availableBoards.length;
                assignedBoard = availableBoards[boardIndex];
            }

            // Create match
            const match = await MatchModel.create({
                boardReference: assignedBoard.boardNumber,
                tournamentRef: tournament._id,
                type: 'knockout',
                round: matchData.round,
                player1: matchData.player1Id ? {
                    playerId: matchData.player1Id,
                    legsWon: 0,
                    legsLost: 0,
                    average: 0,
                } : null,
                player2: matchData.player2Id ? {
                    playerId: matchData.player2Id,
                    legsWon: 0,
                    legsLost: 0,
                    average: 0,
                } : null,
                scorer: scorerId,
                status: 'pending',
                legs: [],
            });

            // Update the pair in the knockout structure
            pair.player1 = matchData.player1Id || null;
            pair.player2 = matchData.player2Id || null;
            pair.matchReference = match._id;

            // Update board status based on whether this is a bye match or not
            const isByeMatch = !matchData.player1Id || !matchData.player2Id;
            const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === assignedBoard.boardNumber);
            
            if (boardIdx !== -1) {
                if (!isByeMatch) {
                    // Normal match with 2 players - assign to board if it's the first pending match
                    const currentNextMatch = tournament.boards[boardIdx].nextMatch;
                    
                    if (!currentNextMatch) {
                        // No next match - assign this one
                        tournament.boards[boardIdx].status = 'waiting';
                        tournament.boards[boardIdx].nextMatch = match._id as any;
                        tournament.boards[boardIdx].currentMatch = undefined;
                    } else {
                        // There's already a next match - check if we should replace it
                        // Find if there are any earlier pending matches
                        const earlierMatch = await MatchModel.findOne({
                            tournamentRef: tournament._id,
                            boardReference: assignedBoard.boardNumber,
                            status: 'pending',
                            'player1.playerId': { $ne: null },
                            'player2.playerId': { $ne: null },
                            createdAt: { $lt: match.createdAt }
                        }).sort({ createdAt: 1 });
                        
                        if (!earlierMatch) {
                            // This is the earliest match - make it the next match
                            tournament.boards[boardIdx].status = 'waiting';
                            tournament.boards[boardIdx].nextMatch = match._id as any;
                            tournament.boards[boardIdx].currentMatch = undefined;
                        }
                    }
                }
                // If it's a bye match, don't assign to board
            }

            await tournament.save();

            console.log(`✅ Empty pair updated to match in round ${matchData.round} in tournament ${tournamentId}`);
            return match;
        } catch (err) {
            console.error('updateEmptyPairToMatch error:', err);
            return false;
        }
    }

    /**
     * Delete a knockout match/pair
     */
    static async deleteKnockoutMatch(tournamentId: string, requesterId: string, matchData: {
        round: number;
        pairIndex: number;
    }): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can delete matches');
            }

            // Find the round
            const round = tournament.knockout.find((r: any) => r.round === matchData.round);
            if (!round) {
                throw new BadRequestError(`Round ${matchData.round} not found`);
            }

            // Find the pair
            if (matchData.pairIndex < 0 || matchData.pairIndex >= round.matches.length) {
                throw new BadRequestError(`Invalid pair index ${matchData.pairIndex}`);
            }

            const pair = round.matches[matchData.pairIndex];

            // If there's a match reference, delete the match and update board status
            if (pair.matchReference) {
                const match = await MatchModel.findById(pair.matchReference);
                if (match) {
                    const boardNumber = match.boardReference;
                    
                    // Delete the match
                    await MatchModel.findByIdAndDelete(pair.matchReference);
                    
                    // Update board status
                    const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === boardNumber);
                    if (boardIdx !== -1) {
                        if (tournament.boards[boardIdx].currentMatch?.toString() === match._id.toString()) {
                            tournament.boards[boardIdx].currentMatch = undefined;
                        }
                        if (tournament.boards[boardIdx].nextMatch?.toString() === match._id.toString()) {
                            tournament.boards[boardIdx].nextMatch = undefined;
                        }
                        
                        // Find the next pending match for this board (skip bye matches - only matches with 2 players)
                        const nextPendingMatch = await MatchModel.findOne({
                            tournamentRef: tournament._id,
                            boardReference: boardNumber,
                            status: 'pending',
                            'player1.playerId': { $ne: null },
                            'player2.playerId': { $ne: null }
                        }).sort({ createdAt: 1 });
                        
                        if (nextPendingMatch) {
                            tournament.boards[boardIdx].nextMatch = nextPendingMatch._id as any;
                            tournament.boards[boardIdx].status = 'waiting';
                        } else {
                            tournament.boards[boardIdx].status = 'idle';
                        }
                    }
                }
            }

            // Remove the pair from the round
            round.matches.splice(matchData.pairIndex, 1);

            await tournament.save();

            console.log(`✅ Match deleted from round ${matchData.round} in tournament ${tournamentId}`);
            return true;
        } catch (err) {
            console.error('deleteKnockoutMatch error:', err);
            return false;
        }
    }

    /**
     * Delete the last knockout round
     */
    static async deleteLastKnockoutRound(tournamentId: string, requesterId: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can delete rounds');
            }

            if (!tournament.knockout || tournament.knockout.length === 0) {
                throw new BadRequestError('No knockout rounds to delete');
            }

            // Get the last round
            const lastRound = tournament.knockout[tournament.knockout.length - 1];

            // Collect all board numbers that need to be updated
            const affectedBoards = new Set<number>();

            // Delete all matches in the last round
            for (const pair of lastRound.matches) {
                if (pair.matchReference) {
                    const match = await MatchModel.findById(pair.matchReference);
                    if (match) {
                        affectedBoards.add(match.boardReference);
                        
                        // Update board status - clear references
                        const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === match.boardReference);
                        if (boardIdx !== -1) {
                            if (tournament.boards[boardIdx].currentMatch?.toString() === match._id.toString()) {
                                tournament.boards[boardIdx].currentMatch = undefined;
                            }
                            if (tournament.boards[boardIdx].nextMatch?.toString() === match._id.toString()) {
                                tournament.boards[boardIdx].nextMatch = undefined;
                            }
                        }

                        // Delete the match
                        await MatchModel.findByIdAndDelete(pair.matchReference);
                    }
                }
            }

            // Remove the last round
            tournament.knockout.pop();

            // Reassign next matches for affected boards (skip bye matches - only matches with 2 players)
            for (const boardNumber of affectedBoards) {
                const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === boardNumber);
                if (boardIdx !== -1) {
                    // Find the next pending match for this board
                    const nextPendingMatch = await MatchModel.findOne({
                        tournamentRef: tournament._id,
                        boardReference: boardNumber,
                        status: 'pending',
                        'player1.playerId': { $ne: null },
                        'player2.playerId': { $ne: null }
                    }).sort({ createdAt: 1 });
                    
                    if (nextPendingMatch) {
                        tournament.boards[boardIdx].nextMatch = nextPendingMatch._id as any;
                        tournament.boards[boardIdx].status = 'waiting';
                    } else {
                        tournament.boards[boardIdx].status = 'idle';
                    }
                }
            }

            await tournament.save();

            console.log(`✅ Last round deleted from tournament ${tournamentId}`);
            return true;
        } catch (err) {
            console.error('deleteLastKnockoutRound error:', err);
            return false;
        }
    }

    static async generateRandomPairings(tournamentId: string, requesterId: string, round: number, selectedPlayerIds: string[]): Promise<any[]> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can generate random pairings');
            }

            // Validate all players exist in tournament
            const validPlayers = tournament.tournamentPlayers.filter((p: any) => 
                selectedPlayerIds.includes(p.playerReference.toString())
            );

            if (validPlayers.length !== selectedPlayerIds.length) {
                throw new BadRequestError('Some selected players not found in tournament');
            }

            // Check if players are already in matches in this round
            const roundData = tournament.knockout.find((r: any) => r.round === round);
            if (!roundData) {
                throw new BadRequestError(`Round ${round} not found`);
            }

            const playersInRound = new Set();
            roundData.matches.forEach((match: any) => {
                if (match.player1) playersInRound.add(match.player1.toString());
                if (match.player2) playersInRound.add(match.player2.toString());
            });

            // Filter out players already in this round
            const availablePlayers = selectedPlayerIds.filter(id => !playersInRound.has(id));

            if (availablePlayers.length < 2) {
                throw new BadRequestError('Not enough available players for pairing');
            }

            // Shuffle players for random pairing
            const shuffledPlayers = [...availablePlayers].sort(() => Math.random() - 0.5);
            const pairs = [];

            // Create pairs
            for (let i = 0; i < shuffledPlayers.length; i += 2) {
                if (i + 1 < shuffledPlayers.length) {
                    pairs.push([shuffledPlayers[i], shuffledPlayers[i + 1]]);
                } else {
                    // Odd number of players - create a bye match
                    pairs.push([shuffledPlayers[i], undefined]);
                }
            }

            // Create matches for each pair
            const createdMatches = [];
            for (const [player1Id, player2Id] of pairs) {
                // For random pairings, use player1 as default scorer
                const match = await this.addPartialMatch(tournamentId, requesterId, {
                    round,
                    player1Id,
                    player2Id,
                    scorerId: player1Id // Default to player1 as scorer
                });
                if (match) {
                    createdMatches.push(match);
                }
            }

            return createdMatches;
        } catch (err) {
            console.error('generateRandomPairings error:', err);
            throw err;
        }
    }

    /**
     * Update a player in a knockout bracket pair
     * This method handles:
     * - Updating player references in tournament.knockout
     * - Creating match if it doesn't exist and at least one player is present
     * - Updating existing match with new player
     * - Syncing UI state with database
     * 
     * FUTURE: This will be extended to support lucky loser brackets
     * Lucky loser: Players who lose in early knockout rounds get a second chance
     * in a parallel bracket, with winners potentially re-entering the main bracket
     */
    static async updateKnockoutPairPlayer(
        tournamentId: string, 
        requesterId: string, 
        roundNumber: number,
        pairIndex: number,
        playerPosition: 'player1' | 'player2', 
        playerId: string | null
    ): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can update knockout pairs');
            }

            // Find the round
            const round = tournament.knockout.find((r: any) => r.round === roundNumber);
            if (!round) {
                throw new BadRequestError(`Round ${roundNumber} not found`);
            }

            // Find the pair
            if (pairIndex < 0 || pairIndex >= round.matches.length) {
                throw new BadRequestError(`Invalid pair index ${pairIndex}`);
            }

            const pair = round.matches[pairIndex];

            // Validate player exists in tournament if provided
            if (playerId) {
                const player = tournament.tournamentPlayers.find((p: any) => 
                    p.playerReference.toString() === playerId
                );
                if (!player) {
                    throw new BadRequestError('Player not found in tournament');
                }
            }

            // Update player reference in knockout structure
            pair[playerPosition] = playerId;

            // Handle match creation/update
            if (pair.matchReference) {
                // Match exists - update it
                const match = await MatchModel.findById(pair.matchReference);
                if (match) {
                    if (playerPosition === 'player1') {
                        match.player1 = playerId ? {
                            playerId: playerId,
                            legsWon: match.player1?.legsWon || 0,
                            legsLost: match.player1?.legsLost || 0,
                            average: match.player1?.average || 0,
                            highestCheckout: match.player1?.highestCheckout || 0,
                            oneEightiesCount: match.player1?.oneEightiesCount || 0,
                        } : null;
                    } else {
                        match.player2 = playerId ? {
                            playerId: playerId,
                            legsWon: match.player2?.legsWon || 0,
                            legsLost: match.player2?.legsLost || 0,
                            average: match.player2?.average || 0,
                            highestCheckout: match.player2?.highestCheckout || 0,
                            oneEightiesCount: match.player2?.oneEightiesCount || 0,
                        } : null;
                    }

                    // Update scorer if not set or if it was the removed player
                    if (!match.scorer || (match.scorer.toString() === playerId && !playerId)) {
                        match.scorer = match.player1?.playerId || match.player2?.playerId || null;
                    }

                    await match.save();
                }
            } else {
                // Match doesn't exist - create it if at least one player is present
                if (pair.player1 || pair.player2) {
                    const availableBoards = tournament.boards.filter((b: any) => b.isActive);
                    if (availableBoards.length === 0) {
                        throw new BadRequestError('No active boards available');
                    }

                    // Find board with least matches
                    const boardAssignments = await MatchModel.aggregate([
                        { $match: { tournamentRef: tournament._id, boardReference: { $exists: true } } },
                        { $group: { _id: '$boardReference', count: { $sum: 1 } } }
                    ]);

                    let selectedBoard = availableBoards[0];
                    let minMatches = boardAssignments.find(b => b._id === selectedBoard.boardNumber)?.count || 0;

                    for (const board of availableBoards) {
                        const boardMatchCount = boardAssignments.find(b => b._id === board.boardNumber)?.count || 0;
                        if (boardMatchCount < minMatches) {
                            selectedBoard = board;
                            minMatches = boardMatchCount;
                        }
                    }

                    const match = await MatchModel.create({
                        boardReference: selectedBoard.boardNumber,
                        tournamentRef: tournament._id,
                        type: 'knockout',
                        round: roundNumber,
                        player1: pair.player1 ? {
                            playerId: pair.player1,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        } : null,
                        player2: pair.player2 ? {
                            playerId: pair.player2,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        } : null,
                        scorer: pair.player1 || pair.player2,
                        status: 'pending',
                        legs: [],
                    });

                    pair.matchReference = match._id;

                    // Update board status if this is the first match
                    const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === selectedBoard.boardNumber);
                    if (boardIdx !== -1 && !tournament.boards[boardIdx].nextMatch) {
                        tournament.boards[boardIdx].status = 'waiting';
                        tournament.boards[boardIdx].nextMatch = match._id as any;
                        tournament.boards[boardIdx].currentMatch = undefined;
                    }
                }
            }

            await tournament.save();
            return true;
        } catch (err) {
            console.error('updateKnockoutPairPlayer error:', err);
            return false;
        }
    }

    static async updateMatchPlayer(tournamentId: string, requesterId: string, matchId: string, playerPosition: 'player1' | 'player2', playerId: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can update match players');
            }

            // Validate player exists in tournament
            const player = tournament.tournamentPlayers.find((p: any) => 
                p.playerReference.toString() === playerId
            );
            if (!player) {
                throw new BadRequestError('Player not found in tournament');
            }

            const match = await MatchModel.findById(matchId);
            if (!match) {
                throw new BadRequestError('Match not found');
            }

            // Check if this is a bye match that's getting a second player
            const isByeMatch = !match.player1?.playerId || !match.player2?.playerId;
            const wasByeMatch = isByeMatch;

            // Update the specified player
            if (playerPosition === 'player1') {
                match.player1 = {
                    playerId: playerId,
                    legsWon: 0,
                    legsLost: 0,
                    average: 0,
                    highestCheckout: 0,
                    oneEightiesCount: 0,
                };
            } else {
                match.player2 = {
                    playerId: playerId,
                    legsWon: 0,
                    legsLost: 0,
                    average: 0,
                    highestCheckout: 0,
                    oneEightiesCount: 0,
                };
            }

            // Update tournament knockout structure
            let matchFound = false;
            for (const round of tournament.knockout) {
                const knockoutMatch = round.matches.find((m: any) => m.matchReference?.toString() === matchId);
                if (knockoutMatch) {
                    knockoutMatch[playerPosition] = playerId;
                    matchFound = true;
                    break;
                }
            }

            if (!matchFound) {
                throw new BadRequestError('Match not found in tournament knockout structure');
            }

            // If this was a bye match and now has both players, set status to pending
            if (wasByeMatch && match.player1?.playerId && match.player2?.playerId) {
                match.status = 'pending';
                match.winnerId = undefined; // Reset winner since it's now a real match
                
                // Only assign board automatically if no board was manually assigned
                if (!match.boardReference) {
                    const availableBoards = tournament.boards.filter((board: any) => board.isActive);

                    if (availableBoards.length === 0) {
                        throw new BadRequestError('No active boards available for this tournament');
                    }

                    // Find a board that's idle or has the least matches
                    const boardAssignments = await MatchModel.aggregate([
                        { $match: { tournamentRef: tournament._id, boardReference: { $exists: true } } },
                        { $group: { _id: '$boardReference', count: { $sum: 1 } } }
                    ]);

                    let selectedBoard = availableBoards[0];
                    let minMatches = boardAssignments.find(b => b._id === selectedBoard.boardNumber)?.count || 0;

                    for (const board of availableBoards) {
                        const boardMatchCount = boardAssignments.find(b => b._id === board.boardNumber)?.count || 0;
                        if (boardMatchCount < minMatches) {
                            selectedBoard = board;
                            minMatches = boardMatchCount;
                        }
                    }

                    match.boardReference = selectedBoard.boardNumber;
                    console.log(`Auto-assigned board ${selectedBoard.boardNumber} to bye match ${match._id}`);
                } else {
                    console.log(`Keeping manually assigned board ${match.boardReference} for bye match ${match._id}`);
                }
            }

            // Update scorer if not set
            if (!match.scorer) {
                match.scorer = playerId;
            }

            await tournament.save();
            await match.save();
            return true;
        } catch (err) {
            console.error('updateMatchPlayer error:', err);
            return false;
        }
    }

    static async addManualMatch(tournamentId: string, requesterId: string, matchData: {
        round: number;
        player1Id: string;
        player2Id: string;
        scorerId?: string;
        boardNumber?: number;
    }): Promise<any> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can add manual matches');
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

            // Validate scorer if provided
            let scorerId = matchData.player1Id; // Default to player1
            if (matchData.scorerId) {
                const scorer = tournament.tournamentPlayers.find((p: any) => 
                    p.playerReference.toString() === matchData.scorerId
                );
                if (!scorer) {
                    throw new BadRequestError('Scorer not found in tournament');
                }
                scorerId = matchData.scorerId;
            }

            // Find the round
            const round = tournament.knockout.find((r: any) => r.round === matchData.round);
            if (!round) {
                throw new BadRequestError(`Round ${matchData.round} not found`);
            }

            // Get available boards for this tournament
            const availableBoards = tournament.boards.filter((board: any) => board.isActive);
            if (availableBoards.length === 0) {
                throw new BadRequestError('No active boards available for this tournament');
            }

            // Assign board: board number is now required
            if (!matchData.boardNumber) {
                throw new BadRequestError('Board number is required for manual match creation');
            }
            
            // Validate that the provided board number is available for this tournament
            const assignedBoard = availableBoards.find((board: any) => board.boardNumber === matchData.boardNumber);
            if (!assignedBoard) {
                throw new BadRequestError(`Board ${matchData.boardNumber} is not available for this tournament`);
            }
            
            // For manual board selection, we allow assignment even if board is busy
            // The user explicitly chose this board, so we respect their choice
            console.log(`Manual board assignment: Board ${matchData.boardNumber} selected by user`);

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
                scorer: scorerId, // Use selected scorer or default to player1
                status: 'pending',
                legs: [],
            });

            // Add match to round
            round.matches.push({
                player1: matchData.player1Id,
                player2: matchData.player2Id,
                matchReference: match._id,
            });

            // Update board status only if it doesn't already have a nextMatch
            const boardIdx = tournament.boards.findIndex((b: any) => b.boardNumber === assignedBoard.boardNumber);
            if (boardIdx !== -1 && !tournament.boards[boardIdx].nextMatch) {
                tournament.boards[boardIdx].status = 'waiting';
                tournament.boards[boardIdx].nextMatch = match._id as any;
                tournament.boards[boardIdx].currentMatch = undefined;
            }

            await tournament.save();

            return match;
        } catch (err) {
            console.error('addManualMatch error:', err);
            return false;
        }
    }

    static async getPlayerMatches(tournamentCode: string, playerId: string): Promise<any[]> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            const { MatchModel } = await import('../models/match.model');
            const matches = await MatchModel.find({
                tournamentRef: tournament._id,
                $or: [
                    { 'player1.playerId': playerId },
                    { 'player2.playerId': playerId }
                ]
            })
            .populate('player1.playerId player2.playerId legs')
            .sort({ createdAt: -1 });

            // Calculate stats for each match
            return matches.map((match: any) => {
                const isPlayer1 = match.player1?.playerId?._id?.toString() === playerId;
                const isPlayer2 = match.player2?.playerId?._id?.toString() === playerId;
                
                if (!isPlayer1 && !isPlayer2) {
                    return match.toObject();
                }

                // Use stored average from match model
                const playerData = isPlayer1 ? match.player1 : match.player2;
                const average = playerData?.average || 0;

                // Calculate highest checkout from legs (using actual darts used)
                let highestCheckout = 0;

                if (match.legs && Array.isArray(match.legs)) {
                    for (const leg of match.legs) {
                        const playerThrows = isPlayer1 ? leg.player1Throws : leg.player2Throws;
                        
                        if (playerThrows && Array.isArray(playerThrows)) {
                            for (const throwData of playerThrows) {
                                // Track highest checkout
                                if (throwData.isCheckout && throwData.score > highestCheckout) {
                                    highestCheckout = throwData.score;
                                }
                            }
                        }
                    }
                }

                // Get round/group info
                let round: string | undefined;
                let groupName: string | undefined;

                if (match.type === 'group' && tournament.groups) {
                    // Find which group contains this match
                    const group = tournament.groups.find((g: any) => 
                        g.matches && Array.isArray(g.matches) && 
                        g.matches.some((matchId: any) => matchId?.toString() === match._id.toString())
                    );
                    if (group) {
                        // Get board name if available, otherwise use board number
                        const board = tournament.boards?.find((b: any) => b.boardNumber === group.board);
                        if (board?.name) {
                            groupName = board.name;
                        } else {
                            groupName = `Csoport ${group.board || ''}`;
                        }
                    }
                } else if (match.type === 'knockout' && tournament.knockout) {
                    // Find which round this match belongs to
                    for (let i = 0; i < tournament.knockout.length; i++) {
                        const roundData = tournament.knockout[i];
                        if (roundData.matches && Array.isArray(roundData.matches)) {
                            const matchInRound = roundData.matches.find((m: any) => 
                                m.matchReference?.toString() === match._id.toString()
                            );
                            if (matchInRound) {
                                round = `${i + 1}. kör`;
                                break;
                            }
                        }
                    }
                }

                return {
                    ...match.toObject(),
                    average: Math.round(average * 100) / 100, // Round to 2 decimal places
                    checkout: highestCheckout > 0 ? highestCheckout.toString() : undefined,
                    round,
                    groupName,
                };
            });

        } catch (error) {
            console.error('Get player matches error:', error);
            throw error;
        }
    }

    static async movePlayerInGroup(tournamentCode: string, groupId: string, playerId: string, direction: 'up' | 'down'): Promise<boolean> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check if user has permission to modify tournament
            const { ClubService } = await import('./club.service');
            
            // Handle both ObjectId and populated club object
            let clubId: string;
            if (typeof tournament.clubId === 'object' && tournament.clubId._id) {
                clubId = tournament.clubId._id.toString();
            } else {
                clubId = tournament.clubId.toString();
            }
            
            const club = await ClubService.getClub(clubId);
            if (!club) {
                throw new BadRequestError('Club not found');
            }

            const group = tournament.groups.find((g: any) => g._id.toString() === groupId);
            if (!group) {
                throw new BadRequestError('Group not found');
            }

            // Find the player by tournamentPlayer._id
            const currentPlayerIndex = tournament.tournamentPlayers.findIndex((p: any) => p._id.toString() === playerId);
            if (currentPlayerIndex === -1) {
                throw new BadRequestError('Player not found in tournament');
            }

            const currentPlayer = tournament.tournamentPlayers[currentPlayerIndex];
            const currentStanding = currentPlayer.groupStanding;

            if (!currentStanding) {
                throw new BadRequestError('Player has no group standing');
            }

            // Calculate new standing
            let newStanding: number;
            if (direction === 'up') {
                newStanding = currentStanding - 1;
                if (newStanding < 1) {
                    throw new BadRequestError('Player is already at the top');
                }
            } else {
                newStanding = currentStanding + 1;
                // Check if this would exceed the number of players in the group
                const groupPlayersCount = tournament.tournamentPlayers.filter((p: any) => 
                    p.groupId && p.groupId.toString() === groupId
                ).length;
                if (newStanding > groupPlayersCount) {
                    throw new BadRequestError('Player is already at the bottom');
                }
            }

            // Find the player who currently has the target standing
            const targetPlayerIndex = tournament.tournamentPlayers.findIndex((p: any) => 
                p.groupId && p.groupId.toString() === groupId && p.groupStanding === newStanding
            );

            if (targetPlayerIndex === -1) {
                throw new BadRequestError('Target position not found');
            }

            // Swap standings: current player gets new standing, target player gets current standing
            tournament.tournamentPlayers[currentPlayerIndex].groupStanding = newStanding;
            tournament.tournamentPlayers[targetPlayerIndex].groupStanding = currentStanding;

            await tournament.save();
            return true;

        } catch (error) {
            console.error('Error moving player in group:', error);
            throw error;
        }
    }

    static async finishTournament(tournamentCode: string, requesterId: string): Promise<boolean> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId._id.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can finish tournaments');
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
                throw new BadRequestError('No checked-in players found');
            }

            const totalPlayers = checkedInPlayers.length;
            const playerStandings = new Map<string, number>();

            // Step 1: Handle group-only tournaments
            if (format === 'group') {
                // For group-only tournaments, use group standings
                checkedInPlayers.forEach((player: any) => {
                    const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                    if (playerId) {
                        playerStandings.set(playerId, player.groupStanding || totalPlayers);
                    }
                });
            } else if (format === 'knockout') {
                // Step 2: Handle knockout-only tournaments
                if (!tournament.knockout || tournament.knockout.length === 0) {
                    throw new BadRequestError('No knockout rounds found for knockout tournament');
                }

                const playersInKnockout = new Set<string>();
                
                // Collect all players who appear in any knockout round
                for (const round of tournament.knockout) {
                    if (round.matches && Array.isArray(round.matches)) {
                        for (const match of round.matches) {
                            if (match.player1) {
                                const player1Id = typeof match.player1 === 'object' ? 
                                    (match.player1 as any)._id?.toString() : match.player1?.toString();
                                if (player1Id) playersInKnockout.add(player1Id);
                            }
                            if (match.player2) {
                                const player2Id = typeof match.player2 === 'object' ? 
                                    (match.player2 as any)._id?.toString() : match.player2?.toString();
                                if (player2Id) playersInKnockout.add(player2Id);
                            }
                        }
                    }
                }

                // Handle knockout eliminations
                for (let roundIndex = 0; roundIndex < tournament.knockout.length; roundIndex++) {
                    const round = tournament.knockout[roundIndex];
                    const matches = round.matches || [];
                    const isFinalRound = roundIndex === tournament.knockout.length - 1;

                    // Calculate how many players are in this round
                    const playersInThisRound = matches.length * 2;
                    const positionForThisRound = playersInThisRound;

                    for (const match of matches) {
                        const matchRef = match.matchReference;
                        if (!matchRef) {
                            // Skip matches without reference (empty pairs or bye matches)
                            continue;
                        }

                        // Handle both populated and non-populated matchReference
                        const matchRefObj = typeof matchRef === 'object' ? matchRef : null;
                        if (!matchRefObj || !(matchRefObj as any).winnerId) {
                            throw new BadRequestError(`Incomplete match in round ${roundIndex + 1} - all matches must be finished`);
                        }

                        // Skip bye matches (only one player)
                        if (!match.player1 || !match.player2) {
                            continue;
                        }

                        const winnerId = (matchRefObj as any).winnerId.toString();
                        const player1Id = typeof match.player1 === 'object' ? 
                            (match.player1 as any)._id?.toString() : match.player1?.toString();
                        const player2Id = typeof match.player2 === 'object' ? 
                            (match.player2 as any)._id?.toString() : match.player2?.toString();
                        const loserId = winnerId === player1Id ? player2Id : player1Id;

                        if (loserId && !playerStandings.has(loserId)) {
                            if (isFinalRound) {
                                // Final round: winner gets 1st, loser gets 2nd
                                playerStandings.set(winnerId, 1);
                                playerStandings.set(loserId, 2);
            } else {
                                // Other rounds: losers get position equal to players in this round
                                playerStandings.set(loserId, positionForThisRound);
                            }
                        }
                    }
                }
            } else {
                // Step 3: Handle group_knockout tournaments
                const playersInKnockout = new Set<string>();
                
                // Collect all players who appear in any knockout round
                if (tournament.knockout && Array.isArray(tournament.knockout)) {
                    for (const round of tournament.knockout) {
                        if (round.matches && Array.isArray(round.matches)) {
                            for (const match of round.matches) {
                                if (match.player1) {
                                    const player1Id = typeof match.player1 === 'object' ? 
                                        (match.player1 as any)._id?.toString() : match.player1?.toString();
                                    if (player1Id) playersInKnockout.add(player1Id);
                                }
                                if (match.player2) {
                                    const player2Id = typeof match.player2 === 'object' ? 
                                        (match.player2 as any)._id?.toString() : match.player2?.toString();
                                    if (player2Id) playersInKnockout.add(player2Id);
                                }
                            }
                        }
                    }
                }

                // Assign positions to players eliminated in group stage
                checkedInPlayers.forEach((player: any) => {
                    const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                    if (playerId && !playersInKnockout.has(playerId)) {
                        // Player was eliminated in group stage - gets position N (total players)
                        playerStandings.set(playerId, totalPlayers);
                    }
                });

                // Handle knockout eliminations
                if (tournament.knockout && Array.isArray(tournament.knockout)) {
                    for (let roundIndex = 0; roundIndex < tournament.knockout.length; roundIndex++) {
                        const round = tournament.knockout[roundIndex];
                        const matches = round.matches || [];
                        const isFinalRound = roundIndex === tournament.knockout.length - 1;

                        // Calculate how many players are in this round
                        const playersInThisRound = matches.length * 2;
                        const positionForThisRound = playersInThisRound;

                        for (const match of matches) {
                            const matchRef = match.matchReference;
                            if (!matchRef) {
                                throw new BadRequestError(`Incomplete match in round ${roundIndex + 1}`);
                            }

                            // Handle both populated and non-populated matchReference
                            const matchRefObj = typeof matchRef === 'object' ? matchRef : null;
                            if (!matchRefObj || !(matchRefObj as any).winnerId) {
                                throw new BadRequestError(`Incomplete match in round ${roundIndex + 1}`);
                            }

                            if (!match.player1 || !match.player2) {
                                throw new BadRequestError(`Invalid players in match in round ${roundIndex + 1}`);
                            }

                            const winnerId = (matchRefObj as any).winnerId.toString();
                            const player1Id = typeof match.player1 === 'object' ? 
                                (match.player1 as any)._id?.toString() : match.player1?.toString();
                            const player2Id = typeof match.player2 === 'object' ? 
                                (match.player2 as any)._id?.toString() : match.player2?.toString();
                            const loserId = winnerId === player1Id ? player2Id : player1Id;

                            if (loserId && !playerStandings.has(loserId)) {
                                if (isFinalRound) {
                                    // Final round: winner gets 1st, loser gets 2nd
                                    playerStandings.set(winnerId, 1);
                                    playerStandings.set(loserId, 2);
                                } else {
                                    // Other rounds: losers get position equal to players in this round
                                    playerStandings.set(loserId, positionForThisRound);
                                }
                            }
                        }
                    }
                }
            }

            // Step 5: Ensure all players have a standing
            checkedInPlayers.forEach((player: any) => {
                const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                if (playerId && !playerStandings.has(playerId)) {
                    // Fallback: assign last position
                    playerStandings.set(playerId, totalPlayers);
                }
            });

            // Step 6: Get stats from actual matches
            const playerStats = new Map<string, {
                average: number;
                checkoutRate: number;
                legsWon: number;
                legsPlayed: number;
                matchesWon: number;
                matchesPlayed: number;
                highestCheckout: number;
                oneEighties: number;
                tournamentTotal: number;
                tournamentMatches: number;
            }>();

            // Initialize all players with zero stats
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
                        tournamentTotal: 0,
                        tournamentMatches: 0,
                    });
                }
            });

            // ===== REFACTORED: SIMPLE AND STABLE STATS CALCULATION =====
            // Get all matches for this tournament that have a winner (finished matches)
            const { MatchModel } = await import('../models/match.model');
            
            // Get group matches
            const groupMatches = await MatchModel.find({
                tournamentRef: tournament._id,
                type: 'group',
                winnerId: { $exists: true, $ne: null } // Only matches with a winner
            }).populate('player1.playerId player2.playerId legs');

            // Get knockout matches from tournament.knockout rounds
            const knockoutMatchIds: any[] = [];
            if (tournament.knockout && Array.isArray(tournament.knockout)) {
                for (const round of tournament.knockout) {
                    if (round.matches && Array.isArray(round.matches)) {
                        for (const match of round.matches) {
                            if (match.matchReference) {
                                knockoutMatchIds.push(match.matchReference);
                            }
                        }
                    }
                }
            }

            const knockoutMatches = knockoutMatchIds.length > 0 ? await MatchModel.find({
                _id: { $in: knockoutMatchIds },
                winnerId: { $exists: true, $ne: null } // Only matches with a winner
            }).populate('player1.playerId player2.playerId legs') : [];

            // Combine all matches for overall tournament stats
            const allMatches = [...groupMatches, ...knockoutMatches];

            console.log(`Found ${allMatches.length} finished matches for tournament ${tournamentCode} (${groupMatches.length} group + ${knockoutMatches.length} knockout)`);

            // Separate stats for group stage only (for group standings) and overall tournament stats
            const groupStageStats = new Map<string, {
                average: number;
                checkoutRate: number;
                legsWon: number;
                legsPlayed: number;
                matchesWon: number;
                matchesPlayed: number;
                highestCheckout: number;
                oneEighties: number;
                tournamentTotal: number;
                tournamentMatches: number;
            }>();

            // Initialize group stage stats
            checkedInPlayers.forEach((player: any) => {
                const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                if (playerId) {
                    groupStageStats.set(playerId, {
                        average: 0,
                        checkoutRate: 0,
                        legsWon: 0,
                        legsPlayed: 0,
                        matchesWon: 0,
                        matchesPlayed: 0,
                        highestCheckout: 0,
                        oneEighties: 0,
                        tournamentTotal: 0,
                        tournamentMatches: 0,
                    });
                }
            });

            // Process GROUP matches only for group stage stats
            for (const match of groupMatches) {
                const player1Id = match.player1?.playerId?._id?.toString();
                const player2Id = match.player2?.playerId?._id?.toString();
                
                if (!player1Id || !player2Id) continue;

                const player1GroupStats = groupStageStats.get(player1Id);
                const player2GroupStats = groupStageStats.get(player2Id);
                
                if (!player1GroupStats || !player2GroupStats) continue;

                // Count matches
                player1GroupStats.matchesPlayed++;
                player2GroupStats.matchesPlayed++;

                const winnerId = match.winnerId.toString();
                if (winnerId === player1Id) {
                    player1GroupStats.matchesWon++;
                } else if (winnerId === player2Id) {
                    player2GroupStats.matchesWon++;
                }

                // Calculate match average for each player
                let player1TotalScore = 0;
                let player1TotalThrows = 0;
                let player2TotalScore = 0;
                let player2TotalThrows = 0;

                if (match.legs && Array.isArray(match.legs)) {
                    for (const leg of match.legs) {
                        if (leg.player1Throws && Array.isArray(leg.player1Throws)) {
                            for (const throwData of leg.player1Throws) {
                                player1TotalScore += throwData.score || 0;
                                player1TotalThrows++;
                                if (throwData.score === 180) {
                                    player1GroupStats.oneEighties++;
                                }
                                if (throwData.isCheckout && throwData.score > player1GroupStats.highestCheckout) {
                                    player1GroupStats.highestCheckout = throwData.score;
                                }
                            }
                            player1GroupStats.legsPlayed++;
                        }

                        if (leg.player2Throws && Array.isArray(leg.player2Throws)) {
                            for (const throwData of leg.player2Throws) {
                                player2TotalScore += throwData.score || 0;
                                player2TotalThrows++;
                                if (throwData.score === 180) {
                                    player2GroupStats.oneEighties++;
                                }
                                if (throwData.isCheckout && throwData.score > player2GroupStats.highestCheckout) {
                                    player2GroupStats.highestCheckout = throwData.score;
                                }
                            }
                            player2GroupStats.legsPlayed++;
                        }

                        if (leg.winnerId) {
                            const legWinnerId = leg.winnerId.toString();
                            if (legWinnerId === player1Id) {
                                player1GroupStats.legsWon++;
                            } else if (legWinnerId === player2Id) {
                                player2GroupStats.legsWon++;
                            }
                        }
                    }
                }

                if (player1TotalThrows > 0) {
                    const matchAverage = player1TotalScore / player1TotalThrows;
                    player1GroupStats.tournamentTotal += matchAverage;
                    player1GroupStats.tournamentMatches++;
                }

                if (player2TotalThrows > 0) {
                    const matchAverage = player2TotalScore / player2TotalThrows;
                    player2GroupStats.tournamentTotal += matchAverage;
                    player2GroupStats.tournamentMatches++;
                }
            }

            // Calculate group stage averages
            for (const [, stats] of groupStageStats) {
                if (stats.tournamentMatches > 0) {
                    stats.average = stats.tournamentTotal / stats.tournamentMatches;
                } else {
                    stats.average = 0;
                }
            }

            // Process ALL matches (group + knockout) for overall tournament stats
            for (const match of allMatches) {
                const player1Id = match.player1?.playerId?._id?.toString();
                const player2Id = match.player2?.playerId?._id?.toString();
                
                // Skip if players not found
                if (!player1Id || !player2Id) continue;

                const player1Stats = playerStats.get(player1Id);
                const player2Stats = playerStats.get(player2Id);
                
                if (!player1Stats || !player2Stats) continue;

                // === 1. COUNT MATCHES ===
                player1Stats.matchesPlayed++;
                player2Stats.matchesPlayed++;

                const winnerId = match.winnerId.toString();
                if (winnerId === player1Id) {
                    player1Stats.matchesWon++;
                } else if (winnerId === player2Id) {
                    player2Stats.matchesWon++;
                }

                // === 2. CALCULATE MATCH AVERAGE FOR EACH PLAYER ===
                let player1TotalScore = 0;
                let player1TotalThrows = 0;
                let player2TotalScore = 0;
                let player2TotalThrows = 0;

                // Process legs
                if (match.legs && Array.isArray(match.legs)) {
                    for (const leg of match.legs) {
                        // Player 1 leg processing
                        if (leg.player1Throws && Array.isArray(leg.player1Throws)) {
                            for (const throwData of leg.player1Throws) {
                                player1TotalScore += throwData.score || 0;
                                player1TotalThrows++;
                                
                                // Count 180s
                                if (throwData.score === 180) {
                                    player1Stats.oneEighties++;
                                }
                                
                                // Track highest checkout
                                if (throwData.isCheckout && throwData.score > player1Stats.highestCheckout) {
                                    player1Stats.highestCheckout = throwData.score;
                                }
                            }
                            player1Stats.legsPlayed++;
                        }

                        // Player 2 leg processing
                        if (leg.player2Throws && Array.isArray(leg.player2Throws)) {
                            for (const throwData of leg.player2Throws) {
                                player2TotalScore += throwData.score || 0;
                                player2TotalThrows++;
                                
                                // Count 180s
                                if (throwData.score === 180) {
                                    player2Stats.oneEighties++;
                                }
                                
                                // Track highest checkout
                                if (throwData.isCheckout && throwData.score > player2Stats.highestCheckout) {
                                    player2Stats.highestCheckout = throwData.score;
                                }
                            }
                            player2Stats.legsPlayed++;
                        }

                        // Count legs won
                        if (leg.winnerId) {
                            const legWinnerId = leg.winnerId.toString();
                            if (legWinnerId === player1Id) {
                                player1Stats.legsWon++;
                            } else if (legWinnerId === player2Id) {
                                player2Stats.legsWon++;
                            }
                        }
                    }
                }

                // Calculate this match's average and add to tournament total
                if (player1TotalThrows > 0) {
                    const matchAverage = player1TotalScore / player1TotalThrows;
                    player1Stats.tournamentTotal += matchAverage;
                    player1Stats.tournamentMatches++;
                }

                if (player2TotalThrows > 0) {
                    const matchAverage = player2TotalScore / player2TotalThrows;
                    player2Stats.tournamentTotal += matchAverage;
                    player2Stats.tournamentMatches++;
                }
            }

            // === 3. CALCULATE FINAL TOURNAMENT AVERAGES ===
            /* eslint-disable @typescript-eslint/no-unused-vars */
            for (const [playerId, stats] of playerStats) {
                if (stats.tournamentMatches > 0) {
                    // Tournament average = sum of match averages / number of matches
                    stats.average = stats.tournamentTotal / stats.tournamentMatches;
                } else {
                    stats.average = 0;
                }
            }
            /* eslint-enable @typescript-eslint/no-unused-vars */

            // === 4. LOG RESULTS ===
            console.log('=== TOURNAMENT STATS SUMMARY ===');
            for (const [playerId, stats] of playerStats) {
                console.log(`Player ${playerId}:`);
                console.log(`  Matches: ${stats.matchesWon}W / ${stats.matchesPlayed - stats.matchesWon}L (${stats.matchesPlayed} total)`);
                console.log(`  Legs: ${stats.legsWon}W / ${stats.legsPlayed - stats.legsWon}L (${stats.legsPlayed} total)`);
                console.log(`  Tournament Average: ${stats.average.toFixed(2)} (from ${stats.tournamentMatches} matches)`);
                console.log(`  180s: ${stats.oneEighties}, Highest Checkout: ${stats.highestCheckout}`);
            }
            console.log('===============================');

            // Step 7: Update tournament players with final standings
            tournament.tournamentPlayers = tournament.tournamentPlayers.map((player: any) => {
                const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                const standing = playerStandings.get(playerId);
                
                if (standing) {
                    const overallStats = playerStats.get(playerId);
                    const groupOnlyStats = groupStageStats.get(playerId);
                    
                    // Use group-only stats for group stage points, overall stats for tournament stats
                    const groupStats = groupOnlyStats || overallStats;
                    const finalStats = overallStats || {};
                    
                    return {
                        ...player,
                        tournamentStanding: standing,
                        finalPosition: standing,
                        eliminatedIn: this.getEliminationText(standing, format),
                        // Group stage stats (only from group matches) - used for group standings
                        stats: {
                            matchesWon: groupStats?.matchesWon || 0,
                            matchesLost: groupStats?.matchesPlayed ? groupStats.matchesPlayed - groupStats.matchesWon : 0,
                            legsWon: groupStats?.legsWon || 0,
                            legsLost: groupStats?.legsPlayed ? groupStats.legsPlayed - groupStats.legsWon : 0,
                            avg: groupStats?.average || 0, // Group stage average only
                            oneEightiesCount: groupStats?.oneEighties || 0,
                            highestCheckout: groupStats?.highestCheckout || 0,
                        },
                        // Overall tournament stats (from all matches) - used for final tournament stats
                        finalStats: finalStats
                    };
                }
                return player;
            });

            // Step 8: Calculate tournament average for MMR calculation
            let tournamentAverageScore = 0;
            if (playerStats.size > 0) {
                const totalAvg = Array.from(playerStats.values()).reduce((sum, s) => sum + s.average, 0);
                tournamentAverageScore = totalAvg / playerStats.size;
            }

            // Step 9: Update Player collection statistics with MMR
            for (const [playerId, stats] of playerStats) {
                const player = await PlayerModel.findById(playerId);
                if (player) {
                    // Get the tournament standing from the tournament players array
                    const tournamentPlayer = tournament.tournamentPlayers.find((tp: any) => {
                        const tpPlayerId = tp.playerReference?._id?.toString() || tp.playerReference?.toString();
                        return tpPlayerId === playerId;
                    });
                    const placement = tournamentPlayer?.tournamentStanding || totalPlayers;

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
                            average: stats.average, // Add tournament average to history
                        },
                        date: new Date()
                    };

                    if (!player.tournamentHistory) {
                        player.tournamentHistory = [];
                    }
                    player.tournamentHistory.push(tournamentHistory);

                    // Update overall statistics
                    if (!player.stats) {
                        player.stats = {
                            tournamentsPlayed: 0,
                            matchesPlayed: 0,
                            legsWon: 0,
                            legsLost: 0,
                            oneEightiesCount: 0,
                            highestCheckout: 0,
                            avg: 0,
                            averagePosition: 0,
                            bestPosition: 999,
                            totalMatchesWon: 0,
                            totalMatchesLost: 0,
                            totalLegsWon: 0,
                            totalLegsLost: 0,
                            total180s: 0
                        };
                    }

                    // Handle legacy data: ensure tournamentsPlayed is a number
                    if (Array.isArray(player.stats.tournamentsPlayed)) {
                        player.stats.tournamentsPlayed = player.stats.tournamentsPlayed.length;
                    } else if (typeof player.stats.tournamentsPlayed !== 'number') {
                        player.stats.tournamentsPlayed = 0;
                    }

                    // Update tournament count
                    player.stats.tournamentsPlayed += 1;

                    // Ensure all stats fields are numbers
                    if (typeof player.stats.bestPosition !== 'number') player.stats.bestPosition = 999;
                    if (typeof player.stats.totalMatchesWon !== 'number') player.stats.totalMatchesWon = 0;
                    if (typeof player.stats.totalMatchesLost !== 'number') player.stats.totalMatchesLost = 0;
                    if (typeof player.stats.totalLegsWon !== 'number') player.stats.totalLegsWon = 0;
                    if (typeof player.stats.totalLegsLost !== 'number') player.stats.totalLegsLost = 0;
                    if (typeof player.stats.total180s !== 'number') player.stats.total180s = 0;
                    if (typeof player.stats.highestCheckout !== 'number') player.stats.highestCheckout = 0;
                    if (typeof player.stats.averagePosition !== 'number') player.stats.averagePosition = 0;
                    if (typeof player.stats.matchesPlayed !== 'number') player.stats.matchesPlayed = 0;
                    if (typeof player.stats.legsWon !== 'number') player.stats.legsWon = 0;
                    if (typeof player.stats.legsLost !== 'number') player.stats.legsLost = 0;
                    if (typeof player.stats.oneEightiesCount !== 'number') player.stats.oneEightiesCount = 0;
                    if (typeof player.stats.avg !== 'number') player.stats.avg = 0;
                    if (typeof player.stats.mmr !== 'number') player.stats.mmr = MMRService.getInitialMMR();

                    // Update best position
                    if (placement < player.stats.bestPosition || player.stats.bestPosition === 0 || player.stats.bestPosition === 999) {
                        player.stats.bestPosition = placement;
                    }

                    // Update match statistics
                    player.stats.totalMatchesWon += stats.matchesWon;
                    player.stats.totalMatchesLost += (stats.matchesPlayed - stats.matchesWon);
                    player.stats.totalLegsWon += stats.legsWon;
                    player.stats.totalLegsLost += (stats.legsPlayed - stats.legsWon);
                    player.stats.total180s += stats.oneEighties;

                    // Update highest checkout
                    if (stats.highestCheckout > player.stats.highestCheckout) {
                        player.stats.highestCheckout = stats.highestCheckout;
                    }

                    // Update one-eighties count
                    player.stats.oneEightiesCount += stats.oneEighties;

                    // Update matches and legs played
                    player.stats.matchesPlayed += stats.matchesPlayed;
                    player.stats.legsWon += stats.legsWon;
                    player.stats.legsLost += (stats.legsPlayed - stats.legsWon);

                    // Update average - use tournament history to recalculate all-time average
                    // This ensures accuracy even if tournaments are reopened and re-finished
                    if (player.tournamentHistory && player.tournamentHistory.length > 0) {
                        // Calculate all-time average from tournament history
                        const totalAvg = player.tournamentHistory.reduce((sum: number, hist: any) => {
                            // Get average from tournament stats, fallback to 0
                            return sum + (hist.stats?.average || 0);
                        }, 0);
                        player.stats.avg = totalAvg / player.tournamentHistory.length;
                    } else {
                        player.stats.avg = stats.average;
                    }

                    console.log(`Player ${player.name} tournament average: ${stats.average.toFixed(2)}, all-time average: ${player.stats.avg.toFixed(2)}`);

                    // Calculate average position from tournament history
                    if (player.tournamentHistory && player.tournamentHistory.length > 0) {
                        const totalPosition = player.tournamentHistory.reduce((sum: number, hist: any) => sum + hist.position, 0);
                        player.stats.averagePosition = totalPosition / player.tournamentHistory.length;
                    } else {
                        player.stats.averagePosition = placement;
                    }

                    // Calculate MMR change
                    const matchWinRate = stats.matchesPlayed > 0 ? stats.matchesWon / stats.matchesPlayed : 0;
                    const legWinRate = stats.legsPlayed > 0 ? stats.legsWon / stats.legsPlayed : 0;
                    
                    // Get current MMR or initialize to base value if not set
                    const currentMMR = player.stats.mmr || MMRService.getInitialMMR();
                    
                    const newMMR = MMRService.calculateMMRChange(
                        currentMMR,
                        placement,
                        totalPlayers,
                        matchWinRate,
                        legWinRate,
                        stats.average,
                        tournamentAverageScore
                    );
                    
                    const mmrChange = Math.ceil(newMMR) - currentMMR;
                    player.stats.mmr = Math.ceil(newMMR); // Felfelé kerekítés tizedesjegyek nélkül
                    
                    console.log(`Player ${player.name} MMR: ${currentMMR} → ${Math.ceil(newMMR)} (${mmrChange >= 0 ? '+' : ''}${mmrChange})`);

                    await player.save();
                }
            }

            // Step 10: Update tournament status to finished and reset boards
            console.log('=== DATABASE UPDATE DEBUG ===');
            console.log('Updating tournament with ID:', tournament._id);
            console.log('Current tournament status:', tournament.tournamentSettings?.status);
            console.log('Current tournamentPlayers count:', tournament.tournamentPlayers?.length || 0);
            console.log('Sample tournamentPlayer:', JSON.stringify(tournament.tournamentPlayers?.[0], null, 2));
            console.log('Updated tournamentPlayers:', JSON.stringify(tournament.tournamentPlayers.slice(0, 2), null, 2)); // Show first 2 players
            console.log('================================');

            // Reset all boards to idle status (boards are now part of tournament)
            // Handle both new (tournament.boards) and legacy (club.boards) approaches
            const updateData: any = {
                        'tournamentSettings.status': 'finished',
                        'tournamentPlayers': tournament.tournamentPlayers
            };

            if (tournament.boards && tournament.boards.length > 0) {
                // New approach: tournament has its own boards
                tournament.boards = tournament.boards.map((board: any) => ({
                    ...board,
                    status: 'idle',
                    currentMatch: undefined,
                    nextMatch: undefined
                }));
                updateData['boards'] = tournament.boards;
                console.log('✅ Resetting tournament boards to idle');
            } else {
                // Legacy approach: boards were in club
                // No board reset needed, they're managed elsewhere
                console.log('⚠️ Legacy tournament without boards array - skipping board reset');
            }

            const updateResult = await TournamentModel.updateOne(
                { _id: tournament._id },
                { $set: updateData }
            );

            console.log('Update result:', updateResult);
            console.log('Modified count:', updateResult.modifiedCount);
            console.log('Matched count:', updateResult.matchedCount);

            // Step 11: Calculate league points if tournament is attached to a league
            try {
                const { LeagueService } = await import('./league.service');
                const league = await LeagueService.findLeagueByTournament(tournament._id.toString());
                if (league) {
                    console.log('Tournament is attached to league, calculating points...');
                    // Get updated tournament with final standings
                    const updatedTournament = await TournamentModel.findById(tournament._id);
                    if (updatedTournament) {
                        await LeagueService.calculatePointsForTournament(updatedTournament, league);
                        console.log('League points calculated successfully');
                    }
                }
            } catch (error) {
                console.error('Error calculating league points:', error);
                // Don't fail tournament completion if league calculation fails
            }

            console.log(`✅ Tournament ${tournamentCode} finished successfully with MMR updates`);
            return true;
        } catch (error) {
            console.error('Finish tournament error:', error);
            // Re-throw BadRequestError for proper frontend error handling
            if (error instanceof BadRequestError) {
                throw error;
            }
            throw new BadRequestError('Failed to finish tournament: ' + (error as Error).message);
        }
    }

    static async cancelKnockout(tournamentCode: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check if tournament is in knockout stage
            if (tournament.tournamentSettings?.status !== 'knockout') {
                throw new BadRequestError('Tournament is not in knockout stage');
            }

            // Get all knockout match IDs
            const knockoutMatchIds: mongoose.Types.ObjectId[] = [];
            if (tournament.knockout && Array.isArray(tournament.knockout)) {
                for (const round of tournament.knockout) {
                    if (round.matches && Array.isArray(round.matches)) {
                        for (const match of round.matches) {
                            if (match.matchReference) {
                                const matchId = typeof match.matchReference === 'object' ? 
                                    (match.matchReference as any)._id : match.matchReference;
                                if (matchId) {
                                    knockoutMatchIds.push(matchId);
                                }
                            }
                        }
                    }
                }
            }

            // Delete all knockout matches
            if (knockoutMatchIds.length > 0) {
                await MatchModel.deleteMany({ _id: { $in: knockoutMatchIds } });
                console.log(`Deleted ${knockoutMatchIds.length} knockout matches`);
            }

            // Clear knockout structure
            tournament.knockout = [];
            tournament.tournamentSettings.knockoutMethod = undefined;

            // Reset tournament status based on format
            const format = tournament.tournamentSettings?.format || 'group_knockout';
            if (format === 'knockout') {
                // For knockout-only tournaments, go back to pending
                tournament.tournamentSettings.status = 'pending';
            } else {
                // For group_knockout tournaments, go back to group-stage
                tournament.tournamentSettings.status = 'group-stage';
            }

            // Reset all boards to idle status
            tournament.boards = tournament.boards.map((board: any) => ({
                ...board,
                status: 'idle',
                currentMatch: null,
                nextMatch: null
            }));

            await tournament.save();
            console.log(`Knockout cancelled for tournament ${tournamentCode}`);

            return true;
        } catch (error) {
            console.error('Cancel knockout error:', error);
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


    static async getLatestTournamentByClubId(clubId: string): Promise<any> {
        const tournament = await TournamentModel.findOne({ clubId: clubId }).sort({ createdAt: -1 });
        if (!tournament) {
            return null;
        }
        return tournament;
    }

    static async getLiveMatches(tournamentCode: string): Promise<any[]> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
            
            if (!tournament) {
                throw new Error('Tournament not found');
            }
            
            // Get all ongoing matches
            const liveMatches = await MatchModel.find({
                tournamentRef: tournament._id,
                status: 'ongoing'
            })
            .populate('player1.playerId')
            .populate('player2.playerId')
            .sort({ updatedAt: -1 });
            
            return liveMatches;
        } catch (error) {
            console.error('getLiveMatches error:', error);
            throw error;
        }
    }

    static async updateTournamentSettings(tournamentId: string, requesterId: string, settings: Partial<TournamentSettings> & { boards?: any[] }): Promise<TournamentDocument> {
        try {
            await connectMongo();
            
            // Get tournament with club information
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId })
                .populate('clubId');
            
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization using the authorization service
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId._id.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can edit tournament settings');
            }

            // Validate settings based on tournament status
            const currentStatus = tournament.tournamentSettings.status;
            
            // Don't allow editing certain fields if tournament has started
            if (currentStatus !== 'pending') {
                const restrictedFields = ['format', 'maxPlayers', 'startingScore'];
                const attemptedRestrictedChanges = restrictedFields.filter(field => {
                    const newValue = settings[field as keyof TournamentSettings];
                    const currentValue = tournament.tournamentSettings[field as keyof TournamentSettings];
                    return newValue !== undefined && newValue !== currentValue;
                });
                
                if (attemptedRestrictedChanges.length > 0) {
                    throw new BadRequestError(`Cannot modify ${attemptedRestrictedChanges.join(', ')} after tournament has started`);
                }
            }

            // Handle board updates if provided
            if (settings.boards && currentStatus === 'pending') {
                // Update boards array
                tournament.boards = settings.boards.map((board: any, index: number) => ({
                    boardNumber: index + 1,
                    name: board.name || `Tábla ${index + 1}`,
                    currentMatch: board.currentMatch || undefined,
                    nextMatch: board.nextMatch || undefined,
                    status: board.status || 'idle',
                    isActive: board.isActive !== undefined ? board.isActive : true
                }));

                console.log(`Updated boards for tournament ${tournamentId}: ${tournament.boards.length} boards`);
                
                // Automatically update boardCount to match boards length
                settings.boardCount = tournament.boards.length;
            }

            // Update tournament settings
            const updatedSettings = { ...tournament.tournamentSettings, ...settings };
            
            // Check subscription limits if start date is being changed
            if (settings.startDate && new Date(settings.startDate).getTime() !== new Date(tournament.tournamentSettings.startDate).getTime()) {
                const subscriptionCheck = await SubscriptionService.canUpdateTournament(
                    tournament.clubId._id.toString(),
                    new Date(settings.startDate),
                    tournament.tournamentId
                );
                
                if (!subscriptionCheck.canUpdate) {
                    throw new BadRequestError(subscriptionCheck.errorMessage || 'Subscription limit exceeded');
                }
            }

            // Validate required fields
            if (updatedSettings.name && updatedSettings.name.trim().length === 0) {
                throw new BadRequestError('Tournament name cannot be empty');
            }

            if (updatedSettings.maxPlayers && updatedSettings.maxPlayers < 2) {
                throw new BadRequestError('Maximum players must be at least 2');
            }

            if (updatedSettings.startingScore && updatedSettings.startingScore < 1) {
                throw new BadRequestError('Starting score must be at least 1');
            }

            if (updatedSettings.entryFee && updatedSettings.entryFee < 0) {
                throw new BadRequestError('Entry fee cannot be negative');
            }

            // Update the tournament
            tournament.tournamentSettings = updatedSettings;
            tournament.updatedAt = new Date();
            
            await tournament.save();
            
            // Return updated tournament
            return await this.getTournament(tournamentId);
        } catch (err) {
            console.error('updateTournamentSettings error:', err);
            throw err;
        }
    }

    static async getActiveTournamentsByClubId(clubId: string): Promise<any[]> {
        try {
            await connectMongo();
            const tournaments = await TournamentModel.find({ 
                clubId: clubId,
                'tournamentSettings.status': { $in: ['pending', 'group-stage', 'knockout'] }
            })
            .sort({ createdAt: -1 })
            .populate('tournamentPlayers.playerReference');
            
            return tournaments;
        } catch (error) {
            console.error('getActiveTournamentsByClubId error:', error);
            return [];
        }
    }

    static async getTournamentBoardContext(tournamentId: string): Promise<{
        availableBoards: Array<{ boardNumber: number; name: string; isActive: boolean; isAssigned: boolean; status: string }>;
        selectedBoards: number[];
    }> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Get all boards from the tournament
            const availableBoards = (tournament.boards || []).map((board: any) => ({
                    boardNumber: board.boardNumber,
                    name: board.name || `Tábla ${board.boardNumber}`,
                    isActive: board.isActive,
                    isAssigned: true,
                    status: board.status || 'idle'
                }));

            // Get currently selected boards for this tournament
            const selectedBoards = (tournament.boards || []).map((board: any) => board.boardNumber);

            return {
                availableBoards,
                selectedBoards
            };
        } catch (error) {
            console.error('getTournamentBoardContext error:', error);
            throw error;
        }
    }

    // --- SITEMAP SUPPORT ---
    static async getAllTournaments(): Promise<{ tournamentId: string; updatedAt?: Date }[]> {
        await connectMongo();
        const tournaments = await TournamentModel.find({ isActive: { $ne: false } })
            .select('tournamentId updatedAt')
            .lean();
        return tournaments.map((tournament: any) => ({
            tournamentId: tournament.tournamentId,
            updatedAt: tournament.updatedAt
        }));
    }

    // --- WAITING LIST MANAGEMENT ---
    
    /**
     * Add a player to the waiting list
     */
    static async addToWaitingList(
        tournamentCode: string,
        userId: string,
        playerData: { playerId?: string; userRef?: string; name?: string }
    ): Promise<{ playerId: string }> {
        await connectMongo();
        
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        // Only allow adding to waiting list if tournament is pending
        if (tournament.tournamentSettings.status !== 'pending') {
            throw new BadRequestError('Can only add to waiting list during pending status');
        }

        let playerId = playerData.playerId;

        // If no playerId provided, create or find player
        if (!playerId) {
            if (playerData.userRef) {
                // Find existing player with this userRef
                let player = await PlayerModel.findOne({ userRef: playerData.userRef });
                if (!player) {
                    // Create new player
                    player = await PlayerModel.create({
                        name: playerData.name,
                        userRef: playerData.userRef,
                    });
                }
                playerId = player._id.toString();
            } else if (playerData.name) {
                // Create guest player
                const player = await PlayerModel.create({
                    name: playerData.name,
                });
                playerId = player._id.toString();
            } else {
                throw new BadRequestError('Player ID, user reference, or name is required');
            }
        }

        if (!playerId) {
            throw new BadRequestError('Failed to get or create player ID');
        }

        // Check if player is already in tournament
        const existingPlayer = tournament.tournamentPlayers.find(
            (p: any) => p.playerReference.toString() === playerId
        );
        if (existingPlayer) {
            throw new BadRequestError('Player is already in the tournament');
        }

        // Check if player is already in waiting list
        if (!tournament.waitingList) {
            tournament.waitingList = [];
        }
        
        const existingWaitingPlayer = tournament.waitingList.find(
            (p: any) => p.playerReference.toString() === playerId
        );
        if (existingWaitingPlayer) {
            throw new BadRequestError('Player is already in the waiting list');
        }

        // Add to waiting list
        tournament.waitingList.push({
            playerReference: playerId as any,
            addedAt: new Date(),
            addedBy: userId as any
        });

        await tournament.save();

        return { playerId };
    }

    /**
     * Remove a player from the waiting list
     */
    static async removeFromWaitingList(
        tournamentCode: string,
        userId: string,
        playerId: string
    ): Promise<void> {
        await connectMongo();
        
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        if (!tournament.waitingList || tournament.waitingList.length === 0) {
            throw new BadRequestError('Waiting list is empty');
        }

        // Find player in waiting list
        const playerIndex = tournament.waitingList.findIndex(
            (p: any) => p.playerReference.toString() === playerId
        );

        if (playerIndex === -1) {
            throw new BadRequestError('Player not found in waiting list');
        }

        // Check if user is removing themselves or is admin/moderator
        const player = await PlayerModel.findById(playerId);
        const isOwnPlayer = player?.userRef?.toString() === userId;
        const clubId = tournament.clubId._id?.toString() || tournament.clubId.toString();
        const isAdmin = await AuthorizationService.checkAdminOrModerator(userId, clubId);

        if (!isOwnPlayer && !isAdmin) {
            throw new BadRequestError('You can only remove yourself or be an admin/moderator');
        }

        // Remove from waiting list
        tournament.waitingList.splice(playerIndex, 1);
        await tournament.save();
    }

    /**
     * Promote a player from waiting list to tournament
     * Admin/Moderator can promote even if tournament is full (they can override maxPlayers)
     */
    static async promoteFromWaitingList(
        tournamentCode: string,
        playerId: string
    ): Promise<void> {
        await connectMongo();
        
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        // Note: We don't check maxPlayers here because admins/moderators can override it
        // The authorization check is done in the API route

        // Find player in waiting list
        if (!tournament.waitingList || tournament.waitingList.length === 0) {
            throw new BadRequestError('Waiting list is empty');
        }

        const playerIndex = tournament.waitingList.findIndex(
            (p: any) => p.playerReference.toString() === playerId
        );

        if (playerIndex === -1) {
            throw new BadRequestError('Player not found in waiting list');
        }

        // Add to tournament players
        tournament.tournamentPlayers.push({
            playerReference: playerId as any,
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
        } as any);

        // Remove from waiting list
        tournament.waitingList.splice(playerIndex, 1);

        await tournament.save();
    }

    // --- NOTIFICATION MANAGEMENT ---
    
    /**
     * Subscribe to tournament notifications
     */
    static async subscribeToNotifications(
        tournamentCode: string,
        userId: string,
        email: string
    ): Promise<void> {
        await connectMongo();
        
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        // Initialize notificationSubscribers if it doesn't exist
        if (!tournament.notificationSubscribers) {
            tournament.notificationSubscribers = [];
        }

        // Check if already subscribed
        const existingSubscriber = tournament.notificationSubscribers.find(
            (s: any) => s.userRef.toString() === userId
        );

        if (existingSubscriber) {
            throw new BadRequestError('Already subscribed to notifications');
        }

        // Add subscriber
        tournament.notificationSubscribers.push({
            userRef: userId as any,
            email,
            subscribedAt: new Date()
        } as any);

        await tournament.save();
    }

    /**
     * Unsubscribe from tournament notifications
     */
    static async unsubscribeFromNotifications(
        tournamentCode: string,
        userId: string
    ): Promise<void> {
        await connectMongo();
        
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        if (!tournament.notificationSubscribers || tournament.notificationSubscribers.length === 0) {
            throw new BadRequestError('No subscribers found');
        }

        // Find subscriber
        const subscriberIndex = tournament.notificationSubscribers.findIndex(
            (s: any) => s.userRef.toString() === userId
        );

        if (subscriberIndex === -1) {
            throw new BadRequestError('Not subscribed to notifications');
        }

        // Remove subscriber
        tournament.notificationSubscribers.splice(subscriberIndex, 1);
        await tournament.save();
    }

    /**
     * Send notifications to subscribers when spots become available
     * This should be called when:
     * - A player is removed from tournament
     * - A player withdraws their application
     * - Free spots reach threshold (e.g., <= 10 or <= 5)
     */
    static async notifySubscribersAboutAvailableSpots(
        tournamentCode: string,
        freeSpots: number
    ): Promise<void> {
        await connectMongo();
        
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode })
            .populate('notificationSubscribers.userRef', 'name username');
        
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        if (!tournament.notificationSubscribers || tournament.notificationSubscribers.length === 0) {
            console.log('No subscribers to notify');
            return;
        }

        // Only notify if free spots are <= 10 or <= 5
        if (freeSpots > 10) {
            console.log(`Free spots (${freeSpots}) > 10, not notifying yet`);
            return;
        }

        const { MailerService } = await import('@/database/services/mailer.service');
        const now = new Date();

        // Notify subscribers who haven't been notified in the last hour
        for (const subscriber of tournament.notificationSubscribers) {
            const lastNotified = (subscriber as any).notifiedAt;
            const hoursSinceLastNotification = lastNotified 
                ? (now.getTime() - new Date(lastNotified).getTime()) / (1000 * 60 * 60)
                : Infinity;

            // Only notify if not notified in the last hour
            if (hoursSinceLastNotification >= 1) {
                try {
                    await MailerService.sendTournamentSpotAvailableEmail(
                        (subscriber as any).email,
                        {
                            tournamentName: tournament.tournamentSettings.name,
                            tournamentCode: tournament.tournamentId,
                            freeSpots,
                            userName: (subscriber as any).userRef?.name || (subscriber as any).userRef?.username || 'Játékos'
                        }
                    );

                    // Update notifiedAt timestamp
                    (subscriber as any).notifiedAt = now;
                    console.log(`Notified ${(subscriber as any).email} about ${freeSpots} free spots`);
                } catch (error) {
                    console.error(`Failed to notify ${(subscriber as any).email}:`, error);
                }
            }
        }

        await tournament.save();
    }

    /**
     * Get tournament deletion info (players with emails count)
     * Used to show email modal before deletion
     */
    static async getTournamentDeletionInfo(tournamentCode: string): Promise<{
        hasPlayers: boolean;
        playersWithEmailCount: number;
    }> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode })
                .populate('tournamentPlayers.playerReference');
            
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            const hasPlayers = tournament.tournamentPlayers && tournament.tournamentPlayers.length > 0;
            let playersWithEmailCount = 0;

            if (hasPlayers && tournament.tournamentPlayers) {
                for (const tp of tournament.tournamentPlayers) {
                    const playerRef: any = tp.playerReference;
                    if (playerRef && playerRef.userRef) {
                        // Player has a user account - check if user has email
                        const { UserModel } = await import('../models/user.model');
                        const user = await UserModel.findById(playerRef.userRef).select('email');
                        if (user && user.email) {
                            playersWithEmailCount++;
                        }
                    }
                }
            }

            return {
                hasPlayers: hasPlayers || false,
                playersWithEmailCount
            };
        } catch (error) {
            console.error('Get tournament deletion info error:', error);
            throw error;
        }
    }

    /**
     * Delete a tournament (only if not started - status must be 'pending')
     * Admin/Moderator/Super Admin only
     * If tournament has registered players, emails can be sent to notify them
     */
    static async deleteTournament(tournamentCode: string, requesterId: string, emailData?: {
        subject: string;
        message: string;
    }): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode })
                .populate('tournamentPlayers.playerReference')
                .populate('clubId');
            
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const clubId = tournament.clubId._id?.toString() || tournament.clubId.toString();
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, clubId);
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can delete tournaments');
            }

            // Check if tournament has not started (only pending tournaments can be deleted)
            if (tournament.tournamentSettings?.status !== 'pending') {
                throw new BadRequestError('Only pending tournaments can be deleted');
            }

            // Get all registered players with email addresses
            const playersWithEmails: Array<{ email: string; name: string }> = [];
            
            if (tournament.tournamentPlayers && tournament.tournamentPlayers.length > 0) {
                for (const tp of tournament.tournamentPlayers) {
                    const playerRef: any = tp.playerReference;
                    if (playerRef && playerRef.userRef) {
                        // Player has a user account - get email from user
                        const { UserModel } = await import('../models/user.model');
                        const user = await UserModel.findById(playerRef.userRef).select('email name username');
                        if (user && user.email) {
                            playersWithEmails.push({
                                email: user.email,
                                name: user.name || user.username || playerRef.name || 'Játékos'
                            });
                        }
                    }
                }
            }

            // Send emails if email data is provided and there are players with emails
            if (emailData && playersWithEmails.length > 0) {
                const { sendEmail } = await import('@/lib/mailer');
                const tournamentName = tournament.tournamentSettings?.name || 'Torna';
                
                const emailContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #ef4444;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 30px;
        }
        .highlight {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            text-align: center;
            font-size: 14px;
            color: #9ca3af;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 tDarts</div>
            <div class="title">Torna törölve</div>
        </div>
        
        <div class="content">
            <p>Kedves Játékos!</p>
            
            <p>Sajnálattal értesítünk, hogy a <strong>${tournamentName}</strong> torna törölve lett.</p>
            
            <div class="highlight">
                <strong>${emailData.subject}</strong>
                <p style="margin: 10px 0 0 0; white-space: pre-line;">${emailData.message}</p>
            </div>
            
            <p>Ha bármilyen kérdése van, kérjük, lépjen kapcsolatba a szervezőkkel.</p>
            
            <p>Üdvözlettel,<br>A tDarts csapat</p>
        </div>
        
        <div class="footer">
            <p>© 2024 tDarts. Minden jog fenntartva.</p>
        </div>
    </div>
</body>
</html>
                `;

                // Send email to all players with email addresses
                const emailPromises = playersWithEmails.map(player => 
                    sendEmail({
                        to: [player.email],
                        subject: `[${tournamentName}] ${emailData.subject}`,
                        text: emailData.message,
                        html: emailContent,
                    }).catch(err => {
                        console.error(`Failed to send email to ${player.email}:`, err);
                        return false;
                    })
                );

                await Promise.all(emailPromises);
                console.log(`Sent deletion notification emails to ${playersWithEmails.length} players`);
            }

            // Soft delete the tournament
            tournament.isDeleted = true;
            tournament.isActive = false;
            await tournament.save();

            console.log(`Tournament ${tournamentCode} deleted by ${requesterId}`);
            return true;
        } catch (error) {
            console.error('Delete tournament error:', error);
            if (error instanceof BadRequestError) {
                throw error;
            }
            throw new BadRequestError('Failed to delete tournament: ' + (error as Error).message);
        }
    }

    /**
     * Reopen a finished tournament (Super Admin only)
     * This will:
     * - Change tournament status from 'finished' back to 'active' or 'group-stage' or 'knockout'
     * - Reset final positions to null
     * - Clear player statistics (won/lost matches, final position, etc.)
     * - Keep all match data and leg data intact
     */
    static async reopenTournament(tournamentCode: string, requesterId: string): Promise<TournamentDocument> {
        try {
            // Get tournament
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
            if (!tournament) {
                throw new Error('Torna nem található');
            }

            // Check if tournament is actually finished
            if (tournament.tournamentSettings?.status !== 'finished') {
                throw new Error('A torna nincs befejezve');
            }

            // Determine what status to set back to based on tournament format and current state
            let newStatus: string;
            
            if (tournament.tournamentSettings?.format === 'group') {
                // Pure group tournament -> group-stage
                newStatus = 'group-stage';
            } else if (tournament.tournamentSettings?.format === 'knockout') {
                // Pure knockout tournament -> knockout
                newStatus = 'knockout';
            } else if (tournament.tournamentSettings?.format === 'group_knockout') {
                // Group + knockout tournament -> knockout (since groups are already finished)
                newStatus = 'knockout';
            } else {
                // Default to active
                newStatus = 'active';
            }

            // Update tournament settings
            tournament.tournamentSettings.status = newStatus;
            tournament.tournamentSettings.finishedAt = undefined;

            // Reset all tournament players' statistics and subtract from Player collection
            if (tournament.tournamentPlayers && tournament.tournamentPlayers.length > 0) {
                for (const tournamentPlayer of tournament.tournamentPlayers) {
                    // Reset tournament player statistics
                    tournamentPlayer.matchesWon = 0;
                    tournamentPlayer.matchesLost = 0;
                    tournamentPlayer.legsWon = 0;
                    tournamentPlayer.legsLost = 0;
                    
                    // Reset tournament statistics
                    tournamentPlayer.finalPosition = null;
                    tournamentPlayer.eliminationRound = null;
                    tournamentPlayer.eliminationText = null;
                    tournamentPlayer.avg = null;
                    tournamentPlayer.total180s = 0;
                    tournamentPlayer.highestCheckout = null;
                    tournamentPlayer.totalCheckouts = 0;
                    tournamentPlayer.totalDartsThrown = 0;
                    
                    // Reset group standings if applicable
                    if (tournamentPlayer.groupStanding !== undefined) {
                        tournamentPlayer.groupStanding = null;
                    }

                    // Subtract tournament statistics from Player collection and remove from tournament history
                    try {
                        const playerId = tournamentPlayer.playerReference?._id || tournamentPlayer.playerReference;
                        if (playerId) {
                            const player = await PlayerModel.findById(playerId);
                            if (player) {
                                // Find tournament in history to get MMR change
                                const tournamentHistoryIndex = player.tournamentHistory?.findIndex(
                                    (th: any) => th.tournamentId === tournament.tournamentId
                                );
                                
                                const mmrChange = 0;
                                if (tournamentHistoryIndex !== undefined && tournamentHistoryIndex !== -1 && player.tournamentHistory) {
                                    
                                    // Remove tournament from history
                                    player.tournamentHistory.splice(tournamentHistoryIndex, 1);
                                    console.log(`Removed tournament ${tournament.tournamentId} from player ${playerId} history`);
                                }
                                
                                // Subtract tournament statistics from player's global statistics
                                if (player.stats) {
                                    // Subtract tournaments played
                                    player.stats.tournamentsPlayed = Math.max(0, (player.stats.tournamentsPlayed || 0) - 1);
                                    
                                    // Subtract match statistics
                                    player.stats.matchesPlayed = Math.max(0, (player.stats.matchesPlayed || 0) - (tournamentPlayer.matchesWon || 0) - (tournamentPlayer.matchesLost || 0));
                                    player.stats.totalMatchesWon = Math.max(0, (player.stats.totalMatchesWon || 0) - (tournamentPlayer.matchesWon || 0));
                                    player.stats.totalMatchesLost = Math.max(0, (player.stats.totalMatchesLost || 0) - (tournamentPlayer.matchesLost || 0));
                                    
                                    // Subtract leg statistics
                                    player.stats.legsWon = Math.max(0, (player.stats.legsWon || 0) - (tournamentPlayer.legsWon || 0));
                                    player.stats.legsLost = Math.max(0, (player.stats.legsLost || 0) - (tournamentPlayer.legsLost || 0));
                                    player.stats.totalLegsWon = Math.max(0, (player.stats.totalLegsWon || 0) - (tournamentPlayer.legsWon || 0));
                                    player.stats.totalLegsLost = Math.max(0, (player.stats.totalLegsLost || 0) - (tournamentPlayer.legsLost || 0));
                                    
                                    // Subtract other statistics
                                    player.stats.total180s = Math.max(0, (player.stats.total180s || 0) - (tournamentPlayer.total180s || 0));
                                    player.stats.oneEightiesCount = Math.max(0, (player.stats.oneEightiesCount || 0) - (tournamentPlayer.total180s || 0));
                                    
                                    // Subtract MMR change
                                    player.stats.mmr = Math.max(0, (player.stats.mmr || 800) + mmrChange);
                                    
                                    // Recalculate average from remaining tournament history
                                    if (player.tournamentHistory && player.tournamentHistory.length > 0) {
                                        const totalAvg = player.tournamentHistory.reduce((sum: number, th: any) => {
                                            return sum + (th.stats?.averagePosition || 0);
                                        }, 0);
                                        player.stats.averagePosition = totalAvg / player.tournamentHistory.length;
                                        
                                        // Recalculate best position
                                        const bestPos = Math.min(...player.tournamentHistory.map((th: any) => th.position || 999));
                                        player.stats.bestPosition = bestPos < 999 ? bestPos : 999;
                                        
                                        // Recalculate highest checkout from tournament history
                                        const maxCheckout = Math.max(...player.tournamentHistory.map((th: any) => th.stats?.highestCheckout || 0), 0);
                                        player.stats.highestCheckout = maxCheckout;
                                    } else {
                                        // No tournaments left, reset to defaults
                                        player.stats.averagePosition = 0;
                                        player.stats.bestPosition = 999;
                                        player.stats.highestCheckout = 0;
                                    }
                                    
                                    // Recalculate average from tournament history
                                    if (player.tournamentHistory && player.tournamentHistory.length > 0) {
                                        const totalAvg = player.tournamentHistory.reduce((sum: number, th: any) => {
                                            return sum + (th.stats?.average || 0);
                                        }, 0);
                                        player.stats.avg = totalAvg / player.tournamentHistory.length;
                                    } else {
                                        player.stats.avg = 0;
                                    }
                                }
                                
                                await player.save();
                                console.log(`Subtracted tournament statistics from player ${playerId}, removed from history, adjusted MMR by ${mmrChange}`);
                            }
                        }
                    } catch (playerError) {
                        console.error(`Error updating player ${tournamentPlayer.playerReference?._id || tournamentPlayer.playerReference} statistics:`, playerError);
                        // Continue with other players even if one fails
                    }
                }
            }

            // Reset group standings if tournament has groups
            if (tournament.groups && tournament.groups.length > 0) {
                tournament.groups.forEach((group: any) => {
                    if (group.standings && group.standings.length > 0) {
                        group.standings.forEach((standing: any) => {
                            standing.matchesPlayed = 0;
                            standing.matchesWon = 0;
                            standing.matchesLost = 0;
                            standing.legsWon = 0;
                            standing.legsLost = 0;
                            standing.legDifference = 0;
                            standing.points = 0;
                            standing.average = null;
                            standing.total180s = 0;
                            standing.highestCheckout = null;
                        });
                    }
                });
            }

            // Save tournament
            await tournament.save();

            console.log(`Tournament ${tournamentCode} reopened by super admin ${requesterId}. Status changed from 'finished' to '${newStatus}'`);

            return tournament;

        } catch (error: any) {
            console.error('Error reopening tournament:', error);
            throw new Error(`Hiba történt a torna újranyitása során: ${error.message}`);
        }
    }
}