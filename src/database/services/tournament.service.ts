import { TournamentModel } from '@/database/models/tournament.model';
import { TournamentDocument, TournamentSettings } from '@/interface/tournament.interface';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { PlayerModel } from '../models/player.model';
import { TournamentPlayerDocument } from '@/interface/tournament.interface';

import mongoose from 'mongoose';
import { MatchModel } from '../models/match.model';
import { AuthorizationService } from './authorization.service';
import { SubscriptionService } from './subscription.service';
import { MMRService } from './mmr.service';
import { OacMmrService } from './oac-mmr.service';

import { TournamentGroupService } from './tournament-group.service';
import { TournamentStatsService } from './tournament-stats.service';
import { TournamentPlayerService } from './tournament-player.service';
import { GeocodingService } from './geocoding.service';
import { ErrorService } from './error.service';

export class TournamentService {
    private static toThreeDartAverage(score: number, darts: number): number {
        return darts > 0 ? Math.round((score / darts) * 3 * 100) / 100 : 0;
    }

    private static getLegDarts(throws: any[] | undefined, storedTotalDarts?: number | null): number {
        if (!throws || throws.length === 0) return 0;
        if (storedTotalDarts !== undefined && storedTotalDarts !== null) return Number(storedTotalDarts);
        return throws.reduce((sum: number, t: any) => sum + Number(t?.darts || 3), 0);
    }

    private static getFirstNineScoreAndDarts(throws: any[] | undefined): { score: number; darts: number } {
        if (!throws || throws.length === 0) return { score: 0, darts: 0 };
        const firstVisits = throws.slice(0, 3);
        return {
            score: firstVisits.reduce((sum: number, t: any) => sum + Number(t?.score || 0), 0),
            darts: firstVisits.reduce((sum: number, t: any) => sum + Number(t?.darts || 3), 0),
        };
    }

    private static async recalculateCurrentSeasonAverages(playerId: string): Promise<{ avg: number; firstNineAvg: number }> {
        const currentYear = new Date().getFullYear();
        const seasonStart = new Date(currentYear, 0, 1);
        const seasonEnd = new Date(currentYear + 1, 0, 1);

        const matches = await MatchModel.find({
            status: 'finished',
            createdAt: { $gte: seasonStart, $lt: seasonEnd },
            $or: [{ 'player1.playerId': playerId }, { 'player2.playerId': playerId }],
        }).select('player1 player2 legs');

        let totalScore = 0;
        let totalDarts = 0;
        let firstNineScore = 0;
        let firstNineDarts = 0;

        for (const match of matches) {
            const isP1 = match.player1?.playerId?.toString() === playerId;
            const isP2 = match.player2?.playerId?.toString() === playerId;
            if (!isP1 && !isP2) continue;

            for (const leg of match.legs || []) {
                if (isP1) {
                    totalScore += Number(leg.player1Score || 0);
                    totalDarts += this.getLegDarts(leg.player1Throws as any[], (leg as any).player1TotalDarts);
                    const f9 = this.getFirstNineScoreAndDarts(leg.player1Throws as any[]);
                    firstNineScore += f9.score;
                    firstNineDarts += f9.darts;
                } else if (isP2) {
                    totalScore += Number(leg.player2Score || 0);
                    totalDarts += this.getLegDarts(leg.player2Throws as any[], (leg as any).player2TotalDarts);
                    const f9 = this.getFirstNineScoreAndDarts(leg.player2Throws as any[]);
                    firstNineScore += f9.score;
                    firstNineDarts += f9.darts;
                }
            }
        }

        return {
            avg: this.toThreeDartAverage(totalScore, totalDarts),
            firstNineAvg: this.toThreeDartAverage(firstNineScore, firstNineDarts),
        };
    }
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
            await ErrorService.logError(
                'Failed to initialize tournament indexes',
                error as Error,
                'database',
                {
                    errorCode: 'TOURNAMENT_INDEX_INIT_FAILED',
                    expected: false,
                    operation: 'tournament.ensureIndexes',
                    entityType: 'tournament',
                }
            );
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

        const locationInput = tournamentData.tournamentSettings?.location;
        if (typeof locationInput === 'string' && locationInput.trim()) {
            const geocodeResult = await GeocodingService.geocodeAddress(locationInput, 'user');
            if (tournamentData.tournamentSettings) {
                tournamentData.tournamentSettings = {
                    ...tournamentData.tournamentSettings,
                    locationData: geocodeResult.location,
                } as TournamentSettings;
            }
        }

