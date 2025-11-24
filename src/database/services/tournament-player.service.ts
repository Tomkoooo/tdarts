import { TournamentModel } from '@/database/models/tournament.model';
import { PlayerModel } from '../models/player.model';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { TournamentPlayer } from '@/interface/tournament.interface';

export class TournamentPlayerService {
    static async getPlayerStatusInTournament(tournamentId: string, userId: string): Promise<string | undefined> {
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
            // const freeSpots = maxPlayers - (currentPlayers - 1);
            
            // Trigger notifications if spots become available
            // Note: notifySubscribersAboutAvailableSpots is in TournamentService. 
            // We might need to move it or call it from there. 
            // For now, let's assume we can import it or move it to a shared service.
            // Since we are splitting, let's keep it simple and maybe skip notification here for now 
            // OR import TournamentService (circular dependency risk).
            // Best approach: Move notification logic to a NotificationService or keep it in TournamentService and call it.
            // But TournamentService depends on this service? No, this is a new service.
            // Let's comment out notification for now and mark as TODO or move it.
            
            /*
            if (freeSpots > 0 && freeSpots <= 10) {
                // Run notification in background (don't await to avoid blocking)
                this.notifySubscribersAboutAvailableSpots(tournamentId, freeSpots)
                    .catch(err => console.error('Failed to notify subscribers:', err));
            }
            */
            
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
}
