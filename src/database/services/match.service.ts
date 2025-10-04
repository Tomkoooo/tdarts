import { Match } from "@/interface/match.interface";
import { MatchModel } from "../models/match.model";
import { BadRequestError } from "@/middleware/errorHandle";
import { TournamentService } from "./tournament.service";
import { TournamentModel } from "../models/tournament.model";
import { ClubModel } from "../models/club.model";
import { AuthorizationService } from "./authorization.service";
import { connectMongo } from "@/lib/mongoose";

export class MatchService {
    // Get all matches for a board that haven't finished yet
    static async getBoardMatches(tournamentId: string, clubId: string, boardNumber: number): Promise<Match[]> {
        const tournament = await TournamentService.getTournament(tournamentId);
        const startingScore = tournament?.tournamentSettings.startingScore;

        if (!tournament) throw new BadRequestError('Tournament not found', 'tournament', {
          tournamentId,
          clubId,
          boardNumber
        });
        
        const matches = await MatchModel.find({
            boardReference: boardNumber,
            tournamentRef: tournament._id,
            status: { $ne: 'finished' },
            // Only include matches where both players exist (no bye matches)
            $and: [
                { 'player1.playerId': { $ne: null } },
                { 'player2.playerId': { $ne: null } }
            ]
        })
        .populate('player1.playerId')
        .populate('player2.playerId')
        .populate('scorer')
        .sort({ createdAt: 1 });

        return matches.map(match => ({
            ...match.toObject(),
            startingScore: startingScore,
            startingPlayer: match.startingPlayer || 1, // Ensure startingPlayer is included
        }));
    }

    // Get all matches for a board (including finished ones)
    static async getAllBoardMatches(tournamentId: string, clubId: string, boardNumber: number): Promise<Match[]> {
        const tournament = await TournamentService.getTournament(tournamentId);
        const startingScore = tournament?.tournamentSettings.startingScore;

        if (!tournament) throw new BadRequestError('Tournament not found', 'tournament', {
          tournamentId,
          clubId,
          boardNumber
        });
        
        const matches = await MatchModel.find({
            boardReference: boardNumber,
            tournamentRef: tournament._id,
            // Only include matches where both players exist (no bye matches)
            $and: [
                { 'player1.playerId': { $ne: null } },
                { 'player2.playerId': { $ne: null } }
            ]
        })
        .populate('player1.playerId')
        .populate('player2.playerId')
        .populate('scorer')
        .sort({ createdAt: 1 });

        return matches.map(match => ({
            ...match.toObject(),
            startingScore: startingScore,
            startingPlayer: match.startingPlayer || 1, // Ensure startingPlayer is included
        }));
    }

    // Get a specific match by ID
    static async getMatch(tournamentId: string, clubId: string, boardNumber: number, matchId: string): Promise<Match> {
        const tournament = await TournamentService.getTournament(tournamentId);
        const startingScore = tournament?.tournamentSettings.startingScore;

        if (!tournament) throw new BadRequestError('Tournament not found', 'tournament', {
          tournamentId,
          clubId,
          boardNumber
        });
        
        const match = await MatchModel.findOne({ _id: matchId, tournamentRef: tournament._id })
            .populate('player1.playerId')
            .populate('player2.playerId')
            .populate('scorer')
            .populate('legs.winnerId').select('name');
            
        if (!match) throw new BadRequestError('Match not found', 'tournament', {
          tournamentId,
          clubId,
          boardNumber,
          matchId
        });
        
        return {
            ...match.toObject(),
            startingScore: startingScore,
            startingPlayer: match.startingPlayer || 1, // Ensure startingPlayer is included
            winnerId: match.winnerId || null, // Ensure winnerId is included
            legs: match.legs || [], // Ensure legs are included
        };
    }

