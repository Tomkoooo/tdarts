#!/usr/bin/env node

const fs = require('fs');

// Load files
const huJson = JSON.parse(fs.readFileSync('messages/hu.json', 'utf-8'));
const newStructure = JSON.parse(fs.readFileSync('scripts/new-structure.json', 'utf-8'));

// Merge function
function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Merge Admin structure
if (!huJson.Admin) huJson.Admin = {};
deepMerge(huJson.Admin, newStructure.Admin);

// Merge Tournament structure
if (!huJson.Tournament) huJson.Tournament = {};
deepMerge(huJson.Tournament, newStructure.Tournament);

// Merge Club structure
if (!huJson.Club) huJson.Club = {};
deepMerge(huJson.Club, newStructure.Club);

// Merge Board
if (!huJson.Board) huJson.Board = {};
Object.assign(huJson.Board, newStructure.Board);

// Merge Feedback
if (!huJson.Feedback) huJson.Feedback = {};
Object.assign(huJson.Feedback, newStructure.Feedback);

// Merge Common (but don't overwrite existing Common keys)
if (!huJson.Common) huJson.Common = {};
for (const [key, value] of Object.entries(newStructure.Common)) {
  if (!huJson.Common[key]) {
    huJson.Common[key] = value;
  }
}

// Keep Auto for now (we'll remove it after updating all files)
// Create a backup copy
fs.writeFileSync('messages/hu.json.backup', JSON.stringify(huJson, null, 4));

// Write the updated JSON (with 4-space indentation to match original)
fs.writeFileSync('messages/hu.json', JSON.stringify(huJson, null, 4));

console.log('✓ Successfully merged translations into messages/hu.json');
console.log('✓ Backup created at messages/hu.json.backup');
console.log('\nMerged sections:');
console.log(`  Admin: ${Object.keys(huJson.Admin).length} subsections`);
console.log(`  Tournament: ${Object.keys(huJson.Tournament).length} subsections`);
console.log(`  Club: ${Object.keys(huJson.Club).length} subsections`);
console.log(`  Board: ${Object.keys(huJson.Board).length} keys`);
console.log(`  Feedback: ${Object.keys(huJson.Feedback).length} keys`);
console.log(`  Common: ${Object.keys(huJson.Common).length} keys`);
