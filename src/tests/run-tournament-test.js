#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get player count from command line argument
const playerCount = process.argv[2] ? parseInt(process.argv[2]) : 16;

if (isNaN(playerCount) || playerCount < 4 || playerCount > 32) {
  console.error('❌ Please provide a valid player count between 4 and 32');
  console.error('Usage: node run-tournament-test.js <playerCount>');
  console.error('Example: node run-tournament-test.js 12');
  process.exit(1);
}

console.log(`🎯 Running tournament test with ${playerCount} players...`);

// Read the test file
const testFilePath = path.join(__dirname, 'tournament-lifecycle.test.ts');
let testContent = fs.readFileSync(testFilePath, 'utf8');

// Update the configuration
const configRegex = /const CONFIG = \{[\s\S]*?\};/;
const newConfig = `const CONFIG = {
  playerCount: ${playerCount}, // Change this to test with different numbers of players
  maxPlayers: ${Math.max(playerCount, 16)}, // Ensure maxPlayers is at least playerCount
  boardCount: 2,
  legsToWin: 2,
  delayBetweenRequests: 200, // ms
  delayBetweenSteps: 1000, // ms
};`;

testContent = testContent.replace(configRegex, newConfig);

// Write the updated test file
fs.writeFileSync(testFilePath, testContent);

console.log(`✅ Updated test configuration for ${playerCount} players`);

// Run the test
try {
  console.log('🚀 Starting Jest test...');
  console.log('⏱️  This may take several minutes...');
  
  execSync('npm test -- src/tests/tournament-lifecycle.test.ts --verbose', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('🎉 Test completed successfully!');
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
} 