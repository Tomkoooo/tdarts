"use client";

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';

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
}

const LiveMatchesList: React.FC<LiveMatchesListProps> = ({ tournamentCode, onMatchSelect }) => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Join tournament room
    socket.emit('join-tournament', tournamentCode);
    
    // Fetch active matches from API
    fetchLiveMatches();
    
    // Socket event handlers
    function onConnect() {
      setIsConnected(true);
      console.log('Connected to Socket.IO server');
    }

    function onDisconnect() {
      setIsConnected(false);
      console.log('Disconnected from Socket.IO server');
    }

    function onMatchStarted(matchId: string) {
      setLiveMatches(prev => [...prev, { 
        _id: matchId, 
        status: 'ongoing',
        currentLeg: 1,
        player1Remaining: 501,
        player2Remaining: 501,
        player1: { name: 'Loading...' },
        player2: { name: 'Loading...' }
      }]);
    }

    function onMatchFinished(matchId: string) {
      setLiveMatches(prev => prev.filter(match => match._id !== matchId));
    }

    // Set up event listeners
    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('match-started', onMatchStarted);
    socket.on('match-finished', onMatchFinished);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('match-started', onMatchStarted);
      socket.off('match-finished', onMatchFinished);
    };
  }, [tournamentCode]);

  const fetchLiveMatches = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/tournaments/${tournamentCode}/live-matches`);
      const data = await response.json();
      if (data.success) {
        // Ensure player data is properly structured
        const processedMatches = data.matches.map((match: any) => ({
          ...match,
          player1: match.player1?.playerId || match.player1 || { name: 'Loading...' },
          player2: match.player2?.playerId || match.player2 || { name: 'Loading...' },
          currentLeg: match.currentLeg || 1,
          player1Remaining: match.player1Remaining || 501,
          player2Remaining: match.player2Remaining || 501
        }));
        setLiveMatches(processedMatches);
        console.log('Live matches loaded:', processedMatches);
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
              
              <div className="flex justify-between items-center text-sm text-base-content/70">
                <span>Leg {match.currentLeg}</span>
                <span className="font-mono">
                  {match.player1Remaining} - {match.player2Remaining}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveMatchesList; 