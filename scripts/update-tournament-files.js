#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to update
const files = {
  'src/app/[locale]/tournaments/[code]/live/not-found.tsx': { namespace: 'Tournament.live' },
  'src/app/[locale]/tournaments/[code]/live/loading.tsx': { namespace: 'Tournament.live' },
  'src/app/[locale]/tournaments/[code]/live/page.tsx': { namespace: 'Tournament.live' },
  'src/app/[locale]/tournaments/[code]/live/error.tsx': { namespace: 'Tournament.live' },
  'src/app/[locale]/tournaments/[code]/tv/page.tsx': { namespace: 'Tournament.tv' },
  'src/components/tournament/TournamentShareModal.tsx': { namespace: 'Tournament.components', existingNamespace: 'Tournament' },
  'src/components/tournament/TournamentGroupsView.tsx': { namespace: 'Tournament.components' },
  'src/components/tournament/TournamentKnockoutBracket.tsx': { namespace: 'Tournament.components' },
  'src/components/tournament/TournamentStatusChanger.tsx': { namespace: 'Tournament.components' },
  'src/components/tournament/TournamentBoardsView.tsx': { namespace: 'Tournament.components' },
  'src/components/tournament/TournamentPlayers.tsx': { namespace: 'Tournament.components' },
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

console.log(`\n✓ Successfully updated ${updatedCount} tournament files`);
