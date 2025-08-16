import axios from 'axios';

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const CLUB_ID = '687fabffb16ffd1e85174d7c';

// Test user credentials for JWT authentication
const TEST_USER = {
  email: 'test@test.user',
  password: 'testuser'
};

// JWT token storage
let authToken: string | null = null;
let authCookies: string | null = null;

// Simple Tournament Configuration - EASILY CONFIGURABLE
const SIMPLE_CONFIG = {
  playerCount: 12, // 8 players - MODIFY THIS
  boardCount: 2, // 2 boards - MODIFY THIS
  legsToWin: 2,
  delayBetweenRequests: 100,
  delayBetweenSteps: 500,
};

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

// Helper functions
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Authentication helper
const authenticateUser = async () => {
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    expect(loginResponse.status).toBe(200);
    
    // Extract token from cookies
    const setCookieHeader = loginResponse.headers['set-cookie'];
    if (setCookieHeader) {
      authCookies = setCookieHeader.join('; ');
      // Extract token value from cookie
      const tokenMatch = authCookies.match(/token=([^;]+)/);
      if (tokenMatch) {
        authToken = tokenMatch[1];
      }
    }
    
    console.log('✅ User authenticated successfully');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    return false;
  }
};

// Create authenticated axios instance
const createAuthenticatedAxios = () => {
  const instance = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Cookie': authCookies || '',
      'Content-Type': 'application/json'
    }
  });
  
  // Add request interceptor to include cookies
  instance.interceptors.request.use((config) => {
    if (authCookies) {
      config.headers['Cookie'] = authCookies;
    }
    return config;
  });
  
  return instance;
};

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

