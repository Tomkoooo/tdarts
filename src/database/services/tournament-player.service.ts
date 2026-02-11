import { TournamentModel } from '@/database/models/tournament.model';
import { PlayerModel } from '../models/player.model';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';

export class TournamentPlayerService {
    static async getPlayerStatusInTournament(tournamentId: string, userId: string): Promise<string | undefined> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentId })
            .populate({
                path: 'tournamentPlayers.playerReference',
                populate: { path: 'members' }
            })
            .populate({
                path: 'waitingList.playerReference',
                populate: { path: 'members' }
            });

        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        const playerProfile = await PlayerModel.findOne({ userRef: userId });
        if (!playerProfile) return undefined;

        // Check if in main player list
        const playerStatus = tournament.tournamentPlayers.find(
            (p: any) => {
                const pr = p.playerReference;
                if (!pr) return false;
                
                // Direct match (individual)
                if (pr._id?.toString() === playerProfile._id.toString()) return true;
                
                // Team member check
                if (pr.type === 'pair' || pr.type === 'team') {
                    return pr.members?.some((m: any) => 
                        (m._id?.toString() || m.toString()) === playerProfile._id.toString()
                    );
                }
                return false;
            }
        );

        if (playerStatus) return playerStatus.status;

        // Check if on waiting list
        const waitingStatus = tournament.waitingList.find(
            (p: any) => {
                const pr = p.playerReference;
                if (!pr) return false;
                
                // Direct match (individual)
                if (pr._id?.toString() === playerProfile._id.toString()) return true;
                
                // Team member check
                if (pr.type === 'pair' || pr.type === 'team') {
                    return pr.members?.some((m: any) => 
                        (m._id?.toString() || m.toString()) === playerProfile._id.toString()
                    );
                }
                return false;
            }
        );

        return waitingStatus ? 'applied' : undefined;
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
            
            // Re-fetch tournament to get accurate player count
            const updatedTournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (updatedTournament) {
                const maxPlayers = updatedTournament.tournamentSettings.maxPlayers;
                const currentPlayers = updatedTournament.tournamentPlayers.length;
                const freeSpots = Math.max(0, maxPlayers - currentPlayers);
                
                if (freeSpots > 0 && freeSpots <= 10) {
                    // Trigger notifications if spots become available
                    // Use dynamic import to avoid circular dependencies
                    const { TournamentService } = await import('@/database/services/tournament.service');
                    TournamentService.notifySubscribersAboutAvailableSpots(tournamentId, freeSpots)
                        .catch(err => console.error('Failed to notify subscribers:', err));
                }
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
}
