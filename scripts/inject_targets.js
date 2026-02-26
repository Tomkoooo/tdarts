const fs = require('fs');

const injections = [
  {
    file: "src/components/player/PlayerStatsModal.tsx",
    targets: [
      `const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ player, onClose, isOacContext }) => {`,
      `function StatCard({ label, value, icon, variant }: { label: string, value: string | number, icon: React.ReactNode, variant: 'primary' | 'blue' | 'amber' | 'emerald' }) {`,
      `function MiniStatBox({ label, value }: { label: string, value: string | number }) {`,
      `function MiniRowStat({ label, value }: { label: string, value: string | number }) {`
    ]
  },
  {
    file: "src/components/club/LeagueManager.tsx",
    targets: [
      `export default function LeagueManager({ clubId, userRole, autoOpenLeagueId }: LeagueManagerProps) {`
    ]
  },
  {
    file: "src/components/board/LocalMatchGame.tsx",
    targets: [
      `const LocalMatchGame: React.FC<LocalMatchGameProps> = ({ legsToWin: initialLegsToWin, startingScore, onBack, onRematch }) => {`
    ]
  },
  {
    file: "src/components/board/MatchGame.tsx",
    targets: [
      `const MatchGame: React.FC<MatchGameProps> = ({ match, onBack, onMatchFinished, clubId, scoliaConfig }) => {`
    ]
  },
  {
    file: "src/app/[locale]/tournaments/[code]/live/page.tsx",
    targets: [
      `export default function TournamentTVViewPage() {`
    ]
  },
  {
    file: "src/app/[locale]/board/[tournamentId]/page.tsx",
    targets: [
      `const BoardPage: React.FC<BoardPageProps> = (props) => {`
    ]
  }
];

injections.forEach(({file, targets}) => {
   let content = fs.readFileSync(file, 'utf8');
   let hasChanges = false;
   targets.forEach(t => {
       if (content.includes(t) && !content.substring(content.indexOf(t), content.indexOf(t) + 300).includes('const t = useTranslations("Auto");')) {
           content = content.replace(t, `${t}\n  const t = useTranslations("Auto");`);
           hasChanges = true;
       }
   });
   if (hasChanges) {
       fs.writeFileSync(file, content);
       console.log(`Injected into ${file}`);
   }
});
