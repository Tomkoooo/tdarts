#!/usr/bin/env node

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const CLUB_ID = '687fabffb16ffd1e85174d7c';

console.log('🧹 Cleaning up test tournaments...');

// This script would need a delete endpoint to work properly
// For now, it just lists tournaments that should be cleaned up

async function cleanupTestTournaments() {
  try {
    // Get tournaments for the club
    const response = await axios.get(`${BASE_URL}/clubs/${CLUB_ID}/tournaments`);
    
    if (response.status === 200 && response.data) {
      const tournaments = response.data;
      const testTournaments = tournaments.filter(t => 
        t.name && t.name.includes('Test Tournament')
      );
      
      console.log(`Found ${testTournaments.length} test tournaments:`);
      
      testTournaments.forEach(tournament => {
        console.log(`- ${tournament.tournamentId}: ${tournament.name} (${tournament.tournamentSettings?.status || 'unknown'})`);
      });
      
      if (testTournaments.length > 0) {
        console.log('\n⚠️  To clean up these tournaments, you need to:');
        console.log('1. Add a delete endpoint to your API');
        console.log('2. Or manually delete them from the database');
        console.log('3. Or mark them as deleted in the UI');
      } else {
        console.log('✅ No test tournaments found to clean up');
      }
    }
  } catch (error) {
    console.error('❌ Failed to get tournaments:', error.message);
  }
}

cleanupTestTournaments(); 