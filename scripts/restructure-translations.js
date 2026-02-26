#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load the current hu.json
const huJson = JSON.parse(fs.readFileSync('messages/hu.json', 'utf-8'));
const autoSection = huJson.Auto;
const analysis = JSON.parse(fs.readFileSync('scripts/auto-keys-analysis.json', 'utf-8'));

// Helper to create semantic key names
function createSemanticKey(originalKey, value, context) {
  // Remove random suffixes like _123a, _xyz4
  let clean = originalKey.replace(/_[a-z0-9]{4}$/i, '');
  
  // Common patterns
  const patterns = {
    'kezelő': 'manager',
    'létrehozása': 'creation',
    'kezelése': 'management',
    'statisztikák': 'stats',
    'részletes': 'detailed',
    'hozzáadása': 'add',
    'eltávolítása': 'remove',
    'módosítása': 'edit',
    'törlése': 'delete',
    'mentése': 'save',
    'betöltése': 'loading',
    'frissítése': 'update'
  };
  
  for (const [hu, en] of Object.entries(patterns)) {
    if (clean.includes(hu)) {
      return clean.replace(hu, en);
    }
  }
  
  return clean;
}

// Build the new structure
const newStructure = {
  Admin: {
    common: {},
    announcements: {},
    clubs: {},
    tournaments: {},
    users: {},
    errors: {},
    settings: {},
    emails: {},
    todos: {},
    feedback: {},
    leagues: {},
    components: {}
  },
  Tournament: {
    live: {},
    tv: {},
    components: {}
  },
  Club: {
    pages: {},
    components: {}
  },
  Board: {},
  Feedback: {},
  Common: {}
};

// Mapping from old keys to new paths
const keyMapping = {};

// Duplicates that should go to Common
const commonDuplicates = [
  'frissítés', 'mégse', 'státusz', 'műveletek', 'nincs_találat_a',
  'hiba_történt', 'betöltés', 'létrehozás', 'újrapróbálás',
  'keresés', 'bezárás', 'mentés', 'vissza', 'mégse', 'törlés'
];

// Admin common duplicates
const adminCommonDuplicates = [
  'összesen', 'találat_oldal', 'törölve', 'aktív', 'létrehozva',
  'hiba_történt_az', 'klub', 'versenyek', 'játékosok'
];

// Process each category
for (const [category, keys] of Object.entries(analysis)) {
  const parts = category.split('.');
  
  keys.forEach(oldKey => {
    const value = autoSection[oldKey];
    if (!value) return;
    
    // Determine if this should go to common
    if (commonDuplicates.includes(oldKey)) {
      if (!newStructure.Common[oldKey]) {
        newStructure.Common[oldKey] = value;
        keyMapping[oldKey] = { newPath: 'Common', newKey: oldKey };
      }
      return;
    }
    
    // Admin common
    if (parts[0] === 'Admin' && adminCommonDuplicates.includes(oldKey)) {
      if (!newStructure.Admin.common[oldKey]) {
        newStructure.Admin.common[oldKey] = value;
        keyMapping[oldKey] = { newPath: 'Admin.common', newKey: oldKey, categories: [category] };
      } else {
        keyMapping[oldKey].categories.push(category);
      }
      return;
    }
    
    // Place in specific category
    let target;
    if (parts[0] === 'Admin' && parts[1]) {
      target = newStructure.Admin[parts[1]];
    } else if (parts[0] === 'Tournament' && parts[1]) {
      target = newStructure.Tournament[parts[1]];
    } else if (parts[0] === 'Club' && parts[1]) {
      target = newStructure.Club[parts[1]];
    } else if (parts[0] === 'Board') {
      target = newStructure.Board;
    } else if (parts[0] === 'Feedback') {
      target = newStructure.Feedback;
    } else if (parts[0] === 'Common') {
      target = newStructure.Common;
    }
    
    if (target && !target[oldKey]) {
      target[oldKey] = value;
      keyMapping[oldKey] = { 
        newPath: category, 
        newKey: oldKey,
        categories: [category]
      };
    }
  });
}

// Save the new structure
fs.writeFileSync('scripts/new-structure.json', JSON.stringify(newStructure, null, 2));

// Save the mapping
fs.writeFileSync('scripts/key-mapping.json', JSON.stringify(keyMapping, null, 2));

console.log('✓ Generated new structure in scripts/new-structure.json');
console.log('✓ Generated key mapping in scripts/key-mapping.json');
console.log(`  Total keys mapped: ${Object.keys(keyMapping).length}`);
console.log(`  Common keys: ${Object.keys(newStructure.Common).length}`);
console.log(`  Admin.common keys: ${Object.keys(newStructure.Admin.common).length}`);
