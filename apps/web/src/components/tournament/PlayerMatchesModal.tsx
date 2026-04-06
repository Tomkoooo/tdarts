import React, { useState, useEffect } from 'react';
import { IconTrophy, IconTarget, IconLoader2, IconAlertCircle, IconDeviceAnalytics, IconChartBar } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { getTournamentPlayerMatchesClientAction } from "@/features/tournaments/actions/tournamentRoster.action";

interface Throw {
  score: number;
  darts: number;
  isDouble: boolean;
  isCheckout: boolean;
}

interface Leg {
  player1Score: number;
  player2Score: number;
  player1Throws: Throw[];
  player2Throws: Throw[];
  winnerId: {
    _id: string;
    name: string;
  };
  checkoutScore?: number;
  checkoutDarts?: number;
  winnerArrowCount?: number;
  loserRemainingScore?: number;
  doubleAttempts: number;
  createdAt: string;
}

interface Match {
  _id: string;
  player1: {
    legsWon: number;
    playerId: {
      _id: string;
      name: string;
    };
  };
  player2: {
    legsWon: number;
    playerId: {
      _id: string;
      name: string;
    };
  };
  winnerId?: string;
  status: string;
  legs?: Leg[];
  createdAt: string;
  round?: string;
  groupName?: string;
  average?: number;
  firstNineAvg?: number;
  checkout?: string;
}

interface PlayerMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  tournamentCode: string;
  onShowDetailedStats?: (matchId: string) => void;
}