    static async startMatch(tournamentId: string, matchId: string, legsToWin: number, startingPlayer: 1 | 2) {
        const match = await MatchModel.findById(matchId);
        if (!match) throw new BadRequestError('Match not found', 'tournament', {
          tournamentId,
          matchId
        });
        
        // Meccs beállítások mentése
        match.legsToWin = legsToWin;
        match.startingPlayer = startingPlayer;
        match.status = 'ongoing';
        await match.save();
        
        // Tábla állapot frissítése
        if (match.type === 'knockout') {
            // Use the new knockout board status update method
            await TournamentService.updateBoardStatusAfterMatch(matchId);
        } else {
            // Group match - use existing logic
            const tournament = await TournamentModel.findById(match.tournamentRef);
            if (!tournament) throw new BadRequestError('Tournament not found');
            const clubId = tournament.clubId.toString();
            // Mivel a board a Club dokumentumon belül van, a Club-ot kell frissíteni
            const club = await ClubModel.findById(clubId);
            if (!club) throw new BadRequestError('Club not found');

            // Keressük meg a megfelelő board-ot a club.boards tömbben
            const boardIndex = club.boards.findIndex((b: any) => b.boardNumber === match.boardReference);
            if (boardIndex === -1) throw new BadRequestError('Board not found');

            // Következő pending meccs keresése ugyanerre a táblára és tornára
            const nextMatch = await MatchModel.findOne({
                boardReference: match.boardReference,
                tournamentRef: match.tournamentRef,
                status: 'pending',
                _id: { $ne: matchId } // Ne a jelenlegi meccset adja vissza
            });

            // Frissítjük a board mezőit
            club.boards[boardIndex].status = 'playing';
            club.boards[boardIndex].currentMatch = matchId;
            club.boards[boardIndex].nextMatch = nextMatch?._id || null;

            // Mentsük el a club dokumentumot
            await club.save();
        }
        
        // Populate the match data before returning
        const populatedMatch = await MatchModel.findById(matchId)
            .populate('player1.playerId')
            .populate('player2.playerId')
            .populate('scorer');
            
        if (!populatedMatch) throw new BadRequestError('Match not found after update');
        
        // Get tournament for startingScore
        const tournament = await TournamentService.getTournament(tournamentId);
        const startingScore = tournament?.tournamentSettings.startingScore;
        
        return {
            ...populatedMatch.toObject(),
            startingScore: startingScore,
            startingPlayer: populatedMatch.startingPlayer || 1,
            winnerId: populatedMatch.winnerId || null,
        };
    }

    static async finishLeg(matchId: string, legData: {
        winner: 1 | 2;
        player1Throws: number[];
        player2Throws: number[];
        player1Stats: {
            highestCheckout: number;
            oneEightiesCount: number;
            totalThrows: number;
            totalScore: number;
        };
        player2Stats: {
            highestCheckout: number;
            oneEightiesCount: number;
            totalThrows: number;
            totalScore: number;
        };
    }) {
        const match = await MatchModel.findById(matchId);
        if (!match) throw new BadRequestError('Match not found');

        // Update match player statistics
        if (legData.winner === 1) {
            match.player1.legsWon += 1;
            match.player2.legsLost += 1;
        } else {
            match.player2.legsWon += 1;
            match.player1.legsLost += 1;
        }

        // Update player statistics
        match.player1.highestCheckout = Math.max(match.player1.highestCheckout || 0, legData.player1Stats.highestCheckout);
        match.player1.oneEightiesCount = (match.player1.oneEightiesCount || 0) + legData.player1Stats.oneEightiesCount;
        match.player1.average = legData.player1Stats.totalThrows > 0 ? 
            Math.round(legData.player1Stats.totalScore / legData.player1Stats.totalThrows) : 0;

        match.player2.highestCheckout = Math.max(match.player2.highestCheckout || 0, legData.player2Stats.highestCheckout);
        match.player2.oneEightiesCount = (match.player2.oneEightiesCount || 0) + legData.player2Stats.oneEightiesCount;
        match.player2.average = legData.player2Stats.totalThrows > 0 ? 
            Math.round(legData.player2Stats.totalScore / legData.player2Stats.totalThrows) : 0;

        // Save leg data to the match's legs array
        const winnerId = legData.winner === 1 ? match.player1.playerId : match.player2.playerId;
        
        // Find the highest checkout in this leg
        const legCheckoutScore = Math.max(legData.player1Stats.highestCheckout, legData.player2Stats.highestCheckout);
        
        // Count double attempts (throws that are multiples of 2)
        const player1DoubleAttempts = legData.player1Throws.filter(throwScore => throwScore % 2 === 0 && throwScore > 0).length;
        const player2DoubleAttempts = legData.player2Throws.filter(throwScore => throwScore % 2 === 0 && throwScore > 0).length;
        const totalDoubleAttempts = player1DoubleAttempts + player2DoubleAttempts;

        // Create leg object
        const leg = {
            player1Score: legData.player1Stats.totalScore,
            player2Score: legData.player2Stats.totalScore,
            player1Throws: legData.player1Throws.map((score, index) => ({
                score: score,
                darts: 3, // Each throw is 3 darts
                isDouble: false, // Not needed
                isCheckout: index === legData.player1Throws.length - 1 && legData.winner === 1 // Last throw of winner
            })),
            player2Throws: legData.player2Throws.map((score, index) => ({
                score: score,
                darts: 3, // Each throw is 3 darts
                isDouble: false, // Not needed
                isCheckout: index === legData.player2Throws.length - 1 && legData.winner === 2 // Last throw of winner
            })),
            winnerId: winnerId,
            checkoutScore: legCheckoutScore > 0 ? legCheckoutScore : undefined,
            checkoutDarts: legCheckoutScore > 0 ? 3 : undefined, // Simplified - could be calculated more precisely
            doubleAttempts: totalDoubleAttempts,
            createdAt: new Date()
        };

        // Add leg to match
        if (!match.legs) {
            match.legs = [];
        }
        match.legs.push(leg);

        await match.save();

        return match;
    }

