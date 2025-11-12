"use client";

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { getLiveMatches } from '@/lib/socketApi';
import { Badge } from '@/components/ui/badge';

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
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(selectedMatchId || null);
  const [isLoading, setIsLoading] = useState(true);

  // Use the useSocket hook for proper socket management
  const { socket, isConnected } = useSocket({ tournamentId: tournamentCode });

  useEffect(() => {
    console.log('🔌 LiveMatchesList useEffect triggered:', {
      tournamentCode,
      isConnected,
      socketConnected: socket.connected
    });

    // Join tournament room - use socket directly to avoid dependency issues
    if (socket.connected) {
      console.log('📡 LiveMatchesList joining tournament room:', tournamentCode);
      socket.emit('join-tournament', tournamentCode);
    } else {
      console.log('❌ LiveMatchesList socket not connected, cannot join room');
    }
    
    // Fetch active matches from API
    fetchLiveMatches();
    
    // Socket event handlers
    function onMatchStarted(data: any) {
      console.log('🎯 Match started event received:', data);
      
      // When a new match starts, fetch fresh data from database
      fetchLiveMatches();
    }

    function onMatchFinished(matchId: string) {

      setLiveMatches(prev => prev.filter(match => match._id !== matchId));
    }

    function onMatchUpdate(data: { matchId: string; state: any }) {

      // Update only the real-time data (scores, current leg) from socket
      setLiveMatches(prev => prev.map(match => {
        if (match._id === data.matchId) {
          const updatedMatch = {
            ...match,
            currentLeg: data.state.currentLeg,
            player1Remaining: data.state.currentLegData?.player1Remaining || match.player1Remaining,
            player2Remaining: data.state.currentLegData?.player2Remaining || match.player2Remaining,
            player1LegsWon: data.state.player1LegsWon || match.player1LegsWon || 0,
            player2LegsWon: data.state.player2LegsWon || match.player2LegsWon || 0,
            lastUpdate: new Date().toISOString()
          };

          return updatedMatch;
        }
        return match;
      }));
    }

    function onLegComplete() {

      // When a leg is completed, refresh data from database to get updated leg counts
      fetchLiveMatches();
    }

    // Set up event listeners
    console.log('🔌 Setting up socket event listeners for tournament:', tournamentCode);
    console.log('🔌 Socket connected:', socket.connected);
    
    // Socket connection handler
    const handleSocketConnect = () => {
      console.log('🔌 LiveMatchesList socket connected, joining tournament room:', tournamentCode);
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
  }, [tournamentCode, socket.connected]); // Removed emit dependency

  const fetchLiveMatches = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Fetching live matches for tournament:', tournamentCode);
      
      // Always fetch from database first for complete and accurate data
      const response = await fetch(`/api/tournaments/${tournamentCode}/live-matches`);
      const data = await response.json();

      console.log('📊 Live matches API response:', data);
      
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
              name: match.player1?.playerId?.name || match.player1?.name || 'Loading...'
            },
            player2: {
              _id: match.player2?.playerId?._id || match.player2?._id,
              name: match.player2?.playerId?.name || match.player2?.name || 'Loading...'
            },
            player1LegsWon: match.player1?.legsWon || 0,
            player2LegsWon: match.player2?.legsWon || 0,
            lastUpdate: match.lastUpdate || new Date().toISOString()
          };
        });
        setLiveMatches(processedMatches);
      }
      
      // Optionally get additional real-time data from external socket server (but don't replace database data)
      try {
        const socketData = await getLiveMatches();
        
        if (socketData.success && socketData.matches.length > 0) {
          console.log('Socket data available for real-time updates:', socketData.matches);
          // We could use this for real-time score updates, but keep database as primary source
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

  if (isLoading) {
    return (
      <div className="live-matches-list bg-base-100 p-6 rounded-lg">
        <div className="flex items-center justify-center py-8">
          <div className="loading loading-spinner loading-lg"></div>
          <span className="ml-2">Betöltés...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="live-matches-list bg-base-100 p-6 rounded-lg">
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <h3 className="text-xl font-bold mb-4">Aktív meccsek</h3>
      
      {liveMatches.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-base-content/70">Nincs aktív meccs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {liveMatches.map((match) => (
            <div
              key={match._id}
              className={`cursor-pointer rounded-xl border border-border/50 bg-card/80 p-4 transition hover:bg-card/90 ${
                selectedMatch === match._id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleMatchSelect(match)}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {match.player1?.name || "Betöltés…"} vs {match.player2?.name || "Betöltés…"}
                </span>
                <Badge variant="outline" className="rounded-full border-primary/40 text-xs text-primary">
                  LIVE
                </Badge>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Leg {match.currentLeg}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">
                    {match.player1LegsWon || 0} - {match.player2LegsWon || 0}
                  </span>
                  <span className="font-mono text-xs">
                    {match.player1Remaining} - {match.player2Remaining}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Utolsó frissítés: {match.lastUpdate ? new Date(match.lastUpdate).toLocaleTimeString('hu-HU') : 'ismeretlen'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveMatchesList; 