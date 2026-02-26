#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to update
const files = {
  'src/app/[locale]/board/page.tsx': { namespace: 'Board' },
  'src/app/[locale]/board/[tournamentId]/page.tsx': { namespace: 'Board' },
  'src/app/[locale]/board/redirect/[clubId]/TournamentSelectionPage.tsx': { namespace: 'Board' },
  'src/app/[locale]/feedback/page.tsx': { namespace: 'Feedback' },
  'src/app/[locale]/error.tsx': { namespace: 'Common' },
  'src/app/[locale]/loading.tsx': { namespace: 'Common' },
  'src/app/[locale]/invitations/[token]/page.tsx': { namespace: 'Common' },
  'src/components/forms/CreateTournamentFormEnhanced.tsx': { namespace: 'Common' },
  'src/components/player/PlayerCard.tsx': { namespace: 'Common' },
  'src/hooks/usePlayerStatsModal.tsx': { namespace: 'Common' },
  'src/app/[locale]/auth/callback/google/page.tsx': { namespace: 'Common' },
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

console.log(`\n✓ Successfully updated ${updatedCount} other files`);
