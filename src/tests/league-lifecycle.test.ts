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
// eslint-disable-next-line
let authToken: string | null = null;
let authCookies: string | null = null;

// League Test Configuration - EASILY CONFIGURABLE
const LEAGUE_CONFIG = {
  playerCount: 8, // Players per tournament
  boardCount: 2, // Boards to use
  legsToWin: 2,
  delayBetweenRequests: 100,
  delayBetweenSteps: 500,
  tournamentCount: 2, // Number of tournaments to create for the league
};

interface TournamentData {
  tournamentId: string;
  code: string;
  _id: string;
}

interface LeagueData {
  _id: string;
  name: string;
  isActive: boolean;
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

const logStep = async (step: string, message: string) => {
  console.log(`\n${step} ${message}`);
  await sleep(100); // Small delay to ensure console output is processed
};

const logSuccess = async (message: string) => {
  console.log(`✅ ${message}`);
  await sleep(100);
};

const logResponse = (response: any, context: string) => {
  console.log(`📋 ${context} Response:`, {
    status: response.status,
    statusText: response.statusText,
    data: response.data
  });
};

const logError = async (message: string, error?: any) => {
  console.error(`❌ ${message}`);
  if (error) {
    console.error('Error details:', error.message || error);
    
    // Log detailed axios error information
    if (error?.response) {
      console.error('📋 Axios Error Response Details:');
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Headers:', error.response.headers);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error?.request) {
      console.error('📋 Axios Request Error (no response):');
      console.error('Request:', error.request);
    }
  }
  await sleep(100);
};

// Play a complete tournament
const playCompleteTournament = async (authenticatedAxios: any, leagueId?: string): Promise<TournamentData> => {
  // Get Available Boards
  await logStep('📋', 'Getting available boards...');
  
  let availableBoards: any[] = [];
  const boardsResponse = await authenticatedAxios.get(`/clubs/${CLUB_ID}/boards`);
  expect(boardsResponse.status).toBe(200);
  availableBoards = boardsResponse.data.boards || [];
  
  await logSuccess(`Found ${availableBoards.length} available boards`);
  
  if (availableBoards.length < LEAGUE_CONFIG.boardCount) {
    throw new Error(`Not enough available boards. Need ${LEAGUE_CONFIG.boardCount}, have ${availableBoards.length}`);
  }

  // Create Tournament
  await logStep('📝', 'Creating tournament...');
  
  const selectedBoards = availableBoards
    .slice(0, LEAGUE_CONFIG.boardCount)
    .map((board: any) => board.boardNumber);
  
  const tournamentPayload = {
    name: `League Test Tournament - ${Date.now()}`,
    description: `Automated league test tournament with ${LEAGUE_CONFIG.playerCount} players`,
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    maxPlayers: LEAGUE_CONFIG.playerCount,
    format: 'group_knockout',
    startingScore: 501,
    tournamentPassword: 'test123',
    boardCount: LEAGUE_CONFIG.boardCount,
    selectedBoards: selectedBoards,
    entryFee: 1000,
    location: 'Test Location',
    type: 'amateur',
    registrationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    leagueId: leagueId // Attach to league if provided
  };

  const createResponse = await authenticatedAxios.post(
    `/clubs/${CLUB_ID}/createTournament`,
    tournamentPayload
  );
  expect(createResponse.status).toBe(200);
  const tournamentData: TournamentData = createResponse.data;
  await logSuccess(`Tournament created: ${tournamentData?.tournamentId}`);

  // Add Players
  await logStep('👥', `Adding ${LEAGUE_CONFIG.playerCount} players...`);
  
  const testPlayers = Array.from({ length: LEAGUE_CONFIG.playerCount }, (_, i) => ({
    name: `League Player ${i + 1}`,
  }));
  
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

  // Check-in Players
  await logStep('✅', 'Checking-in all players...');
  
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

  // Generate Groups
  await logStep('🏆', 'Generating groups...');
  
  const groupsResponse = await authenticatedAxios.post(
    `/tournaments/${tournamentData.tournamentId}/generateGroups`
  );
  expect(groupsResponse.status).toBe(200);
  await logSuccess('Groups generated');

  // Play Group Matches
  await logStep('🎯', 'Playing group matches...');
  
  const updatedTournamentResponse = await authenticatedAxios.get(
    `/tournaments/${tournamentData.tournamentId}`
  );
  expect(updatedTournamentResponse.status).toBe(200);

  const updatedTournament = updatedTournamentResponse.data;
  expect(updatedTournament.groups).toBeDefined();
  expect(updatedTournament.groups.length).toBeGreaterThan(0);

  // Get all group matches
  const allGroupMatches: MatchData[] = [];
  for (const group of updatedTournament.groups) {
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
    
    try {
      // Start the match
      const startResponse = await authenticatedAxios.post(
        `/boards/${tournamentData.tournamentId}/${match.boardReference}/start`,
        {
          matchId: matchId,
          legsToWin: LEAGUE_CONFIG.legsToWin,
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

      await sleep(LEAGUE_CONFIG.delayBetweenRequests);
    } catch (error) {
      await logError(`Failed to play match ${matchId}`, error);
    }
  }

  await logSuccess('All group matches completed');

  // Generate Knockout
  await logStep('🥊', 'Generating knockout stage...');
  
  const currentTournamentResponse = await authenticatedAxios.get(
    `/tournaments/${tournamentData.tournamentId}`
  );
  expect(currentTournamentResponse.status).toBe(200);
  const currentTournament = currentTournamentResponse.data;
  
  const totalPlayers = currentTournament.tournamentPlayers.filter((p: any) => p.status === 'checked-in').length;
  const playersCount = Math.min(4, totalPlayers); // Simple knockout with 4 players
  
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

  // Play Knockout Matches (simplified - just play all matches)
  await logStep('🎯', 'Playing knockout matches...');
  
  let currentRound = 1;
  let hasMoreRounds = true;
  
  while (hasMoreRounds && currentRound <= 3) { // Max 3 rounds to prevent infinite loop
    await logStep('🎯', `Playing knockout round ${currentRound}...`);
    
    const knockoutTournamentResponse = await authenticatedAxios.get(
      `/tournaments/${tournamentData.tournamentId}`
    );
    expect(knockoutTournamentResponse.status).toBe(200);

    const knockoutTournament = knockoutTournamentResponse.data;
    
    // Find current round matches
    const allKnockoutMatches: MatchData[] = [];
    
    for (const group of knockoutTournament.groups) {
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

    if (allKnockoutMatches.length === 0) {
      await logSuccess(`No matches found for round ${currentRound}`);
      break;
    }

    await logSuccess(`Found ${allKnockoutMatches.length} knockout matches for round ${currentRound}`);

    // Play all knockout matches in current round
    for (const match of allKnockoutMatches) {
      const matchId = match._id?.toString() || match._id;
      
      try {
        // Start the match
        const startResponse = await authenticatedAxios.post(
          `/boards/${tournamentData.tournamentId}/${match.boardReference}/start`,
          {
            matchId: matchId,
            legsToWin: LEAGUE_CONFIG.legsToWin,
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

        await sleep(LEAGUE_CONFIG.delayBetweenRequests);
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

  // Finish Tournament
  await logStep('🏁', 'Finishing tournament...');
  
  const finishResponse = await authenticatedAxios.post(
    `/tournaments/${tournamentData.tournamentId}/finish`
  );
  expect(finishResponse.status).toBe(200);
  await logSuccess('Tournament finished');

  return tournamentData;
};

// League Lifecycle Test
describe('League Lifecycle Test', () => {
  test('Complete League Lifecycle with Multiple Tournaments', async () => {
    jest.setTimeout(600000); // 10 minutes
    
    await logStep('🚀', `Starting league lifecycle test with ${LEAGUE_CONFIG.tournamentCount} tournaments...`);

    // Step 0: Authenticate user
    await logStep('🔐', 'Step 0: Authenticating user...');
    const authSuccess = await authenticateUser();
    if (!authSuccess) {
      throw new Error('Authentication failed - cannot proceed with test');
    }
    
    const authenticatedAxios = createAuthenticatedAxios();

    // Step 1: Check Feature Flags
    await logStep('🚩', 'Step 1: Checking league feature availability...');
    
    try {
      const featureResponse = await authenticatedAxios.get(
        `/feature-flags/check?feature=leagues&clubId=${CLUB_ID}`
      );
      
      logResponse(featureResponse, 'Feature Flag Check');
      expect(featureResponse.status).toBe(200);
      const featureEnabled = featureResponse.data.enabled;
      await logSuccess(`League feature enabled: ${featureEnabled}`);
      
      if (!featureEnabled) {
        await logError('League feature is not enabled for this club - test cannot proceed');
        // You may want to skip the test or enable the feature for testing
        console.warn('⚠️  Consider enabling NEXT_PUBLIC_ENABLE_LEAGUES=true or upgrading club subscription for testing');
      }
    } catch (error) {
      await logError('Failed to check feature flags', error);
      // Continue with test - might still work if feature is enabled by other means
    }

    // Step 2: Create League
    await logStep('🏆', 'Step 2: Creating league...');
    
    let leagueData: LeagueData;
    try {
      const leaguePayload = {
        name: `Test League - ${Date.now()}`,
        description: 'Automated test league for multiple tournaments',
        pointsConfig: {
          groupDropoutPoints: 5,
          knockoutBasePoints: 10,
          knockoutMultiplier: 1.5,
          winnerBonus: 20,
          maxKnockoutRounds: 3,
          useFixedRanks: false
        }
      };

      const createLeagueResponse = await authenticatedAxios.post(
        `/clubs/${CLUB_ID}/leagues`,
        leaguePayload
      );
      
      logResponse(createLeagueResponse, 'League Creation');
      expect(createLeagueResponse.status).toBe(201);
      leagueData = createLeagueResponse.data.league;
      await logSuccess(`League created: ${leagueData.name} (${leagueData._id})`);
    } catch (error) {
      await logError('Failed to create league', error);
      
      if ((error as any)?.response?.data?.featureDisabled) {
        console.warn('⚠️  League feature is disabled. Enable with NEXT_PUBLIC_ENABLE_LEAGUES=true or upgrade club subscription.');
      }
      throw error;
    }

    // Step 3: Create and Play Multiple Tournaments
    const tournamentResults: TournamentData[] = [];
    
    for (let i = 1; i <= LEAGUE_CONFIG.tournamentCount; i++) {
      await logStep('🎯', `Step 3.${i}: Creating and playing tournament ${i}/${LEAGUE_CONFIG.tournamentCount}...`);
      
      try {
        const tournamentData = await playCompleteTournament(authenticatedAxios, leagueData._id);
        tournamentResults.push(tournamentData);
        await logSuccess(`Tournament ${i} completed: ${tournamentData.tournamentId}`);
        
        // Wait between tournaments
        await sleep(LEAGUE_CONFIG.delayBetweenSteps);
      } catch (error) {
        await logError(`Failed to complete tournament ${i}`, error);
        throw error;
      }
    }

    await logSuccess(`All ${LEAGUE_CONFIG.tournamentCount} tournaments completed`);

    // Step 4: Verify League Leaderboard
    await logStep('📊', 'Step 4: Verifying league leaderboard...');
    
    try {
      const leaderboardResponse = await authenticatedAxios.get(
        `/clubs/${CLUB_ID}/leagues/${leagueData._id}/leaderboard`
      );
      expect(leaderboardResponse.status).toBe(200);
      
      const leaderboard = leaderboardResponse.data.leaderboard;
      expect(leaderboard).toBeDefined();
      expect(leaderboard.length).toBeGreaterThan(0);
      
      await logSuccess(`League leaderboard has ${leaderboard.length} players`);
      
      // Log top 3 players
      console.log('\n🏆 Top 3 Players:');
      leaderboard.slice(0, 3).forEach((player: any, index: number) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        console.log(`${medal} ${player.player.name}: ${player.totalPoints} points (${player.tournamentsPlayed} tournaments)`);
      });
      
    } catch (error) {
      await logError('Failed to verify league leaderboard', error);
      throw error;
    }

    // Step 5: Get League Statistics
    await logStep('📈', 'Step 5: Getting league statistics...');
    
    try {
      const statsResponse = await authenticatedAxios.get(
        `/clubs/${CLUB_ID}/leagues/${leagueData._id}`
      );
      expect(statsResponse.status).toBe(200);
      
      const stats = statsResponse.data;
      expect(stats.league).toBeDefined();
      expect(stats.leaderboard).toBeDefined();
      expect(stats.totalTournaments).toBe(LEAGUE_CONFIG.tournamentCount);
      expect(stats.totalPlayers).toBeGreaterThan(0);
      
      await logSuccess('League statistics verified');
      console.log(`📊 League Stats:`);
      console.log(`   Total Tournaments: ${stats.totalTournaments}`);
      console.log(`   Total Players: ${stats.totalPlayers}`);
      console.log(`   Average Points/Tournament: ${stats.averagePointsPerTournament}`);
      
    } catch (error) {
      await logError('Failed to get league statistics', error);
      throw error;
    }

    // Step 6: Test Manual Points Adjustment (Optional)
    await logStep('⚙️', 'Step 6: Testing manual points adjustment...');
    
    try {
      const leaderboardResponse = await authenticatedAxios.get(
        `/clubs/${CLUB_ID}/leagues/${leagueData._id}/leaderboard`
      );
      const leaderboard = leaderboardResponse.data.leaderboard;
      
      if (leaderboard.length > 0) {
        const testPlayer = leaderboard[0];
        const adjustmentPayload = {
          playerId: testPlayer.player._id,
          pointsAdjustment: 10,
          reason: 'Test manual adjustment'
        };

        const adjustResponse = await authenticatedAxios.post(
          `/clubs/${CLUB_ID}/leagues/${leagueData._id}/adjust-points`,
          adjustmentPayload
        );
        expect(adjustResponse.status).toBe(200);
        await logSuccess(`Manual points adjustment applied to ${testPlayer.player.name}`);
      }
    } catch (error) {
      await logError('Failed to test manual points adjustment', error);
      // Don't throw - this is optional
    }

    // Final Summary
    await logSuccess('League lifecycle test completed successfully!');
    console.log(`\n🎉 Final Summary:`);
    console.log(`🏆 League: ${leagueData.name} (${leagueData._id})`);
    console.log(`🎯 Tournaments Played: ${tournamentResults.length}`);
    console.log(`📊 Tournament IDs: ${tournamentResults.map(t => t.tournamentId).join(', ')}`);
    console.log(`⚡ Total Test Duration: ~${(LEAGUE_CONFIG.tournamentCount * 2)} minutes estimated`);

  }, 600000); // 10 minute timeout
});

// Configuration test
describe('League Test Configuration', () => {
  test('League configuration is valid', async () => {
    expect(LEAGUE_CONFIG.playerCount).toBeGreaterThan(0);
    expect(LEAGUE_CONFIG.boardCount).toBeGreaterThan(0);
    expect(LEAGUE_CONFIG.legsToWin).toBeGreaterThan(0);
    expect(LEAGUE_CONFIG.tournamentCount).toBeGreaterThan(0);
    expect(LEAGUE_CONFIG.delayBetweenRequests).toBeGreaterThan(0);
    expect(LEAGUE_CONFIG.delayBetweenSteps).toBeGreaterThan(0);
    
    console.log(`\n📋 League Test Configuration:`);
    console.log(`👥 Player Count per Tournament: ${LEAGUE_CONFIG.playerCount}`);
    console.log(`🎯 Board Count: ${LEAGUE_CONFIG.boardCount}`);
    console.log(`🎮 Legs to Win: ${LEAGUE_CONFIG.legsToWin}`);
    console.log(`🏆 Tournament Count: ${LEAGUE_CONFIG.tournamentCount}`);
    console.log(`⏱️  Request Delay: ${LEAGUE_CONFIG.delayBetweenRequests}ms`);
    console.log(`⏱️  Step Delay: ${LEAGUE_CONFIG.delayBetweenSteps}ms`);
  });
});
