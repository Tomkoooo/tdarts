import axios from 'axios';

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const CLUB_ID = '687fabffb16ffd1e85174d7c';

// Test configuration - 2 parallel tournaments with 16 players each
const CONFIG = {
  playerCount: 16, // 16 players per tournament
  maxPlayers: 16, // Ensure maxPlayers is at least playerCount
  legsToWin: 2,
  delayBetweenRequests: 200, // ms
  delayBetweenSteps: 1000, // ms
  parallelTournaments: 2, // Number of parallel tournaments to simulate
};

// Generate test players based on configuration
const generateTestPlayers = (count: number, tournamentIndex: number) => {
  const players = [];
  for (let i = 0; i < count; i++) {
    players.push({
      name: `Tournament ${tournamentIndex + 1} - Player ${i + 1}`,
    });
  }
  return players;
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

describe('Parallel Tournament Lifecycle Test', () => {
  const tournamentDataArray: TournamentData[] = [];

  test(`Complete Parallel Tournament Lifecycle with ${CONFIG.parallelTournaments} tournaments of ${CONFIG.playerCount} players each`, async () => {
    // Increase timeout for this test
    jest.setTimeout(600000); // 10 minutes
    
    await logStep('🚀', `Starting parallel tournament lifecycle test with ${CONFIG.parallelTournaments} tournaments of ${CONFIG.playerCount} players each...`);

    // Step 1: Get Available Boards
    await logStep('📋', 'Step 1: Getting available boards...');
    
    let availableBoards: any[] = [];
    try {
      const boardsResponse = await axios.get(`${BASE_URL}/clubs/${CLUB_ID}/boards`);
      expect(boardsResponse.status).toBe(200);
      availableBoards = boardsResponse.data.boards || [];
      
      await logSuccess(`Found ${availableBoards.length} available boards`);
      console.log('Available boards:', availableBoards.map((b: any) => b.boardNumber));
      
      if (availableBoards.length < CONFIG.parallelTournaments) {
        throw new Error(`Not enough available boards. Need ${CONFIG.parallelTournaments}, have ${availableBoards.length}`);
      }
    } catch (error) {
      await logError('Failed to get available boards', error);
      throw error;
    }

    // Step 2: Create Multiple Tournaments
    await logStep('📝', `Step 2: Creating ${CONFIG.parallelTournaments} tournaments...`);
    
    const createTournamentWithRetry = async (tournamentIndex: number, attempts = 3) => {
      for (let i = 0; i < attempts; i++) {
        try {
          // Select boards for this tournament (divide available boards between tournaments)
          const boardsPerTournament = Math.floor(availableBoards.length / CONFIG.parallelTournaments);
          const startIndex = tournamentIndex * boardsPerTournament;
          const endIndex = tournamentIndex === CONFIG.parallelTournaments - 1 
            ? availableBoards.length 
            : startIndex + boardsPerTournament;
          
          const selectedBoards = availableBoards
            .slice(startIndex, endIndex)
            .map((board: any) => board.boardNumber);
          
          await logStep('🎯', `Tournament ${tournamentIndex + 1} will use boards: ${selectedBoards.join(', ')}`);
          
          const tournamentPayload = {
            name: `Parallel Test Tournament ${tournamentIndex + 1} - ${Date.now()}-${i + 1}`,
            description: `Automated parallel test tournament ${tournamentIndex + 1} with ${CONFIG.playerCount} players`,
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            maxPlayers: CONFIG.maxPlayers,
            format: 'group_knockout',
            startingScore: 501,
            tournamentPassword: 'test123',
            boardCount: selectedBoards.length,
            selectedBoards: selectedBoards, // Use the selected boards from available boards
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
          const tournamentData = createResponse.data;
          expect(tournamentData).toHaveProperty('tournamentId');
          expect(tournamentData).toHaveProperty('_id');

          await logSuccess(`Tournament ${tournamentIndex + 1} created: ${tournamentData?.tournamentId}`);
          return tournamentData;
        } catch (error: any) {
          if (error.response?.status === 500 && error.response?.data?.error?.includes('duplicate key')) {
            await logError(`Attempt ${i + 1} failed due to duplicate key, retrying...`, error);
            await sleep(1000); // Wait before retry
            continue;
          }
          throw error;
        }
      }
      throw new Error(`Failed to create tournament ${tournamentIndex + 1} after ${attempts} attempts`);
    };

    try {
      // Create tournaments sequentially to avoid conflicts
      for (let i = 0; i < CONFIG.parallelTournaments; i++) {
        const tournamentData = await createTournamentWithRetry(i);
        tournamentDataArray.push(tournamentData);
        await sleep(1000); // Wait between tournament creations
      }
    } catch (error) {
      await logError('Failed to create tournaments', error);
      throw error;
    }

    // Step 3: Add Players to All Tournaments
    await logStep('👥', `Step 3: Adding ${CONFIG.playerCount} players to each tournament...`);
    
    for (let tournamentIndex = 0; tournamentIndex < CONFIG.parallelTournaments; tournamentIndex++) {
      const tournamentData = tournamentDataArray[tournamentIndex];
      const testPlayers = generateTestPlayers(CONFIG.playerCount, tournamentIndex);
      
      try {
        const playerPromises = testPlayers.map(async (player, index) => {
          await sleep(index * 50); // Smaller delay between requests
        const response = await axios.post(
            `${BASE_URL}/tournaments/${tournamentData.tournamentId}/players`,
          player
        );
        expect(response.status).toBe(200);
        return response.data;
      });

      await Promise.all(playerPromises);
        await logSuccess(`Added ${testPlayers.length} players to Tournament ${tournamentIndex + 1}`);
    } catch (error) {
        await logError(`Failed to add players to Tournament ${tournamentIndex + 1}`, error);
      throw error;
      }
    }

    // Step 3.5: Check-in all players in all tournaments
    await logStep('✅', 'Step 3.5: Checking-in all players in all tournaments...');
    await sleep(CONFIG.delayBetweenSteps);

    for (let tournamentIndex = 0; tournamentIndex < CONFIG.parallelTournaments; tournamentIndex++) {
      const tournamentData = tournamentDataArray[tournamentIndex];

    try {
      // Get tournament to see all players
      const tournamentResponse = await axios.get(
          `${BASE_URL}/tournaments/${tournamentData.tournamentId}`
      );
      expect(tournamentResponse.status).toBe(200);

      const tournament = tournamentResponse.data;
      const players = tournament.tournamentPlayers || [];

        await logSuccess(`Found ${players.length} players to check-in for Tournament ${tournamentIndex + 1}`);

      // Check-in each player
      const checkInPromises = players.map(async (player: any, index: number) => {
          await sleep(index * 50); // Smaller delay between requests
        const response = await axios.put(
            `${BASE_URL}/tournaments/${tournamentData.tournamentId}/players`,
          {
            playerId: player.playerReference._id || player.playerReference,
            status: 'checked-in'
          }
        );
        expect(response.status).toBe(200);
        return response.data;
      });

      await Promise.all(checkInPromises);
        await logSuccess(`Checked-in ${players.length} players for Tournament ${tournamentIndex + 1}`);
    } catch (error) {
        await logError(`Failed to check-in players for Tournament ${tournamentIndex + 1}`, error);
      throw error;
      }
    }

    // Step 4: Generate Groups for All Tournaments
    await logStep('🏆', 'Step 4: Generating groups for all tournaments...');
    await sleep(CONFIG.delayBetweenSteps);

    for (let tournamentIndex = 0; tournamentIndex < CONFIG.parallelTournaments; tournamentIndex++) {
      const tournamentData = tournamentDataArray[tournamentIndex];

    try {
      const groupsResponse = await axios.post(
          `${BASE_URL}/tournaments/${tournamentData.tournamentId}/generateGroups`
      );
      expect(groupsResponse.status).toBe(200);
        await logSuccess(`Groups generated for Tournament ${tournamentIndex + 1}`);
    } catch (error) {
        await logError(`Failed to generate groups for Tournament ${tournamentIndex + 1}`, error);
      throw error;
      }
    }

    // Step 5: Play Group Matches for All Tournaments
    await logStep('🎯', 'Step 5: Playing group matches for all tournaments...');
    await sleep(CONFIG.delayBetweenSteps);

    for (let tournamentIndex = 0; tournamentIndex < CONFIG.parallelTournaments; tournamentIndex++) {
      const tournamentData = tournamentDataArray[tournamentIndex];

    try {
      const tournamentResponse = await axios.get(
          `${BASE_URL}/tournaments/${tournamentData.tournamentId}`
      );
      expect(tournamentResponse.status).toBe(200);

      const tournament = tournamentResponse.data;
      expect(tournament.groups).toBeDefined();
      expect(tournament.groups.length).toBeGreaterThan(0);

      // Get all group matches using the correct API endpoint
      const allGroupMatches: MatchData[] = [];
      for (const group of tournament.groups) {
        try {
            console.log(`Fetching matches for board ${group.board} in Tournament ${tournamentIndex + 1}`);
          
          const matchesResponse = await axios.get(
              `${BASE_URL}/boards/${tournamentData.tournamentId}/${group.board}/matches`
          );
          
          if (matchesResponse.status === 200 && matchesResponse.data.matches) {
            const boardMatches = matchesResponse.data.matches;
              console.log(`Found ${boardMatches.length} matches for board ${group.board} in Tournament ${tournamentIndex + 1}`);
            allGroupMatches.push(...boardMatches);
          }
        } catch (error) {
            await logError(`Failed to get matches for board ${group.board} in Tournament ${tournamentIndex + 1}`, error);
        }
      }

        await logSuccess(`Found ${allGroupMatches.length} group matches for Tournament ${tournamentIndex + 1}`);

      if (allGroupMatches.length === 0) {
          await logError(`No group matches found for Tournament ${tournamentIndex + 1}. This might indicate an issue with group generation.`);
        console.log('Tournament groups:', JSON.stringify(tournament.groups, null, 2));
          throw new Error(`No group matches found for Tournament ${tournamentIndex + 1}`);
      }

        // Play all group matches
      for (const match of allGroupMatches) {
        const matchId = match._id?.toString() || match._id;
          await logStep('🎮', `Playing match in Tournament ${tournamentIndex + 1}: ${match.player1?.playerId?.name || 'Unknown'} vs ${match.player2?.playerId?.name || 'Unknown'}`);
        
        try {
          // Start the match
          const startResponse = await axios.post(
              `${BASE_URL}/boards/${tournamentData.tournamentId}/${match.boardReference}/start`,
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
            await logError(`Failed to play match ${matchId} in Tournament ${tournamentIndex + 1}`, error);
          }
        }

        await logSuccess(`All group matches completed for Tournament ${tournamentIndex + 1}`);
      } catch (error) {
        await logError(`Failed to process group matches for Tournament ${tournamentIndex + 1}`, error);
        throw error;
      }
    }

    // Step 6: Generate Knockout for All Tournaments
    await logStep('🥊', 'Step 6: Generating knockout stage for all tournaments...');
    await sleep(CONFIG.delayBetweenSteps);

    for (let tournamentIndex = 0; tournamentIndex < CONFIG.parallelTournaments; tournamentIndex++) {
      const tournamentData = tournamentDataArray[tournamentIndex];

    try {
      // Get current tournament data to calculate playersCount
      const currentTournamentResponse = await axios.get(
          `${BASE_URL}/tournaments/${tournamentData.tournamentId}`
      );
      expect(currentTournamentResponse.status).toBe(200);
      const currentTournament = currentTournamentResponse.data;
      
      // Calculate the appropriate playersCount (nearest power of 2)
      const totalPlayers = currentTournament.tournamentPlayers.filter((p: any) => p.status === 'checked-in').length;
      const playersCount = calculateKnockoutPlayersCount(totalPlayers);
      
        await logSuccess(`Calculated playersCount: ${playersCount} (from ${totalPlayers} total players) for Tournament ${tournamentIndex + 1}`);
      
      const knockoutResponse = await axios.post(
          `${BASE_URL}/tournaments/${tournamentData.tournamentId}/generateKnockout`,
        {
          playersCount: playersCount,
          knockoutMethod: 'automatic'
        }
      );
      expect(knockoutResponse.status).toBe(200);
        await logSuccess(`Knockout stage generated for Tournament ${tournamentIndex + 1}`);
    } catch (error) {
        await logError(`Failed to generate knockout for Tournament ${tournamentIndex + 1}`, error);
      throw error;
      }
    }

    // Step 7: Play Knockout Matches for All Tournaments (including next rounds)
    await logStep('🎯', 'Step 7: Playing knockout matches for all tournaments...');
    await sleep(CONFIG.delayBetweenSteps);

    for (let tournamentIndex = 0; tournamentIndex < CONFIG.parallelTournaments; tournamentIndex++) {
      const tournamentData = tournamentDataArray[tournamentIndex];
      
      try {
        // Play all knockout rounds until final
        let currentRound = 1;
        let hasMoreRounds = true;
        
        while (hasMoreRounds) {
          await logStep('🎯', `Playing knockout round ${currentRound} for Tournament ${tournamentIndex + 1}...`);
          
      const updatedTournamentResponse = await axios.get(
            `${BASE_URL}/tournaments/${tournamentData.tournamentId}`
      );
      expect(updatedTournamentResponse.status).toBe(200);

      const updatedTournament = updatedTournamentResponse.data;
      expect(updatedTournament.knockout).toBeDefined();
      expect(updatedTournament.knockout.length).toBeGreaterThan(0);

          // Find current round
          const currentRoundData = updatedTournament.knockout.find((r: any) => r.round === currentRound);
          if (!currentRoundData || !currentRoundData.matches || currentRoundData.matches.length === 0) {
            await logSuccess(`No more matches in round ${currentRound} for Tournament ${tournamentIndex + 1}`);
            break;
          }

          // Get all knockout matches from all boards for current round
      const allKnockoutMatches: MatchData[] = [];
      
      // Get tournament data to find which boards have knockout matches
          const tournamentResponse = await axios.get(`${BASE_URL}/tournaments/${tournamentData.tournamentId}`);
      if (tournamentResponse.status === 200 && tournamentResponse.data.groups) {
        // Use the same boards that were used for groups
        for (const group of tournamentResponse.data.groups) {
          try {
                console.log(`Fetching knockout matches for board ${group.board} in Tournament ${tournamentIndex + 1}, round ${currentRound}`);
            
            const matchesResponse = await axios.get(
                  `${BASE_URL}/boards/${tournamentData.tournamentId}/${group.board}/matches`
            );
            
            if (matchesResponse.status === 200 && matchesResponse.data.matches) {
                  const boardMatches = matchesResponse.data.matches.filter((match: any) => 
                    match.type === 'knockout' && match.round === currentRound
                  );
                  console.log(`Found ${boardMatches.length} knockout matches for board ${group.board} in Tournament ${tournamentIndex + 1}, round ${currentRound}`);
              allKnockoutMatches.push(...boardMatches);
            }
          } catch (error) {
                await logError(`Failed to get knockout matches for board ${group.board} in Tournament ${tournamentIndex + 1}`, error);
              }
            }
          }

          await logSuccess(`Found ${allKnockoutMatches.length} knockout matches for round ${currentRound} in Tournament ${tournamentIndex + 1}`);

          if (allKnockoutMatches.length === 0) {
            await logSuccess(`No matches found for round ${currentRound} in Tournament ${tournamentIndex + 1}`);
            break;
          }

          // Play all knockout matches in current round
      for (const match of allKnockoutMatches) {
        const matchId = match._id?.toString() || match._id;
            await logStep('🎮', `Playing knockout match in Tournament ${tournamentIndex + 1}, round ${currentRound}: ${match.player1?.playerId?.name || 'Unknown'} vs ${match.player2?.playerId?.name || 'Unknown'}`);
        
        try {
          // Start the match
          const startResponse = await axios.post(
                `${BASE_URL}/boards/${tournamentData.tournamentId}/${match.boardReference}/start`,
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
              await logError(`Failed to play knockout match ${matchId} in Tournament ${tournamentIndex + 1}`, error);
            }
          }

          await logSuccess(`All knockout matches completed for round ${currentRound} in Tournament ${tournamentIndex + 1}`);

          // Check if this was the final round (only 1 match)
          if (allKnockoutMatches.length === 1) {
            await logSuccess(`Final round completed for Tournament ${tournamentIndex + 1}`);
            hasMoreRounds = false;
          } else {
            // Generate next round
            await logStep('🔄', `Generating next round for Tournament ${tournamentIndex + 1}...`);
            try {
              const nextRoundResponse = await axios.post(
                `${BASE_URL}/tournaments/${tournamentData.tournamentId}/generateNextRound`,
                { currentRound }
              );
              expect(nextRoundResponse.status).toBe(200);
              await logSuccess(`Next round generated for Tournament ${tournamentIndex + 1}`);
              currentRound++;
            } catch (error) {
              await logError(`Failed to generate next round for Tournament ${tournamentIndex + 1}`, error);
              hasMoreRounds = false;
            }
          }
        }

        await logSuccess(`All knockout matches completed for Tournament ${tournamentIndex + 1}`);
    } catch (error) {
        await logError(`Failed to process knockout matches for Tournament ${tournamentIndex + 1}`, error);
      throw error;
      }
    }

    // Step 8: Finish All Tournaments
    await logStep('🏁', 'Step 8: Finishing all tournaments...');
    await sleep(CONFIG.delayBetweenSteps);

    for (let tournamentIndex = 0; tournamentIndex < CONFIG.parallelTournaments; tournamentIndex++) {
      const tournamentData = tournamentDataArray[tournamentIndex];

    try {
      const finishResponse = await axios.post(
          `${BASE_URL}/tournaments/${tournamentData.tournamentId}/finish`
      );
      expect(finishResponse.status).toBe(200);
        await logSuccess(`Tournament ${tournamentIndex + 1} finished`);
    } catch (error) {
        await logError(`Failed to finish Tournament ${tournamentIndex + 1}`, error);
      throw error;
      }
    }

    // Step 9: Verify Final Tournament States
    await logStep('📊', 'Step 9: Verifying final tournament states...');
    
    for (let tournamentIndex = 0; tournamentIndex < CONFIG.parallelTournaments; tournamentIndex++) {
      const tournamentData = tournamentDataArray[tournamentIndex];
      
    try {
      const finalTournamentResponse = await axios.get(
          `${BASE_URL}/tournaments/${tournamentData.tournamentId}`
      );
      expect(finalTournamentResponse.status).toBe(200);

      const finalTournament = finalTournamentResponse.data;
      expect(finalTournament.tournamentSettings.status).toBe('finished');
        expect(finalTournament.tournamentPlayers.length).toBe(CONFIG.playerCount);

        await logSuccess(`Tournament ${tournamentIndex + 1} lifecycle test completed successfully!`);
        console.log(`\n📈 Final tournament ${tournamentIndex + 1} status: ${finalTournament.tournamentSettings.status}`);
      console.log(`👥 Total players: ${finalTournament.tournamentPlayers.length}`);
        console.log(`🏆 Tournament ID: ${tournamentData.tournamentId}`);
      console.log(`🎯 Group matches played: ${finalTournament.groups?.reduce((acc: number, group: any) => acc + group.matches.length, 0) || 0}`);
      console.log(`🥊 Knockout matches played: ${finalTournament.knockout?.reduce((acc: number, round: any) => acc + round.matches.length, 0) || 0}`);
    } catch (error) {
        await logError(`Failed to verify final tournament state for Tournament ${tournamentIndex + 1}`, error);
      throw error;
      }
    }

    await logSuccess('All parallel tournament lifecycle tests completed successfully!');
  }, 600000); // 10 minute timeout

  // Cleanup test
  test('Cleanup - Log test tournament IDs for manual cleanup', async () => {
    if (tournamentDataArray.length > 0) {
      console.log(`\n🧹 Test tournament IDs for manual cleanup:`);
      tournamentDataArray.forEach((tournamentData, index) => {
        console.log(`Tournament ${index + 1}: ${tournamentData.tournamentId}`);
        console.log(`🔗 Tournament ${index + 1} URL: http://localhost:3000/tournaments/${tournamentData.tournamentId}`);
      });
    }
  });

  // Test for tournament standing logic
  test('Verify tournament standing logic after finishing tournaments', async () => {
    if (tournamentDataArray.length === 0) {
      console.log('⏭️  Skipping tournament standing test - no tournament data available');
      return;
    }

    for (let tournamentIndex = 0; tournamentIndex < tournamentDataArray.length; tournamentIndex++) {
      const tournamentData = tournamentDataArray[tournamentIndex];

    try {
      // Get the finished tournament
      const tournamentResponse = await axios.get(
        `${BASE_URL}/tournaments/${tournamentData.tournamentId}`
      );
      expect(tournamentResponse.status).toBe(200);

      const tournament = tournamentResponse.data;
      
      // Verify tournament is finished
      expect(tournament.tournamentSettings.status).toBe('finished');
      
      // Verify all players have tournamentStanding
      const checkedInPlayers = tournament.tournamentPlayers.filter((p: any) => p.status === 'checked-in');
      expect(checkedInPlayers.length).toBeGreaterThan(0);
      
      checkedInPlayers.forEach((player: any) => {
        expect(player.tournamentStanding).toBeDefined();
        expect(typeof player.tournamentStanding).toBe('number');
        expect(player.tournamentStanding).toBeGreaterThan(0);
        expect(player.tournamentStanding).toBeLessThanOrEqual(checkedInPlayers.length);
        
        // Verify finalPosition matches tournamentStanding
        expect(player.finalPosition).toBe(player.tournamentStanding);
        
        // Verify eliminatedIn is set
        expect(player.eliminatedIn).toBeDefined();
        expect(typeof player.eliminatedIn).toBe('string');
        
        // Verify finalStats is set
        expect(player.finalStats).toBeDefined();
        expect(typeof player.finalStats).toBe('object');
      });

      // Verify positions are unique (no duplicates)
      const positions = checkedInPlayers.map((p: any) => p.tournamentStanding);
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(positions.length);

      // Verify we have exactly one winner (position 1)
      const winners = checkedInPlayers.filter((p: any) => p.tournamentStanding === 1);
      expect(winners.length).toBe(1);

      // Verify we have exactly one runner-up (position 2) if knockout exists
      if (tournament.knockout && tournament.knockout.length > 0) {
        const runnersUp = checkedInPlayers.filter((p: any) => p.tournamentStanding === 2);
        expect(runnersUp.length).toBe(1);
      }

      // Log the standings for verification
        console.log(`\n🏆 Tournament ${tournamentIndex + 1} Standings:`);
      const sortedPlayers = checkedInPlayers.sort((a: any, b: any) => a.tournamentStanding - b.tournamentStanding);
      sortedPlayers.forEach((player: any) => {
        const playerName = player.playerReference?.name || player.playerReference?.toString() || 'Unknown';
        console.log(`${player.tournamentStanding}. ${playerName} - ${player.eliminatedIn}`);
      });

        await logSuccess(`Tournament ${tournamentIndex + 1} standing logic verified successfully`);
    } catch (error) {
        await logError(`Failed to verify tournament ${tournamentIndex + 1} standing logic`, error);
      throw error;
      }
    }
  }, 60000); // 1 minute timeout
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
    expect(CONFIG.playerCount).toBeGreaterThan(0);
    expect(CONFIG.maxPlayers).toBeGreaterThanOrEqual(CONFIG.playerCount);
    expect(CONFIG.legsToWin).toBeGreaterThan(0);
    expect(CONFIG.delayBetweenRequests).toBeGreaterThan(0);
    expect(CONFIG.delayBetweenSteps).toBeGreaterThan(0);
    expect(CONFIG.parallelTournaments).toBeGreaterThan(0);
    
    console.log(`\n📋 Test Configuration:`);
    console.log(`👥 Player Count per Tournament: ${CONFIG.playerCount}`);
    console.log(`🎯 Max Players per Tournament: ${CONFIG.maxPlayers}`);
    console.log(`🎮 Legs to Win: ${CONFIG.legsToWin}`);
    console.log(`⏱️  Request Delay: ${CONFIG.delayBetweenRequests}ms`);
    console.log(`⏱️  Step Delay: ${CONFIG.delayBetweenSteps}ms`);
    console.log(`🔄 Parallel Tournaments: ${CONFIG.parallelTournaments}`);
  });
}); 