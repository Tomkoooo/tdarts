import { Match } from "@/types/matchSchema";
import { MatchModel } from "../models/match.model";
import { ClubService } from "./club.service";
import { BadRequestError } from "@/middleware/errorHandle";
import { TournamentService } from "./tournament.service";
import { TournamentModel } from "../models/tournament.model";
import { ClubModel } from "../models/club.model";

export class MatchService {
    //give back the match by Id if there is no id give back the next match for the board
    static async getMatch(tournamentId: string, clubId: string, boardNumber: number, matchId?: string): Promise<Match> {
        const tournament = await TournamentService.getTournament(tournamentId);
        const startingScore = tournament?.tournamentSettings.startingScore;

        if (!tournament) throw new BadRequestError('Tournament not found');
        
        if (matchId) {
            // Ha van matchId, akkor azt a meccset kell visszaadni (folyamatban lévő meccs)
            let match = await MatchModel.findOne({ _id: matchId, tournamentRef: tournament._id })
                .populate('player1.playerId')
                .populate('player2.playerId')
                .populate('scorer');
            if (match) {
                return {
                    ...match.toObject(),
                    startingScore: startingScore,
                };
            }
            // Ha nincs ilyen meccs, próbáljuk meg a folyamatban lévő meccset visszaadni
            const board = await ClubService.getBoard(clubId, boardNumber);
            if (board && board.currentMatch && board.status === 'playing') {
                const currentMatch = await MatchModel.findOne({
                    _id: board.currentMatch,
                    tournamentRef: tournament._id
                }).populate('player1.playerId').populate('player2.playerId').populate('scorer');
                if (currentMatch) {
                    return {
                        ...currentMatch.toObject(),
                        startingScore: startingScore,
                    };
                }
            }
            // Ha nincs folyamatban lévő meccs, adjuk vissza az első pending meccset
            const nextMatch = await MatchModel.findOne({
                boardReference: boardNumber,
                tournamentRef: tournament._id,
                status: 'pending'
            }).populate('player1.playerId').populate('player2.playerId').populate('scorer');
            if (nextMatch) {
                return {
                    ...nextMatch.toObject(),
                    startingScore: startingScore,
                };
            }
            throw new BadRequestError('No match found for this board');
        } else {
            // Ha nincs matchId, akkor a következő pending meccset kell visszaadni
            const board = await ClubService.getBoard(clubId, boardNumber);
            if (!board) throw new BadRequestError('Board not found');
            
            // Ha van currentMatch és az ongoing, akkor azt adja vissza
            if (board.currentMatch && board.status === 'playing') {
                const currentMatch = await MatchModel.findOne({ 
                    _id: board.currentMatch, 
                    tournamentRef: tournament._id 
                }).populate('player1.playerId').populate('player2.playerId').populate('scorer');
                if (currentMatch) {
                    return {
                        ...currentMatch.toObject(),
                        startingScore: startingScore,
                    };
                }
            }
            
            // Egyébként a következő pending meccset keresi
            const nextMatch = await MatchModel.findOne({
                boardReference: boardNumber,
                tournamentRef: tournament._id,
                status: 'pending'
            }).populate('player1.playerId').populate('player2.playerId').populate('scorer');
            
            if (!nextMatch) throw new BadRequestError('No pending match found for this board');
            return {
                ...nextMatch.toObject(),
                startingScore: startingScore,
            };
        }
    }

    static async startMatch(matchId: string, legsToWin: number, startingPlayer: 1 | 2) {
        const match = await MatchModel.findById(matchId);
        if (!match) throw new BadRequestError('Match not found');
        
        // Meccs beállítások mentése
        match.legsToWin = legsToWin;
        match.startingPlayer = startingPlayer;
        match.status = 'ongoing';
        await match.save();
        
        // Tábla állapot frissítése
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
        
        return match;
    }
}