        // Sandbox check: Limit to 5 per month per club
        if (tournamentData.clubId && tournamentData.isSandbox) {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const sandboxCount = await TournamentModel.countDocuments({
                clubId: tournamentData.clubId,
                isSandbox: true,
                createdAt: { $gte: startOfMonth }
            });

            if (sandboxCount >= 5) {
                // Check if user is trying to create another one
                 throw new BadRequestError('Maximum 5 sandbox tournaments per month allowed.', 'tournament');
            }
        }
        
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
        return TournamentGroupService.getManualGroupsContext(tournamentCode);
    }

    static async createManualGroup(tournamentCode: string, requesterId: string, params: {
        boardNumber: number;
        // Player document ids
        playerIds: string[];
    }): Promise<{
        groupId: string;
        matchIds: string[];
    }> {
        return TournamentGroupService.createManualGroup(tournamentCode, requesterId, params);
    }

    static async createManualGroups(
        tournamentCode: string,
        requesterId: string,
        groups: Array<{ boardNumber: number; playerIds: string[] }>
    ): Promise<Array<{ boardNumber: number; groupId: string; matchIds: string[] }>> {
        return TournamentGroupService.createManualGroups(tournamentCode, requesterId, groups);
    }

    static async getTournament(tournamentId: string): Promise<TournamentDocument> {
        await connectMongo();
        let tournament = await TournamentModel.findOne({ 
            tournamentId: tournamentId,
            isDeleted: { $ne: true },
            isArchived: { $ne: true }
        })
            .populate('clubId')
            .populate('clubId')
            .populate({
                path: 'tournamentPlayers.playerReference',
                populate: { path: 'members', model: 'Player' }
            })
            .populate({
                path: 'waitingList.playerReference',
                populate: { path: 'members', model: 'Player' }
            })
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
            tournament = await TournamentModel.findOne({ 
                _id: tournamentId,
                isDeleted: { $ne: true },
                isArchived: { $ne: true }
            })
              .populate('clubId')
              .populate('clubId')
            .populate({
                path: 'tournamentPlayers.playerReference',
                populate: { path: 'members', model: 'Player' }
            })
            .populate({
                path: 'waitingList.playerReference',
                populate: { path: 'members', model: 'Player' }
            })
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
                throw new BadRequestError('Tournament not found', 'tournament', {
                    tournamentId,
                    errorCode: 'TOURNAMENT_NOT_FOUND',
                    expected: true,
                    operation: 'tournament.getTournament',
                    entityType: 'tournament',
                    entityId: tournamentId,
                });
            }
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

        if (!tournament.tournamentSettings?.locationData?.rawInput && tournament.tournamentSettings?.location) {
            try {
                const geocodeResult = await GeocodingService.geocodeAddress(tournament.tournamentSettings.location, 'legacy');
                tournament.tournamentSettings.locationData = geocodeResult.location as any;
                await tournament.save();
            } catch (error) {
                await ErrorService.logWarning(
                    'Tournament lazy geocode failed',
                    'tournament',
                    {
                        tournamentId: tournament.tournamentId,
                        errorCode: 'TOURNAMENT_LAZY_GEOCODE_FAILED',
                        expected: true,
                        operation: 'tournament.getTournament',
                        entityType: 'tournament',
                        entityId: tournament.tournamentId,
                        metadata: {
                            reason: error instanceof Error ? error.message : String(error),
                        },
                    }
                );
            }
        }
        return tournament;
    }


    static async getPlayerStatusInTournament(tournamentId: string, userId: string): Promise<string> {
        const status = await TournamentPlayerService.getPlayerStatusInTournament(tournamentId, userId);
        return status || '';
    }

    //method to add, remove and update tournament players status, the rquest takes the player._id form the player collection
    static async addTournamentPlayer(tournamentId: string, playerId: string): Promise<boolean> {
        return TournamentPlayerService.addTournamentPlayer(tournamentId, playerId);
    }

    static async removeTournamentPlayer(tournamentId: string, playerId: string): Promise<boolean> {
        // Note: Notification logic was in the original method. 
        // If we want to keep it, we should handle it here or in the new service.
        // For now, delegating to the new service which currently has notification commented out.
        // We can add notification logic here if needed, but let's stick to simple delegation.
        return TournamentPlayerService.removeTournamentPlayer(tournamentId, playerId);
    }

    static async updateTournamentPlayerStatus(tournamentId: string, playerId: string, status: string): Promise<boolean> {
        return TournamentPlayerService.updateTournamentPlayerStatus(tournamentId, playerId, status);
    }

    static async generateGroups(tournamentId: string, requesterId: string): Promise<boolean> {
        return TournamentGroupService.generateGroups(tournamentId, requesterId);
    }

    //re calculate the group standing for each group
    static async updateGroupStanding(tournamentId: string): Promise<boolean> {
        return TournamentStatsService.updateGroupStanding(tournamentId);
    }

    static async validateTournamentByPassword(tournamentId: string, password: string): Promise<boolean> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({
            tournamentId: tournamentId,
            isDeleted: { $ne: true },
            isArchived: { $ne: true }
        });

        if (!tournament) {
            await ErrorService.logError(
                'Tournament not found',
                undefined,
                'tournament',
                {
                    tournamentId,
                    operation: 'tournament.validatePassword',
                    errorCode: 'TOURNAMENT_NOT_FOUND',
                    errorType: 'expected_user_error',
                    expected: true,
                    entityType: 'tournament',
                    entityId: tournamentId,
                    httpStatus: 404,
                }
            );
            return false;
        }

        if (tournament.tournamentSettings.tournamentPassword !== password) {
            await ErrorService.logError(
                'Invalid tournament password',
                undefined,
                'auth',
                {
                    tournamentId,
                    operation: 'tournament.validatePassword',
                    errorCode: 'TOURNAMENT_INVALID_PASSWORD',
                    errorType: 'expected_user_error',
                    expected: true,
                    entityType: 'tournament',
                    entityId: tournamentId,
                    httpStatus: 401,
                }
            );
            return false;
        }

        return true;
    }

    static async getBoards(tournamentId: string): Promise<any> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ 
            tournamentId: tournamentId,
            isDeleted: { $ne: true },
            isArchived: { $ne: true }
        });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }
        return tournament.boards || [];
    }

    static async updateBoard(tournamentId: string, boardNumber: number, data: { name?: string; scoliaSerialNumber?: string; scoliaAccessToken?: string }): Promise<TournamentDocument> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({
            tournamentId: tournamentId,
             isDeleted: { $ne: true },
            isArchived: { $ne: true }
        });

        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        const boardIndex = tournament.boards.findIndex((b: any) => b.boardNumber === boardNumber);
        if (boardIndex === -1) {
            throw new BadRequestError('Board not found');
        }

        if (data.name !== undefined) tournament.boards[boardIndex].name = data.name;
        if (data.scoliaSerialNumber !== undefined) tournament.boards[boardIndex].scoliaSerialNumber = data.scoliaSerialNumber;
        if (data.scoliaAccessToken !== undefined) tournament.boards[boardIndex].scoliaAccessToken = data.scoliaAccessToken;

        await tournament.save();
        return tournament;
    }

    /**
     * Automatically advance winner to next round after knockout match finishes
     * Creates or updates next round match with the winner
     */
    static async autoAdvanceKnockoutWinner(matchId: string): Promise<void> {
        try {
            await connectMongo();
            
            const match = await MatchModel.findById(matchId);
            if (!match || match.type !== 'knockout' || match.status !== 'finished') {
                return;
            }

            const tournament = await TournamentModel.findById(match.tournamentRef);
            if (!tournament) {
                return;
            }

            // Only auto-advance if knockout method is automatic
            if (tournament.tournamentSettings?.knockoutMethod !== 'automatic') {
                return;
            }

            const winnerId = match.winnerId;
            if (!winnerId) {
                console.log(`No winner ID found for match ${matchId}`);
                return;
            }

            // Check if this is a bye match
            const isByeMatch = !match.player1?.playerId || !match.player2?.playerId;
            
            // Get loser ID (only for non-bye matches)
            let loserId = null;
            if (!isByeMatch) {
                loserId = match.player1?.playerId?.toString() === winnerId?.toString() 
                    ? match.player2.playerId 
                    : match.player1.playerId;
            }

            const currentRound = match.round || 1;
            const currentPosition = match.bracketPosition || 0;

            // Calculate next round position using bracket pairing formula
            // Positions 2i and 2i+1 in current round → position i in next round
            const nextRound = currentRound + 1;
            const nextPosition = Math.floor(currentPosition / 2);

            console.log(`Auto-advance: Match ${matchId} winner ${winnerId} from round ${currentRound} pos ${currentPosition} to round ${nextRound} pos ${nextPosition} (bye: ${isByeMatch})`);

            // Find next round match (should already exist in pre-generated bracket)
            // Sort by createdAt desc to get the newest match (in case old matches exist)
            const nextMatch = await MatchModel.findOne({
                tournamentRef: tournament._id,
                type: 'knockout',
                round: nextRound,
                bracketPosition: nextPosition
            }).sort({ createdAt: -1 });

            console.log(`Looking for next match: tournamentRef=${tournament._id}, round=${nextRound}, pos=${nextPosition}`);
            console.log(`Found match: ${nextMatch?._id} with players: p1=${nextMatch?.player1?.playerId}, p2=${nextMatch?.player2?.playerId}`);

            if (!nextMatch) {
                // This means we've reached the final (no next round)
                console.log(`No next match found - tournament complete`);
                return;
            }

            // Update the existing match with winner
            const result = await this.assignPlayerToNextMatch(nextMatch, winnerId);
            
            if (!result.success) {
                console.log(`Match ${nextMatch._id} already has both players assigned or player could not be added`);
                return;
            }

            const assignedSlot = result.slot; // 1 or 2

            // Update tournament knockout structure atomically using array filters
            // We need to match the round and the match reference
            if (assignedSlot) {
                const updateField = assignedSlot === 1 ? 'knockout.$[r].matches.$[m].player1' : 'knockout.$[r].matches.$[m].player2';
                
                await TournamentModel.updateOne(
                    { _id: tournament._id },
                    { $set: { [updateField]: winnerId } },
                    { 
                        arrayFilters: [
                            { "r.round": nextRound },
                            { "m.matchReference": nextMatch._id }
                        ]
                    }
                );
                console.log(`Updated tournament structure for match ${nextMatch._id} slot ${assignedSlot}`);
            } else {
                 // Should not happen if success is true
                 console.warn(`Success returned but no slot assigned for match ${nextMatch._id}`);
            }

            // Assign loser as scorer to appropriate match in next round (only for non-bye matches)
            if (loserId) {
                await this.assignLoserAsScorer(tournament, loserId);
            }

            await tournament.save();
            
            // Emit SSE event to notify frontend of knockout bracket update
            const { eventEmitter, EVENTS } = await import('@/lib/events');
            eventEmitter.emit(EVENTS.TOURNAMENT_UPDATE, {
                tournamentId: tournament.tournamentId,
                type: 'knockout-update'
            });
        } catch (error) {
            console.error('Auto-advance knockout winner error:', error);
            throw error;
        }
    }

    /**
     * Assign player to next match's empty slot atomically
     * Returns object with success status and assigned slot
     */
    private static async assignPlayerToNextMatch(match: any, playerId: any): Promise<{ success: boolean; slot?: 1 | 2; match?: any }> {
        const matchId = match._id;
        const pIdStr = playerId.toString();

        // 1. Try to assign to Player 1
        // Condition: Player 1 is empty AND Player 2 is NOT this player (avoid self-play or duplicate)
        let updatedMatch = await MatchModel.findOneAndUpdate(
            { 
                _id: matchId, 
                "player1.playerId": null, 
                "player2.playerId": { $ne: playerId } 
            },
            { 
                $set: { 
                    player1: {
                        playerId: playerId,
                        legsWon: 0,
                        legsLost: 0,
                        average: 0,
                    }
                }
            },
            { new: true }
        );

        if (updatedMatch) {
            console.log(`Assigned winner ${playerId} to player1 of match ${matchId}`);
            // Check if match is now ready (has both players)
            if (updatedMatch.player2 && updatedMatch.player2.playerId) {
                updatedMatch.status = 'pending';
                await updatedMatch.save(); // Safe to save here as we have latest doc
                await this.assignMatchToBoardByOrder(matchId.toString());
            }
            return { success: true, slot: 1, match: updatedMatch };
        }

        // 2. Try to assign to Player 2
        // Condition: Player 2 is empty AND Player 1 is NOT this player
        updatedMatch = await MatchModel.findOneAndUpdate(
            { 
                _id: matchId, 
                "player2.playerId": null, 
                "player1.playerId": { $ne: playerId } 
            },
            { 
                $set: { 
                    player2: {
                        playerId: playerId,
                        legsWon: 0,
                        legsLost: 0,
                        average: 0,
                    },
                    status: 'pending' // If we fill P2 and P1 presumably exists (checked in query implied?), we can start?
                    // Wait, the query only checks P1 != me. It doesn't guarantee P1 exists.
                    // But usually P1 is filled first. 
                    // Let's safe update status after check.
                }
            },
            { new: true }
        );

        if (updatedMatch) {
            console.log(`Assigned winner ${playerId} to player2 of match ${matchId}`);
            
            // If P1 exists, match is ready
            if (updatedMatch.player1 && updatedMatch.player1.playerId) {
                if (updatedMatch.status !== 'pending') {
                     updatedMatch.status = 'pending';
                     await updatedMatch.save();
                }
                await this.assignMatchToBoardByOrder(matchId.toString());
            } else {
                // If P1 is missing (rare case where P2 filled before P1?), status not pending yet
                // But we set it to pending in $set above, which might be premature if P1 is missing.
                // Actually, let's refine the update to NOT set status pending blindly.
                // But since I used $set above, I should correct it.
                // Ideally we verify P1 existence.
                // However, for Simplicity, if P2 is filled, and P1 is missing, it's just a waiting match. 
            }
            return { success: true, slot: 2, match: updatedMatch };
        }

        // 3. Fallback: Check if already assigned (Idempotency)
        const currentMatch = await MatchModel.findById(matchId);
        const p1Id = currentMatch?.player1?.playerId?.toString();
        const p2Id = currentMatch?.player2?.playerId?.toString();

        if (p1Id === pIdStr) {
             console.log(`Player ${playerId} is already assigned to match ${matchId} (slot 1) - skipping`);
             return { success: true, slot: 1, match: currentMatch };
        }
        if (p2Id === pIdStr) {
             console.log(`Player ${playerId} is already assigned to match ${matchId} (slot 2) - skipping`);
             return { success: true, slot: 2, match: currentMatch };
        }

        console.log(`Failed to assign player ${playerId} to match ${matchId} - match likely full`);
        return { success: false };
    }

    /**
     * Dynamically assign all playable matches to boards by order (round + bracketPosition)
     * Lower-order matches take priority. Skips bye matches entirely.
     */
    private static async assignMatchToBoardByOrder(matchId: string): Promise<void> {
        try {
            const match = await MatchModel.findById(matchId);
            if (!match || match.type !== 'knockout') return;

            const tournament = await TournamentModel.findById(match.tournamentRef);
            if (!tournament) return;

            // Get all pending knockout matches with 2 players (playable), sorted by order
            const playableMatches = await MatchModel.find({
                tournamentRef: tournament._id,
                type: 'knockout',
                status: 'pending',
                'player1.playerId': { $exists: true, $ne: null },
                'player2.playerId': { $exists: true, $ne: null }
            }).sort({ round: 1, bracketPosition: 1 });

            console.log(`Reassigning ${playableMatches.length} playable matches to boards by order`);

            // Get active boards
            const activeBoards = tournament.boards.filter((b: any) => b.isActive);
            if (activeBoards.length === 0) return;
            
            // Clear nextMatch for idle boards
            for (const board of tournament.boards) {
                if (board.status !== 'playing') {
                    board.nextMatch = undefined;
                    board.status = 'idle';
                }
            }

            // Assign playable matches to boards in round-robin order
            let boardIndex = 0;
            for (const playableMatch of playableMatches) {
                // Skip if currently being played
                const isPlaying = tournament.boards.some((b: any) => 
                    b.currentMatch?.toString() === playableMatch._id.toString()
                );
                if (isPlaying) continue;

                // Assign to next available board
                const targetBoard = activeBoards[boardIndex % activeBoards.length];
                const tBoardIndex = tournament.boards.findIndex((b: any) => 
                    b.boardNumber === targetBoard.boardNumber
                );
                
                if (tBoardIndex !== -1 && !tournament.boards[tBoardIndex].currentMatch) {
                    tournament.boards[tBoardIndex].nextMatch = playableMatch._id as any;
                    tournament.boards[tBoardIndex].status = 'waiting';
                }
                
                boardIndex++;
            }

            await tournament.save();
            console.log('Board assignments updated by match order');
        } catch (error) {
            console.error('Error assigning boards by order:', error);
        }
    }


    /**
     * Assign match loser as scorer for the next available match
     */
    private static async assignLoserAsScorer(
        tournament: any,
        loserId: any,
    ): Promise<void> {
        // Find ANY match that needs a scorer, prioritizing earliest rounds and positions
        // User request: "assign them to the next match as scorer where ther isnt a scorer - no matter if the match is in the first or second round"
        const matchesNeedingScorer = await MatchModel.find({
            tournamentRef: tournament._id,
            type: 'knockout',
            scorer: null,
            status: { $ne: 'finished' }
        }).sort({ round: 1, bracketPosition: 1 });

        if (matchesNeedingScorer.length > 0) {
            // Find the first valid match where the loser is not a player
            const matchToScore = matchesNeedingScorer.find(m => 
                m.player1?.playerId?.toString() !== loserId.toString() && 
                m.player2?.playerId?.toString() !== loserId.toString()
            );

            if (matchToScore) {
                matchToScore.scorer = loserId;
                matchToScore.scorerSource = {
                    type: 'match_loser',
                    playerId: loserId
                };
                await matchToScore.save();
                console.log(`Assigned loser ${loserId} as scorer for match ${matchToScore._id} (Round ${matchToScore.round})`);
            }
        }
    }

    /**
     * Recalculate knockout bracket when a match winner changes
     * This clears all subsequent rounds and rebuilds from the changed match
     */
    static async recalculateKnockoutBracket(matchId: string,  oldWinnerId: string, newWinnerId: string): Promise<void> {
        try {
            await connectMongo();
            
            const match = await MatchModel.findById(matchId);
            if (!match || match.type !== 'knockout') {
                return;
            }

            const tournament = await TournamentModel.findById(match.tournamentRef);
            if (!tournament) {
                return;
            }

            const currentRound = match.round || 1;
            const currentPosition = match.bracketPosition || 0;

            console.log(`Recalculating bracket from match ${matchId}, round ${currentRound}, position ${currentPosition}`);
            console.log(`Winner changed from ${oldWinnerId} to ${newWinnerId}`);

            // Find and delete all subsequent round matches that contain the old winner
            const subsequentMatches = await MatchModel.find({
                tournamentRef: tournament._id,
                type: 'knockout',
                round: { $gt: currentRound }
            });

            for (const futureMatch of subsequentMatches) {
                const hasOldWinner = 
                    futureMatch.player1?.playerId?.toString() === oldWinnerId?.toString() ||
                    futureMatch.player2?.playerId?.toString() === oldWinnerId?.toString();

                if (hasOldWinner) {
                    // Replace old winner with new winner
                    if (futureMatch.player1?.playerId?.toString() === oldWinnerId?.toString()) {
                        futureMatch.player1.playerId = newWinnerId;
                    }
                    if (futureMatch.player2?.playerId?.toString() === oldWinnerId?.toString()) {
                        futureMatch.player2.playerId = newWinnerId;
                    }
                    await futureMatch.save();
                    console.log(`Updated match ${futureMatch._id} with new winner ${newWinnerId}`);
                }
            }

            // Update tournament knockout structure
            for (const round of tournament.knockout) {
                if (round.round > currentRound) {
                    for (const knockoutMatch of round.matches) {
                        if (knockoutMatch.player1?.toString() === oldWinnerId) {
                            knockoutMatch.player1 = newWinnerId;
                        }
                        if (knockoutMatch.player2?.toString() === oldWinnerId) {
                            knockoutMatch.player2 = newWinnerId;
                        }
                    }
                }
            }

            await tournament.save();
            console.log('Knockout bracket recalculated successfully');
        } catch (error) {
            console.error('Recalculate knockout bracket error:', error);
            throw error;
        }
    }

    static async generateKnockout(tournamentCode: string, requesterId: string, options: {
        playersCount?: number;
        qualifiersPerGroup?: number;
    }): Promise<boolean> {
        try {
            const tournament = await TournamentService.getTournament(tournamentCode);
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
                
                if (!options.qualifiersPerGroup && groupPlayers.length < (options.playersCount || 0)) {
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
                // For group_knockout format
                if (options.qualifiersPerGroup) {
                    // MDL Path: Use all players, filtering happens in generateMDLKnockoutRounds
                    advancingPlayers = allPlayers;
                } else {
                    // Legacy Path: Use specified count
                    advancingPlayers = allPlayers.slice(0, options.playersCount);
                    
                    if (advancingPlayers.length !== (options.playersCount || 0)) {
                        throw new Error(`Expected ${options.playersCount} players but got ${advancingPlayers.length}`);
                    }
                }
            }

            // Generate knockout rounds with proper cross-group pairings (for round 1 only)
            const knockoutRounds = await this.generateKnockoutRounds(advancingPlayers, format, tournament, options.qualifiersPerGroup);

            // Get available boards
            const availableBoards = tournament.boards.filter((board: any) => board.isActive);
            if (availableBoards.length === 0) {
                throw new Error('No active boards available for this tournament');
            }

            // Calculate total rounds needed based on ADVANCING players
            let effectivePlayerCount = advancingPlayers.length;
            
            if (format === 'group_knockout' && options.qualifiersPerGroup) {
                // For MDL, we need to calculate the actual number of qualifiers
                // IMPORTANT: Convert ObjectIds to strings before Set to ensure uniqueness by value
                const uniqueGroups = new Set(allPlayers.map(p => p.groupId?.toString()).filter(Boolean)).size;
                effectivePlayerCount = uniqueGroups * options.qualifiersPerGroup;
            }

            const totalRoundsNeeded = Math.ceil(Math.log2(effectivePlayerCount));
            console.log(`Generating knockout: ${advancingPlayers.length} total players, ${effectivePlayerCount} effective qualifiers, ${totalRoundsNeeded} rounds needed`);

            // Pre-generate ALL rounds for automatic mode
            const allRoundsStructure: any[] = [];
            const createdMatches: any[] = [];
            const boardFirstMatches = new Map<number, mongoose.Types.ObjectId>();
            
            // Track playable match counter for proper board distribution
            let playableMatchCounter = 0;
            
            for (let roundNum = 1; roundNum <= totalRoundsNeeded; roundNum++) {
                const matchesInRound = Math.pow(2, totalRoundsNeeded - roundNum);
                const roundMatches: any[] = [];

                console.log(`Round ${roundNum}: ${matchesInRound} matches`);

                for (let matchPos = 0; matchPos < matchesInRound; matchPos++) {
                    // For round 1, get actual players from knockoutRounds
                    let player1Id = null;
                    let player2Id = null;

                    if (roundNum === 1 && knockoutRounds[0] && knockoutRounds[0].matches[matchPos]) {
                        player1Id = knockoutRounds[0].matches[matchPos].player1 || null;
                        player2Id = knockoutRounds[0].matches[matchPos].player2 || null;
                    }

                    // Determine if this will be a playable match (both players present)
                    const isPlayable = player1Id && player2Id;
                    
                    // Assign board: for round 1 playable matches, use playable counter to distribute evenly
                    // For bye matches or later rounds, use simple round-robin
                    let assignedBoard;
                    if (roundNum === 1 && isPlayable) {
                        const boardIndex = playableMatchCounter % availableBoards.length;
                        assignedBoard = availableBoards[boardIndex];
                        playableMatchCounter++;
                        console.log(`Playable match ${matchPos}: assigned to board ${assignedBoard.boardNumber} (playable #${playableMatchCounter})`);
                    } else {
                        const boardIndex = matchPos % availableBoards.length;
                        assignedBoard = availableBoards[boardIndex];
                        if (roundNum === 1) {
                            console.log(`Bye match ${matchPos}: assigned to board ${assignedBoard.boardNumber}`);
                        }
                    }

                    // Create match
                    const match = await MatchModel.create({
                        boardReference: assignedBoard.boardNumber,
                        tournamentRef: tournament._id,
                        type: 'knockout',
                        round: roundNum,
                        bracketPosition: matchPos,
                        player1: player1Id ? {
                            playerId: player1Id,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        } : null,
                        player2: player2Id ? {
                            playerId: player2Id,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        } : null,
                        scorer: player1Id || player2Id || null,
                        status: 'pending',
                        legs: [],
                    });

                    roundMatches.push({
                        player1: player1Id,
                        player2: player2Id,
                        matchReference: match._id
                    });

                    if (roundNum === 1) {
                        createdMatches.push(match);
                        
                        // Track first PLAYABLE match for each board (skip bye matches)
                        if (isPlayable && !boardFirstMatches.has(assignedBoard.boardNumber)) {
                            boardFirstMatches.set(assignedBoard.boardNumber, match._id);
                        }
                    }
                }

                allRoundsStructure.push({
                    round: roundNum,
                    matches: roundMatches
                });
            }

            // Update board status - only assign matches with BOTH players (skip bye matches)
            // Bye matches will be dynamically assigned when they get a 2nd player
            for (const [boardNumber, firstMatchId] of boardFirstMatches) {
                // Check if this match is playable (has both players)
                const matchToCheck = createdMatches.find(m => m._id.toString() === firstMatchId.toString());
                const isPlayable = matchToCheck && 
                                  matchToCheck.player1 && matchToCheck.player1.playerId &&
                                  matchToCheck.player2 && matchToCheck.player2.playerId;
                
                if (isPlayable) {
                    const boardIndex = tournament.boards.findIndex((b: any) => b.boardNumber === boardNumber);
                    if (boardIndex !== -1) {
                        tournament.boards[boardIndex].status = 'waiting';
                        tournament.boards[boardIndex].nextMatch = firstMatchId as any;
                        tournament.boards[boardIndex].currentMatch = undefined;
                    }
                } else {
                    console.log(`Skipping bye match ${firstMatchId} for board ${boardNumber} - will assign when match becomes playable`);
                }
            }

            // Assign scorers dynamically for knockout round 1
            await this.assignKnockoutScorers(tournament, createdMatches, format);

            // IMPORTANT: Save the initial knockout structure BEFORE processing bye matches
            // This allows autoAdvanceKnockoutWinner to find and update the structure
            tournament.knockout = allRoundsStructure;
            tournament.tournamentSettings.status = 'knockout';
            tournament.tournamentSettings.knockoutMethod = 'automatic';
            await tournament.save();
            console.log('Saved initial knockout structure to database');

            // Automatically finish bye matches so players advance to round 2
            console.log(`Checking ${createdMatches.length} round 1 matches for byes...`);
            for (const match of createdMatches) {
                // Check if either player is null (bye match)
                // Note: match.player1/player2 contain { playerId, legsWon, ... } structure
                const hasPlayer1 = match.player1 && match.player1.playerId;
                const hasPlayer2 = match.player2 && match.player2.playerId;
                const isByeMatch = !hasPlayer1 || !hasPlayer2;
                
                console.log(`Match ${match._id}: hasPlayer1=${!!hasPlayer1}, hasPlayer2=${!!hasPlayer2}, isBye=${isByeMatch}`);
                
                if (isByeMatch) {
                    // Get the existing player - check for null before accessing playerId
                    console.log(`Match ${match._id}: hasPlayer1=${!!hasPlayer1}, hasPlayer2=${!!hasPlayer2}, match.player1=${match.player1}, match.player2=${match.player2}`);
                    
                    // Get the player ID safely
                    const existingPlayerId = hasPlayer1 && match.player1 ? match.player1.playerId : 
                                            (hasPlayer2 && match.player2 ? match.player2.playerId : null);
                    
                    if (existingPlayerId) {
                        match.winnerId = existingPlayerId;
                        match.status = 'finished';
                        
                        // Set legs won
                        if (hasPlayer1) {
                            match.player1.legsWon = 1;
                            if (match.player2) match.player2.legsWon = 0;
                        } else {
                            if (match.player1) match.player1.legsWon = 0;
                            match.player2.legsWon = 1;
                        }
                        
                        await match.save();
                        console.log(`Auto-finished bye match ${match._id} - winner: ${existingPlayerId}`);
                        
                        // Auto-advance to next round
                        try {
                            await this.autoAdvanceKnockoutWinner(match._id.toString());
                        } catch (error) {
                            console.error(`Error auto-advancing bye match ${match._id}:`, error);
                        }
                    } else {
                        console.warn(`Match ${match._id}: Bye match but no player found - skipping`);
                    }
                }
            }

            // Tournament structure should now be updated by bye auto-advances
            console.log('Bye match processing complete');

            return true;
        } catch (error) {
            console.error('Generate knockout error:', error);
            throw error;
        }
    }

    /**
     * Assign scorers dynamically for knockout round 1
     * - Group losers score for first N matches
     * - Remaining matches use losers from earlier matches
     */
    private static async assignKnockoutScorers(
        tournament: any,
        createdMatches: any[],
        format: string
    ): Promise<void> {
        // Only apply dynamic scorer assignment for group_knockout format
        if (format !== 'group_knockout') {
            return;
        }

        // Get all tournament players
        const allPlayers = tournament.tournamentPlayers || [];
        
        // Identify group losers (players who participated in groups but didn't advance)
        const groupLosers = allPlayers.filter((player: any) => {
            // Has a group but not in knockout matches
            if (!player.groupId) return false;
            
            const isInKnockout = createdMatches.some(match => {
                const p1Id = match.player1?.playerId?.toString();
                const p2Id = match.player2?.playerId?.toString();
                const playerId = player.playerReference?.toString();
                return p1Id === playerId || p2Id === playerId;
            });
            
            return !isInKnockout;
        });

        console.log(`Found ${groupLosers.length} group losers for ${createdMatches.length} matches`);

        // Sort matches by bracketPosition
        const sortedMatches = [...createdMatches].sort((a, b) => 
            (a.bracketPosition || 0) - (b.bracketPosition || 0)
        );

        // Assign scorers
        // Assign scorers
        // IMPROVED LOGIC: Try to keep scorers on the same board where possible
        
        // 1. Map matches to boards
        const matchesByBoard = new Map<number, any[]>();
        for (const match of sortedMatches) {
            const boardNum = match.boardReference;
            if (!matchesByBoard.has(boardNum)) {
                matchesByBoard.set(boardNum, []);
            }
            matchesByBoard.get(boardNum)!.push(match);
        }
        
        // 2. Map group losers to their original boards (if possible) or just list them
        // Since we don't easily know which board a group played on without more queries, 
        // we'll stick to the simple list but try to distribute them intelligently.
        
        let loserIndex = 0;
        
        // Iterate through matches board by board to assign scorers
        // IMPROVED: Distribute group losers across boards round-robin style
        
        // Flatten matches back to a list, but grouped by board for processing
        // Actually, we want to assign: Loser 1 -> Board 1 Match 1, Loser 2 -> Board 2 Match 1, etc.
        
        const maxMatchesPerBoard = Math.max(...Array.from(matchesByBoard.values()).map(m => m.length));
        const boardNumbers = Array.from(matchesByBoard.keys());
        
        for (let matchIndex = 0; matchIndex < maxMatchesPerBoard; matchIndex++) {
            for (const boardNum of boardNumbers) {
                const matches = matchesByBoard.get(boardNum);
                if (!matches || matchIndex >= matches.length) continue;
                
                const match = matches[matchIndex];
                
                if (loserIndex < groupLosers.length) {
                    // Assign group loser as scorer
                    match.scorer = groupLosers[loserIndex].playerReference;
                    match.scorerSource = {
                        type: 'group_loser',
                        playerId: groupLosers[loserIndex].playerReference
                    };
                    loserIndex++;
                } else {
                    // Use loser from previous match ON THE SAME BOARD if available
                    if (matchIndex > 0) {
                        const previousMatchOnBoard = matches[matchIndex - 1];
                        match.scorer = null; // Will be determined after source match finishes
                        match.scorerSource = {
                            type: 'match_loser',
                            sourceMatchId: previousMatchOnBoard._id
                        };
                    } else {
                        // Fallback: use loser from a previous match in the sorted list (might be different board)
                        // Try to find a match from the previous "round" of matches across boards
                        // This is a best-effort fallback
                        const currentMatchGlobalIndex = sortedMatches.findIndex(m => m._id === match._id);
                        if (currentMatchGlobalIndex > 0) {
                            const sourceMatch = sortedMatches[currentMatchGlobalIndex - 1];
                            match.scorer = null;
                            match.scorerSource = {
                                type: 'match_loser',
                                sourceMatchId: sourceMatch._id
                            };
                        } else {
                            console.warn(`Could not find a scorer source for match ${match._id}`);
                        }
                    }
                }
                
                await match.save();
            }
        }
    }

    private static async generateKnockoutRounds(advancingPlayers: any[], format: string = 'group_knockout', tournament?: any, qualifiersPerGroup?: number): Promise<any[]> {
 
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
            
            // NEW: Use MDL logic if qualifiersPerGroup is provided
            if (qualifiersPerGroup) {
                return this.generateMDLKnockoutRounds(groups, groupIds, qualifiersPerGroup, tournament);
            }

            if (groupCount % 2 !== 0) {
                throw new Error('Group count must be even');
            }
            return await this.generateStandardKnockoutRounds( groups, groupIds, tournament);
        } else {
            // For knockout-only format, create simple random pairings
            return this.generateSimpleKnockoutRounds(advancingPlayers);
        }
    }

    private static generateMDLKnockoutRounds(groups: Map<string, TournamentPlayerDocument[]>, groupIds: string[], qualifiersPerGroup: number, tournament?: any): any[] {
        // 1. Sort groupIds based on tournament.groups order
        let orderedGroupIds = groupIds;
        if (tournament && tournament.groups && Array.isArray(tournament.groups)) {
             orderedGroupIds = tournament.groups
                .map((group: any) => group._id.toString())
                .filter((id: string) => groupIds.includes(id));
        }

        const numGroups = orderedGroupIds.length;
        
        // 2. Define Pairings
        const pairingsKey = `${numGroups}_${qualifiersPerGroup}`;
        const rules: Record<string, string[]> = {
            '2_2': ['1/1-2/2', '2/1-1/2'],
            '2_3': ['1/1-X', '2/2-1/3', '2/1-X', '1/2-2/3'],
            '2_4': ['1/1-2/4', '2/2-1/3', '2/1-1/4', '1/2-2/3'],
            '4_2': ['1/1-2/2', '4/1-3/2', '2/1-1/2', '3/1-4/2'],
            '4_3': ['1/1-X', '2/2-3/3', '4/1-X', '3/2-2/3', '2/1-X', '1/2-4/3', '3/1-X', '4/2-1/3'],
            '4_4': ['1/1-4/4', '2/2-3/3', '4/1-1/4', '3/2-2/3', '2/1-3/4', '1/2-4/3', '3/1-2/4', '4/2-1/3'],
            '8_2': ['1/1-2/2', '8/1-7/2', '4/1-3/2', '5/1-6/2', '2/1-1/2', '7/1-8/2', '3/1-4/2', '6/1-5/2'],
            '8_3': ['1/1-X', '2/2-3/3', '8/1-X', '7/2-6/3', '4/1-X', '3/2-2/3', '5/1-X', '6/2-7/3', '2/1-X', '1/2-4/3', '7/1-X', '8/2-5/3', '3/1-X', '4/2-1/3', '6/1-X', '5/2-8/3'],
            '8_4': ['1/1-4/4', '2/2-3/3', '8/1-5/4', '7/2-6/3', '4/1-1/4', '3/2-2/3', '5/1-8/4', '6/2-7/3', '2/1-3/4', '1/2-4/3', '7/1-6/4', '8/2-5/3', '3/1-2/4', '4/2-1/3', '6/1-7/4', '5/2-8/3'],
            '16_2': ['1/1-2/2', '16/1-15/2', '8/1-7/2', '9/1-10/2', '4/1-3/2', '13/1-14/2', '5/1-6/2', '12/1-11/2', '2/1-1/2', '15/1-16/2', '7/1-8/2', '10/1-9/2', '3/1-4/2', '14/1-13/2', '6/1-5/2', '11/1-12/2'],
            '16_3': ['1/1-X', '2/2-3/3', '16/1-X', '15/2-14/3', '8/1-X', '7/2-6/3', '9/1-X', '10/2-11/3', '4/1-X', '3/2-2/3', '13/1-X', '14/2-15/3', '5/1-X', '6/2-7/3', '12/1-X', '11/2-10/3', '2/1-X', '1/2-4/3', '15/1-X', '16/2-13/3', '7/1-X', '8/2-12/3', '10/1-X', '9/2-5/3', '3/1-X', '4/2-1/3', '14/1-X', '13/2-16/3', '6/1-X', '5/2-9/3', '11/1-X', '12/2-8/3']
        };

        const matchRules = rules[pairingsKey];
        if (!matchRules) {
            throw new Error(`No MDL rules found for ${numGroups} groups and ${qualifiersPerGroup} qualifiers.`);
        }

        // 3. Resolve Matches
        const matches: any[] = [];
        
        // Helper to get player
        const getPlayer = (groupNum: number, position: number) => {
            if (groupNum > orderedGroupIds.length) return null;
            const groupId = orderedGroupIds[groupNum - 1];
            const groupPlayers = groups.get(groupId) || [];
            // Sort by standing
            groupPlayers.sort((a, b) => (a.groupStanding || 1) - (b.groupStanding || 1));
            return groupPlayers[position - 1] || null;
        };

        for (const rule of matchRules) {
            const [p1Str, p2Str] = rule.split('-');
            
            const resolve = (str: string) => {
                if (str === 'X') return null;
                const [g, p] = str.split('/').map(Number);
                return getPlayer(g, p);
            };

            const player1 = resolve(p1Str);
            const player2 = resolve(p2Str);
            
            matches.push({
                player1: player1?.playerReference,
                player2: player2?.playerReference
            });
        }

        return [{
            round: 1,
            matches
        }];
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
        const playersPerGroup = Math.min(...pairingsByGroupPair.map(gp => gp.length)); // Use minimum, not first
        const maxPlayersPerGroup = Math.max(...pairingsByGroupPair.map(gp => gp.length));
        const useConstraintBasedOrdering = isPowerOfTwo && playersPerGroup >= 2 && groupCount >= 4;
        
        console.log(`=== CONSTRAINT-BASED ORDERING DEBUG ===`);
        console.log(`groupCount: ${groupCount}, isPowerOfTwo: ${isPowerOfTwo}`);
        console.log(`playersPerGroup (min): ${playersPerGroup}, maxPlayersPerGroup: ${maxPlayersPerGroup}`);
        console.log(`pairingsByGroupPair.length: ${pairingsByGroupPair.length}`);
        pairingsByGroupPair.forEach((gp, idx) => {
            console.log(`  Group pair ${idx}: ${gp.length} pairings`);
        });
        
        if (useConstraintBasedOrdering && groupCount === 4 && playersPerGroup >= 2) {
            // NEW ALGORITHM for 4 groups with constraint-based ordering
            // Each consecutive pair of matches should:
            // 1. Have exactly one group winner (rank 1)
            // 2. Represent all groups exactly once
            
            const matches0 = pairingsByGroupPair[0]; // e.g., A/D pairings: a1-d4, a2-d3, a3-d2, a4-d1
            const matches1 = pairingsByGroupPair[1]; // e.g., B/C pairings: b1-c4, b2-c3, b3-c2, b4-c1
            
            console.log(`matches0.length: ${matches0?.length || 0}, matches1.length: ${matches1?.length || 0}`);
            
            // Use the minimum length to avoid index errors
            const actualPlayersPerGroup = Math.min(matches0.length, matches1.length, playersPerGroup);
            
            if (!matches0 || !matches1 || matches0.length === 0 || matches1.length === 0) {
                console.error(`ERROR: No pairings! matches0: ${matches0?.length || 0}, matches1: ${matches1?.length || 0}`);
                throw new Error(`No pairings generated. matches0: ${matches0?.length || 0}, matches1: ${matches1?.length || 0}`);
            }
            
            console.log(`Using actualPlayersPerGroup: ${actualPlayersPerGroup} (matches0: ${matches0.length}, matches1: ${matches1.length})`);
            
            // Pattern for 4 groups: a1/d4 - b2/c3 - d1/a4 - c2/b3 - b1/c4 - a2/d3 - c1/b4 - d2/a3
            // Breakdown:
            // Pair 0 (matches 0-1): A/D[0] as-is,     B/C[1] as-is
            // Pair 1 (matches 2-3): A/D[3] flipped,   B/C[2] flipped
            // Pair 2 (matches 4-5): B/C[0] as-is,     A/D[1] as-is
            // Pair 3 (matches 6-7): B/C[3] flipped,   A/D[2] flipped
            
            const numPairs = actualPlayersPerGroup; // Use the minimum length we calculated
            
            console.log(`numPairs: ${numPairs} (matches0: ${matches0.length}, matches1: ${matches1.length})`);
            
            for (let pairIdx = 0; pairIdx < numPairs; pairIdx++) {
                let match1, match2;
                
                if (pairIdx === 0) {
                    // Pair 0: A/D[0] as-is, B/C[1] as-is
                    if (matches0.length > 0 && matches1.length > 1) {
                        match1 = matches0[0].pairing;
                        match2 = matches1[1].pairing;
                    }
                } else if (pairIdx === 1) {
                    // Pair 1: A/D[3] flipped, B/C[2] flipped
                    if (matches0.length > 3 && matches1.length > 2) {
                        const m1 = matches0[3].pairing;
                        match1 = { player1: m1.player2, player2: m1.player1 };
                        const m2 = matches1[2].pairing;
                        match2 = { player1: m2.player2, player2: m2.player1 };
                    } else {
                        // Fallback: use available matches
                        const idx0 = Math.min(3, matches0.length - 1);
                        const idx1 = Math.min(2, matches1.length - 1);
                        if (idx0 >= 0 && idx1 >= 0) {
                            const m1 = matches0[idx0].pairing;
                            match1 = { player1: m1.player2, player2: m1.player1 };
                            const m2 = matches1[idx1].pairing;
                            match2 = { player1: m2.player2, player2: m2.player1 };
                        }
                    }
                } else if (pairIdx === 2) {
                    // Pair 2: B/C[0] as-is, A/D[1] as-is
                    if (matches1.length > 0 && matches0.length > 1) {
                        match1 = matches1[0].pairing;
                        match2 = matches0[1].pairing;
                    }
                } else if (pairIdx === 3) {
                    // Pair 3: B/C[3] flipped, A/D[2] flipped
                    if (matches1.length > 3 && matches0.length > 2) {
                        const m1 = matches1[3].pairing;
                        match1 = { player1: m1.player2, player2: m1.player1 };
                        const m2 = matches0[2].pairing;
                        match2 = { player1: m2.player2, player2: m2.player1 };
                    } else {
                        // Fallback: use available matches
                        const idx1 = Math.min(3, matches1.length - 1);
                        const idx0 = Math.min(2, matches0.length - 1);
                        if (idx1 >= 0 && idx0 >= 0) {
                            const m1 = matches1[idx1].pairing;
                            match1 = { player1: m1.player2, player2: m1.player1 };
                            const m2 = matches0[idx0].pairing;
                            match2 = { player1: m2.player2, player2: m2.player1 };
                        }
                    }
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
            const tournament = await TournamentService.getTournament(tournamentCode);
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
            const tournament = await TournamentService.getTournament(tournamentCode);
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
            const tournament = await TournamentService.getTournament(tournamentCode);
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
            const tournament = await TournamentService.getTournament(tournamentCode);
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
                const firstNineAvg = playerData?.firstNineAvg || 0;

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
                    firstNineAvg: Math.round(firstNineAvg * 100) / 100,
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

    static async getHeadToHead(
        playerAId: string,
        playerBId: string,
        options?: { season?: number; tournamentCode?: string }
    ): Promise<{
        playerA: { _id: string; name: string; country?: string | null };
        playerB: { _id: string; name: string; country?: string | null };
        summary: {
            matchesPlayed: number;
            playerAWins: number;
            playerBWins: number;
            playerALegsWon: number;
            playerBLegsWon: number;
            playerAAverage: number;
            playerBAverage: number;
            playerAHighestCheckout: number;
            playerBHighestCheckout: number;
            playerAOneEighties: number;
            playerBOneEighties: number;
                playerAFirstNineAvg: number;
                playerBFirstNineAvg: number;
        };
        allTimeComparison: {
            playerA: {
                matchesPlayed: number;
                wins: number;
                losses: number;
                winRate: number;
                avg: number;
                firstNineAvg: number;
                highestCheckout: number;
                oneEightiesCount: number;
            };
            playerB: {
                matchesPlayed: number;
                wins: number;
                losses: number;
                winRate: number;
                avg: number;
                firstNineAvg: number;
                highestCheckout: number;
                oneEightiesCount: number;
            };
        };
        matches: Array<{
            _id: string;
            date: Date;
            type: string;
            round: number;
            winnerId?: string;
            tournament: {
                _id: string;
                tournamentId: string;
                name: string;
                startDate?: Date;
            };
            playerA: {
                legsWon: number;
                average: number;
                firstNineAvg: number;
                highestCheckout: number;
                oneEightiesCount: number;
            };
            playerB: {
                legsWon: number;
                average: number;
                firstNineAvg: number;
                highestCheckout: number;
                oneEightiesCount: number;
            };
        }>;
    }> {
        await connectMongo();

        const [playerA, playerB] = await Promise.all([
            PlayerModel.findById(playerAId).select("_id name country"),
            PlayerModel.findById(playerBId).select("_id name country"),
        ]);

        if (!playerA || !playerB) {
            throw new BadRequestError("Player not found");
        }

        const aggregateCareerStats = async (playerId: string) => {
            const finishedMatches = await MatchModel.find({
                status: "finished",
                $or: [{ "player1.playerId": playerId }, { "player2.playerId": playerId }],
            }).select("player1 player2 winnerId legs");

            let wins = 0;
            let losses = 0;
            let totalScore = 0;
            let totalDarts = 0;
            let firstNineScore = 0;
            let firstNineDarts = 0;
            let highestCheckout = 0;
            let oneEightiesCount = 0;

            for (const match of finishedMatches) {
                const isP1 = match.player1?.playerId?.toString() === playerId;
                const isP2 = match.player2?.playerId?.toString() === playerId;
                if (!isP1 && !isP2) continue;

                if (match.winnerId?.toString() === playerId) {
                    wins++;
                } else {
                    losses++;
                }

                for (const leg of match.legs || []) {
                    const playerThrows = isP1 ? (leg.player1Throws as any[]) : (leg.player2Throws as any[]);
                    const legScore = Number(isP1 ? leg.player1Score || 0 : leg.player2Score || 0);
                    const legDarts = this.getLegDarts(
                        playerThrows,
                        isP1 ? (leg as any).player1TotalDarts : (leg as any).player2TotalDarts
                    );
                    totalScore += legScore;
                    totalDarts += legDarts;

                    const f9 = this.getFirstNineScoreAndDarts(playerThrows);
                    firstNineScore += f9.score;
                    firstNineDarts += f9.darts;

                    for (const throwData of playerThrows || []) {
                        if (Number(throwData?.score || 0) === 180) oneEightiesCount++;
                        if (throwData?.isCheckout) {
                            highestCheckout = Math.max(highestCheckout, Number(throwData?.score || 0));
                        }
                    }
                }
            }

            const matchesPlayed = wins + losses;
            const winRate = matchesPlayed > 0 ? Number(((wins / matchesPlayed) * 100).toFixed(1)) : 0;

            return {
                matchesPlayed,
                wins,
                losses,
                winRate,
                avg: this.toThreeDartAverage(totalScore, totalDarts),
                firstNineAvg: this.toThreeDartAverage(firstNineScore, firstNineDarts),
                highestCheckout,
                oneEightiesCount,
            };
        };

        const query: any = {
            status: "finished",
            $or: [
                { "player1.playerId": playerA._id, "player2.playerId": playerB._id },
                { "player1.playerId": playerB._id, "player2.playerId": playerA._id },
            ],
        };

        if (options?.tournamentCode) {
            const tournament = await TournamentModel.findOne({ tournamentId: options.tournamentCode }).select("_id");
            if (!tournament) {
                throw new BadRequestError("Tournament not found");
            }
            query.tournamentRef = tournament._id;
        }

        if (options?.season) {
            const seasonStart = new Date(options.season, 0, 1);
            const seasonEnd = new Date(options.season + 1, 0, 1);
            query.createdAt = { $gte: seasonStart, $lt: seasonEnd };
        }

        const matches = await MatchModel.find(query)
            .populate("player1.playerId", "name country")
            .populate("player2.playerId", "name country")
            .populate("tournamentRef", "tournamentId tournamentSettings.name tournamentSettings.startDate")
            .sort({ createdAt: -1 });

        let playerAWins = 0;
        let playerBWins = 0;
        let playerALegsWon = 0;
        let playerBLegsWon = 0;
        let playerAAverageSum = 0;
        let playerBAverageSum = 0;
        let playerAAverageCount = 0;
        let playerBAverageCount = 0;
        let playerAFirstNineAverageSum = 0;
        let playerBFirstNineAverageSum = 0;
        let playerAFirstNineAverageCount = 0;
        let playerBFirstNineAverageCount = 0;
        let playerAHighestCheckout = 0;
        let playerBHighestCheckout = 0;
        let playerAOneEighties = 0;
        let playerBOneEighties = 0;

        const mappedMatches = matches.map((match: any) => {
            const player1Id = match.player1?.playerId?._id?.toString() || match.player1?.playerId?.toString();
            const isAPlayer1 = player1Id === playerA._id.toString();
            const aData = isAPlayer1 ? match.player1 : match.player2;
            const bData = isAPlayer1 ? match.player2 : match.player1;

            const aLegsWon = aData?.legsWon || 0;
            const bLegsWon = bData?.legsWon || 0;
            const aAvg = aData?.average || 0;
            const bAvg = bData?.average || 0;
            const aFirstNineAvg = aData?.firstNineAvg || 0;
            const bFirstNineAvg = bData?.firstNineAvg || 0;
            const aCheckout = aData?.highestCheckout || 0;
            const bCheckout = bData?.highestCheckout || 0;
            const aOneEighties = aData?.oneEightiesCount || 0;
            const bOneEighties = bData?.oneEightiesCount || 0;

            playerALegsWon += aLegsWon;
            playerBLegsWon += bLegsWon;
            playerAHighestCheckout = Math.max(playerAHighestCheckout, aCheckout);
            playerBHighestCheckout = Math.max(playerBHighestCheckout, bCheckout);
            playerAOneEighties += aOneEighties;
            playerBOneEighties += bOneEighties;

            if (aAvg > 0) {
                playerAAverageSum += aAvg;
                playerAAverageCount += 1;
            }

            if (bAvg > 0) {
                playerBAverageSum += bAvg;
                playerBAverageCount += 1;
            }
            if (aFirstNineAvg > 0) {
                playerAFirstNineAverageSum += aFirstNineAvg;
                playerAFirstNineAverageCount += 1;
            }
            if (bFirstNineAvg > 0) {
                playerBFirstNineAverageSum += bFirstNineAvg;
                playerBFirstNineAverageCount += 1;
            }

            const winnerId = match.winnerId?.toString();
            if (winnerId) {
                if (winnerId === playerA._id.toString()) {
                    playerAWins += 1;
                } else if (winnerId === playerB._id.toString()) {
                    playerBWins += 1;
                }
            }

            const tournament = match.tournamentRef;

            return {
                _id: match._id.toString(),
                date: match.createdAt,
                type: match.type,
                round: match.round,
                winnerId,
                tournament: {
                    _id: tournament?._id?.toString() || "",
                    tournamentId: tournament?.tournamentId || "",
                    name: tournament?.tournamentSettings?.name || tournament?.tournamentId || "Unknown tournament",
                    startDate: tournament?.tournamentSettings?.startDate,
                },
                playerA: {
                    legsWon: aLegsWon,
                    average: aAvg,
                    firstNineAvg: aFirstNineAvg,
                    highestCheckout: aCheckout,
                    oneEightiesCount: aOneEighties,
                },
                playerB: {
                    legsWon: bLegsWon,
                    average: bAvg,
                    firstNineAvg: bFirstNineAvg,
                    highestCheckout: bCheckout,
                    oneEightiesCount: bOneEighties,
                },
            };
        });

        const [playerACareerStats, playerBCareerStats] = await Promise.all([
            aggregateCareerStats(playerAId),
            aggregateCareerStats(playerBId),
        ]);

        return {
            playerA: {
                _id: playerA._id.toString(),
                name: playerA.name,
                country: playerA.country || null,
            },
            playerB: {
                _id: playerB._id.toString(),
                name: playerB.name,
                country: playerB.country || null,
            },
            summary: {
                matchesPlayed: mappedMatches.length,
                playerAWins,
                playerBWins,
                playerALegsWon,
                playerBLegsWon,
                playerAAverage: playerAAverageCount > 0 ? Number((playerAAverageSum / playerAAverageCount).toFixed(2)) : 0,
                playerBAverage: playerBAverageCount > 0 ? Number((playerBAverageSum / playerBAverageCount).toFixed(2)) : 0,
                playerAHighestCheckout,
                playerBHighestCheckout,
                playerAOneEighties,
                playerBOneEighties,
                playerAFirstNineAvg: playerAFirstNineAverageCount > 0 ? Number((playerAFirstNineAverageSum / playerAFirstNineAverageCount).toFixed(2)) : 0,
                playerBFirstNineAvg: playerBFirstNineAverageCount > 0 ? Number((playerBFirstNineAverageSum / playerBFirstNineAverageCount).toFixed(2)) : 0,
            },
            allTimeComparison: {
                playerA: playerACareerStats,
                playerB: playerBCareerStats,
            },
            matches: mappedMatches,
        };
    }

    static async getTopHeadToHeadOpponents(
        playerId: string,
        options?: { season?: number; limit?: number }
    ): Promise<Array<{
        opponent: { _id: string; name: string; country?: string | null };
        matchesPlayed: number;
        wins: number;
        losses: number;
        lastPlayedAt?: Date;
    }>> {
        await connectMongo();

        const player = await PlayerModel.findById(playerId).select("_id");
        if (!player) {
            throw new BadRequestError("Player not found");
        }

        const query: any = {
            status: "finished",
            $or: [{ "player1.playerId": player._id }, { "player2.playerId": player._id }],
        };

        if (options?.season) {
            const seasonStart = new Date(options.season, 0, 1);
            const seasonEnd = new Date(options.season + 1, 0, 1);
            query.createdAt = { $gte: seasonStart, $lt: seasonEnd };
        }

        const matches = await MatchModel.find(query)
            .select("player1.playerId player2.playerId winnerId createdAt")
            .sort({ createdAt: -1 });

        const byOpponent = new Map<
            string,
            { matchesPlayed: number; wins: number; losses: number; lastPlayedAt?: Date }
        >();
        const currentPlayerId = player._id.toString();

        for (const match of matches as any[]) {
            const player1Id = match.player1?.playerId?.toString();
            const player2Id = match.player2?.playerId?.toString();
            const isPlayer1 = player1Id === currentPlayerId;
            const opponentId = isPlayer1 ? player2Id : player1Id;

            if (!opponentId) continue;

            const current = byOpponent.get(opponentId) || {
                matchesPlayed: 0,
                wins: 0,
                losses: 0,
                lastPlayedAt: undefined,
            };

            current.matchesPlayed += 1;
            if (!current.lastPlayedAt || (match.createdAt && new Date(match.createdAt) > current.lastPlayedAt)) {
                current.lastPlayedAt = match.createdAt;
            }

            const winnerId = match.winnerId?.toString();
            if (winnerId) {
                if (winnerId === currentPlayerId) current.wins += 1;
                if (winnerId === opponentId) current.losses += 1;
            }

            byOpponent.set(opponentId, current);
        }

        const limit = Math.max(1, options?.limit || 5);
        const sorted = Array.from(byOpponent.entries())
            .sort((a, b) => {
                if (b[1].matchesPlayed !== a[1].matchesPlayed) {
                    return b[1].matchesPlayed - a[1].matchesPlayed;
                }
                return (b[1].lastPlayedAt?.getTime() || 0) - (a[1].lastPlayedAt?.getTime() || 0);
            })
            .slice(0, limit);

        const opponentIds = sorted.map(([id]) => id);
        const opponents = await PlayerModel.find({ _id: { $in: opponentIds } }).select("_id name country");
        const opponentMap = new Map(opponents.map((op: any) => [op._id.toString(), op]));

        return sorted
            .map(([opponentId, stats]) => {
                const opponent = opponentMap.get(opponentId);
                if (!opponent) return null;
                return {
                    opponent: {
                        _id: opponent._id.toString(),
                        name: opponent.name,
                        country: opponent.country || null,
                    },
                    matchesPlayed: stats.matchesPlayed,
                    wins: stats.wins,
                    losses: stats.losses,
                    lastPlayedAt: stats.lastPlayedAt,
                };
            })
            .filter(Boolean) as Array<{
            opponent: { _id: string; name: string; country?: string | null };
            matchesPlayed: number;
            wins: number;
            losses: number;
            lastPlayedAt?: Date;
        }>;
    }

    static async movePlayerInGroup(tournamentCode: string, groupId: string, playerId: string, direction: 'up' | 'down'): Promise<boolean> {
        try {
            const tournament = await TournamentService.getTournament(tournamentCode);
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

    static async finishTournament(tournamentCode: string, requesterId: string, thirdPlacePlayerId?: string): Promise<boolean> {
        try {
            const tournament = await TournamentService.getTournament(tournamentCode);
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId._id.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can finish tournaments');
            }



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

                        // Skip bye matches (only one player)
                        if (!match.player1 || !match.player2) {
                            continue;
                        }

                        // Handle both populated and non-populated matchReference
                        const matchRefObj = typeof matchRef === 'object' ? matchRef : null;
                        if (!matchRefObj || !(matchRefObj as any).winnerId) {
                            console.log(`DEBUG: Incomplete match found in Round ${roundIndex + 1}`);
                            console.log(`DEBUG: Match Ref ID: ${matchRef && (matchRef as any)._id ? (matchRef as any)._id : matchRef}`);
                            console.log(`DEBUG: Match Status: ${matchRefObj ? (matchRefObj as any).status : 'N/A'}`);
                            console.log(`DEBUG: Player 1: ${match.player1}, Player 2: ${match.player2}`);
                            throw new BadRequestError(`Incomplete match in round ${roundIndex + 1} - all matches must be finished`);
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
                            } else if (roundIndex === tournament.knockout.length - 2 && thirdPlacePlayerId) {
                                // Semi-final round and thirdPlacePlayerId provided
                                if (loserId === thirdPlacePlayerId) {
                                    playerStandings.set(loserId, 3);
                                } else {
                                    playerStandings.set(loserId, 4);
                                }
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
                    console.log(playerId)
                    if (playerId && !playersInKnockout.has(playerId.toString())) {
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

                            console.log('Match has player1?: ', !match.player1, (match.player1 as any).playerId, 'Match has player2: ', !match.player2, (!match.player1 as any).playerId)
                            // Skip bye matches (missing players or missing playerIds)
                            if (!match.player1|| !match.player2) {
                                console.log('continue')
                                continue;
                            }

                            // Handle both populated and non-populated matchReference
                            const matchRefObj = typeof matchRef === 'object' ? matchRef : null;
                            if (!matchRefObj || !(matchRefObj as any).winnerId) {
                                throw new BadRequestError(`Incomplete match in round ${roundIndex + 1}`);
                            }

                            console.log('processing elimination')

                            const winnerId = (matchRefObj as any).winnerId.toString();
                            const player1Id = typeof match.player1 === 'object' ? 
                                (match.player1 as any)._id?.toString() : match.player1?.toString();
                            const player2Id = typeof match.player2 === 'object' ? 
                                (match.player2 as any)._id?.toString() : match.player2?.toString();
                            const loserId = winnerId === player1Id ? player2Id : player1Id;
                            console.log('found loser: ', loserId)
                            if (loserId && !playerStandings.has(loserId.toString())) {
                                if (isFinalRound) {
                                    // Final round: winner gets 1st, loser gets 2nd
                                    playerStandings.set(winnerId, 1);
                                    playerStandings.set(loserId, 2);
                                } else if (roundIndex === tournament.knockout.length - 2 && thirdPlacePlayerId) {
                                    // Semi-final round and thirdPlacePlayerId provided
                                    if (loserId === thirdPlacePlayerId) {
                                        playerStandings.set(loserId, 3);
                                    } else {
                                        playerStandings.set(loserId, 4);
                                    }
                                } else {
                                    console.log('Knockout round:', loserId, ' => ', positionForThisRound)
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
                firstNineAvg: number;
                checkoutRate: number;
                legsWon: number;
                legsPlayed: number;
                matchesWon: number;
                matchesPlayed: number;
                highestCheckout: number;
                oneEighties: number;
                tournamentTotal: number;
                tournamentMatches: number;
                firstNineTotal: number;
                firstNineMatches: number;
            }>();

            // Initialize all players with zero stats
            checkedInPlayers.forEach((player: any) => {
                const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                if (playerId) {
                    playerStats.set(playerId, {
                        average: 0,
                        firstNineAvg: 0,
                        checkoutRate: 0,
                        legsWon: 0,
                        legsPlayed: 0,
                        matchesWon: 0,
                        matchesPlayed: 0,
                        highestCheckout: 0,
                        oneEighties: 0,
                        tournamentTotal: 0,
                        tournamentMatches: 0,
                        firstNineTotal: 0,
                        firstNineMatches: 0,
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
                firstNineAvg: number;
                checkoutRate: number;
                legsWon: number;
                legsPlayed: number;
                matchesWon: number;
                matchesPlayed: number;
                highestCheckout: number;
                oneEighties: number;
                tournamentTotal: number;
                tournamentMatches: number;
                firstNineTotal: number;
                firstNineMatches: number;
            }>();

            // Initialize group stage stats
            checkedInPlayers.forEach((player: any) => {
                const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                if (playerId) {
                    groupStageStats.set(playerId, {
                        average: 0,
                        firstNineAvg: 0,
                        checkoutRate: 0,
                        legsWon: 0,
                        legsPlayed: 0,
                        matchesWon: 0,
                        matchesPlayed: 0,
                        highestCheckout: 0,
                        oneEighties: 0,
                        tournamentTotal: 0,
                        tournamentMatches: 0,
                        firstNineTotal: 0,
                        firstNineMatches: 0,
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

                // Calculate match average for each player (dart-weighted)
                let player1TotalScore = 0;
                let player1TotalDarts = 0;
                let player1FirstNineScore = 0;
                let player1FirstNineDarts = 0;
                let player2TotalScore = 0;
                let player2TotalDarts = 0;
                let player2FirstNineScore = 0;
                let player2FirstNineDarts = 0;

                if (match.legs && Array.isArray(match.legs)) {
                    for (const leg of match.legs) {
                        if (leg.player1Throws && Array.isArray(leg.player1Throws)) {
                            const firstNine = this.getFirstNineScoreAndDarts(leg.player1Throws as any[]);
                            player1FirstNineScore += firstNine.score;
                            player1FirstNineDarts += firstNine.darts;
                            for (const throwData of leg.player1Throws) {
                                player1TotalScore += throwData.score || 0;
                                if (throwData.score === 180) {
                                    player1GroupStats.oneEighties++;
                                }
                                if (throwData.isCheckout && throwData.score > player1GroupStats.highestCheckout) {
                                    player1GroupStats.highestCheckout = throwData.score;
                                }
                            }
                            player1GroupStats.legsPlayed++;
                        }
                        player1TotalDarts += this.getLegDarts(leg.player1Throws as any[], (leg as any).player1TotalDarts);

                        if (leg.player2Throws && Array.isArray(leg.player2Throws)) {
                            const firstNine = this.getFirstNineScoreAndDarts(leg.player2Throws as any[]);
                            player2FirstNineScore += firstNine.score;
                            player2FirstNineDarts += firstNine.darts;
                            for (const throwData of leg.player2Throws) {
                                player2TotalScore += throwData.score || 0;
                                if (throwData.score === 180) {
                                    player2GroupStats.oneEighties++;
                                }
                                if (throwData.isCheckout && throwData.score > player2GroupStats.highestCheckout) {
                                    player2GroupStats.highestCheckout = throwData.score;
                                }
                            }
                            player2GroupStats.legsPlayed++;
                        }
                        player2TotalDarts += this.getLegDarts(leg.player2Throws as any[], (leg as any).player2TotalDarts);

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

                if (player1TotalDarts > 0) {
                    player1GroupStats.tournamentTotal += player1TotalScore;
                    player1GroupStats.tournamentMatches += player1TotalDarts;
                }
                if (player1FirstNineDarts > 0) {
                    player1GroupStats.firstNineTotal += player1FirstNineScore;
                    player1GroupStats.firstNineMatches += player1FirstNineDarts;
                }

                if (player2TotalDarts > 0) {
                    player2GroupStats.tournamentTotal += player2TotalScore;
                    player2GroupStats.tournamentMatches += player2TotalDarts;
                }
                if (player2FirstNineDarts > 0) {
                    player2GroupStats.firstNineTotal += player2FirstNineScore;
                    player2GroupStats.firstNineMatches += player2FirstNineDarts;
                }
            }

            // Calculate group stage averages
            for (const [, stats] of groupStageStats) {
                stats.average = this.toThreeDartAverage(stats.tournamentTotal, stats.tournamentMatches);
                stats.firstNineAvg = this.toThreeDartAverage(stats.firstNineTotal, stats.firstNineMatches);
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

                // === 2. CALCULATE MATCH AVERAGE FOR EACH PLAYER (dart-weighted) ===
                let player1TotalScore = 0;
                let player1TotalDarts = 0;
                let player1FirstNineScore = 0;
                let player1FirstNineDarts = 0;
                let player2TotalScore = 0;
                let player2TotalDarts = 0;
                let player2FirstNineScore = 0;
                let player2FirstNineDarts = 0;

                // Process legs
                if (match.legs && Array.isArray(match.legs)) {
                    for (const leg of match.legs) {
                        // Player 1 leg processing
                        if (leg.player1Throws && Array.isArray(leg.player1Throws)) {
                            const firstNine = this.getFirstNineScoreAndDarts(leg.player1Throws as any[]);
                            player1FirstNineScore += firstNine.score;
                            player1FirstNineDarts += firstNine.darts;
                            for (const throwData of leg.player1Throws) {
                                player1TotalScore += throwData.score || 0;
                                
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
                        player1TotalDarts += this.getLegDarts(leg.player1Throws as any[], (leg as any).player1TotalDarts);

                        // Player 2 leg processing
                        if (leg.player2Throws && Array.isArray(leg.player2Throws)) {
                            const firstNine = this.getFirstNineScoreAndDarts(leg.player2Throws as any[]);
                            player2FirstNineScore += firstNine.score;
                            player2FirstNineDarts += firstNine.darts;
                            for (const throwData of leg.player2Throws) {
                                player2TotalScore += throwData.score || 0;
                                
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
                        player2TotalDarts += this.getLegDarts(leg.player2Throws as any[], (leg as any).player2TotalDarts);

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
                if (player1TotalDarts > 0) {
                    player1Stats.tournamentTotal += player1TotalScore;
                    player1Stats.tournamentMatches += player1TotalDarts;
                }
                if (player1FirstNineDarts > 0) {
                    player1Stats.firstNineTotal += player1FirstNineScore;
                    player1Stats.firstNineMatches += player1FirstNineDarts;
                }

                if (player2TotalDarts > 0) {
                    player2Stats.tournamentTotal += player2TotalScore;
                    player2Stats.tournamentMatches += player2TotalDarts;
                }
                if (player2FirstNineDarts > 0) {
                    player2Stats.firstNineTotal += player2FirstNineScore;
                    player2Stats.firstNineMatches += player2FirstNineDarts;
                }
            }

            // === 3. CALCULATE FINAL TOURNAMENT AVERAGES ===
            /* eslint-disable @typescript-eslint/no-unused-vars */
            for (const [playerId, stats] of playerStats) {
                stats.average = this.toThreeDartAverage(stats.tournamentTotal, stats.tournamentMatches);
                stats.firstNineAvg = this.toThreeDartAverage(stats.firstNineTotal, stats.firstNineMatches);
            }
            /* eslint-enable @typescript-eslint/no-unused-vars */

            // Step 7: Update tournament players with final standings
            tournament.tournamentPlayers = tournament.tournamentPlayers.map((player: any) => {
                const playerId = player.playerReference?._id?.toString() || player.playerReference?.toString();
                const standing = playerStandings.get(playerId);
                
                if (standing) {
                    const overallStats = playerStats.get(playerId);
                    const groupOnlyStats = groupStageStats.get(playerId);
                    
                    // Keep group-only stats available, but persist final tournament stats on `stats`
                    // so finished standings/TV surfaces include knockout contributions too.
                    const groupStats = groupOnlyStats || {};
                    const finalStats = overallStats || {};
                    
                    return {
                        ...player,
                        tournamentStanding: standing,
                        finalPosition: standing,
                        eliminatedIn: this.getEliminationText(standing, format),
                        // Final tournament stats (group + knockout)
                        stats: {
                            matchesWon: finalStats?.matchesWon || 0,
                            matchesLost: finalStats?.matchesPlayed ? finalStats.matchesPlayed - finalStats.matchesWon : 0,
                            legsWon: finalStats?.legsWon || 0,
                            legsLost: finalStats?.legsPlayed ? finalStats.legsPlayed - finalStats.legsWon : 0,
                            avg: finalStats?.average || 0,
                            firstNineAvg: finalStats?.firstNineAvg || 0,
                            oneEightiesCount: finalStats?.oneEighties || 0,
                            highestCheckout: finalStats?.highestCheckout || 0,
                        },
                        // Group-only stats preserved for dedicated group-stage displays if needed.
                        groupStats: {
                            matchesWon: groupStats?.matchesWon || 0,
                            matchesLost: groupStats?.matchesPlayed ? groupStats.matchesPlayed - groupStats.matchesWon : 0,
                            legsWon: groupStats?.legsWon || 0,
                            legsLost: groupStats?.legsPlayed ? groupStats.legsPlayed - groupStats.legsWon : 0,
                            avg: groupStats?.average || 0,
                            firstNineAvg: groupStats?.firstNineAvg || 0,
                            oneEightiesCount: groupStats?.oneEighties || 0,
                            highestCheckout: groupStats?.highestCheckout || 0,
                        },
                        // Backward-compatible explicit final stats payload.
                        finalStats: finalStats,
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

            // Step 9: Update Player collection statistics with MMR (ONLY for non-sandbox)
            if (!tournament.isSandbox) {
                for (const [playerId, stats] of playerStats) {
                    const player = await PlayerModel.findById(playerId);
                    if (player) {
                        // 1. Check for existing entry
                        if (!player.tournamentHistory) player.tournamentHistory = [];
                        const existingHistoryIndex = player.tournamentHistory.findIndex((h: any) => h.tournamentId === tournament.tournamentId);

                        // 2. Identify placement
                        const tournamentPlayer = tournament.tournamentPlayers.find((tp: any) => {
                            const tpPlayerId = tp.playerReference?._id?.toString() || tp.playerReference?.toString();
                            return tpPlayerId === playerId;
                        });
                        const placement = tournamentPlayer?.tournamentStanding || totalPlayers;

                        // 3. OAC MMR CALCULATION (Using previous history only)
                        let verifiedAverage = 0;
                        if (tournament.verified) {
                            // If re-finishing, skip the existing entry for this tournament to get the "true" previous average
                            const historicalEntries = existingHistoryIndex > -1 
                                ? player.tournamentHistory.filter((_: any, i: number) => i !== existingHistoryIndex)
                                : player.tournamentHistory;
                            verifiedAverage = OacMmrService.calculateVerifiedAverage(historicalEntries);
                        }

                        const currentOacMmr = player.stats.oacMmr || OacMmrService.BASE_OAC_MMR;
                        let oacMmrChange = 0;
                        
                        if (tournament.verified && totalPlayers >= 16) {
                            const nextOacMmr = OacMmrService.calculateMMRChange({
                                currentOacMmr,
                                placement,
                                totalParticipants: totalPlayers,
                                currentAverage: stats.average,
                                verifiedAverage,
                                oneEightiesCount: stats.oneEighties,
                                highestCheckout: stats.highestCheckout,
                                matchesWon: stats.matchesWon
                            });
                            oacMmrChange = nextOacMmr - currentOacMmr;
                            player.stats.oacMmr = nextOacMmr;
                        }

                        // 4. GLOBAL MMR CALCULATION
                        const matchWinRate = stats.matchesPlayed > 0 ? stats.matchesWon / stats.matchesPlayed : 0;
                        const legWinRate = stats.legsPlayed > 0 ? stats.legsWon / stats.legsPlayed : 0;
                        const currentMMR = player.stats.mmr || MMRService.getInitialMMR();
                        const nextMMR = MMRService.calculateMMRChange(
                            currentMMR,
                            placement,
                            totalPlayers,
                            matchWinRate,
                            legWinRate,
                            stats.average,
                            tournamentAverageScore
                        );
                        player.stats.mmr = Math.ceil(nextMMR);

                        // 5. UPDATE GLOBAL STATS INCREMENTALLY (No all-time loops)
                        const isNewTournament = existingHistoryIndex === -1;
                        if (isNewTournament) {
                            player.stats.tournamentsPlayed = (player.stats.tournamentsPlayed || 0) + 1;
                            
                            // Keep ranking position weighted by tournaments, but recompute averages from finished matches (dart-weighted).
                            const historyCount = player.tournamentHistory.length;
                            player.stats.averagePosition =
                                historyCount > 0
                                    ? ((player.stats.averagePosition * historyCount) + placement) / (historyCount + 1)
                                    : placement;

                            // Incremental counters
                            player.stats.totalMatchesWon = (player.stats.totalMatchesWon || 0) + stats.matchesWon;
                            player.stats.totalMatchesLost = (player.stats.totalMatchesLost || 0) + (stats.matchesPlayed - stats.matchesWon);
                            player.stats.totalLegsWon = (player.stats.totalLegsWon || 0) + stats.legsWon;
                            player.stats.totalLegsLost = (player.stats.totalLegsLost || 0) + (stats.legsPlayed - stats.legsWon);
                            player.stats.total180s = (player.stats.total180s || 0) + stats.oneEighties;
                            player.stats.oneEightiesCount = (player.stats.oneEightiesCount || 0) + stats.oneEighties;
                            player.stats.matchesPlayed = (player.stats.matchesPlayed || 0) + stats.matchesPlayed;
                            player.stats.legsWon = (player.stats.legsWon || 0) + stats.legsWon;
                            player.stats.legsLost = (player.stats.legsLost || 0) + (stats.legsPlayed - stats.legsWon);
                        } else {
                            // If re-finishing, skipping all-time recalculation as requested
                            console.log(`Re-finishing tournament ${tournament.tournamentId} for ${player.name}. Skipping incremental stat updates.`);
                        }

                        if (stats.highestCheckout > (player.stats.highestCheckout || 0)) {
                            player.stats.highestCheckout = stats.highestCheckout;
                        }
                        if (placement < (player.stats.bestPosition || 999) || player.stats.bestPosition === 0) {
                            player.stats.bestPosition = placement;
                        }

                         // 6. UPDATE TOURNAMENT HISTORY ENTRY
                         const mmrChange = player.stats.mmr - currentMMR;
                         const tournamentHistoryEntry = {
                            isVerified: tournament.verified || false,
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
                                 average: stats.average,
                                 firstNineAvg: stats.firstNineAvg || 0,
                             },
                             date: new Date(),
                             verified: tournament.verified || false,
                             mmrChange: mmrChange,
                             oacMmrChange: oacMmrChange
                         };

                        if (isNewTournament) {
                            player.tournamentHistory.push(tournamentHistoryEntry);
                        } else {
                            player.tournamentHistory[existingHistoryIndex] = tournamentHistoryEntry;
                        }

                        const seasonAverages = await this.recalculateCurrentSeasonAverages(playerId);
                        player.stats.avg = seasonAverages.avg;
                        player.stats.firstNineAvg = seasonAverages.firstNineAvg;

                        await player.save();
                    }
                }
            } else {
                console.log('🛡️ Sandbox tournament: Skipping global Player stats and MMR updates');
            }

            // Step 10: Update tournament status to finished and reset boards

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
                    if (tournament.isSandbox) {
                        console.log('🛡️ Sandbox tournament: Skipping League points calculation');
                    } else {
                        console.log('Tournament is attached to league, calculating points...');
                        // Get updated tournament with final standings
                        const updatedTournament = await TournamentModel.findById(tournament._id);
                        if (updatedTournament) {
                            await LeagueService.calculatePointsForTournament(updatedTournament, league);
                            console.log('League points calculated successfully');
                        }
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
        const tournament = await TournamentModel.findOne({ 
            clubId: clubId,
            isDeleted: { $ne: true },
            isArchived: { $ne: true }
        }).sort({ createdAt: -1 });
        if (!tournament) {
            return null;
        }
        return tournament;
    }

    static async getLiveMatches(tournamentCode: string): Promise<any[]> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ 
                tournamentId: tournamentCode,
                isDeleted: { $ne: true },
                isArchived: { $ne: true }
            });
            
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

            return liveMatches.map((match: any) => {
                const player1LegsWon = Number(match?.player1?.legsWon || 0);
                const player2LegsWon = Number(match?.player2?.legsWon || 0);
                return {
                    ...match.toObject(),
                    currentLeg: player1LegsWon + player2LegsWon + 1,
                    player1Remaining: 501,
                    player2Remaining: 501,
                    lastUpdate: match.updatedAt || match.createdAt,
                };
            });
        } catch (error) {
            console.error('getLiveMatches error:', error);
            throw error;
        }
    }

    static async updateTournamentSettings(tournamentId: string, requesterId: string, settings: Partial<TournamentSettings> & { boards?: any[] }): Promise<TournamentDocument> {
        try {
            await connectMongo();
            
            // Get tournament with club information
            const tournament = await TournamentModel.findOne({ 
                tournamentId: tournamentId,
                isDeleted: { $ne: true },
                isArchived: { $ne: true }
            })
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

            if (typeof settings.location === 'string' && settings.location.trim()) {
                const geocodeResult = await GeocodingService.geocodeAddress(settings.location, 'user');
                (updatedSettings as any).locationData = geocodeResult.location;
            }
            
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
            return await TournamentService.getTournament(tournamentId);
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
                'tournamentSettings.status': { $in: ['pending', 'group-stage', 'knockout'] },
                isDeleted: { $ne: true },
                isArchived: { $ne: true }
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
            const tournament = await TournamentModel.findOne({ 
                tournamentId: tournamentId,
                isDeleted: { $ne: true },
                isArchived: { $ne: true }
            });
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
        const tournaments = await TournamentModel.find({ 
            isActive: { $ne: false },
            isDeleted: { $ne: true },
            isArchived: { $ne: true }
        })
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
                firstNineAvg: 0,
                oneEightiesCount: 0,
                highestCheckout: 0,
            }
        } as any);

        // Remove from waiting list
        tournament.waitingList.splice(playerIndex, 1);

        await tournament.save();

        // Trigger notifications if spots are within threshold
        const maxPlayers = tournament.tournamentSettings.maxPlayers;
        const currentPlayers = tournament.tournamentPlayers.length;
        const freeSpots = Math.max(0, maxPlayers - currentPlayers);
        
        if (freeSpots <= 10) {
            // We call it even if spots decreased, as per user request "no matter the change"
            this.notifySubscribersAboutAvailableSpots(tournamentCode, freeSpots)
                .catch((err) =>
                    ErrorService.logError(
                        'Failed to notify subscribers',
                        err as Error,
                        'tournament',
                        {
                            tournamentId: tournamentCode,
                            errorCode: 'TOURNAMENT_NOTIFY_SUBSCRIBERS_FAILED',
                            expected: false,
                            operation: 'tournament.notifySubscribersAboutAvailableSpots',
                            entityType: 'tournament',
                            entityId: tournamentCode,
                        }
                    ).catch(console.error)
                );
        }
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

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const addResult = await TournamentModel.updateOne(
            {
                tournamentId: tournamentCode,
                isDeleted: { $ne: true },
                isArchived: { $ne: true },
                'notificationSubscribers.userRef': { $ne: userObjectId },
            },
            {
                $push: {
                    notificationSubscribers: {
                        userRef: userObjectId,
                        email,
                        subscribedAt: new Date(),
                    },
                },
            }
        );

        if (addResult.modifiedCount > 0) {
            return;
        }

        const tournament = await TournamentModel.findOne({
            tournamentId: tournamentCode,
            isDeleted: { $ne: true },
            isArchived: { $ne: true },
        }).select('_id notificationSubscribers.userRef');

        if (!tournament) {
            throw new BadRequestError('Tournament not found', 'tournament', {
                tournamentId: tournamentCode,
                errorCode: 'TOURNAMENT_NOT_FOUND',
                expected: true,
                operation: 'tournament.subscribeToNotifications',
                entityType: 'tournament',
                entityId: tournamentCode,
            });
        }

        const alreadySubscribed = (tournament.notificationSubscribers || []).some(
            (s: any) => s.userRef?.toString() === userId
        );
        if (alreadySubscribed) {
            throw new BadRequestError('Already subscribed to notifications', 'tournament', {
                tournamentId: tournamentCode,
                userId,
                errorCode: 'TOURNAMENT_ALREADY_SUBSCRIBED',
                expected: true,
                operation: 'tournament.subscribeToNotifications',
                entityType: 'tournament',
                entityId: tournamentCode,
            });
        }
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
            throw new BadRequestError('Tournament not found', 'tournament', {
                tournamentId: tournamentCode,
                userId,
                errorCode: 'TOURNAMENT_NOT_FOUND',
                expected: true,
                operation: 'tournament.unsubscribeFromNotifications',
                entityType: 'tournament',
                entityId: tournamentCode,
            });
        }

        if (!tournament.notificationSubscribers || tournament.notificationSubscribers.length === 0) {
            throw new BadRequestError('No subscribers found', 'tournament', {
                tournamentId: tournamentCode,
                userId,
                errorCode: 'TOURNAMENT_NO_SUBSCRIBERS',
                expected: true,
                operation: 'tournament.unsubscribeFromNotifications',
                entityType: 'tournament',
                entityId: tournamentCode,
            });
        }

        // Find subscriber
        const subscriberIndex = tournament.notificationSubscribers.findIndex(
            (s: any) => s.userRef.toString() === userId
        );

        if (subscriberIndex === -1) {
            throw new BadRequestError('Not subscribed to notifications', 'tournament', {
                tournamentId: tournamentCode,
                userId,
                errorCode: 'TOURNAMENT_NOT_SUBSCRIBED',
                expected: true,
                operation: 'tournament.unsubscribeFromNotifications',
                entityType: 'tournament',
                entityId: tournamentCode,
            });
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
                                
                                let mmrChange = 0;
                                if (tournamentHistoryIndex !== undefined && tournamentHistoryIndex !== -1 && player.tournamentHistory) {
                                    
                                    // Remove tournament from history
                                    mmrChange = player.tournamentHistory[tournamentHistoryIndex].mmrChange
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
                                    player.stats.mmr = Math.max(0, (player.stats.mmr || 800) + (mmrChange*-1));
                                    
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
                                    
                                    // Recalculate current season averages from finished matches (dart-weighted)
                                    const seasonAverages = await this.recalculateCurrentSeasonAverages(playerId.toString());
                                    player.stats.avg = seasonAverages.avg;
                                    player.stats.firstNineAvg = seasonAverages.firstNineAvg;
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

    /**
     * Check for tournaments starting today and send reminder emails
     * This is intended to be called by a trigger (e.g., when someone visits the site)
     */
    static async checkAndSendTournamentReminders(): Promise<void> {
        await connectMongo();
        
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Find tournaments starting today where reminders haven't been sent
        const tournaments = await TournamentModel.find({
            'tournamentSettings.date': { $gte: startOfDay, $lte: endOfDay },
            'tournamentSettings.reminderSent': { $ne: true },
            'tournamentSettings.status': { $ne: 'finished' }
        }).populate({
            path: 'tournamentPlayers.playerReference',
            populate: {
                path: 'userRef',
                select: 'email name username'
            }
        });

        if (tournaments.length === 0) {
            return;
        }

        const { MailerService } = await import('@/database/services/mailer.service');

        for (const tournament of tournaments) {
            console.log(`[Reminder] Processing tournament: ${tournament.tournamentSettings.name} (${tournament.tournamentId})`);
            
            // Collect recipients
            const recipients = new Map<string, { email: string, name: string }>();
            
            // 1. Add notification subscribers
            if (tournament.notificationSubscribers) {
                for (const sub of tournament.notificationSubscribers) {
                    if (sub.email) {
                        recipients.set(sub.email.toLowerCase(), { 
                            email: sub.email, 
                            name: 'Játékos' 
                        });
                    }
                }
            }
            
            // 2. Add registered players
            for (const tp of tournament.tournamentPlayers) {
                const player = (tp as any).playerReference;
                if (player && player.userRef && (player.userRef as any).email) {
                    const user = player.userRef as any;
                    recipients.set(user.email.toLowerCase(), {
                        email: user.email,
                        name: user.name || user.username || 'Játékos'
                    });
                }
            }
            
            // Send emails
            const tournamentDateStr = tournament.tournamentSettings.date.toLocaleTimeString('hu-HU', {
                hour: '2-digit',
                minute: '2-digit'
            });

            for (const recipient of recipients.values()) {
                try {
                    await MailerService.sendTournamentReminderEmail(recipient.email, {
                        tournamentName: tournament.tournamentSettings.name,
                        tournamentCode: tournament.tournamentId,
                        tournamentDate: tournamentDateStr,
                        userName: recipient.name
                    });
                } catch (err) {
                    console.error(`[Reminder] Failed to send to ${recipient.email}:`, err);
                }
            }
            
            // Mark as sent
            await TournamentModel.updateOne(
                { _id: tournament._id },
                { $set: { 'tournamentSettings.reminderSent': true } }
            );
            console.log(`[Reminder] Reminders sent for tournament: ${tournament.tournamentId}`);
        }
    }
}
