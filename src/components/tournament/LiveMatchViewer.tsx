"use client";

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';

interface LiveMatchViewerProps {
  matchId: string;
  tournamentCode: string;
  player1: any;
  player2: any;
}

interface MatchState {
  currentLeg: number;
  completedLegs: any[];
  currentLegData: {
    player1Score: number;
    player2Score: number;
    player1Throws: any[];
    player2Throws: any[];
    player1Remaining: number;
    player2Remaining: number;
    player1Id?: string;
    player2Id?: string;
  };
}

const LiveMatchViewer: React.FC<LiveMatchViewerProps> = ({ matchId, tournamentCode, player1, player2 }) => {
  const [matchState, setMatchState] = useState<MatchState>({
    currentLeg: 1,
    completedLegs: [],
    currentLegData: {
      player1Score: 501,
      player2Score: 501,
      player1Throws: [],
      player2Throws: [],
      player1Remaining: 501,
      player2Remaining: 501
    }
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlayer1, setCurrentPlayer1] = useState(player1);
  const [currentPlayer2, setCurrentPlayer2] = useState(player2);

  useEffect(() => {
    // Update players when props change
    setCurrentPlayer1(player1);
    setCurrentPlayer2(player2);
  }, [player1, player2]);

  useEffect(() => {
    // Join tournament and match rooms
    socket.emit('join-tournament', tournamentCode);
    socket.emit('join-match', matchId);
    
    // Get initial state
    fetch(`/api/socket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-match-state', matchId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.state) {
        setMatchState(data.state);
      }
      setIsLoading(false);
    })
    .catch(error => {
      console.error('Failed to fetch initial match state:', error);
      setIsLoading(false);
    });
    
    // Socket event handlers
    function onConnect() {
      setIsConnected(true);
      console.log('Connected to Socket.IO server');
    }

    function onDisconnect() {
      setIsConnected(false);
      console.log('Disconnected from Socket.IO server');
    }

    function onMatchState(state: MatchState) {
      setMatchState(state);
      console.log('Received match state:', state);
    }

    function onThrowUpdate(data: any) {
      setMatchState(prev => ({
        ...prev,
        currentLegData: {
          ...prev.currentLegData,
          [data.playerId === currentPlayer1?._id ? 'player1Throws' : 'player2Throws']: [
            ...prev.currentLegData[data.playerId === currentPlayer1?._id ? 'player1Throws' : 'player2Throws'],
            {
              score: data.score,
              darts: data.darts,
              isDouble: data.isDouble,
              isCheckout: data.isCheckout,
              remainingScore: data.remainingScore,
              timestamp: Date.now()
            }
          ],
          [data.playerId === currentPlayer1?._id ? 'player1Remaining' : 'player2Remaining']: data.remainingScore
        }
      }));
    }

    function onLegComplete(data: any) {
      setMatchState(prev => ({
        ...prev,
        completedLegs: [...prev.completedLegs, data.completedLeg],
        currentLeg: (data.legNumber || prev.currentLeg) + 1,
        currentLegData: {
          player1Score: 501,
          player2Score: 501,
          player1Throws: [],
          player2Throws: [],
          player1Remaining: 501,
          player2Remaining: 501
        }
      }));
    }

    // Set up event listeners
    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('match-state', onMatchState);
    socket.on('throw-update', onThrowUpdate);
    socket.on('leg-complete', onLegComplete);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('match-state', onMatchState);
      socket.off('throw-update', onThrowUpdate);
      socket.off('leg-complete', onLegComplete);
    };
  }, [matchId, tournamentCode, currentPlayer1?._id, currentPlayer2?._id]);

  const getScoreHighlight = (score: number) => {
    if (score === 180) return { text: '180', class: 'bg-blue-500 text-white' };
    if (score >= 140) return { text: '140+', class: 'bg-gray-300 text-gray-800' };
    return null;
  };

  const isBreakOfThrow = (leg: any) => {
    console.log(leg);
    // Logic to determine if it was a break of throw
    // This would need to be implemented based on your game logic
    return false;
  };

  if (isLoading) {
    return (
      <div className="live-match-viewer bg-base-100 p-6 rounded-lg">
        <div className="flex items-center justify-center py-8">
          <div className="loading loading-spinner loading-lg"></div>
          <span className="ml-2">Betöltés...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="live-match-viewer bg-base-100 p-6 rounded-lg">
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      {/* Match Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{currentPlayer1?.name || 'Loading...'} vs {currentPlayer2?.name || 'Loading...'}</h2>
        <div className="flex items-center gap-2">
          <span className="badge badge-info">LIVE</span>
          <span className="text-lg">Leg {matchState.currentLeg}</span>
        </div>
      </div>
      
      {/* Current Scores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold">{matchState.currentLegData.player1Remaining}</div>
          <div className="text-sm text-base-content/70">{currentPlayer1?.name || 'Loading...'}</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{matchState.currentLegData.player2Remaining}</div>
          <div className="text-sm text-base-content/70">{currentPlayer2?.name || 'Loading...'}</div>
        </div>
      </div>
      
      {/* Current Leg Throws */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3">Aktuális leg dobások</h3>
        <div className="space-y-2">
          {matchState.currentLegData.player1Throws.map((throwData, index) => (
            <div key={`p1-${index}`} className="flex items-center gap-2">
              <span className="text-sm">{currentPlayer1?.name || 'Loading...'}:</span>
              <span className="font-mono">{throwData.score}</span>
              <span className="text-xs text-base-content/60">({throwData.darts} db)</span>
              {getScoreHighlight(throwData.score) && (
                <span className={`badge badge-sm ${getScoreHighlight(throwData.score)?.class}`}>
                  {getScoreHighlight(throwData.score)?.text}
                </span>
              )}
            </div>
          ))}
          {matchState.currentLegData.player2Throws.map((throwData, index) => (
            <div key={`p2-${index}`} className="flex items-center gap-2">
              <span className="text-sm">{currentPlayer2?.name || 'Loading...'}:</span>
              <span className="font-mono">{throwData.score}</span>
              <span className="text-xs text-base-content/60">({throwData.darts} db)</span>
              {getScoreHighlight(throwData.score) && (
                <span className={`badge badge-sm ${getScoreHighlight(throwData.score)?.class}`}>
                  {getScoreHighlight(throwData.score)?.text}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Completed Legs */}
      <div>
        <h3 className="text-lg font-bold mb-3">Befejezett legek</h3>
        <div className="space-y-4">
          {matchState.completedLegs.map((leg, index) => (
            <div key={index} className="border border-base-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold">Leg {leg.legNumber || index + 1}</span>
                <span className="text-sm">
                  {leg.winnerId === currentPlayer1?._id ? currentPlayer1?.name : currentPlayer2?.name} nyerte
                </span>
                {isBreakOfThrow(leg) && (
                  <span className="badge badge-error badge-sm">ELVESZÍTETT KEZDÉS</span>
                )}
              </div>
              
              {/* Leg progression */}
              <div className="space-y-1">
                {leg.player1Throws?.map((throwData: {score: number, darts: number}, throwIndex: number) => (
                  <div key={`leg-${index}-p1-${throwIndex}`} className="flex items-center gap-2 text-sm">
                    <span>{currentPlayer1?.name || 'Loading...'}:</span>
                    <span className="font-mono">{throwData.score}</span>
                    <span className="text-xs">({throwData.darts} db)</span>
                    {getScoreHighlight(throwData.score) && (
                      <span className={`badge badge-xs ${getScoreHighlight(throwData.score)?.class}`}>
                        {getScoreHighlight(throwData.score)?.text}
                      </span>
                    )}
                  </div>
                ))}
                {leg.player2Throws?.map((throwData: {score: number, darts: number}, throwIndex: number) => (
                  <div key={`leg-${index}-p2-${throwIndex}`} className="flex items-center gap-2 text-sm">
                    <span>{currentPlayer2?.name || 'Loading...'}:</span>
                    <span className="font-mono">{throwData.score}</span>
                    <span className="text-xs">({throwData.darts} db)</span>
                    {getScoreHighlight(throwData.score) && (
                      <span className={`badge badge-xs ${getScoreHighlight(throwData.score)?.class}`}>
                        {getScoreHighlight(throwData.score)?.text}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LiveMatchViewer; 