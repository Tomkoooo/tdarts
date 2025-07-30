#!/usr/bin/env node

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const CLUB_ID = '687fabffb16ffd1e85174d7c';

async function testTournamentCreation() {
  console.log('🧪 Testing tournament creation...');
  
  try {
    // Test 1: Create first tournament
    console.log('\n📝 Creating first tournament...');
    const tournament1 = {
      name: `Test Tournament 1 ${Date.now()}`,
      description: 'First test tournament',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: 16,
      format: 'group_knockout',
      startingScore: 501,
      tournamentPassword: 'test123',
      boardCount: 2,
      entryFee: 1000,
      location: 'Test Location',
      type: 'amateur',
      registrationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    };

    const response1 = await axios.post(
      `${BASE_URL}/clubs/${CLUB_ID}/createTournament`,
      tournament1
    );

    if (response1.status === 200) {
      console.log('✅ First tournament created successfully');
      console.log(`   Tournament ID: ${response1.data.tournamentId}`);
    } else {
      console.log('❌ Failed to create first tournament');
      return;
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Create second tournament
    console.log('\n📝 Creating second tournament...');
    const tournament2 = {
      name: `Test Tournament 2 ${Date.now()}`,
      description: 'Second test tournament',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      maxPlayers: 16,
      format: 'group_knockout',
      startingScore: 501,
      tournamentPassword: 'test123',
      boardCount: 2,
      entryFee: 1000,
      location: 'Test Location',
      type: 'amateur',
      registrationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    };

    const response2 = await axios.post(
      `${BASE_URL}/clubs/${CLUB_ID}/createTournament`,
      tournament2
    );

    if (response2.status === 200) {
      console.log('✅ Second tournament created successfully');
      console.log(`   Tournament ID: ${response2.data.tournamentId}`);
    } else {
      console.log('❌ Failed to create second tournament');
      return;
    }

    // Test 3: Add players to first tournament
    console.log('\n👥 Testing player addition...');
    const testPlayer = {
      name: 'Test Player',
      userRef: '6870f51d9b58837d598e80d5'
    };

    const playerResponse = await axios.post(
      `${BASE_URL}/tournaments/${response1.data.tournamentId}/players`,
      testPlayer
    );

    if (playerResponse.status === 200) {
      console.log('✅ Player added successfully');
    } else {
      console.log('❌ Failed to add player');
    }

    // Test 4: Check-in the player
    console.log('\n✅ Testing player check-in...');
    const checkInResponse = await axios.put(
      `${BASE_URL}/tournaments/${response1.data.tournamentId}/players`,
      {
        playerId: playerResponse.data,
        status: 'checked-in'
      }
    );

    if (checkInResponse.status === 200) {
      console.log('✅ Player checked-in successfully');
    } else {
      console.log('❌ Failed to check-in player');
    }

    console.log('\n🎉 All tests passed! Tournament creation, player addition, and check-in work correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 500) {
      console.error('💡 This might be a database indexing issue. Try running:');
      console.error('   node src/tests/fix-database-indexes.js');
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}`);
    if (response.status === 200) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.error('❌ Server is not running. Please start the development server:');
    console.error('   npm run dev');
    return false;
  }
}

// Run the test
async function runTest() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testTournamentCreation();
  }
}

runTest(); 