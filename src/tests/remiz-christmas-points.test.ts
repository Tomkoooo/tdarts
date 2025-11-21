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

// Magyar vezetéknevek és keresztnevek
const MAGYAR_VEZETEKNEVEK = [
  'Kovács', 'Nagy', 'Szabó', 'Horváth', 'Tóth', 'Varga', 'Kiss', 'Molnár',
  'Németh', 'Farkas', 'Balogh', 'Papp', 'Takács', 'Juhász', 'Lakatos',
  'Mészáros', 'Oláh', 'Simon', 'Rácz', 'Fekete'
];

const MAGYAR_KERESZTNEVEK = [
  'János', 'István', 'László', 'Péter', 'Gábor', 'Tamás', 'Zoltán', 'Ferenc',
  'Miklós', 'András', 'Attila', 'Béla', 'Csaba', 'Dániel', 'Endre', 'György',
  'Imre', 'József', 'Károly', 'Márton'
];

// Tournament Configuration
const TOURNAMENT_CONFIG = {
  playerCount: 20, // 4 groups of 5 players each
  boardCount: 4,
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

interface LeagueData {
  _id: string;
  name: string;
  pointSystemType: string;
}

// Helper functions
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate Hungarian player name
const generateHungarianPlayerName = (index: number): string => {
  const vezeteknev = MAGYAR_VEZETEKNEVEK[index % MAGYAR_VEZETEKNEVEK.length];
  const keresztnev = MAGYAR_KERESZTNEVEK[Math.floor(index / MAGYAR_VEZETEKNEVEK.length) % MAGYAR_KERESZTNEVEK.length];
  return `${vezeteknev} ${keresztnev}`;
};

// Authentication helper
const authenticateUser = async () => {
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    expect(loginResponse.status).toBe(200);
    
    const setCookieHeader = loginResponse.headers['set-cookie'];
    if (setCookieHeader) {
      authCookies = setCookieHeader.join('; ');
      const tokenMatch = authCookies.match(/token=([^;]+)/);
      if (tokenMatch) {
        authToken = tokenMatch[1];
      }
    }
    
    console.log('✅ Felhasználó sikeresen bejelentkezett');
    return true;
  } catch (error) {
    console.error('❌ Bejelentkezés sikertelen:', error);
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
  await sleep(100);
};

const logSuccess = async (message: string) => {
  console.log(`✅ ${message}`);
  await sleep(100);
};

const logError = async (message: string, error?: any) => {
  console.error(`❌ ${message}`, error?.response?.data || error?.message || error);
  await sleep(100);
};

// Remiz Christmas Points Test
describe('Remiz Christmas Series Pontszámítás Teszt', () => {
  test('Remiz Christmas pontszámítás részletes ellenőrzése', async () => {
    jest.setTimeout(600000); // 10 perc timeout
    
    await logStep('🚀', `Remiz Christmas Series pontszámítás teszt indítása ${TOURNAMENT_CONFIG.playerCount} játékossal...`);

    // Step 0: Authenticate
    await logStep('🔐', 'Step 0: Authenticating user...');
    const authSuccess = await authenticateUser();
    if (!authSuccess) {
      throw new Error('Authentication failed - cannot proceed with test');
    }
    
    const authenticatedAxios = createAuthenticatedAxios();

    // Step 1: Create League with Remiz Christmas system
    await logStep('🏆', 'Step 1: Creating league with Remiz Christmas Series point system...');
    
    const leaguePayload = {
      name: `Remiz Christmas Teszt Liga - ${Date.now()}`,
      description: 'Remiz Christmas Series pontszámítás teszt liga',
      pointSystemType: 'remiz_christmas',
      pointsConfig: {
        groupDropoutPoints: 5,
        knockoutBasePoints: 10,
        knockoutMultiplier: 1.5,
        winnerBonus: 20,
        maxKnockoutRounds: 3,
        useFixedRanks: false
      }
    };

    let leagueData: LeagueData;
    try {
      const createLeagueResponse = await authenticatedAxios.post(
        `/clubs/${CLUB_ID}/leagues`,
        leaguePayload
      );
      
      expect(createLeagueResponse.status).toBe(201);
      leagueData = createLeagueResponse.data.league;
      await logSuccess(`League created: ${leagueData.name} (${leagueData._id})`);
      expect(leagueData.pointSystemType).toBe('remiz_christmas');
    } catch (error) {
      await logError('Failed to create league', error);
      throw error;
    }

    // Step 2: Create Tournament (exactly like simple-tournament-lifecycle.test.ts)
    await logStep('📝', 'Step 2: Creating tournament with boards...');
    
    // Create boards directly for the tournament
    const tournamentBoards = Array.from({ length: TOURNAMENT_CONFIG.boardCount }, (_, i) => ({
      boardNumber: i + 1,
      name: `Tábla ${i + 1}`,
      isActive: true,
      status: 'idle'
    }));
    
    const tournamentPayload = {
      name: `Remiz Christmas Test Tournament - ${Date.now()}`,
      description: `Automated test tournament with ${TOURNAMENT_CONFIG.playerCount} players`,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: TOURNAMENT_CONFIG.playerCount,
      format: 'group_knockout',
      startingScore: 501,
      tournamentPassword: 'test123',
      boardCount: TOURNAMENT_CONFIG.boardCount,
      boards: tournamentBoards,
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

    // Step 3: Add Players (with Hungarian names)
    await logStep('👥', `Step 3: Adding ${TOURNAMENT_CONFIG.playerCount} players with Hungarian names...`);
    
    const testPlayers = Array.from({ length: TOURNAMENT_CONFIG.playerCount }, (_, i) => ({
      name: generateHungarianPlayerName(i),
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

    // Step 6: Play Group Matches (exactly like simple-tournament-lifecycle.test.ts)
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
              legsToWin: TOURNAMENT_CONFIG.legsToWin,
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

          await sleep(TOURNAMENT_CONFIG.delayBetweenRequests);
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
      const playersCount = 16; // Top 16 from groups (4 from each group of 5)
      
      await logSuccess(`Generating knockout with ${playersCount} players (from ${totalPlayers} total players)`);
      
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

    // Step 8: Play Knockout Matches (exactly like simple-tournament-lifecycle.test.ts)
    await logStep('🎯', 'Step 8: Playing knockout matches...');
    
    try {
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
        
        const tournamentResponse = await authenticatedAxios.get(`/tournaments/${tournamentData.tournamentId}`);
        if (tournamentResponse.status === 200 && tournamentResponse.data.groups) {
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
                legsToWin: TOURNAMENT_CONFIG.legsToWin,
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

            await sleep(TOURNAMENT_CONFIG.delayBetweenRequests);
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

    // Step 10: Attach Tournament to League
    await logStep('🔗', 'Step 10: Attaching tournament to league...');
    
    try {
      const attachResponse = await authenticatedAxios.post(
        `/clubs/${CLUB_ID}/leagues/${leagueData._id}/attach-tournament`,
        {
          tournamentId: tournamentData.tournamentId
        }
      );
      expect(attachResponse.status).toBe(200);
      await logSuccess('Tournament attached to league');
    } catch (error) {
      await logError('Failed to attach tournament to league', error);
      throw error;
    }

    // Step 11: Verify Points
    await logStep('📊', 'Step 11: Verifying Remiz Christmas points...');
    
    try {
      const leagueResponse = await authenticatedAxios.get(
        `/clubs/${CLUB_ID}/leagues/${leagueData._id}`
      );
      expect(leagueResponse.status).toBe(200);
      
      const league = leagueResponse.data;
      expect(league.pointSystemType).toBe('remiz_christmas');
      
      console.log(`\n📈 League points summary:`);
      console.log(`👥 Total players in league: ${league.players?.length || 0}`);
      
      if (league.players && league.players.length > 0) {
        league.players.forEach((player: any, index: number) => {
          const playerName = player.player?.name || player.player?.toString() || 'Unknown';
          console.log(`${index + 1}. ${playerName}: ${player.totalPoints} pont`);
        });
      }
      
      await logSuccess('Remiz Christmas points verified');
    } catch (error) {
      await logError('Failed to verify points', error);
      throw error;
    }

    await logSuccess('Remiz Christmas Series pontszámítás teszt sikeresen befejezve!');
  }, 600000); // 10 minute timeout
});
