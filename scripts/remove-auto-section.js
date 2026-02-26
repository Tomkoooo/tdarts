#!/usr/bin/env node

const fs = require('fs');

// Load the current hu.json
const huJson = JSON.parse(fs.readFileSync('messages/hu.json', 'utf-8'));

// Check if Auto section exists
if (huJson.Auto) {
  console.log(`Auto section found with ${Object.keys(huJson.Auto).length} keys`);
  
  // Remove Auto section
  delete huJson.Auto;
  
  // Save the updated JSON
  fs.writeFileSync('messages/hu.json', JSON.stringify(huJson, null, 4));
  
  console.log('✓ Successfully removed Auto section from messages/hu.json');
  console.log('\nRemaining top-level sections:');
  Object.keys(huJson).forEach(key => {
    const value = huJson[key];
    if (typeof value === 'object' && !Array.isArray(value)) {
      const subKeys = Object.keys(value).length;
      console.log(`  ${key}: ${subKeys} keys/subsections`);
    }
  });
} else {
  console.log('No Auto section found in messages/hu.json');
}
