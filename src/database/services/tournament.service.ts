import { TournamentModel } from '@/database/models/tournament.model';
import { TournamentDocument } from '@/interface/tournament.interface';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { PlayerModel } from '../models/player.model';
import { TournamentPlayer, TournamentPlayerDocument } from '@/interface/tournament.interface';
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

    static async getManualGroupsContext(tournamentCode: string): Promise<{
        boards: Array<{ boardNumber: number; isUsed: boolean }>,
        availablePlayers: Array<{ _id: string; name: string }>
    }> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode })
            .populate('tournamentPlayers.playerReference');
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }
        const club = await ClubModel.findById(tournament.clubId);
        if (!club || !club.boards) {
            throw new BadRequestError('Club boards not found');
        }
        const tournamentBoards = (club.boards as any[]).filter((board: any) =>
            board.isActive && board.tournamentId === tournament.tournamentId
        );
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

    static async createManualGroup(tournamentCode: string, params: {
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
        const { boardNumber, playerIds } = params;
        if (!Array.isArray(playerIds) || playerIds.length === 0) {
            throw new BadRequestError('playerIds are required');
        }
        if (playerIds.length < 3 || playerIds.length > 6) {
            throw new BadRequestError('Players per group must be between 3 and 6');
        }
        // Ensure board belongs to this tournament and is active
        const club = await ClubModel.findById(tournament.clubId);
        if (!club || !club.boards) {
            throw new BadRequestError('Club boards not found');
        }
        const board = (club.boards as any[]).find((b: any) => b.boardNumber === boardNumber && b.tournamentId === tournament.tournamentId);
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
        // Update board: waiting + nextMatch
        const firstMatchId = createdMatchIds[0];
        if (firstMatchId) {
            await ClubModel.updateOne(
                { _id: tournament.clubId, 'boards.boardNumber': boardNumber },
                { $set: { 'boards.$.status': 'waiting', 'boards.$.nextMatch': firstMatchId, 'boards.$.currentMatch': null } }
            );
        }
        // Set status to group-stage
        tournament.tournamentSettings.status = 'group-stage';
        await tournament.save();
        return { groupId: newGroupId.toString(), matchIds: createdMatchIds.map((id) => id.toString()) };
    }

    static async createManualGroups(
        tournamentCode: string,
        groups: Array<{ boardNumber: number; playerIds: string[] }>
    ): Promise<Array<{ boardNumber: number; groupId: string; matchIds: string[] }>> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }
        if (!Array.isArray(groups) || groups.length === 0) {
            throw new BadRequestError('No groups provided');
        }
        const results: Array<{ boardNumber: number; groupId: string; matchIds: string[] }> = [];
        for (const g of groups) {
            const res = await this.createManualGroup(tournamentCode, { boardNumber: g.boardNumber, playerIds: g.playerIds });
            results.push({ boardNumber: g.boardNumber, ...res });
        }
        return results;
    }

    static async getTournament(tournamentId: string): Promise<TournamentDocument> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentId })
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
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }
            
            // Get club with boards
            const club = await ClubModel.findById(tournament.clubId);
            if (!club || !club.boards) {
                throw new BadRequestError('Club boards not found');
            }

            // Filter boards that belong to this tournament
            const tournamentBoards = club.boards.filter((board: any) => 
                board.tournamentId === tournamentId
            );
            
            if (tournamentBoards.length === 0) {
                throw new BadRequestError('No boards assigned to this tournament');
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

                // Update the club board status to waiting and add the nextMatch as the first match in group
                const boardNumberToUpdate = group.board;
                const nextMatchId = group.matches[0];

                if (nextMatchId) {
                    await ClubModel.updateOne(
                        { 
                            _id: tournament.clubId,
                            'boards.boardNumber': boardNumberToUpdate
                        },
                        { 
                            $set: { 
                                'boards.$.status': 'waiting',
                                'boards.$.nextMatch': nextMatchId,
                                'boards.$.currentMatch': null
                            } 
                        }
                    );
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
        const boards = club.boards.filter((board: any) => board.tournamentId === tournamentId);
        return boards;
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
            const knockoutRounds = this.generateKnockoutRounds(shuffledPlayers, format);

            console.log('=== KNOCKOUT GENERATION DEBUG ===');
            console.log('Tournament format:', format);
            console.log('Advancing players count:', advancingPlayers.length);
            console.log('Shuffled players count:', shuffledPlayers.length);
            console.log('Knockout rounds:', knockoutRounds.length);
            console.log('First round matches count:', knockoutRounds[0]?.matches?.length || 0);
            console.log('First round matches:', knockoutRounds[0]?.matches || []);

            // Create matches for the first round
            const firstRoundMatches = knockoutRounds[0].matches;
            const createdMatches: any[] = [];

            // Get available boards for this tournament
            const club = await ClubModel.findById(tournament.clubId);
            if (!club || !club.boards) {
                throw new Error('Club boards not found');
            }

            // Filter boards that belong to this tournament and are active
            const availableBoards = club.boards.filter((board: any) => 
                board.isActive && board.tournamentId === tournament.tournamentId
            );
            if (availableBoards.length === 0) {
                throw new Error('No active boards available for this tournament');
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
                    await ClubModel.updateOne(
                        { 
                            _id: tournament.clubId,
                            'boards.boardNumber': assignedBoard.boardNumber
                        },
                        { 
                            $set: { 
                                'boards.$.status': 'waiting',
                                'boards.$.nextMatch': match._id,
                                'boards.$.currentMatch': null
                            } 
                        }
                    );
                }
            }

            // If there's a second round with a bye player, don't create a match for it yet
            // The match will be created when the first round is finished

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

    private static generateKnockoutRounds(advancingPlayers: any[], format: string = 'group_knockout'): any[] {
        const rounds: any[] = [];

        // Handle odd number of players by giving a bye to the last player
        const playersForFirstRound = [...advancingPlayers];
        let playerWithBye = null;
        
        if (playersForFirstRound.length % 2 !== 0) {
            // Remove the last player and they get a bye (will join in the second round)
            playerWithBye = playersForFirstRound.pop();
        }

        const firstRoundMatches = [];

        if (format === 'group_knockout') {
            // For group_knockout format, create proper cross-group pairings with 2-group offset
        const playersByGroup = new Map();
        playersForFirstRound.forEach(player => {
            const groupId = player.groupId;
            if (!playersByGroup.has(groupId)) {
                playersByGroup.set(groupId, []);
            }
            playersByGroup.get(groupId).push(player);
        });

            // Sort players within each group by their group standing (1st, 2nd, 3rd, etc.)
        playersByGroup.forEach((players) => {
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

            // Create cross-group pairings with 2-group offset
            const groupIds = Array.from(playersByGroup.keys()).sort();
            
            if (groupIds.length > 1) {
                // Pair groups with 2-group offset: A vs C, B vs D, etc.
                for (let i = 0; i < groupIds.length; i++) {
            const group1Id = groupIds[i];
                    const group2Id = groupIds[(i + 2) % groupIds.length]; // 2-group offset
            
                    if (group1Id !== group2Id) {
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
                
                // If we have odd number of groups, handle the remaining group
                if (groupIds.length % 2 !== 0) {
                    const remainingGroupId = groupIds[groupIds.length - 1];
                    const remainingPlayers = playersByGroup.get(remainingGroupId);
                    
                    // Pair remaining players within their own group
                    for (let i = 0; i < remainingPlayers.length; i += 2) {
                        if (i + 1 < remainingPlayers.length) {
                            const player1 = remainingPlayers[i];
                            const player2 = remainingPlayers[i + 1];
                            
                            firstRoundMatches.push({
                                player1: player1.playerReference,
                                player2: player2.playerReference,
                            });
                        }
                    }
                }
            } else {
                // Only one group, create simple pairings
                const groupPlayers = playersByGroup.get(groupIds[0]) || [];
                for (let i = 0; i < groupPlayers.length; i += 2) {
                    if (i + 1 < groupPlayers.length) {
                        const player1 = groupPlayers[i];
                        const player2 = groupPlayers[i + 1];
                        
                        firstRoundMatches.push({
                            player1: player1.playerReference,
                            player2: player2.playerReference,
                        });
                    }
                }
            }
        } else {
            // For knockout format, create simple random pairings
            for (let i = 0; i < playersForFirstRound.length; i += 2) {
                if (i + 1 < playersForFirstRound.length) {
                    const player1 = playersForFirstRound[i];
                    const player2 = playersForFirstRound[i + 1];
                    
                    firstRoundMatches.push({
                        player1: player1.playerReference,
                        player2: player2.playerReference,
                    });
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
            const club = await ClubModel.findById(tournament.clubId);
            const availableBoards = club?.boards?.filter((board: any) => 
                board.isActive && board.tournamentId === tournament.tournamentId
            ) || [];

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
                        await ClubModel.updateOne(
                            { 
                                _id: tournament.clubId,
                                'boards.boardNumber': assignedBoard.boardNumber
                            },
                            { 
                                $set: { 
                                    'boards.$.status': 'waiting',
                                    'boards.$.nextMatch': byePlayerMatch._id,
                                    'boards.$.currentMatch': null
                                } 
                            }
                        );

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
                                await ClubModel.updateOne(
                                    { 
                                        _id: tournament.clubId,
                                        'boards.boardNumber': assignedBoard.boardNumber
                                    },
                                    { 
                                        $set: { 
                                            'boards.$.status': 'waiting',
                                            'boards.$.nextMatch': match._id,
                                            'boards.$.currentMatch': null
                                        } 
                                    }
                                );
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
                    await ClubModel.updateOne(
                        { 
                            _id: tournament.clubId,
                            'boards.boardNumber': assignedBoard.boardNumber
                        },
                        { 
                            $set: { 
                                'boards.$.status': 'waiting',
                                'boards.$.nextMatch': match._id,
                                'boards.$.currentMatch': null
                            } 
                        }
                    );
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
                        await ClubModel.updateOne(
                            { 
                                _id: tournament.clubId,
                                'boards.boardNumber': match.boardReference
                            },
                            { 
                                $set: { 
                                    'boards.$.status': 'idle',
                                    'boards.$.currentMatch': null,
                                    'boards.$.nextMatch': null
                                } 
                            }
                        );
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
                                await ClubModel.updateOne(
                                    { 
                                        _id: tournament.clubId,
                                        'boards.boardNumber': match.boardReference
                                    },
                                    { 
                                        $set: { 
                                            'boards.$.status': 'idle',
                                            'boards.$.currentMatch': null,
                                            'boards.$.nextMatch': null
                                        } 
                                    }
                                );
                            }
                        }
                    }
                } else {
                    // Match not found in knockout structure, set board to idle
                    await ClubModel.updateOne(
                        { 
                            _id: tournament.clubId,
                            'boards.boardNumber': match.boardReference
                        },
                        { 
                            $set: { 
                                'boards.$.status': 'idle',
                                'boards.$.currentMatch': null,
                                'boards.$.nextMatch': null
                            } 
                        }
                    );
                }
            } else if (match.status === 'ongoing') {
                await ClubModel.updateOne(
                    { 
                        _id: tournament.clubId,
                        'boards.boardNumber': match.boardReference
                    },
                    { 
                        $set: { 
                            'boards.$.status': 'playing',
                            'boards.$.currentMatch': match._id,
                            'boards.$.nextMatch': null
                        } 
                    }
                );
            }
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

    static async generateAutomaticPairingsForManualKnockout(tournamentCode: string, options: {
        playersCount?: number;
        useSeededPlayers: boolean;
        seededPlayersCount: number;
    }): Promise<boolean> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new Error('Tournament not found');
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
            const knockoutRounds = this.generateKnockoutRounds(shuffledPlayers, format);

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

    static async generateEmptyKnockoutRounds(tournamentCode: string, roundsCount: number = 2): Promise<boolean> {
        try {
            const tournament = await this.getTournament(tournamentCode);
            if (!tournament) {
                throw new Error('Tournament not found');
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

    static async addPartialMatch(tournamentId: string, matchData: {
        round: number;
        player1Id?: string;
        player2Id?: string;
    }): Promise<any> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
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

            // Find the round
            const round = tournament.knockout.find((r: any) => r.round === matchData.round);
            if (!round) {
                throw new BadRequestError(`Round ${matchData.round} not found`);
            }

            // Get available boards for this tournament
            const club = await ClubModel.findById(tournament.clubId);
            if (!club || !club.boards) {
                throw new BadRequestError('Club boards not found');
            }

            const availableBoards = club.boards.filter((board: any) => 
                board.isActive && board.tournamentId === tournament.tournamentId
            );
            if (availableBoards.length === 0) {
                throw new BadRequestError('No active boards available for this tournament');
            }

            // Assign board in round-robin fashion
            const boardIndex = round.matches.length % availableBoards.length;
            const assignedBoard = availableBoards[boardIndex];

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
                scorer: matchData.player1Id || matchData.player2Id || null,
                status: 'pending',
                legs: [],
            });

            // Add match to round - use null for missing players to ensure proper database storage
            round.matches.push({
                player1: matchData.player1Id || null,
                player2: matchData.player2Id || null,
                matchReference: match._id,
            });

            // Update board status
            await ClubModel.updateOne(
                { 
                    _id: tournament.clubId,
                    'boards.boardNumber': assignedBoard.boardNumber
                },
                { 
                    $set: { 
                        'boards.$.status': 'waiting',
                        'boards.$.nextMatch': match._id,
                        'boards.$.currentMatch': null
                    } 
                }
            );

            await tournament.save();

            return match;
        } catch (err) {
            console.error('addPartialMatch error:', err);
            return false;
        }
    }

    static async generateRandomPairings(tournamentId: string, round: number, selectedPlayerIds: string[]): Promise<any[]> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
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
                const match = await this.addPartialMatch(tournamentId, {
                    round,
                    player1Id,
                    player2Id
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

    static async updateMatchPlayer(tournamentId: string, matchId: string, playerPosition: 'player1' | 'player2', playerId: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Validate player exists in tournament
            const player = tournament.tournamentPlayers.find((p: any) => 
                p.playerReference.toString() === playerId
            );
            if (!player) {
                throw new BadRequestError('Player not found in tournament');
            }

            // Find match in tournament knockout structure
            let matchFound = false;
            for (const round of tournament.knockout) {
                const match = round.matches.find((m: any) => m.matchReference?.toString() === matchId);
                if (match) {
                    match[playerPosition] = playerId;
                    matchFound = true;
                    break;
                }
            }

            if (!matchFound) {
                throw new BadRequestError('Match not found in tournament');
            }

            // Update the actual match document
            const matchDoc = await MatchModel.findById(matchId);
            if (!matchDoc) {
                throw new BadRequestError('Match document not found');
            }

            if (playerPosition === 'player1') {
                matchDoc.player1 = {
                    playerId: playerId,
                    legsWon: 0,
                    legsLost: 0,
                    average: 0,
                };
            } else {
                matchDoc.player2 = {
                    playerId: playerId,
                    legsWon: 0,
                    legsLost: 0,
                    average: 0,
                };
            }

            // Update scorer if not set
            if (!matchDoc.scorer) {
                matchDoc.scorer = playerId;
            }

            await tournament.save();
            await matchDoc.save();

            return true;
        } catch (err) {
            console.error('updateMatchPlayer error:', err);
            return false;
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

            // Get available boards for this tournament
            const club = await ClubModel.findById(tournament.clubId);
            if (!club || !club.boards) {
                throw new BadRequestError('Club boards not found');
            }

            const availableBoards = club.boards.filter((board: any) => 
                board.isActive && board.tournamentId === tournament.tournamentId
            );
            if (availableBoards.length === 0) {
                throw new BadRequestError('No active boards available for this tournament');
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
            await ClubModel.updateOne(
                { 
                    _id: tournament.clubId,
                    'boards.boardNumber': assignedBoard.boardNumber
                },
                { 
                    $set: { 
                        'boards.$.status': 'waiting',
                        'boards.$.nextMatch': match._id,
                        'boards.$.currentMatch': null
                    } 
                }
            );

            await tournament.save();

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
            } else {
                // Step 2: Handle tournaments with knockout (group_knockout or knockout)
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

                // Step 3: Assign positions to players eliminated in group stage
                checkedInPlayers.forEach((player: any) => {
                    const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                    if (playerId && !playersInKnockout.has(playerId)) {
                        // Player was eliminated in group stage - gets position N (total players)
                        playerStandings.set(playerId, totalPlayers);
                    }
                });

                // Step 4: Handle knockout eliminations
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

            // Step 6: Get stats from tournament players
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

            // Get stats directly from tournament players
            checkedInPlayers.forEach((player: any) => {
                const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                if (playerId && player.stats) {
                    playerStats.set(playerId, {
                        average: player.stats.avg || 0,
                        checkoutRate: 0, // Not stored in tournament stats
                        legsWon: player.stats.legsWon || 0,
                        legsPlayed: (player.stats.legsWon || 0) + (player.stats.legsLost || 0),
                        matchesWon: player.stats.matchesWon || 0,
                        matchesPlayed: (player.stats.matchesWon || 0) + (player.stats.matchesLost || 0),
                        highestCheckout: player.stats.highestCheckout || 0,
                        oneEighties: player.stats.oneEightiesCount || 0,
                    });
                } else if (playerId) {
                    // Fallback if no stats available
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

            // Step 7: Update tournament players with final standings
            tournament.tournamentPlayers = tournament.tournamentPlayers.map((player: any) => {
                const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                const standing = playerStandings.get(playerId);
                
                if (standing) {
                    const stats = playerStats.get(playerId);
                    return {
                        ...player,
                        tournamentStanding: standing,
                        finalPosition: standing,
                        eliminatedIn: this.getEliminationText(standing, format),
                        finalStats: stats || {}
                    };
                }
                return player;
            });

            // Step 8: Update Player collection statistics
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

                    // Update average (weighted average)
                    if (player.stats.matchesPlayed > 0) {
                        const currentTotal = player.stats.avg * (player.stats.matchesPlayed - stats.matchesPlayed);
                        const newTotal = currentTotal + (stats.average * stats.matchesPlayed);
                        player.stats.avg = newTotal / player.stats.matchesPlayed;
                    } else {
                        player.stats.avg = stats.average;
                    }

                    // Calculate average position
                    const totalPosition = player.tournamentHistory.reduce((sum: number, hist: any) => sum + hist.position, 0);
                    player.stats.averagePosition = totalPosition / player.tournamentHistory.length;

                    await player.save();
                }
            }

            // Step 9: Update tournament status to finished
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

            // Step 10: Free up boards assigned to this tournament
            // Get all boards assigned to this tournament and unset their tournamentId
            const club = await ClubModel.findById(tournament.clubId);
            if (club && club.boards) {
                const tournamentBoards = club.boards.filter((board: any) => 
                    board.tournamentId === tournament.tournamentId
                );
                
                for (const board of tournamentBoards) {
                    await ClubModel.updateOne(
                        { 
                            _id: tournament.clubId,
                            'boards.boardNumber': board.boardNumber
                        },
                        { 
                            $unset: { 
                                'boards.$.tournamentId': 1 
                            } 
                        }
                    );
                }
            }

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
}