    static async finishMatch(matchId: string, matchData: {
        player1LegsWon: number;
        player2LegsWon: number;
        player1Stats: {
            highestCheckout: number;
            oneEightiesCount: number;
            totalThrows: number;
            totalScore: number;
        };
        player2Stats: {
            highestCheckout: number;
            oneEightiesCount: number;
            totalThrows: number;
            totalScore: number;
        };
    }) {
        const match = await MatchModel.findById(matchId);
        if (!match) throw new BadRequestError('Match not found');

        // Check if this is a bye match (one or both players are null)
        const isByeMatch = !match.player1?.playerId || !match.player2?.playerId;
        
        if (isByeMatch) {
            // Handle bye match - automatically set the existing player as winner
            if (!match.player1?.playerId && !match.player2?.playerId) {
                throw new BadRequestError('Cannot finish a match with no players');
            }
            
            // Set the existing player as winner
            if (match.player1?.playerId) {
                match.winnerId = match.player1.playerId;
                match.player1.legsWon = 1; // Bye player automatically wins
                match.player2.legsWon = 0;
            } else {
                match.winnerId = match.player2.playerId;
                match.player2.legsWon = 1; // Bye player automatically wins
                match.player1.legsWon = 0;
            }
            
            match.status = 'finished';
            await match.save();
            
            // Update board status for bye matches
            if (match.type === 'knockout') {
                await TournamentService.updateBoardStatusAfterMatch(matchId);
            }
            
            return match;
        }

        // Regular match - both players exist
        // Determine winner based on legs won
        const winner = matchData.player1LegsWon > matchData.player2LegsWon ? 1 : 2;

        // Update match status and winner
        match.status = 'finished';
        match.winnerId = winner === 1 ? match.player1.playerId : match.player2.playerId;
        match.player1.legsWon = matchData.player1LegsWon;
        match.player2.legsWon = matchData.player2LegsWon;

        // Update final player statistics
        match.player1.highestCheckout = Math.max(match.player1.highestCheckout || 0, matchData.player1Stats.highestCheckout);
        match.player1.oneEightiesCount = (match.player1.oneEightiesCount || 0) + matchData.player1Stats.oneEightiesCount;
        match.player1.average = matchData.player1Stats.totalThrows > 0 ? 
            Math.round(matchData.player1Stats.totalScore / matchData.player1Stats.totalThrows) : 0;

        match.player2.highestCheckout = Math.max(match.player2.highestCheckout || 0, matchData.player2Stats.highestCheckout);
        match.player2.oneEightiesCount = (match.player2.oneEightiesCount || 0) + matchData.player2Stats.oneEightiesCount;
        match.player2.average = matchData.player2Stats.totalThrows > 0 ? 
            Math.round(matchData.player2Stats.totalScore / matchData.player2Stats.totalThrows) : 0;

        // Save the final leg data if it hasn't been saved yet
        // This ensures the last leg is also stored in the legs array
        const totalLegs = matchData.player1LegsWon + matchData.player2LegsWon;
        const existingLegs = match.legs ? match.legs.length : 0;
        
        if (existingLegs < totalLegs) {
            // The final leg hasn't been saved yet, so save it now
            const winnerId = winner === 1 ? match.player1.playerId : match.player2.playerId;
            
            // Find the highest checkout in this leg
            const legCheckoutScore = Math.max(matchData.player1Stats.highestCheckout, matchData.player2Stats.highestCheckout);
            
            // Create final leg object (simplified since we don't have throw data here)
            const finalLeg = {
                player1Score: matchData.player1Stats.totalScore,
                player2Score: matchData.player2Stats.totalScore,
                player1Throws: [], // Would need to be passed from frontend
                player2Throws: [], // Would need to be passed from frontend
                winnerId: winnerId,
                checkoutScore: legCheckoutScore > 0 ? legCheckoutScore : undefined,
                checkoutDarts: legCheckoutScore > 0 ? 3 : undefined,
                doubleAttempts: 0, // Would need to be calculated from throws
                createdAt: new Date()
            };

            // Add final leg to match
            if (!match.legs) {
                match.legs = [];
            }
            match.legs.push(finalLeg);
        }

        await match.save();

        // Update tournament player statistics
        await this.updateTournamentPlayerStats(match.tournamentRef.toString(), match.player1.playerId.toString(), matchData.player1Stats);
        await this.updateTournamentPlayerStats(match.tournamentRef.toString(), match.player2.playerId.toString(), matchData.player2Stats);

        // Update board status for all matches (both new and updated)
        if (match.type === 'knockout') {
            // Use the new knockout board status update method
            await TournamentService.updateBoardStatusAfterMatch(matchId);
        } else {
            // Group match - use existing logic
            const tournament = await TournamentModel.findById(match.tournamentRef);
            if (!tournament) throw new BadRequestError('Tournament not found');
            
            const club = await ClubModel.findById(tournament.clubId);
            if (!club) throw new BadRequestError('Club not found');

            const boardIndex = club.boards.findIndex((b: any) => b.boardNumber === match.boardReference);
            if (boardIndex !== -1) {
                // Find next pending match
                const nextMatch = await MatchModel.findOne({
                    boardReference: match.boardReference,
                    tournamentRef: match.tournamentRef,
                    status: 'pending',
                    _id: { $ne: matchId }
                });

                if (nextMatch) {
                    club.boards[boardIndex].status = 'waiting';
                    club.boards[boardIndex].currentMatch = null;
                    club.boards[boardIndex].nextMatch = nextMatch._id;
                } else {
                    club.boards[boardIndex].status = 'idle';
                    club.boards[boardIndex].currentMatch = null;
                    club.boards[boardIndex].nextMatch = null;
                }

                await club.save();
            }
        }

        // Update group standings if this is a group match (always update if match was modified)
        if (match.type === 'group') {
            const tournament = await TournamentModel.findById(match.tournamentRef);
            if (tournament) {
                await TournamentService.updateGroupStanding(tournament.tournamentId);
            }
        }

        return match;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private static async updateTournamentPlayerStats(tournamentId: string, playerId: string, stats: {
        highestCheckout: number;
        oneEightiesCount: number;
        totalThrows: number;
        totalScore: number;
    }) {
        const tournament = await TournamentModel.findById(tournamentId);
        if (!tournament) return;

        // Find all matches for this player in this tournament
        const playerMatches = await MatchModel.find({
            tournamentRef: tournamentId,
            $or: [
                { 'player1.playerId': playerId },
                { 'player2.playerId': playerId }
            ],
            status: 'finished'
        });

        // Calculate cumulative statistics
        let totalHighestCheckout = 0;
        let totalOneEighties = 0;
        let totalThrows = 0;
        let totalScore = 0;

        for (const playerMatch of playerMatches) {
            const isPlayer1 = playerMatch.player1.playerId.toString() === playerId;
            const playerData = isPlayer1 ? playerMatch.player1 : playerMatch.player2;

            totalHighestCheckout = Math.max(totalHighestCheckout, playerData.highestCheckout || 0);
            totalOneEighties += playerData.oneEightiesCount || 0;
            
            // For average calculation, we need to estimate throws and score from the average
            if (playerData.average && playerData.average > 0) {
                // Estimate throws from legs won/lost (assuming average leg length)
                const legsPlayed = (playerData.legsWon || 0) + (playerData.legsLost || 0);
                const estimatedThrows = legsPlayed * 15; // Rough estimate
                totalThrows += estimatedThrows;
                totalScore += playerData.average * estimatedThrows;
            }
        }

        // Update tournament player stats
        tournament.tournamentPlayers = tournament.tournamentPlayers.map((tp: any) => {
            if (tp.playerReference.toString() === playerId) {
                return {
                    ...tp,
                    stats: {
                        ...tp.stats,
                        highestCheckout: totalHighestCheckout,
                        oneEightiesCount: totalOneEighties,
                        avg: totalThrows > 0 ? Math.round(totalScore / totalThrows) : 0
                    }
                };
            }
            return tp;
        });

        await tournament.save();
    }

    // Update match settings (players, scorer, board)
    static async updateMatchSettings(matchId: string, requesterId: string, settingsData: {
        player1Id?: string;
        player2Id?: string;
        scorerId?: string;
        boardNumber?: number;
    }) {
        try {
            await connectMongo();
            
            const match = await MatchModel.findById(matchId)
                .populate('tournamentRef');
            
            if (!match) {
                throw new BadRequestError('Match not found');
            }

            const tournament = match.tournamentRef as any;
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can update match settings');
            }

            // Update players if provided
            if (settingsData.player1Id) {
                // Validate player exists in tournament
                const player1 = tournament.tournamentPlayers.find((p: any) => 
                    p.playerReference.toString() === settingsData.player1Id
                );
                if (!player1) {
                    throw new BadRequestError('Player 1 not found in tournament');
                }

                match.player1 = {
                    playerId: settingsData.player1Id,
                    legsWon: match.player1?.legsWon || 0,
                    legsLost: match.player1?.legsLost || 0,
                    average: match.player1?.average || 0,
                    highestCheckout: match.player1?.highestCheckout || 0,
                    oneEightiesCount: match.player1?.oneEightiesCount || 0,
                };
            }

            if (settingsData.player2Id) {
                // Validate player exists in tournament
                const player2 = tournament.tournamentPlayers.find((p: any) => 
                    p.playerReference.toString() === settingsData.player2Id
                );
                if (!player2) {
                    throw new BadRequestError('Player 2 not found in tournament');
                }

                match.player2 = {
                    playerId: settingsData.player2Id,
                    legsWon: match.player2?.legsWon || 0,
                    legsLost: match.player2?.legsLost || 0,
                    average: match.player2?.average || 0,
                    highestCheckout: match.player2?.highestCheckout || 0,
                    oneEightiesCount: match.player2?.oneEightiesCount || 0,
                };
            }

            // Update scorer if provided
            if (settingsData.scorerId) {
                // Validate scorer exists in tournament
                const scorer = tournament.tournamentPlayers.find((p: any) => 
                    p.playerReference.toString() === settingsData.scorerId
                );
                if (!scorer) {
                    throw new BadRequestError('Scorer not found in tournament');
                }

                match.scorer = settingsData.scorerId;
            }

            // Update board if provided
            if (settingsData.boardNumber) {
                // Validate board exists and is assigned to tournament
                const club = await ClubModel.findById(tournament.clubId);
                if (!club) {
                    throw new BadRequestError('Club not found');
                }

                const board = club.boards.find((b: any) => 
                    b.boardNumber === settingsData.boardNumber && 
                    b.tournamentId === tournament.tournamentId
                );
                if (!board) {
                    throw new BadRequestError('Board not found or not assigned to tournament');
                }

                match.boardReference = settingsData.boardNumber;
            }

            await match.save();

            return {
                success: true,
                match: match
            };

        } catch (error: any) {
            console.error('Update match settings error:', error);
            throw error;
        }
    }
}