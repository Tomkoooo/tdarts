import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserModel } from '@/database/models/user.model';
import { ClubModel } from '@/database/models/club.model';
import { PlayerModel } from '@/database/models/player.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { MatchModel } from '@/database/models/match.model';
import { LeagueModel } from '@/database/models/league.model';
import { TournamentService } from '@/database/services/tournament.service';
import { MatchService } from '@/database/services/match.service';
import { LeagueService } from '@/database/services/league.service';
import { connectMongo } from '@/lib/mongoose';
import bcrypt from 'bcryptjs';

// Simple Tournament Configuration - EASILY CONFIGURABLE
const SIMPLE_CONFIG = {
  playerCount: 24, // 8 players - MODIFY THIS
  boardCount: 4, // 2 boards - MODIFY THIS
  legsToWin: 2,
  delayBetweenRequests: 100,
  delayBetweenSteps: 500,
};

// Helper functions
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Test data storage
let testUser: any;
let testClub: any;

// Setup helper - creates user, club, and player for tests
const setupTestData = async () => {
  await connectMongo();
  
  // Create test user
  const hashedPassword = await bcrypt.hash('testuser123', 10);
  testUser = await UserModel.create({
    email: 'lifecycle-test@test.com',
    password: hashedPassword,
    username: 'lifecycle_test',
    name: 'Lifecycle Test User',
    isVerified: true,
    isAdmin: false
  });

  // Create test club
  testClub = await ClubModel.create({
    name: 'Test Club for Lifecycle',
    description: 'Automated test club',
    location: 'Test Location',
    admin: [testUser._id],
    moderators: [],
    members: [],
    tournamentPlayers: [],
    isActive: true
  });

  await PlayerModel.create({
    name: testUser.name,
    userRef: testUser._id,
    isRegistered: true
  });

  console.log('✅ Test data setup complete');
  return true;
};

// Generate realistic throw scores for leg simulation
const generateThrows = () => {
  const throwScores = [];
  const throwCount = Math.floor(Math.random() * 15) + 9; // 9-24 throws
  
  for (let i = 0; i < throwCount; i++) {
    throwScores.push(Math.floor(Math.random() * 60) + 1);
  }
  
  return throwScores;
};

const calculateKnockoutPlayersCount = (totalPlayers: number): number => {
  // Calculate the nearest power of 2
  let playersCount = 1;
  while (playersCount * 2 <= totalPlayers) {
    playersCount *= 2;
  }
  
  // Ensure we have at least 4 players for knockout
  if (playersCount < 4) {
    playersCount = 4;
  }
  
  // Ensure we don't exceed total players
  if (playersCount > totalPlayers) {
    playersCount = Math.floor(totalPlayers / 2) * 2; // Round down to even number
    if (playersCount < 4) playersCount = 4;
  }
  
  return playersCount;
};

const logStep = async (step: string, message: string) => {
  console.log(`\n${step} ${message}`);
  await sleep(100); // Small delay to ensure console output is processed
};

const logSuccess = async (message: string) => {
  console.log(`✅ ${message}`);
  await sleep(100);
};

const logError = async (message: string, error?: any) => {
  console.error(`❌ ${message}`, error?.response?.data || error?.message || error);
  await sleep(100);
};

// Point calculation helpers for league testing
interface TournamentResults {
  players: Array<{
    playerId: string;
    playerName: string;
    groupStanding: number;
    knockoutRound: number; // 0 = didn't qualify, 1+ = round number
    finalPlacement: number;
    isWinner: boolean;
  }>;
}

function collectTournamentResults(tournament: any): TournamentResults {
  const players: TournamentResults['players'] = [];
  
  for (const tp of tournament.tournamentPlayers) {
    const playerId = tp.playerReference._id?.toString() || tp.playerReference.toString();
    const playerName = tp.playerReference.name || 'Unknown';
    
    players.push({
      playerId,
      playerName,
      groupStanding: tp.groupStanding || 0,
      knockoutRound: tp.knockoutRound || 0,
      finalPlacement: tp.finalPlacement || 99,
      isWinner: tp.finalPlacement === 1
    });
  }
  
  return { players };
}

