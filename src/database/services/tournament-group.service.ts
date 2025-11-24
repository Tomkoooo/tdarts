import { TournamentModel } from '@/database/models/tournament.model';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { MatchModel } from '../models/match.model';
import { AuthorizationService } from './authorization.service';
import { roundRobin } from '@/lib/utils';
import mongoose from 'mongoose';
import { TournamentPlayerDocument } from '@/interface/tournament.interface';

export class TournamentGroupService {
    static async getManualGroupsContext(tournamentCode: string): Promise<{
        boards: Array<{ boardNumber: number; isUsed: boolean }>,
        availablePlayers: Array<{ _id: string; name: string }>
    }> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode })
            .populate('tournamentPlayers.playerReference');
        if (!tournament) {
            throw new BadRequestError('Tournament not found', 'tournament', {
              tournamentCode
            });
        }
        if (!tournament.boards || tournament.boards.length === 0) {
            throw new BadRequestError('No boards found for tournament', 'tournament', {
              tournamentCode
            });
        }
        const tournamentBoards = tournament.boards.filter((board: any) => board.isActive);
        const usedBoardNumbers = new Set(
            (tournament.groups || []).map((g: any) => g.board)
        );
        const boards = tournamentBoards.map((b: any) => ({
            boardNumber: b.boardNumber,
            isUsed: usedBoardNumbers.has(b.boardNumber)
        }));
        // Build available players (_id, name) from checked-in tournament players
        const availablePlayers = (tournament.tournamentPlayers || [])
            .filter((p: any) => p.status === 'checked-in')
            .map((p: any) => {
                const playerRef: any = p.playerReference;
                const idStr = playerRef?._id?.toString?.() ?? playerRef?.toString?.() ?? String(playerRef);
                const nameStr = playerRef?.name ?? '';
                return { _id: idStr, name: nameStr };
            });
        return { boards, availablePlayers };
    }

    static async createManualGroup(tournamentCode: string, requesterId: string, params: {
        boardNumber: number;
        // Player document ids
        playerIds: string[];
    }): Promise<{
        groupId: string;
        matchIds: string[];
    }> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        // Check authorization
        const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
        if (!isAuthorized) {
            throw new BadRequestError('Only club admins or moderators can create manual groups');
        }

        const { boardNumber, playerIds } = params;
        if (!Array.isArray(playerIds) || playerIds.length === 0) {
            throw new BadRequestError('playerIds are required');
        }
        if (playerIds.length < 3) {
             throw new BadRequestError('Players per group must be at least 3');
        }
        // Ensure board belongs to this tournament and is active
        const board = tournament.boards.find((b: any) => b.boardNumber === boardNumber && b.isActive);
        if (!board) {
            throw new BadRequestError('Board not available for this tournament');
        }
        // Ensure no existing group already uses this board
        const boardAlreadyUsed = (tournament.groups || []).some((g: any) => g.board === boardNumber);
        if (boardAlreadyUsed) {
            throw new BadRequestError('This board already has a group');
        }
        // Validate players exist in tournament, checked-in, and not assigned
        const selectedPlayers: TournamentPlayerDocument[] = [];
        
        for (const playerId of playerIds) {
            // Find tournament player by playerReference (player document _id)
            const tp = tournament.tournamentPlayers.find((p: TournamentPlayerDocument) => p.playerReference?.toString() === playerId);
            if (!tp) throw new BadRequestError(`Player ${playerId} not found in tournament`);
            if (tp.status !== 'checked-in') throw new BadRequestError(`Player ${playerId} is not checked-in`);
            // Temporarily disable groupId check
            // if (tp.groupId) throw new BadRequestError(`Player ${playerId} already assigned to a group`);
            selectedPlayers.push(tp);
        }
        
        // Create group
        const newGroupId = new mongoose.Types.ObjectId();
        
        // Update tournament players with group assignment and reset standings/stats
        for (const tp of selectedPlayers) {
            (tp as any).groupId = newGroupId;
            (tp as any).groupOrdinalNumber = selectedPlayers.indexOf(tp);
            (tp as any).groupStanding = null;
            if ((tp as any).stats) {
                (tp as any).stats.matchesWon = 0;
                (tp as any).stats.matchesLost = 0;
                (tp as any).stats.legsWon = 0;
                (tp as any).stats.legsLost = 0;
                (tp as any).stats.avg = 0;
                (tp as any).stats.oneEightiesCount = 0;
                (tp as any).stats.highestCheckout = 0;
            }
        }
        
        const group: { _id: mongoose.Types.ObjectId; board: number; matches: mongoose.Types.ObjectId[] } = {
            _id: newGroupId,
            board: boardNumber,
            matches: []
        };
        // Push group to tournament
        (tournament.groups as any) = [...(tournament.groups || []), group as any];
        // Generate matches with roundRobin
        const rrMatches = roundRobin(playerIds.length);
        if (!rrMatches || rrMatches.length === 0) {
            throw new BadRequestError(`Round-robin generation failed for ${playerIds.length} players.`);
        }
        const createdMatchIds: mongoose.Types.ObjectId[] = [];
        for (const rr of rrMatches) {
            const p1 = selectedPlayers[rr.player1 - 1];
            const p2 = selectedPlayers[rr.player2 - 1];
            const scorer = selectedPlayers[rr.scorer - 1];
            if (!p1 || !p2 || !scorer) continue;
            const matchDoc = await MatchModel.create({
                boardReference: boardNumber,
                tournamentRef: tournament._id,
                type: 'group',
                round: 1,
                player1: { playerId: p1.playerReference, legsWon: 0, legsLost: 0, average: 0 },
                player2: { playerId: p2.playerReference, legsWon: 0, legsLost: 0, average: 0 },
                scorer: scorer.playerReference,
                status: 'pending',
                legs: [],
            });
            createdMatchIds.push(matchDoc._id);
        }
        // Attach matches to the group in tournament
        const groupIndex = (tournament.groups as any[]).findIndex((g: any) => g._id.toString() === newGroupId.toString());
        if (groupIndex !== -1) {
            (tournament.groups as any[])[groupIndex].matches = createdMatchIds as any;
        }
        // Note: Board status update is handled by createManualGroups to avoid overwriting
        // Set status to group-stage
        tournament.tournamentSettings.status = 'group-stage';
        await tournament.save();
        return { groupId: newGroupId.toString(), matchIds: createdMatchIds.map((id) => id.toString()) };
    }

    static async createManualGroups(
        tournamentCode: string,
        requesterId: string,
        groups: Array<{ boardNumber: number; playerIds: string[] }>
    ): Promise<Array<{ boardNumber: number; groupId: string; matchIds: string[] }>> {
        await connectMongo();
        const tournament = await TournamentModel.findOne({ tournamentId: tournamentCode });
        if (!tournament) {
            throw new BadRequestError('Tournament not found');
        }

        // Check authorization
        const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
        if (!isAuthorized) {
            throw new BadRequestError('Only club admins or moderators can create manual groups');
        }

        if (!Array.isArray(groups) || groups.length === 0) {
            throw new BadRequestError('No groups provided');
        }
        
        // Create all groups first without updating board status
        const results: Array<{ boardNumber: number; groupId: string; matchIds: string[] }> = [];
        const boardFirstMatches = new Map<number, string>(); // Track first match for each board
        
        for (const g of groups) {
            const res = await this.createManualGroup(tournamentCode, requesterId, { boardNumber: g.boardNumber, playerIds: g.playerIds });
            results.push({ boardNumber: g.boardNumber, ...res });
            
            // Track the first match for each board
            if (res.matchIds.length > 0) {
                boardFirstMatches.set(g.boardNumber, res.matchIds[0]);
            }
        }
        
        // Update board status only with the first match for each board
        for (const [boardNumber, firstMatchId] of boardFirstMatches) {
            const boardIndex = tournament.boards.findIndex((b: any) => b.boardNumber === boardNumber);
            if (boardIndex !== -1) {
                tournament.boards[boardIndex].status = 'waiting';
                tournament.boards[boardIndex].nextMatch = firstMatchId as any;
                tournament.boards[boardIndex].currentMatch = undefined;
            }
        }
        
        await tournament.save();
        
        return results;
    }

    static async generateGroups(tournamentId: string, requesterId: string): Promise<boolean> {
        try {
            await connectMongo();
            const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
            if (!tournament) {
                throw new BadRequestError('Tournament not found');
            }

            // Check authorization
            const isAuthorized = await AuthorizationService.checkAdminOrModerator(requesterId, tournament.clubId.toString());
            if (!isAuthorized) {
                throw new BadRequestError('Only club admins or moderators can generate groups');
            }
            
            // Get tournament boards
            if (!tournament.boards || tournament.boards.length === 0) {
                throw new BadRequestError('No boards assigned to this tournament');
            }

            const tournamentBoards = tournament.boards.filter((board: any) => board.isActive);
            
            if (tournamentBoards.length === 0) {
                throw new BadRequestError('No active boards available for this tournament');
            }

            const groupCount = tournamentBoards.length;
            const players = tournament.tournamentPlayers.filter(
                (p: any) => p.status === 'checked-in'
            );

            if (!players || players.length === 0) {
                throw new BadRequestError('No players found');
            }
            if (players.length < groupCount * 3) {
                throw new BadRequestError('Not enough players to generate groups');
            }
            // Check if roundRobin can handle the player count per group
            const playersPerGroup = Math.ceil(players.length / tournamentBoards.length);
            if(playersPerGroup < 3){
                throw new BadRequestError(`Invalid players per group: ${playersPerGroup}. Must be at least 3.`);
            }

            // Prepare groups array with matches as ObjectId[] (not empty array)
            const groups: {
                _id: mongoose.Types.ObjectId;
                board: number;
                matches: mongoose.Types.ObjectId[];
            }[] = tournamentBoards.map((board: any) => ({
                _id: new mongoose.Types.ObjectId(),
                board: board.boardNumber,
                matches: []
            }));

            // Assign groups to tournament (replace, don't push)
            tournament.groups = groups as any;

            // Shuffle players
            const randomizedPlayers = [...players].sort(() => Math.random() - 0.5);

            // Distribute players to groups and assign groupOrdinalNumber
            const groupOrdinalCounters: number[] = Array(groupCount).fill(0);

            randomizedPlayers.forEach((player: any, index: number) => {
                const groupIndex = index % groupCount;
                const group = groups[groupIndex];
                player.groupId = group._id;
                player.groupOrdinalNumber = groupOrdinalCounters[groupIndex];
                player.groupStanding = null;
                if (player.stats) {
                    player.stats.matchesWon = 0;
                    player.stats.matchesLost = 0;
                    player.stats.legsWon = 0;
                    player.stats.legsLost = 0;
                    player.stats.avg = 0;
                    player.stats.oneEightiesCount = 0;
                    player.stats.highestCheckout = 0;
                }
                groupOrdinalCounters[groupIndex]++;
            });

            await tournament.save();

            // For each group, generate matches and assign ObjectIds to matches array
            for (const group of groups) {
                // Get players in this group, sorted by groupOrdinalNumber
                const groupPlayers = tournament.tournamentPlayers
                    .filter((p: any) => p.groupId?.toString() === group._id.toString())
                    .sort((a: any, b: any) => a.groupOrdinalNumber - b.groupOrdinalNumber);

                const playerCount = groupPlayers.length;
                console.log(`Group ${group.board}: ${playerCount} players`);
                
                if (playerCount < 3) {
                    console.log(`Skipping group ${group.board}: playerCount ${playerCount} is not supported (need 3+)`);
                    continue;
                }

                const rrMatches = roundRobin(playerCount);
                if (!rrMatches || rrMatches.length === 0) {
                    console.log(`No round robin matches generated for group ${group.board} with ${playerCount} players`);
                    continue;
                }
                
                console.log(`Generated ${rrMatches.length} matches for group ${group.board}`);

                for (const rrMatch of rrMatches) {
                    const player1 = groupPlayers[rrMatch.player1 - 1];
                    const player2 = groupPlayers[rrMatch.player2 - 1];
                    const scorer = groupPlayers[rrMatch.scorer - 1];

                    if (!player1 || !player2 || !scorer) continue;

                    const matchDoc = await MatchModel.create({
                        boardReference: group.board,
                        tournamentRef: tournament._id,
                        type: 'group',
                        round: 1,
                        player1: {
                            playerId: player1.playerReference,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        },
                        player2: {
                            playerId: player2.playerReference,
                            legsWon: 0,
                            legsLost: 0,
                            average: 0,
                        },
                        scorer: scorer.playerReference,
                        status: 'pending',
                        legs: [],
                    });

                    group.matches.push(matchDoc._id);
                }

                // Update the tournament board status to waiting and add the nextMatch as the first match in group
                const boardNumberToUpdate = group.board;
                const nextMatchId = group.matches[0];

                if (nextMatchId) {
                    const boardIndex = tournament.boards.findIndex((b: any) => b.boardNumber === boardNumberToUpdate);
                    if (boardIndex !== -1) {
                        tournament.boards[boardIndex].status = 'waiting';
                        tournament.boards[boardIndex].nextMatch = nextMatchId as any;
                        tournament.boards[boardIndex].currentMatch = undefined;
                    }
                }
               
            }

            // Assign updated groups (with matches) back to tournament
            tournament.groups = groups as any;
            tournament.tournamentSettings.status = 'group-stage';
            await tournament.save();
            return true;
        } catch (err) {
            console.error('generateGroups error:', err);
            return false;
        }
    }
}
