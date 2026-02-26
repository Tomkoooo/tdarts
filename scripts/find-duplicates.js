#!/usr/bin/env node

const fs = require('fs');

const analysis = JSON.parse(fs.readFileSync('scripts/auto-keys-analysis.json', 'utf-8'));

// Build a map of key -> categories
const keyMap = new Map();

for (const [category, keys] of Object.entries(analysis)) {
  for (const key of keys) {
    if (!keyMap.has(key)) {
      keyMap.set(key, []);
    }
    keyMap.get(key).push(category);
  }
}

// Find duplicates
const duplicates = {};
const commonKeys = {};

for (const [key, categories] of keyMap.entries()) {
  if (categories.length > 1) {
    duplicates[key] = categories;
  }
}

// Identify truly common keys that should be in Common
const commonCandidates = [
  'betöltés', 'hiba_történt', 'frissítés', 'mégse', 'mentés', 
  'státusz', 'műveletek', 'összes', 'összesen', 'keresés',
  'klub', 'verseny', 'versenyek', 'játékosok', 'létrehozva',
  'nincs_találat_a', 'találat_oldal', 'törölve', 'aktív',
  'minden_típus', 'platform', 'hiba_történt_az', 'kategória',
  'típus', 'mód', 'dátum'
];

for (const [key, categories] of Object.entries(duplicates)) {
  // Check if it's a common term used across multiple unrelated areas
  if (categories.length >= 3 || commonCandidates.some(c => key.includes(c))) {
    commonKeys[key] = categories;
  }
}

console.log('=== DUPLICATE KEYS ===');
console.log(JSON.stringify(duplicates, null, 2));

console.log('\n\n=== COMMON KEY CANDIDATES (used in 3+ categories) ===');
console.log(JSON.stringify(commonKeys, null, 2));

console.log('\n\n=== STATISTICS ===');
console.log(`Total unique keys: ${keyMap.size}`);
console.log(`Duplicate keys: ${Object.keys(duplicates).length}`);
console.log(`Common key candidates: ${Object.keys(commonKeys).length}`);
