"use client";

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { getLiveMatches } from '@/lib/socketApi';
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

interface LiveMatch {
  _id: string;
  player1: any;
  player2: any;
  currentLeg: number;
  player1Remaining: number;
  player2Remaining: number;
  status: string;
  player1LegsWon?: number;
  player2LegsWon?: number;
  lastUpdate?: string;
}

const LiveMatchesList: React.FC<LiveMatchesListProps> = ({ tournamentCode, onMatchSelect, selectedMatchId }) => {
  const tTour = useTranslations('Tournament')
  const t = (key: string, values?: any) => tTour(`live_matches.${key}`, values);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(selectedMatchId || null);
  const [isLoading, setIsLoading] = useState(true);

  // Use the useSocket hook for proper socket management
  const { socket, isConnected } = useSocket({ tournamentId: tournamentCode });

  useEffect(() => {
    // Join tournament room - use socket directly to avoid dependency issues
    if (socket.connected) {
      socket.emit('join-tournament', tournamentCode);
    }
    
    // Fetch active matches from API
    fetchLiveMatches();
    
    // Socket event handlers
    function onMatchStarted(data: { matchId: string; matchData: any }) {
      console.log('🎮 New match started:', data);
      // When a new match starts, add it to the list immediately
      if (data.matchData) {
        const newMatch: LiveMatch = {
          _id: data.matchId,
          status: 'ongoing',
          currentLeg: 1,
          player1Remaining: 501,
          player2Remaining: 501,
          player1: {
            _id: data.matchData.player1?.playerId?._id || data.matchData.player1?._id,
            name: data.matchData.player1?.playerId?.name || data.matchData.player1?.name || t('player_1')
          },
          player2: {
            _id: data.matchData.player2?.playerId?._id || data.matchData.player2?._id,
            name: data.matchData.player2?.playerId?.name || data.matchData.player2?.name || t('player_2')
          },
          player1LegsWon: 0,
          player2LegsWon: 0,
          lastUpdate: new Date().toISOString()
        };
        
        setLiveMatches(prev => {
          // Check if match already exists to avoid duplicates
          const exists = prev.some(m => m._id === data.matchId);
          if (exists) {
            return prev;
          }
          return [...prev, newMatch];
        });
      } else {
        // Fallback: fetch from database if matchData not provided
        fetchLiveMatches();
      }
    }

    function onMatchFinished(data: { matchId: string }) {
      console.log('🏁 Match finished:', data.matchId);
      // Remove the finished match from the list
      setLiveMatches(prev => prev.filter(match => match._id !== data.matchId));
    }

    function onMatchUpdate(data: { matchId: string; state: any }) {
      console.log('📊 Match update:', data.matchId);
      // Update only the real-time data (scores, current leg) from socket
      setLiveMatches(prev => prev.map(match => {
        if (match._id === data.matchId) {
          return {
            ...match,
            currentLeg: data.state.currentLeg,
            player1Remaining: data.state.currentLegData?.player1Remaining || match.player1Remaining,
            player2Remaining: data.state.currentLegData?.player2Remaining || match.player2Remaining,
            player1LegsWon: data.state.player1LegsWon || match.player1LegsWon || 0,
            player2LegsWon: data.state.player2LegsWon || match.player2LegsWon || 0,
            lastUpdate: new Date().toISOString()
          };
        }
        return match;
      }));
    }

    function onLegComplete() {
      console.log('🏆 Leg completed');
      // When a leg is completed, refresh data from database to get updated leg counts
      fetchLiveMatches();
    }

    // Socket connection handler
    const handleSocketConnect = () => {
      console.log('🔌 Socket connected, joining tournament:', tournamentCode);
      socket.emit('join-tournament', tournamentCode);
    };

    socket.on('connect', handleSocketConnect);
    socket.on('match-started', onMatchStarted);
    socket.on('match-finished', onMatchFinished);
    socket.on('match-update', onMatchUpdate);
    socket.on('leg-complete', onLegComplete);

    return () => {
      socket.off('connect', handleSocketConnect);
      socket.off('match-started', onMatchStarted);
      socket.off('match-finished', onMatchFinished);
      socket.off('match-update', onMatchUpdate);
      socket.off('leg-complete', onLegComplete);
    };
  }, [tournamentCode, socket.connected]);

  const fetchLiveMatches = async () => {
    try {
      setIsLoading(true);
      
      // Always fetch from database first for complete and accurate data
      const response = await fetch(`/api/tournaments/${tournamentCode}/live-matches`);
      const data = await response.json();
      
      if (data.success) {
        // Ensure player data is properly structured with real names
        const processedMatches = data.matches.map((match: any) => {
          return {
            _id: match._id,
            status: match.status || 'ongoing',
            currentLeg: match.currentLeg || 1,
            player1Remaining: match.player1Remaining || 501,
            player2Remaining: match.player2Remaining || 501,
            player1: {
              _id: match.player1?.playerId?._id || match.player1?._id,
              name: match.player1?.playerId?.name || match.player1?.name || t('loading')
            },
            player2: {
              _id: match.player2?.playerId?._id || match.player2?._id,
              name: match.player2?.playerId?.name || match.player2?.name || t('loading')
            },
            player1LegsWon: match.player1?.legsWon || 0,
            player2LegsWon: match.player2?.legsWon || 0,
            lastUpdate: match.lastUpdate || new Date().toISOString()
          };
        });
        setLiveMatches(processedMatches);
      }
      
      // Optionally get additional real-time data from external socket server
      try {
        const socketData = await getLiveMatches();
        if (socketData.success && socketData.matches.length > 0) {
           // Logic to merge socket data if needed, currently skipped to rely on DB
        }
      } catch (socketError) {
        console.log('Socket data not available, using database only:', socketError);
      }
      
    } catch (error) {
      console.error('Failed to fetch live matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMatchSelect = (match: LiveMatch) => {
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

      <ScrollArea className="flex-1 h-[400px] lg:h-[500px]">
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
                      {match.player1LegsWon || 0} {t("leg_2aku")}</div>
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
                      {match.player2LegsWon || 0} {t("leg_2aku")}</div>
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