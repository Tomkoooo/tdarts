import { Match } from "@/interface/match.interface";
import { MatchModel } from "../models/match.model";
import { BadRequestError } from "@/middleware/errorHandle";
import { TournamentService } from "./tournament.service";
import { TournamentModel } from "../models/tournament.model";
import { AuthorizationService } from "./authorization.service";
import { connectMongo } from "@/lib/mongoose";
import { eventEmitter, EVENTS } from "@/lib/events";

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

            // Keressük meg a megfelelő board-ot a tournament.boards tömbben
            const boardIndex = tournament.boards.findIndex((b: any) => b.boardNumber === match.boardReference);
            if (boardIndex === -1) throw new BadRequestError('Board not found');

            // Következő pending meccs keresése ugyanerre a táblára és tornára
            const nextMatch = await MatchModel.findOne({
                boardReference: match.boardReference,
                tournamentRef: match.tournamentRef,
                status: 'pending',
                _id: { $ne: matchId } // Ne a jelenlegi meccset adja vissza
            });

            // Frissítjük a board mezőit
            tournament.boards[boardIndex].status = 'playing';
            tournament.boards[boardIndex].currentMatch = matchId as any;
            tournament.boards[boardIndex].nextMatch = nextMatch?._id as any || undefined;

            // Mentsük el a tournament dokumentumot
            await tournament.save();
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
        
        const result = {
            ...populatedMatch.toObject(),
            startingScore: startingScore,
            startingPlayer: populatedMatch.startingPlayer || 1,
            winnerId: populatedMatch.winnerId || null,
        };

        // Emit match update event
        eventEmitter.emit(EVENTS.MATCH_UPDATE, {
            tournamentId,
            matchId,
            match: result,
            type: 'started'
        });
        
        return result;
    }

    static async finishLeg(matchId: string, legData: {
        winner: 1 | 2;
        player1Throws: number[];
        player2Throws: number[];
        winnerArrowCount?: number;
        legNumber?: number;
    }) {
        const match = await MatchModel.findById(matchId);
        if (!match) throw new BadRequestError('Match not found');

        // Idempotency check: if legNumber is provided, check if it already exists
        if (legData.legNumber) {
            const existingLeg = match.legs?.find((l: any) => l.legNumber === legData.legNumber);
            if (existingLeg) {
                console.log(`Leg ${legData.legNumber} already exists for match ${matchId} - skipping duplicate save`);
                return match;
            }
        }

        // Update match player leg counts only
        if (legData.winner === 1) {
            match.player1.legsWon += 1;
            match.player2.legsLost += 1;
        } else {
            match.player2.legsWon += 1;
            match.player1.legsLost += 1;
        }

        // Calculate accurate darts count for this leg
        const checkoutDarts = legData.winnerArrowCount || 3;
        
        // Player 1 total darts for this leg
        const p1TotalDarts = legData.winner === 1
            ? (legData.player1Throws.length - 1) * 3 + checkoutDarts  // Winner: last throw uses actual checkout darts
            : legData.player1Throws.length * 3;  // Loser: all throws are 3 darts
        
        // Player 2 total darts for this leg
        const p2TotalDarts = legData.winner === 2
            ? (legData.player2Throws.length - 1) * 3 + checkoutDarts  // Winner: last throw uses actual checkout darts
            : legData.player2Throws.length * 3;  // Loser: all throws are 3 darts

        // Save leg data to the match's legs array
        const winnerId = legData.winner === 1 ? match.player1.playerId : match.player2.playerId;
        
        // Calculate total scores for this leg
        const player1LegScore = legData.player1Throws.reduce((sum, score) => sum + score, 0);
        const player2LegScore = legData.player2Throws.reduce((sum, score) => sum + score, 0);
        
        // Find the checkout score (winner's last throw)
        const checkoutScore = legData.winner === 1 
            ? legData.player1Throws[legData.player1Throws.length - 1]
            : legData.player2Throws[legData.player2Throws.length - 1];
        
        // Count double attempts (even number throws > 0)
        const player1DoubleAttempts = legData.player1Throws.filter(throwScore => throwScore % 2 === 0 && throwScore > 0).length;
        const player2DoubleAttempts = legData.player2Throws.filter(throwScore => throwScore % 2 === 0 && throwScore > 0).length;
        const totalDoubleAttempts = player1DoubleAttempts + player2DoubleAttempts;

        // Calculate remaining score for the loser
        const startingScore = 501; // Standard starting score
        const loserRemainingScore = legData.winner === 1 ? 
            startingScore - player2LegScore : 
            startingScore - player1LegScore;

        // Create leg object with detailed throw information
        const leg = {
            legNumber: legData.legNumber || (match.legs ? match.legs.length + 1 : 1),
            player1Score: player1LegScore,
            player2Score: player2LegScore,
            player1Throws: legData.player1Throws.map((score, index) => {
                const isLastThrow = index === legData.player1Throws.length - 1;
                return {
                    score: score,
                    darts: (legData.winner === 1 && isLastThrow) ? checkoutDarts : 3,
                    isDouble: false,
                    isCheckout: isLastThrow && legData.winner === 1
                };
            }),
            player2Throws: legData.player2Throws.map((score, index) => {
                const isLastThrow = index === legData.player2Throws.length - 1;
                return {
                    score: score,
                    darts: (legData.winner === 2 && isLastThrow) ? checkoutDarts : 3,
                    isDouble: false,
                    isCheckout: isLastThrow && legData.winner === 2
                };
            }),
            winnerId: winnerId,
            checkoutScore: checkoutScore > 0 ? checkoutScore : undefined,
            checkoutDarts: checkoutScore > 0 ? checkoutDarts : undefined,
            winnerArrowCount: checkoutDarts,
            loserRemainingScore: loserRemainingScore,
            doubleAttempts: totalDoubleAttempts,
            player1TotalDarts: p1TotalDarts,
            player2TotalDarts: p2TotalDarts,
            createdAt: new Date()
        };

        // Add leg to match
        if (!match.legs) {
            match.legs = [];
        }
        match.legs.push(leg);

        // Calculate match-level stats (average, 180s, highest checkout) from ALL legs
        let player1TotalScore = 0;
        let player1TotalDarts = 0;
        let player1OneEighties = 0;
        let player1HighestCheckout = 0;

        let player2TotalScore = 0;
        let player2TotalDarts = 0;
        let player2OneEighties = 0;
        let player2HighestCheckout = 0;

        // Helper function to calculate darts
        const calculateLegDarts = (throws: any[], playerNum: 1 | 2, leg: any): number => {
            if (!throws || throws.length === 0) return 0;
            const storedDarts = playerNum === 1 ? leg.player1TotalDarts : leg.player2TotalDarts;
            if (storedDarts !== undefined && storedDarts !== null) return storedDarts;
            if (throws[0] && typeof throws[0] === 'object' && 'darts' in throws[0]) {
                return throws.reduce((sum: number, t: any) => sum + (t.darts || 3), 0);
            }
            return throws.length * 3;
        };

        // Process all legs including the new one
        const allLegs = [...(match.legs || [])];
        
        for (const leg of allLegs) {
            // Player 1 stats
            if (leg.player1Score) player1TotalScore += leg.player1Score;
            if (leg.player1Throws) {
                player1TotalDarts += calculateLegDarts(leg.player1Throws, 1, leg);
                leg.player1Throws.forEach((t: any) => {
                    if (t.score === 180) player1OneEighties++;
                });
            }
            if (leg.winnerId?.toString() === match.player1.playerId.toString() && leg.checkoutScore) {
                player1HighestCheckout = Math.max(player1HighestCheckout, leg.checkoutScore);
            }

            // Player 2 stats
            if (leg.player2Score) player2TotalScore += leg.player2Score;
            if (leg.player2Throws) {
                player2TotalDarts += calculateLegDarts(leg.player2Throws, 2, leg);
                leg.player2Throws.forEach((t: any) => {
                    if (t.score === 180) player2OneEighties++;
                });
            }
            if (leg.winnerId?.toString() === match.player2.playerId.toString() && leg.checkoutScore) {
                player2HighestCheckout = Math.max(player2HighestCheckout, leg.checkoutScore);
            }
        }

        // Update match stats
        match.player1.highestCheckout = player1HighestCheckout;
        match.player1.oneEightiesCount = player1OneEighties;
        match.player1.average = player1TotalDarts > 0 ? 
            Math.round((player1TotalScore / player1TotalDarts) * 3 * 100) / 100 : 0;

        match.player2.highestCheckout = player2HighestCheckout;
        match.player2.oneEightiesCount = player2OneEighties;
        match.player2.average = player2TotalDarts > 0 ? 
            Math.round((player2TotalScore / player2TotalDarts) * 3 * 100) / 100 : 0;

        await match.save();

        // Update tournament player statistics immediately
        await this.updateTournamentPlayerStats(
            match.tournamentRef.toString(),
            match.player1.playerId.toString(),
            {
                highestCheckout: player1HighestCheckout,
                oneEightiesCount: player1OneEighties,
                average: match.player1.average
            }
        );
        await this.updateTournamentPlayerStats(
            match.tournamentRef.toString(),
            match.player2.playerId.toString(),
            {
                highestCheckout: player2HighestCheckout,
                oneEightiesCount: player2OneEighties,
                average: match.player2.average
            }
        );

        // Emit match update event
        const tournament = await TournamentModel.findById(match.tournamentRef);
        if (tournament) {
            eventEmitter.emit(EVENTS.MATCH_UPDATE, {
                tournamentId: tournament.tournamentId,
                matchId: matchId,
                match: match.toObject(),
                type: 'leg-finished'
            });
        }

        return match;
    }

    static async finishMatch(matchId: string, matchData: {
        player1LegsWon: number;
        player2LegsWon: number;
        allowManualFinish?: boolean; // Allow finishing without legs (for admin manual entry)
    }) {
        const match = await MatchModel.findById(matchId);
        if (!match) throw new BadRequestError('Match not found');

        // Check if this is a bye match (one or both players are null)
        const isByeMatch = !match.player1?.playerId || !match.player2?.playerId || !match.player1 || !match.player2;
        console.log(`Match ${matchId}: isBye=${isByeMatch} player1=${match.player1?.playerId} player2=${match.player2?.playerId} player1=${match.player1} player2=${match.player2}`);
        
        if (isByeMatch) {
            // Handle bye match - automatically set the existing player as winner
            if (!match.player1?.playerId && !match.player2?.playerId && !match.player1 && !match.player2) {
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
        // Validate that legs have been saved (unless manual finish is allowed)
        if (!matchData.allowManualFinish && (!match.legs || match.legs.length === 0)) {
            throw new BadRequestError('Cannot finish match - no legs have been played. Please save legs using finishLeg first.');
        }

        // Determine winner based on legs won
        const newWinner = matchData.player1LegsWon > matchData.player2LegsWon ? 1 : 2;
        const newWinnerId = newWinner === 1 ? match.player1.playerId : match.player2.playerId;

        // Check if this is a winner change for a knockout match
        const isWinnerChange = match.type === 'knockout' && 
                               match.status === 'finished' && 
                               match.winnerId && 
                               match.winnerId.toString() !== newWinnerId.toString();
        
        const oldWinnerId = match.winnerId;

        // Update match status and winner
        match.status = 'finished';
        match.winnerId = newWinnerId;
        match.player1.legsWon = matchData.player1LegsWon;
        match.player2.legsWon = matchData.player2LegsWon;

        // Flag as manual override if explicitly allowed (manual entry) or if changing an already finished match
        if (matchData.allowManualFinish || (match.status === 'finished' && oldWinnerId)) {
            match.manualOverride = true;
            match.overrideTimestamp = new Date();
        }

        // Helper function to calculate darts for backward compatibility
        const calculateLegDarts = (throws: any[], playerNum: 1 | 2, leg: any): number => {
            if (!throws || throws.length === 0) return 0;
            
            // Check if this leg has the new totalDarts field
            const storedDarts = playerNum === 1 ? leg.player1TotalDarts : leg.player2TotalDarts;
            if (storedDarts !== undefined && storedDarts !== null) {
                return storedDarts;
            }
            
            // Fallback calculation for older matches
            // If throw objects have darts field, sum them
            if (throws[0] && typeof throws[0] === 'object' && 'darts' in throws[0]) {
                return throws.reduce((sum: number, t: any) => sum + (t.darts || 3), 0);
            }
            
            // Last fallback: assume all throws are 3 darts
            return throws.length * 3;
        };

        // Calculate match-wide statistics from ALL saved legs
        let player1TotalScore = 0;
        let player1TotalDarts = 0;
        let player1OneEighties = 0;
        let player1HighestCheckout = 0;

        let player2TotalScore = 0;
        let player2TotalDarts = 0;
        let player2OneEighties = 0;
        let player2HighestCheckout = 0;

        // Process all legs to calculate stats
        for (const leg of match.legs) {
            // Player 1 stats from this leg
            if (leg.player1Score) player1TotalScore += leg.player1Score;
            if (leg.player1Throws) {
                // Calculate darts for this leg
                player1TotalDarts += calculateLegDarts(leg.player1Throws, 1, leg);
                
                // Count 180s from throws
                leg.player1Throws.forEach((t: any) => {
                    if (t.score === 180) player1OneEighties++;
                });
            }
            
            // Track highest checkout for player 1
            if (leg.winnerId?.toString() === match.player1.playerId.toString() && leg.checkoutScore) {
                player1HighestCheckout = Math.max(player1HighestCheckout, leg.checkoutScore);
            }

            // Player 2 stats from this leg
            if (leg.player2Score) player2TotalScore += leg.player2Score;
            if (leg.player2Throws) {
                // Calculate darts for this leg
                player2TotalDarts += calculateLegDarts(leg.player2Throws, 2, leg);
                
                // Count 180s from throws
                leg.player2Throws.forEach((t: any) => {
                    if (t.score === 180) player2OneEighties++;
                });
            }
            
            // Track highest checkout for player 2
            if (leg.winnerId?.toString() === match.player2.playerId.toString() && leg.checkoutScore) {
                player2HighestCheckout = Math.max(player2HighestCheckout, leg.checkoutScore);
            }
        }

        // Update aggregated stats on match object
        match.player1.highestCheckout = player1HighestCheckout;
        match.player1.oneEightiesCount = player1OneEighties;
        match.player1.average = player1TotalDarts > 0 ? 
            Math.round((player1TotalScore / player1TotalDarts) * 3 * 100) / 100 : 0;

        match.player2.highestCheckout = player2HighestCheckout;
        match.player2.oneEightiesCount = player2OneEighties;
        match.player2.average = player2TotalDarts > 0 ? 
            Math.round((player2TotalScore / player2TotalDarts) * 3 * 100) / 100 : 0;

        match.status = 'finished';
        await match.save();

        // Update tournament player statistics
        await this.updateTournamentPlayerStats(
            match.tournamentRef.toString(),
            match.player1.playerId.toString(),
            {
                highestCheckout: player1HighestCheckout,
                oneEightiesCount: player1OneEighties,
                average: match.player1.average
            }
        );
        await this.updateTournamentPlayerStats(
            match.tournamentRef.toString(),
            match.player2.playerId.toString(),
            {
                highestCheckout: player2HighestCheckout,
                oneEightiesCount: player2OneEighties,
                average: match.player2.average
            }
        );

        // Update board status for all matches
        if (match.type === 'knockout') {
            // Use the new knockout board status update method
            await TournamentService.updateBoardStatusAfterMatch(matchId);
        } else {
            // Group match - use existing logic
            const tournament = await TournamentModel.findById(match.tournamentRef);
            if (!tournament) throw new BadRequestError('Tournament not found');

            const boardIndex = tournament.boards.findIndex((b: any) => b.boardNumber === match.boardReference);
            if (boardIndex !== -1) {
                // Find next pending match
                const nextMatch = await MatchModel.findOne({
                    boardReference: match.boardReference,
                    tournamentRef: match.tournamentRef,
                    status: 'pending',
                    _id: { $ne: matchId }
                });

                if (nextMatch) {
                    tournament.boards[boardIndex].status = 'waiting';
                    tournament.boards[boardIndex].currentMatch = undefined;
                    tournament.boards[boardIndex].nextMatch = nextMatch._id as any;
                } else {
                    tournament.boards[boardIndex].status = 'idle';
                    tournament.boards[boardIndex].currentMatch = undefined;
                    tournament.boards[boardIndex].nextMatch = undefined;
                }

                await tournament.save();
            }
        }

        // Update group standings if this is a group match
        if (match.type === 'group') {
            const tournament = await TournamentModel.findById(match.tournamentRef);
            if (tournament) {
                await TournamentService.updateGroupStanding(tournament.tournamentId);
                
                // Emit group update event
                eventEmitter.emit(EVENTS.GROUP_UPDATE, {
                    tournamentId: tournament.tournamentId,
                    type: 'standings-updated'
                });
            }
        }

        // Emit match update event
        const tournament = await TournamentModel.findById(match.tournamentRef);
        if (tournament) {
            eventEmitter.emit(EVENTS.MATCH_UPDATE, {
                tournamentId: tournament.tournamentId,
                matchId: matchId,
                match: match.toObject(),
                type: 'finished'
            });

            // Handle knockout match advancement
            if (match.type === 'knockout') {
                // If winner changed, recalculate bracket first
                if (isWinnerChange) {
                    console.log(`Winner changed from ${oldWinnerId} to ${newWinnerId} - recalculating bracket`);
                    try {
                        await TournamentService.recalculateKnockoutBracket(
                            matchId, 
                            oldWinnerId.toString(), 
                            newWinnerId.toString()
                        );
                    } catch (error) {
                        console.error('Bracket recalculation error:', error);
                    }
                } else {
                    // Normal finish - auto-advance winner
                    try {
                        await TournamentService.autoAdvanceKnockoutWinner(matchId);
                    } catch (error) {
                        console.error('Auto-advance error:', error);
                        // Don't throw - match is already finished
                    }
                }
            }
        }

        return match;
    }

    // Update tournament player statistics after match completion
    private static async updateTournamentPlayerStats(
        tournamentId: string,
        playerId: string,
        //eslint-disable-next-line
        matchStats: {
            highestCheckout: number;
            oneEightiesCount: number;
            average: number;
        }
    ) {
        const tournament = await TournamentModel.findById(tournamentId);
        if (!tournament) return;

        // Find the player in tournament players
        const playerIndex = tournament.tournamentPlayers.findIndex(
            (tp: any) => tp.playerReference.toString() === playerId
        );

        if (playerIndex === -1) return;

        // Calculate cumulative stats from all matches
        let totalHighestCheckout = 0;
        let totalOneEighties = 0;
        let totalScore = 0;
        let totalDarts = 0;

        // Get all finished matches for this player in this tournament
        const playerMatches = await MatchModel.find({
            tournamentRef: tournamentId,
            $or: [
                { 'player1.playerId': playerId },
                { 'player2.playerId': playerId }
            ],
            status: 'finished'
        });

        for (const match of playerMatches) {
            const isPlayer1 = match.player1.playerId.toString() === playerId;
            const playerData = isPlayer1 ? match.player1 : match.player2;

            totalHighestCheckout = Math.max(totalHighestCheckout, playerData.highestCheckout || 0);
            totalOneEighties += playerData.oneEightiesCount || 0;

            // Accumulate scores and darts from all legs
            if (match.legs && match.legs.length > 0) {
                for (const leg of match.legs) {
                    if (isPlayer1) {
                        if (leg.player1Score) totalScore += leg.player1Score;
                        // Use stored totalDarts if available, fallback to calculation
                        if ((leg as any).player1TotalDarts) {
                            totalDarts += (leg as any).player1TotalDarts;
                        } else if (leg.player1Throws) {
                            totalDarts += leg.player1Throws.reduce((sum: number, t: any) => sum + (t.darts || 3), 0);
                        }
                    } else {
                        if (leg.player2Score) totalScore += leg.player2Score;
                        // Use stored totalDarts if available, fallback to calculation
                        if ((leg as any).player2TotalDarts) {
                            totalDarts += (leg as any).player2TotalDarts;
                        } else if (leg.player2Throws) {
                            totalDarts += leg.player2Throws.reduce((sum: number, t: any) => sum + (t.darts || 3), 0);
                        }
                    }
                }
            }
        }

        // Calculate overall average
        const overallAverage = totalDarts > 0 
            ? Math.round(((totalScore / totalDarts) * 3) * 100) / 100 
            : 0;

        // Update tournament player stats
        tournament.tournamentPlayers[playerIndex].stats = {
            ...tournament.tournamentPlayers[playerIndex].stats,
            highestCheckout: totalHighestCheckout,
            oneEightiesCount: totalOneEighties,
            avg: overallAverage
        };

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

            // Prevent editing ongoing matches
            if (match.status === 'ongoing') {
                throw new BadRequestError('Cannot edit ongoing matches. Please finish or cancel the match first.');
            }
            
            // Prevent editing finished matches ONLY if it's a normal match (2 players)
            // Bye matches (1 player) can be edited even when finished
            const isByeMatch = !match.player1?.playerId || !match.player2?.playerId;
            if (match.status === 'finished' && !isByeMatch) {
                throw new BadRequestError('Cannot edit finished matches with 2 players.');
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

            // Track if this was a bye match before
            const wasByeMatch = !match.player1?.playerId || !match.player2?.playerId;

            // Update players if provided (including explicit null to clear)
            if ('player1Id' in settingsData) {
                if (settingsData.player1Id === null) {
                    // Clear player1
                    match.player1 = null as any;
                } else if (settingsData.player1Id) {
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
            }

            if ('player2Id' in settingsData) {
                if (settingsData.player2Id === null) {
                    // Clear player2
                    match.player2 = null as any;
                } else if (settingsData.player2Id) {
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
                // Validate board exists in tournament
                const tournamentDoc = await TournamentModel.findById(tournament._id);
                if (!tournamentDoc) {
                    throw new BadRequestError('Tournament not found');
                }

                const board = tournamentDoc.boards.find((b: any) => 
                    b.boardNumber === settingsData.boardNumber && b.isActive
                );
                if (!board) {
                    throw new BadRequestError('Board not found in tournament');
                }

                const oldBoardNumber = match.boardReference;

                // Update board reference in match
                match.boardReference = settingsData.boardNumber;

                // Update tournament.boards status if this match is currently active
                if (match.status === 'ongoing') {
                    // Find the new board in tournament.boards and update currentMatch
                    const boardIndex = tournamentDoc.boards.findIndex((b: any) => 
                        b.boardNumber === settingsData.boardNumber
                    );
                    
                    if (boardIndex !== -1) {
                        tournamentDoc.boards[boardIndex].currentMatch = match._id as any;
                        tournamentDoc.boards[boardIndex].status = 'playing';
                    }
                    
                    // Clear currentMatch from old board if it was different
                    if (oldBoardNumber !== settingsData.boardNumber) {
                        const oldBoardIndex = tournamentDoc.boards.findIndex((b: any) => 
                            b.boardNumber === oldBoardNumber &&
                            b.currentMatch?.toString() === match._id.toString()
                        );
                        
                        if (oldBoardIndex !== -1) {
                            tournamentDoc.boards[oldBoardIndex].currentMatch = undefined;
                            tournamentDoc.boards[oldBoardIndex].status = 'idle';
                        }
                    }
                    
                    await tournamentDoc.save();
                }
            }

            await match.save();

            // Update tournament knockout rounds if this is a knockout match and players were changed
            if (match.type === 'knockout' && ('player1Id' in settingsData || 'player2Id' in settingsData)) {
                await this.updateTournamentKnockoutRounds(tournament._id.toString(), matchId, {
                    player1Id: settingsData.player1Id || null,
                    player2Id: settingsData.player2Id || null
                });
            }

            // Update board status based on bye match status change
            const isNowByeMatch = !match.player1?.playerId || !match.player2?.playerId;
            
            if (wasByeMatch !== isNowByeMatch || settingsData.boardNumber) {
                // Board status needs to be updated
                const tournamentDoc = await TournamentModel.findById(tournament._id);
                if (tournamentDoc) {
                    const currentBoardNumber = match.boardReference;
                    const boardIdx = tournamentDoc.boards.findIndex((b: any) => b.boardNumber === currentBoardNumber);
                    
                    if (boardIdx !== -1) {
                        if (isNowByeMatch) {
                            // Changed to bye match - remove from board if it was the next match
                            if (tournamentDoc.boards[boardIdx].nextMatch?.toString() === matchId) {
                                tournamentDoc.boards[boardIdx].nextMatch = undefined;
                                
                                // Find next non-bye pending match for this board
                                const nextPendingMatch = await MatchModel.findOne({
                                    tournamentRef: tournament._id,
                                    boardReference: currentBoardNumber,
                                    status: 'pending',
                                    'player1.playerId': { $ne: null },
                                    'player2.playerId': { $ne: null },
                                    _id: { $ne: matchId }
                                }).sort({ createdAt: 1 });
                                
                                if (nextPendingMatch) {
                                    tournamentDoc.boards[boardIdx].nextMatch = nextPendingMatch._id as any;
                                    tournamentDoc.boards[boardIdx].status = 'waiting';
                                } else {
                                    tournamentDoc.boards[boardIdx].status = 'idle';
                                }
                            }
                        } else if (wasByeMatch && !isNowByeMatch) {
                            // Changed from bye to normal match - assign to board if it's the earliest
                            if (!tournamentDoc.boards[boardIdx].nextMatch) {
                                tournamentDoc.boards[boardIdx].nextMatch = match._id as any;
                                tournamentDoc.boards[boardIdx].status = 'waiting';
                            } else {
                                // Check if this should be the next match (earliest pending)
                                const earlierMatch = await MatchModel.findOne({
                                    tournamentRef: tournament._id,
                                    boardReference: currentBoardNumber,
                                    status: 'pending',
                                    'player1.playerId': { $ne: null },
                                    'player2.playerId': { $ne: null },
                                    createdAt: { $lt: match.createdAt }
                                }).sort({ createdAt: 1 });
                                
                                if (!earlierMatch) {
                                    // This is the earliest - make it the next match
                                    tournamentDoc.boards[boardIdx].nextMatch = match._id as any;
                                    tournamentDoc.boards[boardIdx].status = 'waiting';
                                }
                            }
                        }
                        
                        await tournamentDoc.save();
                    }
                }
            }

            return {
                success: true,
                match: match
            };

        } catch (error: any) {
            console.error('Update match settings error:', error);
            throw error;
        }
    }

    // Update tournament knockout rounds when match players are changed
    private static async updateTournamentKnockoutRounds(tournamentId: string, matchId: string, playerUpdates: {
        player1Id?: string | null;
        player2Id?: string | null;
    }) {
        try {
            const tournament = await TournamentModel.findById(tournamentId);
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Find the match in knockout rounds and update player references
            let updated = false;
            tournament.knockout = tournament.knockout.map((round: any) => ({
                ...round,
                matches: round.matches.map((knockoutMatch: any) => {
                    if (knockoutMatch.matchReference.toString() === matchId) {
                        updated = true;
                        const updatedMatch: any = { ...knockoutMatch };
                        
                        // Update player1 if provided (including null to clear)
                        if ('player1Id' in playerUpdates) {
                            updatedMatch.player1 = playerUpdates.player1Id;
                        }
                        
                        // Update player2 if provided (including null to clear)
                        if ('player2Id' in playerUpdates) {
                            updatedMatch.player2 = playerUpdates.player2Id;
                        }
                        
                        return updatedMatch;
                    }
                    return knockoutMatch;
                })
            }));

            if (updated) {
                await tournament.save();
                console.log(`Updated knockout rounds for tournament ${tournamentId}, match ${matchId}`);
            }
        } catch (error: any) {
            console.error('Update tournament knockout rounds error:', error);
            throw error;
        }
    }
}