// Simple Tournament Lifecycle Test
describe('Simple Tournament Lifecycle Test', () => {
  test('Complete Simple Tournament Lifecycle', async () => {
    jest.setTimeout(300000); // 5 minutes
    
    await logStep('🚀', `Starting simple tournament lifecycle test with ${SIMPLE_CONFIG.playerCount} players on ${SIMPLE_CONFIG.boardCount} boards...`);

    // Step 0: Authenticate user
    await logStep('🔐', 'Step 0: Authenticating user...');
    const authSuccess = await authenticateUser();
    if (!authSuccess) {
      throw new Error('Authentication failed - cannot proceed with test');
    }
    
    const authenticatedAxios = createAuthenticatedAxios();

    // Step 1: Get Available Boards
    await logStep('📋', 'Step 1: Getting available boards...');
    
    let availableBoards: any[] = [];
    try {
      const boardsResponse = await authenticatedAxios.get(`/clubs/${CLUB_ID}/boards`);
      expect(boardsResponse.status).toBe(200);
      availableBoards = boardsResponse.data.boards || [];
      
      await logSuccess(`Found ${availableBoards.length} available boards`);
      
      if (availableBoards.length < SIMPLE_CONFIG.boardCount) {
        throw new Error(`Not enough available boards. Need ${SIMPLE_CONFIG.boardCount}, have ${availableBoards.length}`);
      }
    } catch (error) {
      await logError('Failed to get available boards', error);
      throw error;
    }

    // Step 2: Create Tournament
    await logStep('📝', 'Step 2: Creating tournament...');
    
    const selectedBoards = availableBoards
      .slice(0, SIMPLE_CONFIG.boardCount)
      .map((board: any) => board.boardNumber);
    
    const tournamentPayload = {
      name: `Simple Test Tournament - ${Date.now()}`,
      description: `Automated simple test tournament with ${SIMPLE_CONFIG.playerCount} players`,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: SIMPLE_CONFIG.playerCount,
      format: 'group_knockout',
      startingScore: 501,
      tournamentPassword: 'test123',
      boardCount: SIMPLE_CONFIG.boardCount,
      selectedBoards: selectedBoards,
      entryFee: 1000,
      location: 'Test Location',
      type: 'amateur',
      registrationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    };

    let tournamentData: TournamentData;
    try {
      const createResponse = await authenticatedAxios.post(
        `/clubs/${CLUB_ID}/createTournament`,
        tournamentPayload
      );
      expect(createResponse.status).toBe(200);
      tournamentData = createResponse.data;
      await logSuccess(`Tournament created: ${tournamentData?.tournamentId}`);
    } catch (error) {
      await logError('Failed to create tournament', error);
      throw error;
    }

    // Step 3: Add Players
    await logStep('👥', `Step 3: Adding ${SIMPLE_CONFIG.playerCount} players...`);
    
    const testPlayers = Array.from({ length: SIMPLE_CONFIG.playerCount }, (_, i) => ({
      name: `Simple Player ${i + 1}`,
    }));
    
    try {
      const playerPromises = testPlayers.map(async (player, index) => {
        await sleep(index * 50);
        const response = await authenticatedAxios.post(
          `/tournaments/${tournamentData.tournamentId}/players`,
          player
        );
        expect(response.status).toBe(200);
        return response.data;
      });

      await Promise.all(playerPromises);
      await logSuccess(`Added ${testPlayers.length} players`);
    } catch (error) {
      await logError('Failed to add players', error);
      throw error;
    }

    // Step 4: Check-in Players
    await logStep('✅', 'Step 4: Checking-in all players...');
    
    try {
      const tournamentResponse = await authenticatedAxios.get(
        `/tournaments/${tournamentData.tournamentId}`
      );
      expect(tournamentResponse.status).toBe(200);

      const tournament = tournamentResponse.data;
      const players = tournament.tournamentPlayers || [];

      const checkInPromises = players.map(async (player: any, index: number) => {
        await sleep(index * 50);
        const response = await authenticatedAxios.put(
          `/tournaments/${tournamentData.tournamentId}/players`,
          {
            playerId: player.playerReference._id || player.playerReference,
            status: 'checked-in'
          }
        );
        expect(response.status).toBe(200);
        return response.data;
      });

      await Promise.all(checkInPromises);
      await logSuccess(`Checked-in ${players.length} players`);
    } catch (error) {
      await logError('Failed to check-in players', error);
      throw error;
    }

    // Step 5: Generate Groups
    await logStep('🏆', 'Step 5: Generating groups...');
    
    try {
      const groupsResponse = await authenticatedAxios.post(
        `/tournaments/${tournamentData.tournamentId}/generateGroups`
      );
      expect(groupsResponse.status).toBe(200);
      await logSuccess('Groups generated');
    } catch (error) {
      await logError('Failed to generate groups', error);
      throw error;
    }

    // Step 6: Play Group Matches
    await logStep('🎯', 'Step 6: Playing group matches...');
    
    try {
      const tournamentResponse = await authenticatedAxios.get(
        `/tournaments/${tournamentData.tournamentId}`
      );
      expect(tournamentResponse.status).toBe(200);

      const tournament = tournamentResponse.data;
      expect(tournament.groups).toBeDefined();
      expect(tournament.groups.length).toBeGreaterThan(0);

      // Get all group matches
      const allGroupMatches: MatchData[] = [];
      for (const group of tournament.groups) {
        try {
          const matchesResponse = await authenticatedAxios.get(
            `/boards/${tournamentData.tournamentId}/${group.board}/matches`
          );
          
          if (matchesResponse.status === 200 && matchesResponse.data.matches) {
            const boardMatches = matchesResponse.data.matches;
            allGroupMatches.push(...boardMatches);
          }
        } catch (error) {
          await logError(`Failed to get matches for board ${group.board}`, error);
        }
      }

      await logSuccess(`Found ${allGroupMatches.length} group matches`);

      // Play all group matches
      for (const match of allGroupMatches) {
        const matchId = match._id?.toString() || match._id;
        await logStep('🎮', `Playing match: ${match.player1?.playerId?.name || 'Unknown'} vs ${match.player2?.playerId?.name || 'Unknown'}`);
        
        try {
          // Start the match
          const startResponse = await authenticatedAxios.post(
            `/boards/${tournamentData.tournamentId}/${match.boardReference}/start`,
            {
              matchId: matchId,
              legsToWin: SIMPLE_CONFIG.legsToWin,
              startingPlayer: 1
            }
          );
          expect(startResponse.status).toBe(200);

          // Generate random match result
          const { player1LegsWon, player2LegsWon } = generateRandomLegsWon();
          const player1Stats = generateRandomStats();
          const player2Stats = generateRandomStats();

          // Finish the match
          const finishResponse = await authenticatedAxios.post(
            `/matches/${matchId}/finish`,
            {
              player1LegsWon,
              player2LegsWon,
              player1Stats,
              player2Stats
            }
          );
          expect(finishResponse.status).toBe(200);

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

    // Step 7: Generate Knockout
    await logStep('🥊', 'Step 7: Generating knockout stage...');
    
    try {
      const currentTournamentResponse = await authenticatedAxios.get(
        `/tournaments/${tournamentData.tournamentId}`
      );
      expect(currentTournamentResponse.status).toBe(200);
      const currentTournament = currentTournamentResponse.data;
      
      const totalPlayers = currentTournament.tournamentPlayers.filter((p: any) => p.status === 'checked-in').length;
      const playersCount = calculateKnockoutPlayersCount(totalPlayers);
      
      await logSuccess(`Calculated playersCount: ${playersCount} (from ${totalPlayers} total players)`);
      
      const knockoutResponse = await authenticatedAxios.post(
        `/tournaments/${tournamentData.tournamentId}/generateKnockout`,
        {
          playersCount: playersCount,
          knockoutMethod: 'automatic'
        }
      );
      expect(knockoutResponse.status).toBe(200);
      await logSuccess('Knockout stage generated');
    } catch (error) {
      await logError('Failed to generate knockout', error);
      throw error;
    }

    // Step 8: Play Knockout Matches
    await logStep('🎯', 'Step 8: Playing knockout matches...');
    
    try {
      // Play all knockout rounds until final
      let currentRound = 1;
      let hasMoreRounds = true;
      
      while (hasMoreRounds) {
        await logStep('🎯', `Playing knockout round ${currentRound}...`);
        
        const updatedTournamentResponse = await authenticatedAxios.get(
          `/tournaments/${tournamentData.tournamentId}`
        );
        expect(updatedTournamentResponse.status).toBe(200);

        const updatedTournament = updatedTournamentResponse.data;
        expect(updatedTournament.knockout).toBeDefined();
        expect(updatedTournament.knockout.length).toBeGreaterThan(0);

        // Find current round
        const currentRoundData = updatedTournament.knockout.find((r: any) => r.round === currentRound);
        if (!currentRoundData || !currentRoundData.matches || currentRoundData.matches.length === 0) {
          await logSuccess(`No more matches in round ${currentRound}`);
          break;
        }

        // Get all knockout matches from all boards for current round
        const allKnockoutMatches: MatchData[] = [];
        
        // Get tournament data to find which boards have knockout matches
        const tournamentResponse = await authenticatedAxios.get(`/tournaments/${tournamentData.tournamentId}`);
        if (tournamentResponse.status === 200 && tournamentResponse.data.groups) {
          // Use the same boards that were used for groups
          for (const group of tournamentResponse.data.groups) {
            try {
              const matchesResponse = await authenticatedAxios.get(
                `/boards/${tournamentData.tournamentId}/${group.board}/matches`
              );
              
              if (matchesResponse.status === 200 && matchesResponse.data.matches) {
                const boardMatches = matchesResponse.data.matches.filter((match: any) => 
                  match.type === 'knockout' && match.round === currentRound
                );
                allKnockoutMatches.push(...boardMatches);
              }
            } catch (error) {
              await logError(`Failed to get knockout matches for board ${group.board}`, error);
            }
          }
        }

        await logSuccess(`Found ${allKnockoutMatches.length} knockout matches for round ${currentRound}`);

        if (allKnockoutMatches.length === 0) {
          await logSuccess(`No matches found for round ${currentRound}`);
          break;
        }

        // Play all knockout matches in current round
        for (const match of allKnockoutMatches) {
          const matchId = match._id?.toString() || match._id;
          await logStep('🎮', `Playing knockout match round ${currentRound}: ${match.player1?.playerId?.name || 'Unknown'} vs ${match.player2?.playerId?.name || 'Unknown'}`);
          
          try {
            // Start the match
            const startResponse = await authenticatedAxios.post(
              `/boards/${tournamentData.tournamentId}/${match.boardReference}/start`,
              {
                matchId: matchId,
                legsToWin: SIMPLE_CONFIG.legsToWin,
                startingPlayer: 1
              }
            );
            expect(startResponse.status).toBe(200);

            // Generate random match result
            const { player1LegsWon, player2LegsWon } = generateRandomLegsWon();
            const player1Stats = generateRandomStats();
            const player2Stats = generateRandomStats();

            // Finish the match
            const finishResponse = await authenticatedAxios.post(
              `/matches/${matchId}/finish`,
              {
                player1LegsWon,
                player2LegsWon,
                player1Stats,
                player2Stats
              }
            );
            expect(finishResponse.status).toBe(200);

            await sleep(SIMPLE_CONFIG.delayBetweenRequests);
          } catch (error) {
            await logError(`Failed to play knockout match ${matchId}`, error);
          }
        }

        await logSuccess(`All knockout matches completed for round ${currentRound}`);

        // Check if this was the final round (only 1 match)
        if (allKnockoutMatches.length === 1) {
          await logSuccess('Final round completed');
          hasMoreRounds = false;
        } else {
          // Generate next round
          await logStep('🔄', 'Generating next round...');
          try {
            const nextRoundResponse = await authenticatedAxios.post(
              `/tournaments/${tournamentData.tournamentId}/generateNextRound`,
              { currentRound }
            );
            expect(nextRoundResponse.status).toBe(200);
            await logSuccess('Next round generated');
            currentRound++;
          } catch (error) {
            await logError('Failed to generate next round', error);
            hasMoreRounds = false;
          }
        }
      }

      await logSuccess('All knockout matches completed');
    } catch (error) {
      await logError('Failed to process knockout matches', error);
      throw error;
    }

    // Step 9: Finish Tournament
    await logStep('🏁', 'Step 9: Finishing tournament...');
    
    try {
      const finishResponse = await authenticatedAxios.post(
        `/tournaments/${tournamentData.tournamentId}/finish`
      );
      expect(finishResponse.status).toBe(200);
      await logSuccess('Tournament finished');
    } catch (error) {
      await logError('Failed to finish tournament', error);
      throw error;
    }

    // Step 10: Verify Final Tournament State
    await logStep('📊', 'Step 10: Verifying final tournament state...');
    
    try {
      const finalTournamentResponse = await authenticatedAxios.get(
        `/tournaments/${tournamentData.tournamentId}`
      );
      expect(finalTournamentResponse.status).toBe(200);

      const finalTournament = finalTournamentResponse.data;
      expect(finalTournament.tournamentSettings.status).toBe('finished');
      expect(finalTournament.tournamentPlayers.length).toBe(SIMPLE_CONFIG.playerCount);

      await logSuccess('Simple tournament lifecycle test completed successfully!');
      console.log(`\n📈 Final tournament status: ${finalTournament.tournamentSettings.status}`);
      console.log(`👥 Total players: ${finalTournament.tournamentPlayers.length}`);
      console.log(`🎯 Tournament ID: ${tournamentData.tournamentId}`);
      console.log(`🎯 Group matches played: ${finalTournament.groups?.reduce((acc: number, group: any) => acc + group.matches.length, 0) || 0}`);
      console.log(`🥊 Knockout matches played: ${finalTournament.knockout?.reduce((acc: number, round: any) => acc + round.matches.length, 0) || 0}`);
    } catch (error) {
      await logError('Failed to verify final tournament state', error);
      throw error;
    }

    await logSuccess('Simple tournament lifecycle test completed successfully!');
  }, 300000); // 5 minute timeout
});

// Utility test for checking server connectivity
describe('Server Connectivity', () => {
  test('Server is running and accessible', async () => {
    try {
      const response = await axios.get(`${BASE_URL.replace('/api', '')}`);
      expect(response.status).toBe(200);
      await logSuccess('Server is accessible');
    } catch (error) {
      await logError('Server is not accessible. Make sure the dev server is running on localhost:3000', error);
      throw error;
    }
  });
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
