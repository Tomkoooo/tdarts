#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to update
const files = {
  'src/app/[locale]/myclub/page.tsx': { namespace: 'Club.pages' },
  'src/app/[locale]/clubs/[code]/page.tsx': { namespace: 'Club.pages' },
  'src/components/club/LeagueDetailModal.tsx': { namespace: 'Club.components' },
  'src/components/club/TournamentList.tsx': { namespace: 'Club.components' },
  'src/components/club/ClubPlayersSection.tsx': { namespace: 'Club.components' },
  'src/components/club/ClubGallerySection.tsx': { namespace: 'Club.components' },
  'src/components/club/CreateLeagueModal.tsx': { namespace: 'Club.components' },
  'src/components/club/ClubLeaguesSection.tsx': { namespace: 'Club.components' },
};

let updatedCount = 0;

for (const [filePath, config] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠ Skipping ${filePath} - file not found`);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Update useTranslations("Auto") to new namespace
  const autoRegex = /const\s+t\s*=\s*useTranslations\(["']Auto["']\);?/;
  if (autoRegex.test(content)) {
    content = content.replace(
      autoRegex,
      `const t = useTranslations("${config.namespace}");`
    );
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    updatedCount++;
    console.log(`✓ Updated ${filePath}`);
  } else {
    console.log(`⚠ Skipping ${filePath} - no Auto translation found`);
  }
}

console.log(`\n✓ Successfully updated ${updatedCount} club files`);
