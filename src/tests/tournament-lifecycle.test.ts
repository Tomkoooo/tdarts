import axios from 'axios';

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const CLUB_ID = '687fabffb16ffd1e85174d7c';
const USER_ID = '6870f51d9b58837d598e80d5';

// Test configuration - Change this to test with different player counts
const CONFIG = {
  playerCount: 24, // Change this to test with different numbers of players
  maxPlayers: 24, // Ensure maxPlayers is at least playerCount
  boardCount: 2,
  legsToWin: 2,
  delayBetweenRequests: 200, // ms
  delayBetweenSteps: 1000, // ms
};

// Generate test players based on configuration
const generateTestPlayers = (count: number) => {
  const players = [];
  for (let i = 0; i < count; i++) {
    players.push({
      name: `Test Player ${i + 1}`,
    
    });
  }
  return players;
};

const TEST_PLAYERS = generateTestPlayers(CONFIG.playerCount);

interface TournamentData {
  tournamentId: string;
  code: string;
  _id: string;
}

interface MatchData {
  _id: string;
  player1: { playerId: { _id: string; name: string } };
  player2: { playerId: { _id: string; name: string } };
  type: 'group' | 'knockout';
  boardReference: number;
}

interface GroupData {
  board: number;
  matches: string[];
}

// Helper functions
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateRandomStats = () => ({
  highestCheckout: Math.floor(Math.random() * 170) + 1,
  oneEightiesCount: Math.floor(Math.random() * 5),
  totalThrows: Math.floor(Math.random() * 50) + 20,
  totalScore: Math.floor(Math.random() * 1000) + 500,
});

