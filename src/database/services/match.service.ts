import { Match } from "@/types/matchSchema";
import { MatchModel } from "../models/match.model";
import { ClubService } from "./club.service";
import { BadRequestError } from "@/middleware/errorHandle";
import { TournamentService } from "./tournament.service";
import { TournamentModel } from "../models/tournament.model";
import { ClubModel } from "../models/club.model";
import { PlayerModel } from "../models/player.model";

export class MatchService {
    // Get all matches for a board that haven't finished yet
    static async getBoardMatches(tournamentId: string, clubId: string, boardNumber: number): Promise<Match[]> {
        const tournament = await TournamentService.getTournament(tournamentId);
        const startingScore = tournament?.tournamentSettings.startingScore;

        if (!tournament) throw new BadRequestError('Tournament not found');
        
        const matches = await MatchModel.find({
            boardReference: boardNumber,
            tournamentRef: tournament._id,
            status: { $ne: 'finished' }
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

        if (!tournament) throw new BadRequestError('Tournament not found');
        
        const match = await MatchModel.findOne({ _id: matchId, tournamentRef: tournament._id })
            .populate('player1.playerId')
            .populate('player2.playerId')
            .populate('scorer');
            
        if (!match) throw new BadRequestError('Match not found');
        
        return {
            ...match.toObject(),
            startingScore: startingScore,
            startingPlayer: match.startingPlayer || 1, // Ensure startingPlayer is included
            winnerId: match.winnerId || null, // Ensure winnerId is included
        };
    }

    static async startMatch(tournamentId: string, matchId: string, legsToWin: number, startingPlayer: 1 | 2) {
        const match = await MatchModel.findById(matchId);
        if (!match) throw new BadRequestError('Match not found');
        
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

        // Determine winner based on legs won
        const winner = matchData.player1LegsWon > matchData.player2LegsWon ? 1 : 2;

        // Check if match is already finished
        const wasFinished = match.status === 'finished';
        const previousWinner = match.winnerId;

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
}