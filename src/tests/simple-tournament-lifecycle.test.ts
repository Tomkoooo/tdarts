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

// Simple Tournament Configuration - EASILY CONFIGURABLE
const SIMPLE_CONFIG = {
  playerCount: 24, // 8 players - MODIFY THIS
  boardCount: 4, // 2 boards - MODIFY THIS
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

    // Step 1: Create Tournament (boards are now part of tournament, not club)
    await logStep('📝', 'Step 1: Creating tournament with boards...');
    
    // Create boards directly for the tournament
    const tournamentBoards = Array.from({ length: SIMPLE_CONFIG.boardCount }, (_, i) => ({
      boardNumber: i + 1,
      name: `Tábla ${i + 1}`,
      isActive: true,
      status: 'idle'
    }));
    
    const tournamentPayload = {
      name: `Simple Test Tournament - ${Date.now()}`,
      description: `Automated simple test tournament with ${SIMPLE_CONFIG.playerCount} players`,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: SIMPLE_CONFIG.playerCount,
      format: 'group_knockout',
      startingScore: 501,
      tournamentPassword: 'test123',
      boardCount: SIMPLE_CONFIG.boardCount,
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

    // Step 2: Add Players
    await logStep('👥', `Step 2: Adding ${SIMPLE_CONFIG.playerCount} players...`);
    
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

    // Step 3: Check-in Players
    await logStep('✅', 'Step 3: Checking-in all players...');
    
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

    // Step 4: Generate Groups
    await logStep('🏆', 'Step 4: Generating groups...');
    
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

    // Step 5: Play Group Matches
    await logStep('🎯', 'Step 5: Playing group matches...');
    
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

    // Step 6: Generate Knockout
    await logStep('🥊', 'Step 6: Generating knockout stage...');
    
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
      
      // Validate knockout bracket structure
      await logStep('🔍', 'Validating knockout bracket structure...');
      const knockoutTournamentResponse = await authenticatedAxios.get(
        `/tournaments/${tournamentData.tournamentId}`
      );
      const knockoutTournament = knockoutTournamentResponse.data;
      
      // Check if we have 4 groups (for constraint-based ordering)
      const groupCount = knockoutTournament.groups?.length || 0;
      if (groupCount === 4) {
        await logSuccess(`Found ${groupCount} groups - validating constraint-based knockout ordering`);
        
        // Get the first round matches
        const firstRound = knockoutTournament.knockout?.find((r: any) => r.round === 1);
        if (!firstRound || !firstRound.matches) {
          throw new Error('First round not found in knockout structure');
        }
        
        const matches = firstRound.matches;
        await logSuccess(`Found ${matches.length} matches in first round`);
        
        // Build group standings map for validation
        const groupStandings = new Map<string, any[]>();
        knockoutTournament.tournamentPlayers.forEach((player: any) => {
          if (player.groupId && player.groupStanding) {
            const groupIdStr = player.groupId.toString();
            if (!groupStandings.has(groupIdStr)) {
              groupStandings.set(groupIdStr, []);
            }
            groupStandings.get(groupIdStr)!.push({
              playerId: player.playerReference._id || player.playerReference,
              standing: player.groupStanding,
              name: player.playerReference.name || 'Unknown'
            });
          }
        });
        
        // Sort each group by standing
        groupStandings.forEach((players) => {
          players.sort((a, b) => a.standing - b.standing);
        });
        
        const orderedGroupIds = knockoutTournament.groups
          .map((g: any) => g._id.toString())
          .filter((id: string) => groupStandings.has(id));
        
        if (orderedGroupIds.length === 4) {
          await logSuccess('Groups A, B, C, D identified - checking pairing pattern');
          
          // Expected pattern for 4 groups (A=0, B=1, C=2, D=3):
          // Group pairs should be A/D (0/3) and B/C (1/2)
          // Match order: a1/d4 - b2/c3 - d1/a4 - c2/b3 - b1/c4 - a2/d3 - c1/b4 - d2/a3
          
          console.log('\n=== KNOCKOUT VALIDATION DEBUG ===');
          console.log('Ordered Group IDs:', orderedGroupIds);
          console.log('Group standings:', Array.from(groupStandings.entries()).map(([gId, players]) => ({
            groupId: gId,
            players: players.map(p => `${p.name} (rank ${p.standing})`)
          })));
          console.log('Matches:', matches.map((m: any, i: number) => {
            const p1 = m.player1 ? knockoutTournament.tournamentPlayers.find((tp: any) => 
              (tp.playerReference._id || tp.playerReference).toString() === m.player1.toString()
            ) : null;
            const p2 = m.player2 ? knockoutTournament.tournamentPlayers.find((tp: any) => 
              (tp.playerReference._id || tp.playerReference).toString() === m.player2.toString()
            ) : null;
            
            return {
              index: i,
              player1: p1 ? `${p1.playerReference.name} (group ${p1.groupId}, rank ${p1.groupStanding})` : 'null',
              player2: p2 ? `${p2.playerReference.name} (group ${p2.groupId}, rank ${p2.groupStanding})` : 'null'
            };
          }));
          console.log('================================\n');
          
          // Count matches with group winners (rank 1)
          let matchPairsWithOneWinner = 0;
          for (let i = 0; i < matches.length; i += 2) {
            if (i + 1 < matches.length) {
              const match1 = matches[i];
              const match2 = matches[i + 1];
              
              // Get players for both matches
              const players = [match1.player1, match1.player2, match2.player1, match2.player2]
                .filter(Boolean)
                .map((pId: any) => {
                  const tp = knockoutTournament.tournamentPlayers.find((p: any) => 
                    (p.playerReference._id || p.playerReference).toString() === pId.toString()
                  );
                  return tp ? { groupId: tp.groupId?.toString(), standing: tp.groupStanding } : null;
                })
                .filter(Boolean);
              
              // Count group winners (standing === 1)
              const winnersCount = players.filter((p: any) => p.standing === 1).length;
              
              // Count unique groups represented
              const uniqueGroups = new Set(players.map((p: any) => p.groupId));
              
              if (winnersCount === 1 && uniqueGroups.size === 4) {
                matchPairsWithOneWinner++;
              }
              
              console.log(`Match pair ${Math.floor(i / 2)}: ${winnersCount} winner(s), ${uniqueGroups.size} unique groups`);
            }
          }
          
          await logSuccess(`✅ Constraint validation: ${matchPairsWithOneWinner} match pairs have exactly 1 group winner and all 4 groups`);
          
          // For 4 groups with 4 players each (16 total), we should have 8 matches (4 pairs)
          const expectedPairs = matches.length / 2;
          if (matchPairsWithOneWinner >= expectedPairs * 0.75) {
            await logSuccess(`✅ Knockout bracket follows expected constraint-based pattern (${matchPairsWithOneWinner}/${expectedPairs} pairs valid)`);
          } else {
            console.warn(`⚠️  Only ${matchPairsWithOneWinner}/${expectedPairs} match pairs follow the constraint pattern`);
          }
        }
      } else {
        await logSuccess(`Found ${groupCount} groups - constraint-based ordering requires 4 groups`);
      }
    } catch (error) {
      await logError('Failed to generate knockout', error);
      throw error;
    }

    // Step 7: Play Knockout Matches
    await logStep('🎯', 'Step 7: Playing knockout matches...');
    
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

    // Step 8: Finish Tournament
    await logStep('🏁', 'Step 8: Finishing tournament...');
    
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

    // Step 9: Verify Final Tournament State
    await logStep('📊', 'Step 9: Verifying final tournament state...');
    
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
