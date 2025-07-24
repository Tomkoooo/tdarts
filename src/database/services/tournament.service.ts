import { TournamentModel } from '@/database/models/tournament.model';
import { TournamentDocument } from '@/interface/tournament.interface';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { PlayerModel } from '../models/player.model';
import { TournamentPlayerDocument } from '@/interface/tournament.interface';

export class TournamentService {
    static async createTournament(tournament: Partial<Omit<TournamentDocument, keyof Document>>): Promise<TournamentDocument> {
        await connectMongo();
        const newTournament = new TournamentModel(tournament);
        return await newTournament.save();
    }

    static async getTournament(tournamentId: string): Promise<TournamentDocument> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentId }).populate('clubId').populate('tournamentPlayers.playerReference');
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }
        return tournament;
    }

    static async getPlayerStatusInTournament(tournamentId: string, userId: string): Promise<string> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }
        const player = await PlayerModel.findOne({ userRef: userId });
        const playerStatus = tournament.tournamentPlayers.find(
            (p: TournamentPlayerDocument) => {
                return p.playerReference?.toString() === player?._id?.toString()
            }
        );
        return playerStatus?.status;
    }

    //method to add, remove and update tournament players status, the rquest takes the player._id form the player collection
    static async addTournamentPlayer(tournamentId: string, playerId: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }
            const player = await PlayerModel.findOne({ _id: playerId });
            if (!player) {
                throw new BadRequestError('Player not found');
            }
            tournament.tournamentPlayers = [...tournament.tournamentPlayers, { playerReference: player._id, status: 'applied' }];
            await tournament.save();
            return true;
        } catch (err) {
            console.error('addTournamentPlayer error:', err);
            return false;
        }
    }

    static async removeTournamentPlayer(tournamentId: string, playerId: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }
            tournament.tournamentPlayers = tournament.tournamentPlayers.filter((player: any) => player.playerReference.toString() !== playerId);
            await tournament.save();
            return true;
        } catch (err) {
            console.error('removeTournamentPlayer error:', err);
            return false;
        }
    }

    static async updateTournamentPlayerStatus(tournamentId: string, playerId: string, status: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            tournament.tournamentPlayers = tournament.tournamentPlayers.map((player: TournamentPlayerDocument) => player.playerReference.toString() === playerId ? { ...player, status: status } : player);
            await tournament.save();
            return true;
        } catch (err) {
            console.error('updateTournamentPlayerStatus error:', err);
            return false;
        }
    }
}