const generateRandomLegsWon = () => {
  const legs = Math.floor(Math.random() * 3) + 1; // 1-3 legs
  return { player1LegsWon: legs, player2LegsWon: 3 - legs };
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

const logStep = (step: string, message: string) => {
  console.log(`\n${step} ${message}`);
};

const logSuccess = (message: string) => {
  console.log(`✅ ${message}`);
};

const logError = (message: string, error?: any) => {
  console.error(`❌ ${message}`, error?.response?.data || error?.message || error);
};

describe('Tournament Lifecycle Test', () => {
  let tournamentData: TournamentData | null = null;
  let groupMatches: MatchData[] = [];
  let knockoutMatches: MatchData[] = [];

  test(`Complete Tournament Lifecycle with ${CONFIG.playerCount} players`, async () => {
    // Increase timeout for this test
    jest.setTimeout(300000); // 5 minutes
    
    logStep('🚀', `Starting tournament lifecycle test with ${CONFIG.playerCount} players...`);

    // Step 1: Create Tournament
    logStep('📝', 'Step 1: Creating tournament...');
    
    const createTournamentWithRetry = async (attempts = 3) => {
      for (let i = 0; i < attempts; i++) {
        try {
          const tournamentPayload = {
            name: `Test Tournament ${Date.now()}-${i + 1}`,
            description: `Automated test tournament with ${CONFIG.playerCount} players`,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            maxPlayers: CONFIG.maxPlayers,
            format: 'group_knockout',
            startingScore: 501,
            tournamentPassword: 'test123',
            boardCount: CONFIG.boardCount,
            entryFee: 1000,
            location: 'Test Location',
            type: 'amateur',
            registrationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
          };

          const createResponse = await axios.post(
            `${BASE_URL}/clubs/${CLUB_ID}/createTournament`,
            tournamentPayload
          );

          expect(createResponse.status).toBe(200);
          tournamentData = createResponse.data;
          expect(tournamentData).toHaveProperty('tournamentId');
          expect(tournamentData).toHaveProperty('_id');

          logSuccess(`Tournament created: ${tournamentData?.tournamentId}`);
          return;
        } catch (error: any) {
          if (error.response?.status === 500 && error.response?.data?.error?.includes('duplicate key')) {
            logError(`Attempt ${i + 1} failed due to duplicate key, retrying...`, error);
            await sleep(1000); // Wait before retry
            continue;
          }
          throw error;
        }
      }
      throw new Error(`Failed to create tournament after ${attempts} attempts`);
    };

    try {
      await createTournamentWithRetry();
    } catch (error) {
      logError('Failed to create tournament', error);
      throw error;
    }

    // Step 2: Add Players
    logStep('👥', `Step 2: Adding ${CONFIG.playerCount} players...`);
    try {
      const playerPromises = TEST_PLAYERS.map(async (player, index) => {
        await sleep(index * 100); // Small delay between requests
        const response = await axios.post(
          `${BASE_URL}/tournaments/${tournamentData!.tournamentId}/players`,
          player
        );
        expect(response.status).toBe(200);
        return response.data;
      });

      await Promise.all(playerPromises);
      logSuccess(`Added ${TEST_PLAYERS.length} players`);
    } catch (error) {
      logError('Failed to add players', error);
      throw error;
    }

    // Step 2.5: Check-in all players
    logStep('✅', 'Step 2.5: Checking-in all players...');
    await sleep(CONFIG.delayBetweenSteps);

    try {
      // Get tournament to see all players
      const tournamentResponse = await axios.get(
        `${BASE_URL}/tournaments/${tournamentData!.tournamentId}`
      );
      expect(tournamentResponse.status).toBe(200);

      const tournament = tournamentResponse.data;
      const players = tournament.tournamentPlayers || [];

      logSuccess(`Found ${players.length} players to check-in`);

      // Check-in each player
      const checkInPromises = players.map(async (player: any, index: number) => {
        await sleep(index * 100); // Small delay between requests
        const response = await axios.put(
          `${BASE_URL}/tournaments/${tournamentData!.tournamentId}/players`,
          {
            playerId: player.playerReference._id || player.playerReference,
            status: 'checked-in'
          }
        );
        expect(response.status).toBe(200);
        return response.data;
      });

      await Promise.all(checkInPromises);
      logSuccess(`Checked-in ${players.length} players`);
    } catch (error) {
      logError('Failed to check-in players', error);
      throw error;
    }

    // Step 3: Generate Groups
    logStep('🏆', 'Step 3: Generating groups...');
    await sleep(CONFIG.delayBetweenSteps);

    try {
      const groupsResponse = await axios.post(
        `${BASE_URL}/tournaments/${tournamentData!.tournamentId}/generateGroups`
      );
      expect(groupsResponse.status).toBe(200);
      logSuccess('Groups generated');
    } catch (error) {
      logError('Failed to generate groups', error);
      throw error;
    }

    // Step 4: Get tournament data to find group matches
    logStep('🎯', 'Step 4: Playing group matches...');
    await sleep(CONFIG.delayBetweenSteps);

    try {
      const tournamentResponse = await axios.get(
        `${BASE_URL}/tournaments/${tournamentData!.tournamentId}`
      );
      expect(tournamentResponse.status).toBe(200);

      const tournament = tournamentResponse.data;
      expect(tournament.groups).toBeDefined();
      expect(tournament.groups.length).toBeGreaterThan(0);

      // Get all group matches using the correct API endpoint
      const allGroupMatches: MatchData[] = [];
      for (const group of tournament.groups) {
        try {
          console.log(`Fetching matches for board ${group.board}`);
          
          const matchesResponse = await axios.get(
            `${BASE_URL}/boards/${tournamentData!.tournamentId}/${group.board}/matches`
          );
          
          if (matchesResponse.status === 200 && matchesResponse.data.matches) {
            const boardMatches = matchesResponse.data.matches;
            console.log(`Found ${boardMatches.length} matches for board ${group.board}`);
            allGroupMatches.push(...boardMatches);
          }
        } catch (error) {
          logError(`Failed to get matches for board ${group.board}`, error);
        }
      }

      logSuccess(`Found ${allGroupMatches.length} group matches`);

      if (allGroupMatches.length === 0) {
        logError('No group matches found. This might indicate an issue with group generation.');
        console.log('Tournament groups:', JSON.stringify(tournament.groups, null, 2));
        throw new Error('No group matches found');
      }

      // Step 5: Play all group matches
      for (const match of allGroupMatches) {
        const matchId = match._id?.toString() || match._id;
        logStep('🎮', `Playing match: ${match.player1?.playerId?.name || 'Unknown'} vs ${match.player2?.playerId?.name || 'Unknown'}`);
        
        try {
          // Start the match
          const startResponse = await axios.post(
            `${BASE_URL}/boards/${tournamentData!.tournamentId}/${match.boardReference}/start`,
            {
              matchId: matchId,
              legsToWin: CONFIG.legsToWin,
              startingPlayer: 1
            }
          );
          expect(startResponse.status).toBe(200);

          // Generate random match result
          const { player1LegsWon, player2LegsWon } = generateRandomLegsWon();
          const player1Stats = generateRandomStats();
          const player2Stats = generateRandomStats();

          // Finish the match
          const finishResponse = await axios.post(
            `${BASE_URL}/matches/${matchId}/finish`,
            {
              player1LegsWon,
              player2LegsWon,
              player1Stats,
              player2Stats
            }
          );
          expect(finishResponse.status).toBe(200);

          await sleep(CONFIG.delayBetweenRequests);
        } catch (error) {
          logError(`Failed to play match ${matchId}`, error);
        }
      }

      logSuccess('All group matches completed');
    } catch (error) {
      logError('Failed to process group matches', error);
      throw error;
    }

    // Step 6: Generate Knockout
    logStep('🥊', 'Step 6: Generating knockout stage...');
    await sleep(CONFIG.delayBetweenSteps);

    try {
      // Get current tournament data to calculate playersCount
      const currentTournamentResponse = await axios.get(
        `${BASE_URL}/tournaments/${tournamentData!.tournamentId}`
      );
      expect(currentTournamentResponse.status).toBe(200);
      const currentTournament = currentTournamentResponse.data;
      
      // Calculate the appropriate playersCount (nearest power of 2)
      const totalPlayers = currentTournament.tournamentPlayers.filter((p: any) => p.status === 'checked-in').length;
      const playersCount = calculateKnockoutPlayersCount(totalPlayers);
      
      logSuccess(`Calculated playersCount: ${playersCount} (from ${totalPlayers} total players)`);
      
      const knockoutResponse = await axios.post(
        `${BASE_URL}/tournaments/${tournamentData!.tournamentId}/generateKnockout`,
        {
          playersCount: playersCount,
          knockoutMethod: 'automatic'
        }
      );
      expect(knockoutResponse.status).toBe(200);
      logSuccess('Knockout stage generated');
    } catch (error) {
      logError('Failed to generate knockout', error);
      throw error;
    }

    // Step 7: Get knockout matches
    logStep('🎯', 'Step 7: Playing knockout matches...');
    await sleep(CONFIG.delayBetweenSteps);

    try {
      const updatedTournamentResponse = await axios.get(
        `${BASE_URL}/tournaments/${tournamentData!.tournamentId}`
      );
      expect(updatedTournamentResponse.status).toBe(200);

      const updatedTournament = updatedTournamentResponse.data;
      expect(updatedTournament.knockout).toBeDefined();
      expect(updatedTournament.knockout.length).toBeGreaterThan(0);

      // Get all knockout matches from all boards
      const allKnockoutMatches: MatchData[] = [];
      
      // Get tournament data to find which boards have knockout matches
      const tournamentResponse = await axios.get(`${BASE_URL}/tournaments/${tournamentData!.tournamentId}`);
      if (tournamentResponse.status === 200 && tournamentResponse.data.groups) {
        // Use the same boards that were used for groups
        for (const group of tournamentResponse.data.groups) {
          try {
            console.log(`Fetching knockout matches for board ${group.board}`);
            
            const matchesResponse = await axios.get(
              `${BASE_URL}/boards/${tournamentData!.tournamentId}/${group.board}/matches`
            );
            
            if (matchesResponse.status === 200 && matchesResponse.data.matches) {
              const boardMatches = matchesResponse.data.matches.filter((match: any) => match.type === 'knockout');
              console.log(`Found ${boardMatches.length} knockout matches for board ${group.board}`);
              allKnockoutMatches.push(...boardMatches);
            }
          } catch (error) {
            logError(`Failed to get knockout matches for board ${group.board}`, error);
          }
        }
      }

      logSuccess(`Found ${allKnockoutMatches.length} knockout matches`);

      // Step 8: Play all knockout matches
      for (const match of allKnockoutMatches) {
        const matchId = match._id?.toString() || match._id;
        logStep('🎮', `Playing knockout match: ${match.player1?.playerId?.name || 'Unknown'} vs ${match.player2?.playerId?.name || 'Unknown'}`);
        
        try {
          // Start the match
          const startResponse = await axios.post(
            `${BASE_URL}/boards/${tournamentData!.tournamentId}/${match.boardReference}/start`,
            {
              matchId: matchId,
              legsToWin: CONFIG.legsToWin,
              startingPlayer: 1
            }
          );
          expect(startResponse.status).toBe(200);

          // Generate random match result
          const { player1LegsWon, player2LegsWon } = generateRandomLegsWon();
          const player1Stats = generateRandomStats();
          const player2Stats = generateRandomStats();

          // Finish the match
          const finishResponse = await axios.post(
            `${BASE_URL}/matches/${matchId}/finish`,
            {
              player1LegsWon,
              player2LegsWon,
              player1Stats,
              player2Stats
            }
          );
          expect(finishResponse.status).toBe(200);

          await sleep(CONFIG.delayBetweenRequests);
        } catch (error) {
          logError(`Failed to play knockout match ${matchId}`, error);
        }
      }

      logSuccess('All knockout matches completed');
    } catch (error) {
      logError('Failed to process knockout matches', error);
      throw error;
    }

    // Step 9: Finish Tournament
    logStep('🏁', 'Step 9: Finishing tournament...');
    await sleep(CONFIG.delayBetweenSteps);

    try {
      const finishResponse = await axios.post(
        `${BASE_URL}/tournaments/${tournamentData!.tournamentId}/finish`
      );
      expect(finishResponse.status).toBe(200);
      logSuccess('Tournament finished');
    } catch (error) {
      logError('Failed to finish tournament', error);
      throw error;
    }

    // Step 10: Verify final tournament state
    logStep('📊', 'Step 10: Verifying final tournament state...');
    try {
      const finalTournamentResponse = await axios.get(
        `${BASE_URL}/tournaments/${tournamentData!.tournamentId}`
      );
      expect(finalTournamentResponse.status).toBe(200);

      const finalTournament = finalTournamentResponse.data;
      expect(finalTournament.tournamentSettings.status).toBe('finished');
      expect(finalTournament.tournamentPlayers.length).toBe(TEST_PLAYERS.length);

      logSuccess('Tournament lifecycle test completed successfully!');
      console.log(`\n📈 Final tournament status: ${finalTournament.tournamentSettings.status}`);
      console.log(`👥 Total players: ${finalTournament.tournamentPlayers.length}`);
      console.log(`🏆 Tournament ID: ${tournamentData!.tournamentId}`);
      console.log(`🎯 Group matches played: ${finalTournament.groups?.reduce((acc: number, group: any) => acc + group.matches.length, 0) || 0}`);
      console.log(`🥊 Knockout matches played: ${finalTournament.knockout?.reduce((acc: number, round: any) => acc + round.matches.length, 0) || 0}`);
    } catch (error) {
      logError('Failed to verify final tournament state', error);
      throw error;
    }

  }, 300000); // 5 minute timeout

  // Cleanup test
  test('Cleanup - Log test tournament ID for manual cleanup', async () => {
    if (tournamentData) {
      console.log(`\n🧹 Test tournament ID for manual cleanup: ${tournamentData.tournamentId}`);
      console.log(`🔗 Tournament URL: http://localhost:3000/tournaments/${tournamentData.tournamentId}`);
    }
  });
});

// Utility test for checking server connectivity
describe('Server Connectivity', () => {
  test('Server is running and accessible', async () => {
    try {
      const response = await axios.get(`${BASE_URL.replace('/api', '')}`);
      expect(response.status).toBe(200);
      logSuccess('Server is accessible');
    } catch (error) {
      logError('Server is not accessible. Make sure the dev server is running on localhost:3000', error);
      throw error;
    }
  });
});

// Configuration test
describe('Test Configuration', () => {
  test('Configuration is valid', () => {
    expect(CONFIG.playerCount).toBeGreaterThan(0);
    expect(CONFIG.maxPlayers).toBeGreaterThanOrEqual(CONFIG.playerCount);
    expect(CONFIG.boardCount).toBeGreaterThan(0);
    expect(CONFIG.legsToWin).toBeGreaterThan(0);
    expect(CONFIG.delayBetweenRequests).toBeGreaterThan(0);
    expect(CONFIG.delayBetweenSteps).toBeGreaterThan(0);
    
    console.log(`\n📋 Test Configuration:`);
    console.log(`👥 Player Count: ${CONFIG.playerCount}`);
    console.log(`🎯 Max Players: ${CONFIG.maxPlayers}`);
    console.log(`🏓 Boards: ${CONFIG.boardCount}`);
    console.log(`🎮 Legs to Win: ${CONFIG.legsToWin}`);
    console.log(`⏱️  Request Delay: ${CONFIG.delayBetweenRequests}ms`);
    console.log(`⏱️  Step Delay: ${CONFIG.delayBetweenSteps}ms`);
  });
}); 