function calculateExpectedPlatformPoints(results: TournamentResults): Map<string, number> {
  const pointsMap = new Map<string, number>();
  
  const pointsTable: { [key: number]: number } = {
    1: 100,
    2: 70,
    3: 50,
    4: 50,
    5: 30,
    6: 30,
    7: 30,
    8: 30
  };
  
  for (const player of results.players) {
    const points = pointsTable[player.finalPlacement] || 5;
    pointsMap.set(player.playerId, points);
  }
  
  return pointsMap;
}

function calculateExpectedRemizPoints(results: TournamentResults): Map<string, number> {
  const pointsMap = new Map<string, number>();
  
  for (const player of results.players) {
    let points = 0;
    
    // Group points (1st: 10, 2nd: 8, 3rd: 6, 4th: 4, 5th: 2)
    const groupPoints = [10, 8, 6, 4, 2];
    if (player.groupStanding > 0 && player.groupStanding <= 5) {
      points += groupPoints[player.groupStanding - 1];
    }
    
    // Knockout points
    if (player.knockoutRound === 1) points += 5;  // Quarter-finals
    else if (player.knockoutRound === 2) points += 10; // Semi-finals
    else if (player.knockoutRound === 3) points += 15; // Finals
    
    // Winner bonus
    if (player.isWinner) points += 50;
    
    pointsMap.set(player.playerId, points);
  }
  
  return pointsMap;
}


