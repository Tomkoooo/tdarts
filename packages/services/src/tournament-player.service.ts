import mongoose from 'mongoose';
import { TournamentModel } from '@tdarts/core';
import { PlayerModel } from '@tdarts/core';
import { connectMongo } from '@tdarts/core';
import { BadRequestError } from '@tdarts/core';

export class TournamentPlayerService {
    static async getPlayerStatusInTournamentFast(tournamentId: string, userId: string): Promise<string | undefined> {
        await connectMongo();

        const playerProfile = await PlayerModel.findOne({ userRef: userId }).select('_id').lean();
        if (!playerProfile || !(playerProfile as any)._id) return undefined;

        const playerId = String((playerProfile as any)._id);
        const teamDocs = await PlayerModel.find({
            type: { $in: ['pair', 'team'] },
            members: (playerProfile as any)._id,
        })
            .select('_id')
            .lean();

        const candidateIds = [playerId, ...teamDocs.map((doc: any) => String(doc._id))];

        const tournament = await TournamentModel.findOne({ tournamentId })
            .select('tournamentPlayers.playerReference tournamentPlayers.status waitingList.playerReference')
            .lean();
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        const playerStatus = ((tournament as any).tournamentPlayers || []).find((entry: any) => {
            const ref = entry?.playerReference;
            const id = typeof ref === 'object' ? ref?.toString?.() : String(ref);
            return candidateIds.includes(id);
        });

        if (playerStatus) {
            return playerStatus.status || 'applied';
        }

        const checkWaitList = ((tournament as any).waitingList || []).find((waitEntry: any) => {
            const ref = waitEntry?.playerReference;
            const id = typeof ref === 'object' ? ref?.toString?.() : String(ref);
            return candidateIds.includes(id);
        });
        return checkWaitList ? 'applied' : undefined;
    }

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

            if (!mongoose.isValidObjectId(playerId)) {
                throw new BadRequestError('Invalid player ID');
            }

            // Keep existence validation, but avoid hydrating full player document.
            const playerExists = await PlayerModel.exists({ _id: playerId });
            if (!playerExists) {
                throw new BadRequestError('Player not found');
            }

            const playerObjectId = new mongoose.Types.ObjectId(playerId);

            // Single-write idempotent add:
            // - insert player only if they are not already in tournamentPlayers
            // - avoids separate read-before-write on hot path
            const result = await TournamentModel.updateOne(
                {
                    tournamentId,
                    'tournamentPlayers.playerReference': { $ne: playerObjectId }
                },
                { 
                    $push: { 
                        tournamentPlayers: { 
                            playerReference: playerObjectId, 
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
                // Either tournament is missing OR player already exists in this tournament.
                const tournamentExists = await TournamentModel.exists({ tournamentId });
                if (tournamentExists) {
                    return true;
                }
                throw new BadRequestError('Tournament not found');
            }
            
            return true;
        } catch (err) {
            console.error('addTournamentPlayer error:', err);
            return false;
        }
    }

    static async addTournamentPlayerCheckedIn(tournamentId: string, playerId: string): Promise<boolean> {
        try {
            await connectMongo();

            if (!mongoose.isValidObjectId(playerId)) {
                throw new BadRequestError('Invalid player ID');
            }

            const playerExists = await PlayerModel.exists({ _id: playerId });
            if (!playerExists) {
                throw new BadRequestError('Player not found');
            }

            const playerObjectId = new mongoose.Types.ObjectId(playerId);
            const result = await TournamentModel.updateOne(
                {
                    tournamentId,
                    'tournamentPlayers.playerReference': { $ne: playerObjectId },
                },
                {
                    $push: {
                        tournamentPlayers: {
                            playerReference: playerObjectId,
                            status: 'checked-in',
                            stats: {
                                matchesWon: 0,
                                matchesLost: 0,
                                legsWon: 0,
                                legsLost: 0,
                                avg: 0,
                                oneEightiesCount: 0,
                                highestCheckout: 0,
                            },
                        },
                    },
                    $set: { updatedAt: new Date() },
                }
            );

            if (result.matchedCount === 0) {
                const tournamentExists = await TournamentModel.exists({ tournamentId });
                if (tournamentExists) {
                    return true;
                }
                throw new BadRequestError('Tournament not found');
            }

            return true;
        } catch (err) {
            console.error('addTournamentPlayerCheckedIn error:', err);
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
                    const { TournamentService } = await import('./tournament.service');
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

    static async checkInAllTournamentPlayers(tournamentId: string): Promise<{ checkedInCount: number; failedCount: number }> {
        try {
            await connectMongo();
            const result = await TournamentModel.updateOne(
                { tournamentId },
                {
                    $set: {
                        'tournamentPlayers.$[player].status': 'checked-in',
                        updatedAt: new Date(),
                    },
                },
                {
                    arrayFilters: [{ 'player.status': { $ne: 'checked-in' } }],
                }
            );

            if (result.matchedCount === 0) {
                throw new BadRequestError('Tournament not found');
            }

            return {
                checkedInCount: Number(result.modifiedCount || 0),
                failedCount: 0,
            };
        } catch (err) {
            console.error('checkInAllTournamentPlayers error:', err);
            return { checkedInCount: 0, failedCount: 1 };
        }
    }

}
