"use client";

import { useEffect, useState } from 'react';
import { useLiveMatchesFeed } from '@/hooks/useLiveMatchesFeed';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { IconDeviceGamepad2, IconTrophy, IconClock } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface LiveMatchesListProps {
  tournamentCode: string;
  onMatchSelect: (matchId: string, match: any) => void;
  selectedMatchId?: string | null;
}

const LiveMatchesList: React.FC<LiveMatchesListProps> = ({ tournamentCode, onMatchSelect, selectedMatchId }) => {
  const tTour = useTranslations('Tournament')
  const t = (key: string, values?: any) => tTour(`live_matches.${key}`, values);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(selectedMatchId || null);
  const { matches: liveMatches, isLoading, isConnected } = useLiveMatchesFeed(tournamentCode);

  const handleMatchSelect = (match: any) => {
    setSelectedMatch(match._id);
    onMatchSelect(match._id, match);
  };

  // Sync internal state with props, important for direct link handling
  useEffect(() => {
    if (selectedMatchId) {
      setSelectedMatch(selectedMatchId);
    }
  }, [selectedMatchId]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <IconDeviceGamepad2 className="w-5 h-5 text-primary" />
            {t('title')}
          </h3>
          <div className="flex items-center gap-2">
            <span className={cn(
              "flex h-2 w-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-xs text-muted-foreground hidden sm:inline-block">
              {isConnected ? t('connected') : t('connecting')}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('desc')}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {liveMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <IconTrophy className="w-12 h-12 mb-3 opacity-20" />
              <p>{t('no_matches')}</p>
              <p className="text-xs mt-1">{t('no_matches_auto')}</p>
            </div>
          ) : (
            liveMatches.map((match) => (
              <div
                key={match._id}
                onClick={() => handleMatchSelect(match)}
                className={cn(
                  "group relative overflow-hidden rounded-lg border p-4 transition-all hover:shadow-md cursor-pointer",
                  selectedMatch === match._id 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge 
                    variant={selectedMatch === match._id ? "default" : "secondary"}
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    {t("leg_1mum")}{match.currentLeg}
                  </Badge>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <IconClock className="w-3 h-3" />
                    <span>
                      {match.lastUpdate ? new Date(match.lastUpdate).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  {/* Player 1 */}
                  <div className="flex-1 text-center">
                    <div className="text-sm font-semibold truncate px-1" title={match.player1?.name}>
                      {match.player1?.name || t('player_1')}
                    </div>
                    <div className={cn(
                      "text-2xl font-bold font-mono my-1",
                      match.player1Remaining <= 100 ? "text-primary" : "text-foreground"
                    )}>
                      {match.player1Remaining}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5 inline-block">
                      {match.player1LegsWon ?? 0} {t("leg_2aku")}</div>
                  </div>

                  {/* VS Divider */}
                  <div className="flex flex-col items-center justify-center text-muted-foreground/30 text-xs font-black">
                    VS
                  </div>

                  {/* Player 2 */}
                  <div className="flex-1 text-center">
                    <div className="text-sm font-semibold truncate px-1" title={match.player2?.name}>
                      {match.player2?.name || t('player_2')}
                    </div>
                    <div className={cn(
                      "text-2xl font-bold font-mono my-1",
                      match.player2Remaining <= 100 ? "text-primary" : "text-foreground"
                    )}>
                      {match.player2Remaining}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5 inline-block">
                      {match.player2LegsWon ?? 0} {t("leg_2aku")}</div>
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedMatch === match._id && (
                  <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default LiveMatchesList;