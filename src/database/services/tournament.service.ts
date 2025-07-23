import { TournamentModel } from '@/database/models/tournament.model';
import { TournamentDocument } from '@/interface/tournament.interface';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';

export class TournamentService {
    static async createTournament(tournament: Partial<Omit<TournamentDocument, keyof Document>>): Promise<TournamentDocument> {
        await connectMongo();
        const newTournament = new TournamentModel(tournament);
        return await newTournament.save();
    }

    static async getTournament(tournamentId: string): Promise<TournamentDocument> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }
        return tournament;
    }

}