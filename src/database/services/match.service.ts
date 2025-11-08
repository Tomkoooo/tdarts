import { Match } from "@/interface/match.interface";
import { MatchModel } from "../models/match.model";
import { BadRequestError } from "@/middleware/errorHandle";
import { TournamentService } from "./tournament.service";
import { TournamentModel } from "../models/tournament.model";
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
        winnerArrowCount?: number;
        player1Stats: {
            highestCheckout: number;
            oneEightiesCount: number;
            totalThrows: number;
            totalScore: number;
            totalArrows?: number;
        };
        player2Stats: {
            highestCheckout: number;
            oneEightiesCount: number;
            totalThrows: number;
            totalScore: number;
            totalArrows?: number;
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

        // Update player statistics (only highest checkout and average, 180s will be calculated in finishMatch from throws)
        match.player1.highestCheckout = Math.max(match.player1.highestCheckout || 0, legData.player1Stats.highestCheckout);
        match.player1.average = legData.player1Stats.totalThrows > 0 ? 
            Math.round(legData.player1Stats.totalScore / legData.player1Stats.totalThrows) : 0;

        match.player2.highestCheckout = Math.max(match.player2.highestCheckout || 0, legData.player2Stats.highestCheckout);
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

        // Calculate remaining score for the loser
        const startingScore = 501; // Standard starting score
        const loserRemainingScore = legData.winner === 1 ? 
            startingScore - legData.player2Stats.totalScore : 
            startingScore - legData.player1Stats.totalScore;

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
            checkoutDarts: legCheckoutScore > 0 ? (legData.winnerArrowCount || 3) : undefined,
            winnerArrowCount: legData.winnerArrowCount || 3,
            loserRemainingScore: loserRemainingScore,
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
        winnerArrowCount?: number;
        player1Stats: {
            highestCheckout: number;
            oneEightiesCount: number;
            totalThrows: number;
            totalScore: number;
            totalArrows?: number;
        };
        player2Stats: {
            highestCheckout: number;
            oneEightiesCount: number;
            totalThrows: number;
            totalScore: number;
            totalArrows?: number;
        };
        finalLegData?: {
            player1Throws: number[];
            player2Throws: number[];
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

        // Calculate 180s from all throws in all legs
        let player1TotalOneEighties = 0;
        let player2TotalOneEighties = 0;
        
        // Count 180s from existing legs
        if (match.legs && match.legs.length > 0) {
            for (const leg of match.legs) {
                if (leg.player1Throws) {
                    player1TotalOneEighties += leg.player1Throws.filter((throwData: any) => throwData.score === 180).length;
                }
                if (leg.player2Throws) {
                    player2TotalOneEighties += leg.player2Throws.filter((throwData: any) => throwData.score === 180).length;
                }
            }
        }
        
        // Add 180s from final leg if provided
        if (matchData.finalLegData) {
            if (matchData.finalLegData.player1Throws) {
                player1TotalOneEighties += matchData.finalLegData.player1Throws.filter((score: number) => score === 180).length;
            }
            if (matchData.finalLegData.player2Throws) {
                player2TotalOneEighties += matchData.finalLegData.player2Throws.filter((score: number) => score === 180).length;
            }
        }

        // Update final player statistics (calculate 180s from throws)
        match.player1.highestCheckout = Math.max(match.player1.highestCheckout || 0, matchData.player1Stats.highestCheckout);
        match.player1.oneEightiesCount = player1TotalOneEighties; // Calculate from throws
        match.player1.average = matchData.player1Stats.totalThrows > 0 ? 
            Math.round(matchData.player1Stats.totalScore / matchData.player1Stats.totalThrows) : 0;

        match.player2.highestCheckout = Math.max(match.player2.highestCheckout || 0, matchData.player2Stats.highestCheckout);
        match.player2.oneEightiesCount = player2TotalOneEighties; // Calculate from throws
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
            
            // Calculate remaining score for the loser
            const startingScore = 501; // Standard starting score
            const loserRemainingScore = winner === 1 ? 
                startingScore - matchData.player2Stats.totalScore : 
                startingScore - matchData.player1Stats.totalScore;

            // Create final leg object with throw data if available
            const finalLeg = {
                player1Score: matchData.player1Stats.totalScore,
                player2Score: matchData.player2Stats.totalScore,
                player1Throws: matchData.finalLegData?.player1Throws?.map((score, index) => ({
                    score: score,
                    darts: 3,
                    isDouble: false,
                    isCheckout: index === (matchData.finalLegData?.player1Throws?.length || 0) - 1 && winner === 1
                })) || [],
                player2Throws: matchData.finalLegData?.player2Throws?.map((score, index) => ({
                    score: score,
                    darts: 3,
                    isDouble: false,
                    isCheckout: index === (matchData.finalLegData?.player2Throws?.length || 0) - 1 && winner === 2
                })) || [],
                winnerId: winnerId,
                checkoutScore: legCheckoutScore > 0 ? legCheckoutScore : undefined,
                checkoutDarts: legCheckoutScore > 0 ? (matchData.winnerArrowCount || 3) : undefined,
                winnerArrowCount: matchData.winnerArrowCount || 3,
                loserRemainingScore: loserRemainingScore,
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