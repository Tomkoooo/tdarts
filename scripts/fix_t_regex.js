const fs = require('fs');
const path = require('path');

const filesToFix = [
  "src/app/[locale]/board/[tournamentId]/page.tsx",
  "src/app/[locale]/tournaments/[code]/live/page.tsx",
  "src/components/board/LocalMatchGame.tsx",
  "src/components/board/MatchGame.tsx",
  "src/components/club/LeagueDetailModal.tsx",
  "src/components/club/LeagueManager.tsx",
  "src/components/player/PlayerStatsModal.tsx",
];

filesToFix.forEach(relPath => {
   const absPath = path.join(process.cwd(), relPath);
   let content = fs.readFileSync(absPath, 'utf8');
   let hasChanges = false;
   
   // Inject at the top of the main export default function or const = React.FC
   // Naive injection:
   if (content.includes('t("') || content.includes('t(')) {
       if (!content.includes('const t = useTranslations("Auto");')) {
           // Find React.FC or export default function
           const matchFC = content.match(/const [A-Za-z0-9_]+\s*:\s*React\.FC<[^>]*>\s*=\s*\([^)]*\)\s*=>\s*\{/);
           const matchFunc = content.match(/(?:export\s+default\s+)?(?:async\s+)?function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/);
           
           if (matchFC) {
               content = content.replace(matchFC[0], `${matchFC[0]}\n  const t = useTranslations("Auto");`);
               hasChanges = true;
           } else if (matchFunc) {
               content = content.replace(matchFunc[0], `${matchFunc[0]}\n  const t = useTranslations("Auto");`);
               hasChanges = true;
           }
       }
   }
   
   if (hasChanges) {
       fs.writeFileSync(absPath, content);
       console.log(`Regex injected ${relPath}`);
   }
});
