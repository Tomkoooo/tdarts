#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files using Auto translations
const autoFiles = [
  'src/app/[locale]/tournaments/[code]/live/not-found.tsx',
  'src/app/[locale]/admin/todos/page.tsx',
  'src/app/[locale]/tournaments/[code]/live/loading.tsx',
  'src/app/[locale]/myclub/page.tsx',
  'src/app/[locale]/admin/errors/page.tsx',
  'src/app/[locale]/admin/settings/page.tsx',
  'src/app/[locale]/tournaments/[code]/tv/page.tsx',
  'src/components/admin/CommandPalette.tsx',
  'src/components/admin/GlobalTodoShortcut.tsx',
  'src/app/[locale]/admin/emails/page.tsx',
  'src/app/[locale]/admin/tournaments/page.tsx',
  'src/app/[locale]/admin/announcements/page.tsx',
  'src/app/[locale]/error.tsx',
  'src/app/[locale]/tournaments/[code]/live/page.tsx',
  'src/app/[locale]/invitations/[token]/page.tsx',
  'src/components/club/LeagueDetailModal.tsx',
  'src/app/[locale]/admin/layout.tsx',
  'src/components/tournament/TournamentShareModal.tsx',
  'src/app/[locale]/admin/users/page.tsx',
  'src/app/[locale]/feedback/page.tsx',
  'src/components/club/TournamentList.tsx',
  'src/components/club/ClubPlayersSection.tsx',
  'src/components/club/ClubGallerySection.tsx',
  'src/components/admin/YearWrapCard.tsx',
  'src/app/[locale]/board/redirect/[clubId]/TournamentSelectionPage.tsx',
  'src/components/admin/SmartTodoManager.tsx',
  'src/components/tournament/TournamentGroupsView.tsx',
  'src/app/[locale]/board/page.tsx',
  'src/components/admin/DailyChart.tsx',
  'src/app/[locale]/clubs/[code]/page.tsx',
  'src/components/player/PlayerCard.tsx',
  'src/components/tournament/TournamentKnockoutBracket.tsx',
  'src/components/tournament/TournamentStatusChanger.tsx',
  'src/components/forms/CreateTournamentFormEnhanced.tsx',
  'src/components/club/CreateLeagueModal.tsx',
  'src/app/[locale]/admin/clubs/page.tsx',
  'src/app/[locale]/auth/callback/google/page.tsx',
  'src/app/[locale]/admin/leagues/page.tsx',
  'src/app/[locale]/tournaments/[code]/live/error.tsx',
  'src/components/club/ClubLeaguesSection.tsx',
  'src/components/admin/SmartInput.tsx',
  'src/app/[locale]/admin/feedback/page.tsx',
  'src/components/tournament/TournamentBoardsView.tsx',
  'src/app/[locale]/loading.tsx',
  'src/app/[locale]/board/[tournamentId]/page.tsx',
  'src/components/tournament/TournamentPlayers.tsx',
  'src/hooks/usePlayerStatsModal.tsx'
];

// Categorize files
const categories = {
  'Admin.announcements': ['src/app/[locale]/admin/announcements/page.tsx'],
  'Admin.clubs': ['src/app/[locale]/admin/clubs/page.tsx'],
  'Admin.tournaments': ['src/app/[locale]/admin/tournaments/page.tsx'],
  'Admin.users': ['src/app/[locale]/admin/users/page.tsx'],
  'Admin.errors': ['src/app/[locale]/admin/errors/page.tsx'],
  'Admin.settings': ['src/app/[locale]/admin/settings/page.tsx'],
  'Admin.emails': ['src/app/[locale]/admin/emails/page.tsx'],
  'Admin.todos': ['src/app/[locale]/admin/todos/page.tsx'],
  'Admin.feedback': ['src/app/[locale]/admin/feedback/page.tsx'],
  'Admin.leagues': ['src/app/[locale]/admin/leagues/page.tsx'],
  'Admin.layout': ['src/app/[locale]/admin/layout.tsx'],
  'Admin.components': [
    'src/components/admin/CommandPalette.tsx',
    'src/components/admin/GlobalTodoShortcut.tsx',
    'src/components/admin/YearWrapCard.tsx',
    'src/components/admin/SmartTodoManager.tsx',
    'src/components/admin/DailyChart.tsx',
    'src/components/admin/SmartInput.tsx'
  ],
  'Tournament.live': [
    'src/app/[locale]/tournaments/[code]/live/not-found.tsx',
    'src/app/[locale]/tournaments/[code]/live/loading.tsx',
    'src/app/[locale]/tournaments/[code]/live/page.tsx',
    'src/app/[locale]/tournaments/[code]/live/error.tsx'
  ],
  'Tournament.tv': ['src/app/[locale]/tournaments/[code]/tv/page.tsx'],
  'Tournament.components': [
    'src/components/tournament/TournamentShareModal.tsx',
    'src/components/tournament/TournamentGroupsView.tsx',
    'src/components/tournament/TournamentKnockoutBracket.tsx',
    'src/components/tournament/TournamentStatusChanger.tsx',
    'src/components/tournament/TournamentBoardsView.tsx',
    'src/components/tournament/TournamentPlayers.tsx'
  ],
  'Club.pages': [
    'src/app/[locale]/myclub/page.tsx',
    'src/app/[locale]/clubs/[code]/page.tsx'
  ],
  'Club.components': [
    'src/components/club/LeagueDetailModal.tsx',
    'src/components/club/TournamentList.tsx',
    'src/components/club/ClubPlayersSection.tsx',
    'src/components/club/ClubGallerySection.tsx',
    'src/components/club/CreateLeagueModal.tsx',
    'src/components/club/ClubLeaguesSection.tsx'
  ],
  'Board': [
    'src/app/[locale]/board/page.tsx',
    'src/app/[locale]/board/[tournamentId]/page.tsx',
    'src/app/[locale]/board/redirect/[clubId]/TournamentSelectionPage.tsx'
  ],
  'Feedback': ['src/app/[locale]/feedback/page.tsx'],
  'Common': [
    'src/app/[locale]/error.tsx',
    'src/app/[locale]/loading.tsx',
    'src/app/[locale]/invitations/[token]/page.tsx',
    'src/components/forms/CreateTournamentFormEnhanced.tsx',
    'src/components/player/PlayerCard.tsx',
    'src/hooks/usePlayerStatsModal.tsx',
    'src/app/[locale]/auth/callback/google/page.tsx'
  ]
};

// Extract t("key") patterns from file
function extractKeysFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const regex = /\bt\(["']([^"']+)["']\)/g;
    const keys = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      keys.push(match[1]);
    }
    return keys;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return [];
  }
}

// Main analysis
const result = {};

for (const [category, files] of Object.entries(categories)) {
  result[category] = new Set();
  files.forEach(file => {
    const keys = extractKeysFromFile(path.join(process.cwd(), file));
    keys.forEach(key => result[category].add(key));
  });
  result[category] = Array.from(result[category]).sort();
}

// Output results
console.log(JSON.stringify(result, null, 2));
