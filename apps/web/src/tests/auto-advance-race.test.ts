
import { connectMongo } from '@/lib/mongoose';
import { MatchModel } from '@/database/models/match.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { TournamentService } from '@/database/services/tournament.service';
import mongoose from 'mongoose';

describe('TournamentService Race Condition', () => {
    beforeAll(async () => {
        await connectMongo();
    });

    afterAll(async () => {
        // Clean up
        await mongoose.connection.close();
    });

    it('should handle concurrent autoAdvanceKnockoutWinner correctly', async () => {
        // 1. Setup Data
        const tournamentId = 'RACE_TEST_' + Math.floor(Math.random() * 10000);
        const p1 = new mongoose.Types.ObjectId();
        const p2 = new mongoose.Types.ObjectId();
        const p3 = new mongoose.Types.ObjectId(); // Winner 1
        const p4 = new mongoose.Types.ObjectId(); // Winner 2

        const tournament = await TournamentModel.create({
            tournamentId: tournamentId,
            name: 'Race Condition Test',
            type: 'knockout',
            tournamentSettings: {
                knockoutMethod: 'automatic',
                format: 'knockout',
                name: 'Race Condition Test',
                maxPlayers: 16,
                tournamentPassword: 'pass'
            },
            clubId: new mongoose.Types.ObjectId(),
            startDate: new Date(),
            creatorId: new mongoose.Types.ObjectId(),
        });

        // Target match (Round 2, Pos 0)
        const nextMatch = await MatchModel.create({
            tournamentRef: tournament._id,
            type: 'knockout',
            round: 2,
            bracketPosition: 0,
            status: 'pending',
            boardReference: 1
        });

        // Source Match 1 (Round 1, Pos 0) -> Winner p3
        const match1 = await MatchModel.create({
            tournamentRef: tournament._id,
            type: 'knockout',
            round: 1,
            bracketPosition: 0,
            status: 'finished',
            player1: { playerId: p1, legsWon: 0 },
            player2: { playerId: p3, legsWon: 3 },
            winnerId: p3,
            boardReference: 1
        });

        // Source Match 2 (Round 1, Pos 1) -> Winner p4
        const match2 = await MatchModel.create({
            tournamentRef: tournament._id,
            type: 'knockout',
            round: 1,
            bracketPosition: 1,
            status: 'finished',
            player1: { playerId: p4, legsWon: 3 },
            player2: { playerId: p2, legsWon: 0 },
            winnerId: p4,
            boardReference: 1
        });

        // Update tournament knockout structure to include these matches
        // This is needed because autoAdvance checks the tournament structure
        tournament.knockout = [
            { 
                round: 1, 
                matches: [
                    { matchReference: match1._id, player1: p1, player2: p3 }, 
                    { matchReference: match2._id, player1: p4, player2: p2 }
                ] 
            },
            { 
                round: 2, 
                matches: [
                    { matchReference: nextMatch._id, player1: null, player2: null }
                ] 
            }
        ];
        await tournament.save();

        // 2. Trigger Concurrent Execution
        console.log('Starting concurrent autoAdvance...');
        await Promise.all([
            TournamentService.autoAdvanceKnockoutWinner(match1._id.toString()),
            TournamentService.autoAdvanceKnockoutWinner(match2._id.toString())
        ]);

        // 3. Verify Result
        const finalNextMatch = await MatchModel.findById(nextMatch._id);
        
        const p1Id = finalNextMatch?.player1?.playerId?.toString();
        const p2Id = finalNextMatch?.player2?.playerId?.toString();
        
        console.log('Final Next Match Players:', { p1Id, p2Id });

        const hasP3 = p1Id === p3.toString() || p2Id === p3.toString();
        const hasP4 = p1Id === p4.toString() || p2Id === p4.toString();

        // One of them should be there
        expect(hasP3 || hasP4).toBe(true);
        
        // BOTH should be there if race condition is fixed
        // Without fix, this expectation might fail intermittently (or consistently if we are "lucky")
        if (!hasP3 || !hasP4) {
             console.log('Race condition reproduced: Missing a player!');
        }

        expect(hasP3).toBe(true);
        expect(hasP4).toBe(true);
    });
});