// Simple Tournament Lifecycle Test
describe('Simple Tournament Lifecycle Test', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // Disconnect any existing connection first
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  test('Complete Simple Tournament Lifecycle', async () => {
    jest.setTimeout(300000); // 5 minutes
    
    await logStep('🚀', `Starting simple tournament lifecycle test with ${SIMPLE_CONFIG.playerCount} players on ${SIMPLE_CONFIG.boardCount} boards...`);

    // Step 0: Setup test data
    await logStep('🔐', 'Step 0: Setting up test data...');
    const setupSuccess = await setupTestData();
    if (!setupSuccess) {
      throw new Error('Test data setup failed - cannot proceed with test');
    }

    // Step 1: Create Tournament using service
    await logStep('📝', 'Step 1: Creating tournament with boards...');
    
    // Create boards directly for the tournament
    const tournamentBoards = Array.from({ length: SIMPLE_CONFIG.boardCount }, (_, i) => ({
      boardNumber: i + 1,
      name: `Tábla ${i + 1}`,
      isActive: true,
      status: 'idle' as const
    }));
    
    let tournament: any;
    let tournamentId: string;
    try {
      tournament = await TournamentService.createTournament({
        clubId: testClub._id,
        tournamentPlayers: [],
        groups: [],
        knockout: [],
        boards: tournamentBoards,
        tournamentSettings: {
          status: 'pending',
          name: `Simple Test Tournament - ${Date.now()}`,
          description: `Automated simple test tournament with ${SIMPLE_CONFIG.playerCount} players`,
          startDate: new Date(),
          maxPlayers: SIMPLE_CONFIG.playerCount,
          format: 'group_knockout',
          startingScore: 501,
          boardCount: SIMPLE_CONFIG.boardCount,
          entryFee: 1000,
          tournamentPassword: 'test123',
          location: 'Test Location',
          type: 'amateur',
          registrationDeadline: new Date(Date.now() + 60 * 60 * 1000)
        },
        isSandbox: true,
        verified: false,
        isActive: true
      });
      
      tournamentId = tournament._id.toString();
      await logSuccess(`Tournament created: ${tournament.tournamentId}`);
    } catch (error) {
      await logError('Failed to create tournament', error);
      throw error;
    }

    // Step 2: Add Players using service
    await logStep('👥', `Step 2: Adding ${SIMPLE_CONFIG.playerCount} players...`);
    
    const testPlayers = Array.from({ length: SIMPLE_CONFIG.playerCount }, (_, i) => ({
      name: `Simple Player ${i + 1}`,
    }));
    
    try {
      for (const playerData of testPlayers) {
        // Create player
        const player = await PlayerModel.create({
          name: playerData.name,
          isRegistered: false // Guest player
        });
        
        // Add player to tournament
        await TournamentService.addTournamentPlayer(
          tournament.tournamentId,
          player._id.toString()
        );
      }
      
      await logSuccess(`Added ${testPlayers.length} players`);
    } catch (error) {
      await logError('Failed to add players', error);
      throw error;
    }

    // Step 3: Check-in Players using service
    await logStep('✅', 'Step 3: Checking-in all players...');
    
    try {
      tournament = await TournamentModel.findById(tournamentId);
      const players = tournament.tournamentPlayers || [];

      for (const player of players) {
        const playerId = player.playerReference._id || player.playerReference;
        await TournamentService.updateTournamentPlayerStatus(
          tournament.tournamentId,
          playerId.toString(),
          'checked-in'
        );
      }

      await logSuccess(`Checked-in ${players.length} players`);
    } catch (error) {
      await logError('Failed to check-in players', error);
      throw error;
    }

    // Step 4: Generate Groups using service
    await logStep('🏆', 'Step 4: Generating groups...');
    
    try {
      await TournamentService.generateGroups(tournament.tournamentId, testUser._id.toString());
      await logSuccess('Groups generated');
    } catch (error) {
      await logError('Failed to generate groups', error);
      throw error;
    }

    // Step 5: Play Group Matches using MatchService
    await logStep('🎯', 'Step 5: Playing group matches...');
    
    try {
      // Reload tournament with populated groups
      tournament = await TournamentModel.findById(tournamentId).populate('groups.matches');
      expect(tournament.groups).toBeDefined();
      expect(tournament.groups.length).toBeGreaterThan(0);

      // Collect all group matches
      const allGroupMatches: any[] = [];
      for (const group of tournament.groups) {
        if (group.matches && group.matches.length > 0) {
          allGroupMatches.push(...group.matches);
        }
      }

      await logSuccess(`Found ${allGroupMatches.length} group matches`);

      // Play each match using service
      for (const match of allGroupMatches) {
        const matchId = match._id.toString();
        const matchDoc = await MatchModel.findById(matchId).populate('player1.playerId player2.playerId');
        
        if (!matchDoc) continue;
        
        const player1Name = matchDoc.player1?.playerId?.name || 'Unknown';
        const player2Name = matchDoc.player2?.playerId?.name || 'Unknown';
        await logStep('🎮', `Playing match: ${player1Name} vs ${player2Name}`);
        
        try {
          // Start match
          await MatchService.startMatch(
            tournament.tournamentId,
            matchId.toString(),
            SIMPLE_CONFIG.legsToWin,
            1 // startingPlayer
          );

          // Play legs until match is won
          let currentMatch = await MatchModel.findById(matchId);
          let legNumber = 1;
          
          while (
            currentMatch && 
            currentMatch.player1LegsWon < SIMPLE_CONFIG.legsToWin &&
            currentMatch.player2LegsWon < SIMPLE_CONFIG.legsToWin
          ) {
            // Randomly determine leg winner
            const winner = Math.random() > 0.5 ? 1 : 2;
            
            // Finish the leg
            await MatchService.finishLeg(matchId, {
              winner,
              player1Throws: generateThrows(),
              player2Throws: generateThrows(),
              winnerArrowCount: Math.floor(Math.random() * 15) + 9,
              legNumber
            });
            
            // Reload match to check scores
            currentMatch = await MatchModel.findById(matchId);
            legNumber++;
          }

          // Finish the match with legs won
          await MatchService.finishMatch(matchId, {
            player1LegsWon: currentMatch.player1LegsWon,
            player2LegsWon: currentMatch.player2LegsWon
          });

          await sleep(SIMPLE_CONFIG.delayBetweenRequests);
        } catch (error) {
          await logError(`Failed to play match ${matchId}`, error);
        }
      }

      await logSuccess('All group matches completed');
    } catch (error) {
      await logError('Failed to process group matches', error);
      throw error;
    }

    // NEW: Update group standings before generating knockout
    await logStep('📊', 'Updating group standings...');
    await TournamentService.updateGroupStanding(tournament.tournamentId);
    await logSuccess('Group standings updated successfully');

    // Step 6: Generate Knockout using service
    await logStep('🥊', 'Step 6: Generating knockout stage...');
    
    try {
      tournament = await TournamentModel.findById(tournamentId);
      const totalPlayers = tournament.tournamentPlayers.filter((p: any) => p.status === 'checked-in').length;
      const playersCount = calculateKnockoutPlayersCount(totalPlayers);
      
      await logSuccess(`Calculated playersCount: ${playersCount} (from ${totalPlayers} total players)`);
      
      await TournamentService.generateKnockout(
        tournament.tournamentId,
        testUser._id.toString(),
        {
          playersCount: playersCount
        }
      );
      
      await logSuccess('Knockout stage generated');
      
      // Validate knockout bracket structure
      await logStep('🔍', 'Validating knockout bracket structure...');
      tournament = await TournamentModel.findById(tournamentId);
      
      const groupCount = tournament.groups?.length || 0;
      if (groupCount > 0) {
        await logSuccess(`Found ${groupCount} groups - knockout bracket validated`);
      }
      
      if (tournament.knockout && tournament.knockout.length > 0) {
        const firstRound = tournament.knockout.find((r: any) => r.round === 1);
        if (firstRound && firstRound.matches) {
          await logSuccess(`Found ${firstRound.matches.length} matches in first round`);
        }
      }
    } catch (error) {
      await logError('Failed to generate knockout', error);
      throw error;
    }

    // Step 7: Play Knockout Matches using modern automatic bracket
    await logStep('🎯', 'Step 7: Playing knockout matches...');
    
    try {
      // Modern knockout system: bracket is fully generated upfront
      // Just play through all matches in all rounds
      tournament = await TournamentModel.findById(tournamentId);
      
      if (!tournament.knockout || tournament.knockout.length === 0) {
        await logSuccess('No knockout stage (groups-only tournament)');
      } else {
        // Play all knockout rounds
        for (const roundData of tournament.knockout) {
          await logStep('🎯', `Playing knockout round ${roundData.round}...`);
          
          const matches = roundData.matches || [];
          await logSuccess(`Found ${matches.length} matches in round ${roundData.round}`);
          
          // Play each match in this round
          for (let matchIndex = 0; matchIndex < matches.length; matchIndex++) {
            const knockoutMatch = matches[matchIndex];
            const matchId = knockoutMatch.matchReference;
            
            // Use direct MatchModel to stay synced with DB
            const matchDoc = await MatchModel.findById(matchId);
            if (!matchDoc) continue;
            
            // Skip finished matches or byes
            if (matchDoc.status === 'finished' || !matchDoc.player1?.playerId || !matchDoc.player2?.playerId) {
              await logSuccess(`Skipping completed or bye match ${matchId}`);
              continue;
            }

            const player1Name = matchDoc.player1?.playerId?.name || 'Unknown';
            const player2Name = matchDoc.player2?.playerId?.name || 'Unknown';
            await logStep('🎮', `Playing round ${roundData.round}: ${player1Name} vs ${player2Name}`);
            
            try {
              // Start match
              await MatchService.startMatch(
                tournament.tournamentId,
                matchId.toString(),
                SIMPLE_CONFIG.legsToWin,
                1
              );

              // Play legs until match is won
              let currentMatch = await MatchModel.findById(matchId);
              let legNumber = 1;
              
              while (
                currentMatch && 
                currentMatch.player1LegsWon < SIMPLE_CONFIG.legsToWin &&
                currentMatch.player2LegsWon < SIMPLE_CONFIG.legsToWin
              ) {
                const winner = Math.random() > 0.5 ? 1 : 2;
                
                await MatchService.finishLeg(matchId.toString(), {
                  winner,
                  player1Throws: generateThrows(),
                  player2Throws: generateThrows(),
                  winnerArrowCount: Math.floor(Math.random() * 15) + 9,
                  legNumber
                });
                
                currentMatch = await MatchModel.findById(matchId);
                legNumber++;
              }

              // Finish the match
              await MatchService.finishMatch(matchId.toString(), {
                player1LegsWon: currentMatch.player1LegsWon,
                player2LegsWon: currentMatch.player2LegsWon
              });

              await sleep(SIMPLE_CONFIG.delayBetweenRequests);
            } catch (error) {
              await logError(`Failed to play knockout match ${matchId}`, error);
            }
          }
          
          await logSuccess(`Completed knockout round ${roundData.round}`);
        }
        
        await logSuccess('All knockout matches completed');
      }
    } catch (error) {
      await logError('Failed to process knockout matches', error);
      throw error;
    }

    // Step 8: Finish Tournament using service
    await logStep('🏁', 'Step 8: Finishing tournament...');
    
    try {
      await TournamentService.finishTournament(
        tournament.tournamentId,
        testUser._id.toString()
      );
      await logSuccess('Tournament finished');
    } catch (error) {
      await logError('Failed to finish tournament', error);
      throw error;
    }

    // Step 9: Verify Final Tournament State
    await logStep('📊', 'Step 9: Verifying final tournament state...');
    
    try {
      const finalTournament = await TournamentModel.findById(tournamentId);
      expect(finalTournament.tournamentSettings.status).toBe('finished');
      expect(finalTournament.tournamentPlayers.length).toBe(SIMPLE_CONFIG.playerCount);

      await logSuccess('Simple tournament lifecycle test completed successfully!');
      console.log(`\n📈 Final tournament status: ${finalTournament.tournamentSettings.status}`);
      console.log(`👥 Total players: ${finalTournament.tournamentPlayers.length}`);
      console.log(`🎯 Tournament ID: ${tournamentId}`);
      console.log(`🎯 Group matches played: ${finalTournament.groups?.reduce((acc: number, group: any) => acc + (group.matches?.length || 0), 0) || 0}`);
      console.log(`🥊 Knockout matches played: ${finalTournament.knockout?.reduce((acc: number, round: any) => acc + (round.matches?.length || 0), 0) || 0}`);
    } catch (error) {
      await logError('Failed to verify final tournament state', error);
      throw error;
    }

    // Step 10: Test Platform League Points
    await logStep('🏆', 'Step 10: Testing platform league points...');
    
    let platformLeagueId: string;
    try {
      // Reload tournament and collect results for backtracking
      const tournamentForPlatform = await TournamentModel.findById(tournamentId);
      const tournamentResults = collectTournamentResults(tournamentForPlatform);
      
      // Create platform league
      const platformLeague = await LeagueService.createLeague(
        testClub._id.toString(),
        testUser._id.toString(),
        {
          name: `Test Platform League - ${Date.now()}`,
          description: 'Testing platform point system',
          pointSystemType: 'platform'
        }
      );
      platformLeagueId = platformLeague._id.toString();
      
      await logSuccess(`Platform league created: ${platformLeague.name}`);
      
      // Attach tournament to league and trigger point calculation
      await TournamentModel.findByIdAndUpdate(tournamentId, {
        league: platformLeague._id
      });
      
      // Reopen and reclose to trigger point calculation
      await TournamentService.reopenTournament(tournament.tournamentId, testUser._id.toString());
      await TournamentService.finishTournament(tournament.tournamentId, testUser._id.toString());
      
      await logSuccess('Tournament reopened and reclosed - platform points calculated');
      
      // Verify points
      const updatedPlatformLeague = await LeagueModel.findById(platformLeagueId);
      const actualPlatformStandings = updatedPlatformLeague.players.map((p: any) => ({
        playerId: p.player.toString(),
        points: p.points
      }));
      
      const expectedPlatformPoints = calculateExpectedPlatformPoints(tournamentResults);
      
      // Compare expected vs actual
      let platformPointsMatch = true;
      for (const standing of actualPlatformStandings) {
        const expected = expectedPlatformPoints.get(standing.playerId);
        if (expected !== undefined && standing.points !== expected) {
          console.warn(`❌ Platform points mismatch for player ${standing.playerId}: expected ${expected}, got ${standing.points}`);
          platformPointsMatch = false;
        }
      }
      
      if (platformPointsMatch) {
        await logSuccess(`✅ Platform points verified (${actualPlatformStandings.length} players)`);
      } else {
        throw new Error('Platform points verification failed');
      }
    } catch (error) {
      await logError('Failed to test platform league points', error);
      throw error;
    }

    // Step 11: Test Remiz League Points
    await logStep('🎄', 'Step 11: Testing remiz christmas league points...');
    
    try {
      // Reload tournament results
      const tournamentForRemiz = await TournamentModel.findById(tournamentId);
      const tournamentResults = collectTournamentResults(tournamentForRemiz);
      
      // Create remiz league
      const remizLeague = await LeagueService.createLeague(
        testClub._id.toString(),
        testUser._id.toString(),
        {
          name: `Test Remiz League - ${Date.now()}`,
          description: 'Testing remiz christmas point system',
          pointSystemType: 'remiz_christmas'
        }
      );
      
      await logSuccess(`Remiz league created: ${remizLeague.name}`);
      
      // Switch tournament to remiz league
      await TournamentModel.findByIdAndUpdate(tournamentId, {
        league: remizLeague._id
      });
      
      // Reopen and reclose to recalculate with remiz points
      await TournamentService.reopenTournament(tournament.tournamentId, testUser._id.toString());
      await TournamentService.finishTournament(tournament.tournamentId, testUser._id.toString());
      
      await logSuccess('Tournament reopened and reclosed - remiz points calculated');
      
      // Verify remiz points
      const updatedRemizLeague = await LeagueModel.findById(remizLeague._id);
      const actualRemizStandings = updatedRemizLeague.players.map((p: any) => ({
        playerId: p.player.toString(),
        points: p.points
      }));
      
      const expectedRemizPoints = calculateExpectedRemizPoints(tournamentResults);
      
      // Compare expected vs actual
      let remizPointsMatch = true;
      for (const standing of actualRemizStandings) {
        const expected = expectedRemizPoints.get(standing.playerId);
        if (expected !== undefined && standing.points !== expected) {
          console.warn(`❌ Remiz points mismatch for player ${standing.playerId}: expected ${expected}, got ${standing.points}`);
          remizPointsMatch = false;
        }
      }
      
      if (remizPointsMatch) {
        await logSuccess(`✅ Remiz points verified (${actualRemizStandings.length} players)`);
      } else {
        throw new Error('Remiz points verification failed');
      }
    } catch (error) {
      await logError('Failed to test remiz league points', error);
      throw error;
    }

    await logSuccess('✅ Complete tournament lifecycle with both league point systems verified successfully!');

  }, 300000); // 5 minute timeout
});



// Configuration test
describe('Test Configuration', () => {
  test('Configuration is valid', async () => {
    expect(SIMPLE_CONFIG.playerCount).toBeGreaterThan(0);
    expect(SIMPLE_CONFIG.boardCount).toBeGreaterThan(0);
    expect(SIMPLE_CONFIG.legsToWin).toBeGreaterThan(0);
    expect(SIMPLE_CONFIG.delayBetweenRequests).toBeGreaterThan(0);
    expect(SIMPLE_CONFIG.delayBetweenSteps).toBeGreaterThan(0);
    
    console.log(`\n📋 Simple Test Configuration:`);
    console.log(`👥 Player Count: ${SIMPLE_CONFIG.playerCount}`);
    console.log(`🎯 Board Count: ${SIMPLE_CONFIG.boardCount}`);
    console.log(`🎮 Legs to Win: ${SIMPLE_CONFIG.legsToWin}`);
    console.log(`⏱️  Request Delay: ${SIMPLE_CONFIG.delayBetweenRequests}ms`);
    console.log(`⏱️  Step Delay: ${SIMPLE_CONFIG.delayBetweenSteps}ms`);
  });
});
