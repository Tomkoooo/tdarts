"use client";

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface LiveMatchesListProps {
  tournamentCode: string;
  onMatchSelect: (matchId: string, match: any) => void;
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
}

const LiveMatchesList: React.FC<LiveMatchesListProps> = ({ tournamentCode, onMatchSelect }) => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
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
    function onMatchStarted() {

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
            player2LegsWon: data.state.player2LegsWon || match.player2LegsWon || 0
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
    if (socket.connected) {
      // onConnect(); // This was removed from useSocket, so we don't need this here.
    }

    socket.on('match-started', onMatchStarted);
    socket.on('match-finished', onMatchFinished);
    socket.on('match-update', onMatchUpdate);
    socket.on('leg-complete', onLegComplete);

    return () => {
      socket.off('match-started', onMatchStarted);
      socket.off('match-finished', onMatchFinished);
      socket.off('match-update', onMatchUpdate);
      socket.off('leg-complete', onLegComplete);
    };
  }, [tournamentCode, socket.connected]); // Removed emit dependency

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
              name: match.player1?.playerId?.name || match.player1?.name || 'Loading...'
            },
            player2: {
              _id: match.player2?.playerId?._id || match.player2?._id,
              name: match.player2?.playerId?.name || match.player2?.name || 'Loading...'
            },
            player1LegsWon: match.player1?.legsWon || 0,
            player2LegsWon: match.player2?.legsWon || 0
          };
        });
        setLiveMatches(processedMatches);
      }
      
      // Optionally get additional real-time data from external socket server (but don't replace database data)
      try {
        const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'https://socket.sironic.hu';
        const socketResponse = await fetch(`${socketServerUrl}/api/socket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-live-matches' })
        });
        const socketData = await socketResponse.json();
        
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
              className={`match-card border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedMatch === match._id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-base-300 hover:border-primary/50'
              }`}
              onClick={() => handleMatchSelect(match)}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="match-info">
                  <span className="font-medium">
                    {match.player1?.name || 'Loading...'} vs {match.player2?.name || 'Loading...'}
                  </span>
                </div>
                <span className="badge badge-info badge-sm">LIVE</span>
              </div>
              
              <div className="flex justify-between items-center text-xs text-base-content/70">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveMatchesList; 