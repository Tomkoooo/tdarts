/**
 * Migration Script: Move boards from Club to Tournament
 * 
 * This script migrates boards from club.boards to tournament.boards
 * for all tournaments that have boards assigned (tournamentId field).
 * 
 * Usage: npx ts-node scripts/migrate-boards-to-tournaments.ts
 */

import mongoose from 'mongoose';
import { ClubModel } from '../src/database/models/club.model';
import { TournamentModel } from '../src/database/models/tournament.model';
import { connectMongo } from '../src/lib/mongoose';

interface ClubBoard {
  boardNumber: number;
  name?: string;
  tournamentId?: string;
  currentMatch?: mongoose.Types.ObjectId;
  nextMatch?: mongoose.Types.ObjectId;
  status: 'idle' | 'waiting' | 'playing';
  isActive: boolean;
}

interface MigrationStats {
  clubsProcessed: number;
  tournamentsUpdated: number;
  boardsMigrated: number;
  errors: Array<{ clubId: string; tournamentId: string; error: string }>;
}

async function migrateBoardsToTournaments() {
  console.log('🚀 Starting board migration from clubs to tournaments...\n');
  
  const stats: MigrationStats = {
    clubsProcessed: 0,
    tournamentsUpdated: 0,
    boardsMigrated: 0,
    errors: []
  };

  try {
    await connectMongo();
    console.log('✅ Connected to MongoDB\n');

    // Get all clubs
    const clubs = await ClubModel.find({});
    console.log(`📊 Found ${clubs.length} clubs to process\n`);

    for (const club of clubs) {
      stats.clubsProcessed++;
      console.log(`\n🏢 Processing club: ${club.name} (${club._id})`);
      
      // Check if club has boards (old schema)
      const clubBoards = (club as any).boards;
      if (!clubBoards || clubBoards.length === 0) {
        console.log(`   ⏭️  No boards found, skipping...`);
        continue;
      }

      console.log(`   📋 Found ${clubBoards.length} boards in club`);

      // Group boards by tournamentId
      const boardsByTournament = new Map<string, ClubBoard[]>();
      
      for (const board of clubBoards) {
        const tournamentId = board.tournamentId;
        if (tournamentId && tournamentId !== '') {
          if (!boardsByTournament.has(tournamentId)) {
            boardsByTournament.set(tournamentId, []);
          }
          boardsByTournament.get(tournamentId)!.push(board);
        }
      }

      console.log(`   🎯 Found boards for ${boardsByTournament.size} tournaments`);

      // Migrate boards to each tournament
      for (const [tournamentId, boards] of boardsByTournament) {
        try {
          console.log(`\n   🏆 Migrating ${boards.length} boards to tournament: ${tournamentId}`);
          
          // Find tournament
          const tournament = await TournamentModel.findOne({ tournamentId: tournamentId });
          
          if (!tournament) {
            console.log(`   ⚠️  Tournament ${tournamentId} not found, skipping...`);
            stats.errors.push({
              clubId: club._id.toString(),
              tournamentId: tournamentId,
              error: 'Tournament not found'
            });
            continue;
          }

          // Check if tournament already has boards
          if (tournament.boards && tournament.boards.length > 0) {
            console.log(`   ℹ️  Tournament ${tournamentId} already has ${tournament.boards.length} boards, skipping...`);
            continue;
          }

          // Migrate boards
          tournament.boards = boards.map((board, index) => ({
            boardNumber: index + 1, // Renumber from 1
            name: board.name || `Tábla ${index + 1}`,
            currentMatch: board.currentMatch || undefined,
            nextMatch: board.nextMatch || undefined,
            status: board.status || 'idle',
            isActive: board.isActive !== undefined ? board.isActive : true
          })) as any;

          // Update boardCount in settings
          tournament.tournamentSettings.boardCount = tournament.boards.length;

          await tournament.save();
          
          stats.tournamentsUpdated++;
          stats.boardsMigrated += boards.length;
          
          console.log(`   ✅ Successfully migrated ${boards.length} boards to tournament ${tournamentId}`);
          console.log(`      Board numbers: ${tournament.boards.map((b: any) => b.boardNumber).join(', ')}`);
          
        } catch (error: any) {
          console.log(`   ❌ Error migrating boards to tournament ${tournamentId}: ${error.message}`);
          stats.errors.push({
            clubId: club._id.toString(),
            tournamentId: tournamentId,
            error: error.message
          });
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Clubs processed:       ${stats.clubsProcessed}`);
    console.log(`Tournaments updated:   ${stats.tournamentsUpdated}`);
    console.log(`Boards migrated:       ${stats.boardsMigrated}`);
    console.log(`Errors:                ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errors.forEach(err => {
        console.log(`   Club: ${err.clubId}, Tournament: ${err.tournamentId}`);
        console.log(`   Error: ${err.error}\n`);
      });
    }
    
    console.log('='.repeat(60));
    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  NOTE: Club.boards field should now be removed from the schema.');
    console.log('   The boards are now stored in tournament.boards.\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration
if (require.main === module) {
  migrateBoardsToTournaments()
    .then(() => {
      console.log('\n✨ Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateBoardsToTournaments;