const PlayerMatchesModal: React.FC<PlayerMatchesModalProps> = ({
  isOpen,
  onClose,
  playerId,
  playerName, 
  tournamentCode,
  onShowDetailedStats,
}) => {
  const tTour = useTranslations('Tournament')
  const t = (key: string, values?: any) => tTour(`player_matches_modal.${key}`, values);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && playerId && tournamentCode) {
      fetchPlayerMatches();
    } else if (isOpen && (!playerId || !tournamentCode)) {
      setError(t('error_missing'));
      setLoading(false);
    }
  }, [isOpen, playerId, tournamentCode]);

  const fetchPlayerMatches = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getTournamentPlayerMatchesClientAction({
        code: tournamentCode,
        playerId,
      });
      if (data && typeof data === 'object' && 'success' in data && data.success) {
        setMatches(((data as any).matches || []) as Match[]);
      } else {
        setError(t('error_loading'));
      }
    } catch (err) {
      setError(t('error_generic'));
      console.error('Fetch player matches error:', err);
    } finally {
      setLoading(false);
    }
  };

  const wins = matches.filter(m => m.winnerId === playerId).length;
  const losses = matches.filter(m => m.winnerId !== playerId && m.status === 'finished').length;
  const winRate = matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;
  
  // Calculate overall average for the player in these matches
  const totalAvg = matches.reduce((acc, m) => acc + (m.average || 0), 0);
  const overallAvg = matches.length > 0 ? (totalAvg / matches.length).toFixed(1) : "0.0";

  // Reverse matches for timeline display (latest first often makes sense)
  const sortedMatches = [...matches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Recent 6 matches for the trend chart
  const recent6Matches = sortedMatches.slice(0, 6).reverse();
  const maxAvgInRecent = Math.max(...recent6Matches.map(m => m.average || 0), 1);
  const trendPoints = recent6Matches
    .map((m, index) => {
      const x = recent6Matches.length <= 1 ? 0 : (index / (recent6Matches.length - 1)) * 100;
      const ratio = Math.max(0, Math.min(1, (m.average || 0) / maxAvgInRecent));
      const y = 100 - (ratio * 100);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-[1200px] w-[95vw] p-0 flex flex-col overflow-hidden bg-background border-border shadow-glow-primary sm:rounded-2xl h-[90vh]">
        <DialogTitle className="sr-only">
          {t('title') || 'Player Profile'} - {playerName}
        </DialogTitle>
        {/* Abstract Background Glows */}
        <div className="absolute top-1/4 -left-20 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 -z-10 h-96 w-96 rounded-full bg-accent/10 blur-[120px] pointer-events-none"></div>

        {/* Modal Header */}
        <div className="p-6 md:p-8 border-b border-border/50 relative shrink-0 z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 relative z-10">
              <span className="font-headline text-primary font-bold uppercase tracking-[0.2em] text-sm">{t('title') || 'Player Profile'}</span>
              <h1 className="font-headline text-3xl md:text-5xl font-black text-foreground tracking-tighter uppercase line-clamp-1">
                {playerName}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary">
                  {tournamentCode}
                </Badge>
              </div>
            </div>
            <div className="flex gap-4 relative z-10">
              <div className="bg-muted/50 px-4 py-2 rounded-lg text-center border border-border/50 shadow-sm">
                <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">{t('win_rate') || 'Win Rate'}</p>
                <p className="font-headline text-xl font-bold text-foreground">{winRate}%</p>
              </div>
              <div className="bg-muted/50 px-4 py-2 rounded-lg text-center border border-border/50 shadow-sm">
                <p className="font-label text-[10px] uppercase tracking-widest text-muted-foreground">{t('avg_score') || 'Avg. Score'}</p>
                <p className="font-headline text-xl font-bold text-foreground">{overallAvg}</p>
              </div>
            </div>
          </div>
          
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-8 space-y-12 custom-scrollbar relative z-10">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
              <IconLoader2 size={48} className="animate-spin text-primary/50" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">{t('loading')}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <IconAlertCircle size={32} className="text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">{t('error_generic')}</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchPlayerMatches}>{t('retry')}</Button>
            </div>
          ) : sortedMatches.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-muted/10">
              <div className="inline-flex w-16 h-16 rounded-full bg-muted/50 items-center justify-center mb-4">
                <IconTarget className="text-muted-foreground/50 w-8 h-8" />
              </div>
              <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest text-center">{t('no_data')}</p>
            </div>
          ) : (
            <>
              {/* Recent Match Results */}
              <div className="space-y-4">
                <h2 className="font-label text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 mb-6">
                  <span className="w-8 h-[1px] bg-border"></span>
                  {t('list_title')}
                </h2>

                <div className="space-y-4">
                  {sortedMatches.map((match, idx) => {
                    const isPlayerWinner = match.winnerId === playerId;
                    const isPlayer1 = playerId === match.player1?.playerId?._id;
                    const opponent = isPlayer1 ? match.player2 : match.player1;
                    const playerScore = isPlayer1 ? match.player1?.legsWon : match.player2?.legsWon;
                    const opponentScore = isPlayer1 ? match.player2?.legsWon : match.player1?.legsWon;
                    
                    const isOngoing = match.status !== 'finished';

                    // First item styling logic
                    const isLatestWin = idx === 0 && isPlayerWinner && !isOngoing;

                    return (
                      <div 
                        key={match._id} 
                        className={cn(
                          "group relative transition-all p-1 rounded-xl shadow-sm border",
                          isLatestWin ? "bg-card border-primary/50 shadow-glow-primary" : "bg-card hover:bg-muted/40 border-border"
                        )}
                      >
                        <div className="flex flex-col lg:flex-row items-center gap-6 p-4 sm:p-5 relative">
                          
                          {/* Player/Opponent Info */}
                          <div className="flex items-center gap-4 flex-1 w-full lg:w-auto">
                            <div className={cn(
                              "w-12 h-12 rounded-lg flex items-center justify-center font-headline font-black text-xl italic shrink-0",
                              isOngoing ? "bg-warning/20 text-warning" : 
                              isPlayerWinner ? (isLatestWin ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg" : "bg-muted text-foreground") : 
                              "bg-muted text-muted-foreground/50"
                            )}>
                              {isOngoing ? "O" : isPlayerWinner ? "W" : "L"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-headline font-bold text-foreground text-lg uppercase truncate">
                                {opponent?.playerId?.name || 'Unknown Opponent'}
                                {!isOngoing && isPlayerWinner ? (
                                  <IconTrophy className="ml-2 inline h-4 w-4 text-amber-500" />
                                ) : null}
                              </h3>
                              <p className="font-body text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate flex items-center gap-2">
                                {match.round || t('tournament_match')} 
                                {match.groupName && <span className="opacity-50">| {match.groupName}</span>}
                              </p>
                            </div>
                          </div>

                          {/* Scores */}
                          <div className="flex items-center justify-center gap-6 lg:gap-8 flex-1 lg:border-x border-border/30 px-4 lg:px-8 w-full py-4 lg:py-0 bg-muted/10 lg:bg-transparent rounded-lg lg:rounded-none">
                            <div className="text-center w-12">
                              <span className={cn(
                                "font-headline text-3xl sm:text-4xl font-black italic",
                                playerScore > opponentScore ? "text-foreground" : "text-muted-foreground/40"
                              )}>
                                {playerScore}
                              </span>
                            </div>
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isLatestWin ? "bg-primary" : "bg-border")}></div>
                            <div className="text-center w-12">
                              <span className={cn(
                                "font-headline text-3xl sm:text-4xl font-black italic",
                                opponentScore > playerScore ? "text-foreground" : "text-muted-foreground/40"
                              )}>
                                {opponentScore}
                              </span>
                            </div>
                          </div>

                          {/* Stats & Actions */}
                          <div className="flex items-center justify-between lg:justify-end gap-6 flex-1 w-full lg:w-auto">
                            <div className="grid grid-cols-3 gap-3 sm:gap-6 text-right flex-1 lg:flex-none">
                              <div>
                                <p className="font-label text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-widest">{t('avg')}</p>
                                <p className="font-headline font-bold text-foreground text-sm sm:text-base">{match.average ? match.average.toFixed(2) : "—"}</p>
                              </div>
                              <div>
                                <p className="font-label text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-widest">F9</p>
                                <p className="font-headline font-bold text-foreground text-sm sm:text-base">{typeof match.firstNineAvg === "number" ? match.firstNineAvg.toFixed(2) : "—"}</p>
                              </div>
                              <div>
                                <p className="font-label text-[9px] sm:text-[10px] uppercase text-muted-foreground tracking-widest">{t('checkout')}</p>
                                <p className="font-headline font-bold text-foreground text-sm sm:text-base">{match.checkout || "—"}</p>
                              </div>
                            </div>
                            
                            {onShowDetailedStats && (
                              <Button 
                                variant={isLatestWin ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "shrink-0 h-10 rounded-lg transition-all gap-2 px-3",
                                  !isLatestWin && "border-border/50 bg-background hover:bg-muted"
                                )}
                                onClick={() => onShowDetailedStats(match._id)}
                                title={t('details')}
                                disabled={!match.legs || match.legs.length === 0}
                              >
                                <IconDeviceAnalytics className="h-4 w-4" />
                                <span className="text-[10px] uppercase tracking-widest">{t('details')}</span>
                              </Button>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Match Analysis Section (Asymmetric Bento Grid) */}
              {sortedMatches.length >= 2 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  {/* Scoring Trends */}
                  <div className="md:col-span-2 bg-card p-6 rounded-xl border border-border/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] "></div>
                    <h4 className="font-headline font-bold text-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                       <IconChartBar className="w-4 h-4 text-primary" />
                       {t('scoring_trends') || 'Scoring Trends'}
                    </h4>
                    <div className="h-40 flex items-end justify-between gap-2 px-2 pb-2 border-b border-border/30">
                      {recent6Matches.map((m, i) => {
                        const heightPct = m.average ? Math.max(10, (m.average / maxAvgInRecent) * 100) : 5;
                        const isBest = m.average === maxAvgInRecent && m.average > 0;
                        const matchIndex = i + 1;
                        return (
                          <div key={i} className="flex flex-col items-center flex-1 group/bar cursor-help" title={`#${matchIndex} • ${m.average?.toFixed(1) || 0} Avg`}>
                             <div className="text-[9px] font-bold text-muted-foreground/0 group-hover/bar:text-primary transition-colors mb-2 opacity-0 group-hover/bar:opacity-100 transform translate-y-2 group-hover/bar:translate-y-0">
                               #{matchIndex} • {m.average?.toFixed(1) || 0}
                             </div>
                             <div 
                               className={cn(
                                 "w-full rounded-t-lg transition-all duration-500",
                                 isBest ? "bg-primary shadow-glow-primary hover:brightness-125" : "bg-muted hover:bg-primary/60"
                               )} 
                               style={{ height: `${heightPct}%` }}
                             ></div>
                          </div>
                        )
                      })}
                    </div>
                    {recent6Matches.length > 1 ? (
                      <div className="mt-4 rounded-lg border border-border/40 bg-muted/10 p-3">
                        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          {t('scoring_trends')}
                        </p>
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-16 w-full">
                          <polyline
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            points={trendPoints}
                            className="text-primary"
                          />
                        </svg>
                        <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                          {recent6Matches.map((match, index) => (
                            <div key={`trend-chip-${match._id || index}`} className="rounded border border-border/40 bg-card/60 px-1.5 py-1 text-center">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">#{index + 1}</p>
                              <p className="text-[10px] font-bold text-foreground">{(match.average || 0).toFixed(1)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="flex justify-between mt-4 text-[10px] font-label uppercase text-muted-foreground">
                      <span>{t('last_n_matches', { count: recent6Matches.length }) || `Last ${recent6Matches.length} Matches`}</span>
                      <span>{t('trend_max') || 'Trend Max'}: {maxAvgInRecent.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Highlights / Stats Summary box */}
                  <div className="bg-gradient-to-br from-muted/50 to-background p-6 rounded-xl border border-border/50 flex flex-col justify-between shadow-sm relative overflow-hidden">
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent/5 rounded-full blur-[30px]"></div>
                    <div className="relative z-10">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <IconTarget className="text-primary w-5 h-5" />
                      </div>
                      <h4 className="font-headline font-bold text-foreground uppercase tracking-wider">{t('tournament_average') || 'Tournament Average'}</h4>
                    </div>
                    <div className="mt-8 relative z-10">
                      <span className="font-headline text-5xl font-black text-primary italic">{overallAvg}</span>
                      <p className="font-body text-xs text-muted-foreground mt-2">{t('overall_across_played') || 'Overall across all played matches'}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerMatchesModal;
