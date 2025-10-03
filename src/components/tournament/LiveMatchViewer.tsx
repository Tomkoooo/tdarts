"use client";

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { getMatchState } from '@/lib/socketApi';
import IconDart from '@/components/homapage/icons/IconDart';

interface LiveMatchViewerProps {
  matchId: string;
  tournamentCode: string;
  player1: any;
  player2: any;
}

interface Throw {
  score: number;
  darts: number;
  isDouble: boolean;
  isCheckout: boolean;
  remainingScore?: number;
  timestamp?: number;
  playerId?: string;
}

interface CompletedLeg {
  player1Score: number;
  player2Score: number;
  player1Throws: Throw[];
  player2Throws: Throw[];
  winnerId: string;
  checkoutScore?: number;
  checkoutDarts?: number;
  doubleAttempts?: number;
  createdAt: string;
}

interface MatchData {
  _id: string;
  player1: any;
  player2: any;
  legsToWin: number;
  startingPlayer: number;
  status: string;
  winnerId?: string;
  legs: CompletedLeg[];
}

interface MatchState {
  currentLeg: number;
  completedLegs: CompletedLeg[];
  currentLegData: {
    player1Score: number;
    player2Score: number;
    player1Throws: Throw[];
    player2Throws: Throw[];
    player1Remaining: number;
    player2Remaining: number;
    player1Id?: string;
    player2Id?: string;
    currentPlayer: number; // 1 or 2
  };
  player1LegsWon?: number;
  player2LegsWon?: number;
  legsToWin?: number;
}

interface ScoreProgression {
  player1Score: number;
  player2Score: number;
  currentPlayer: number;
  throwData: Throw & { player: number; throwIndex: number };
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
      player2Remaining: 501,
      currentPlayer: 1
    },
    player1LegsWon: 0,
    player2LegsWon: 0,
    legsToWin: 3
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlayer1, setCurrentPlayer1] = useState(player1);
  const [currentPlayer2, setCurrentPlayer2] = useState(player2);
  const [matchData, setMatchData] = useState<MatchData | null>(null);

  // Use the useSocket hook for proper socket management
  const { socket } = useSocket({ 
    tournamentId: tournamentCode, 
    matchId: matchId 
  });

  // Fetch match data from database
  const fetchMatchData = async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      const data = await response.json();
      
      if (data.success && data.match) {
        setMatchData(data.match);
        
        // Update player names from match data
        if (data.match.player1?.playerId?.name) {
          setCurrentPlayer1(data.match.player1.playerId);
        }
        if (data.match.player2?.playerId?.name) {
          setCurrentPlayer2(data.match.player2.playerId);
        }
        
        // Update leg counts from database
        const dbPlayer1LegsWon = data.match.player1?.legsWon || 0;
        const dbPlayer2LegsWon = data.match.player2?.legsWon || 0;
        
        setMatchState(prev => ({
          ...prev,
          player1LegsWon: dbPlayer1LegsWon,
          player2LegsWon: dbPlayer2LegsWon,
          legsToWin: data.match.legsToWin || 3,
          currentLeg: dbPlayer1LegsWon + dbPlayer2LegsWon + 1,
          completedLegs: data.match.legs || []
        }));
      }
    } catch (error) {
      console.error('Failed to fetch match data:', error);
    }
  };

  useEffect(() => {
    // Update players when props change
    setCurrentPlayer1(player1);
    setCurrentPlayer2(player2);
  }, [player1, player2]);

  useEffect(() => {
    // Fetch initial match data from database
    fetchMatchData();
    
    // Join tournament and match rooms - use socket directly to avoid dependency issues
    if (socket.connected) {
      socket.emit('join-tournament', tournamentCode);
      socket.emit('join-match', matchId);
    }
    
    // Get initial state from external socket server using socketApi
    getMatchState(matchId)
    .then(data => {
      if (data.success && data.state) {
        setMatchState(prev => ({
          ...prev,
          ...data.state,
          // Keep database leg counts if available
          player1LegsWon: prev.player1LegsWon || data.state.player1LegsWon || 0,
          player2LegsWon: prev.player2LegsWon || data.state.player2LegsWon || 0,
          completedLegs: prev.completedLegs.length > 0 ? prev.completedLegs : data.state.completedLegs || []
        }));
      }
      setIsLoading(false);
    })
    .catch(error => {
      console.error('Failed to fetch initial match state:', error);
      setIsLoading(false);
    });
    
    // Socket event handlers
    function onConnect() {
      console.log('Connected to external Socket.IO server');
    }

    function onDisconnect() {
      console.log('Disconnected from external Socket.IO server');
    }

    function onMatchState(state: MatchState) {
      setMatchState(prev => ({
        ...prev,
        ...state,
        // Keep database leg counts
        player1LegsWon: prev.player1LegsWon || state.player1LegsWon || 0,
        player2LegsWon: prev.player2LegsWon || state.player2LegsWon || 0,
        completedLegs: prev.completedLegs.length > 0 ? prev.completedLegs : state.completedLegs || []
      }));

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
              timestamp: Date.now(),
              playerId: data.playerId
            }
          ],
          [data.playerId === currentPlayer1?._id ? 'player1Remaining' : 'player2Remaining']: data.remainingScore,
          currentPlayer: data.playerId === currentPlayer1?._id ? 2 : 1 // Switch current player after throw
        }
      }));
    }

    function onLegComplete() {
      // Fetch updated match data from database after leg completion
      fetchMatchData();
    }

    function onFetchMatchData() {
      // Fetch match data when server signals
      fetchMatchData();
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
    socket.on('fetch-match-data', onFetchMatchData);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('match-state', onMatchState);
      socket.off('throw-update', onThrowUpdate);
      socket.off('leg-complete', onLegComplete);
      socket.off('fetch-match-data', onFetchMatchData);
    };
  }, [matchId, tournamentCode, currentPlayer1?._id, currentPlayer2?._id, socket.connected]);

  const getScoreHighlight = (score: number) => {
    if (score === 180) return 'text-yellow-500 font-bold';
    if (score >= 140) return 'text-green-500 font-semibold';
    if (score >= 100) return 'text-blue-500';
    return 'text-base-content';
  };

  // Determine starting player for a leg based on throw counts
  const getStartingPlayer = (player1Throws: Throw[], player2Throws: Throw[], legStartingPlayer?: number) => {
    if (legStartingPlayer) return legStartingPlayer;
    
    // If one player has more throws, they started
    if (player1Throws.length > player2Throws.length) return 1;
    if (player2Throws.length > player1Throws.length) return 2;
    
    // If equal throws, the other player started
    return 1; // Default fallback
  };

  // Get throws in chronological order for a leg
  const getLegThrowsInOrder = (player1Throws: Throw[], player2Throws: Throw[], startingPlayer: number) => {
    const allThrows = [];
    const maxThrows = Math.max(player1Throws.length, player2Throws.length);
    
    for (let i = 0; i < maxThrows; i++) {
      if (startingPlayer === 1) {
        if (i < player1Throws.length) {
          allThrows.push({ ...player1Throws[i], player: 1, throwIndex: i });
        }
        if (i < player2Throws.length) {
          allThrows.push({ ...player2Throws[i], player: 2, throwIndex: i });
        }
      } else {
        if (i < player2Throws.length) {
          allThrows.push({ ...player2Throws[i], player: 2, throwIndex: i });
        }
        if (i < player1Throws.length) {
          allThrows.push({ ...player1Throws[i], player: 1, throwIndex: i });
        }
      }
    }
    
    return allThrows;
  };

  // Calculate score progression for a leg
  const getScoreProgression = (player1Throws: Throw[], player2Throws: Throw[], startingPlayer: number): ScoreProgression[] => {
    const throws = getLegThrowsInOrder(player1Throws, player2Throws, startingPlayer);
    const progression: ScoreProgression[] = [];
    let player1Score = 501;
    let player2Score = 501;
    
    throws.forEach((throwData) => {
      if (throwData.player === 1) {
        player1Score = throwData.remainingScore || (player1Score - throwData.score);
      } else {
        player2Score = throwData.remainingScore || (player2Score - throwData.score);
      }
      
      progression.push({
        player1Score,
        player2Score,
        currentPlayer: throwData.player,
        throwData
      });
    });
    
    return progression;
  };

  // Get current leg score progression
  const getCurrentLegProgression = () => {
    const startingPlayer = matchState.currentLegData.currentPlayer === 1 ? 2 : 1;
    return getScoreProgression(
      matchState.currentLegData.player1Throws,
      matchState.currentLegData.player2Throws,
      startingPlayer
    );
  };

  // Helper functions to get player names
  const getPlayer1Name = () => {
    return currentPlayer1?.name || matchData?.player1?.playerId?.name || 'Player 1';
  };

  const getPlayer2Name = () => {
    return currentPlayer2?.name || matchData?.player2?.playerId?.name || 'Player 2';
  };

  const getPlayerName = (playerNumber: number) => {
    return playerNumber === 1 ? getPlayer1Name() : getPlayer2Name();
  };

  const getPlayerId = (playerNumber: number) => {
    if (playerNumber === 1) {
      return currentPlayer1?._id || matchData?.player1?.playerId?._id;
    } else {
      return currentPlayer2?._id || matchData?.player2?.playerId?._id;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-lg shadow-lg p-4 max-w-4xl mx-auto">
      {/* Header with leg counts */}
      <div className="bg-base-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-base-content">{getPlayer1Name()}</div>
            <div className={`text-2xl text-base-content ${matchState.currentLegData.currentPlayer === 1 ? 'text-success' : ''}`}>{matchState.currentLegData.player1Remaining}</div>
            <div className="text-3xl font-bold text-primary">{matchState.player1LegsWon || 0}</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-base-content">{matchState.legsToWin || 3} to win</div>
            <div className="text-lg font-bold text-base-content/70">Score</div>
            <div className="text-sm text-base-content">Legs</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-base-content">{getPlayer2Name()}</div>
            <div className={`text-2xl text-base-content ${matchState.currentLegData.currentPlayer === 2 ? 'text-success' : ''}`}>{matchState.currentLegData.player2Remaining}</div>
            <div className="text-3xl font-bold text-primary">{matchState.player2LegsWon || 0}</div>
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              const fullscreenWindow = window.open('', '_blank', 'width=1200,height=400,scrollbars=no,resizable=yes');
              if (fullscreenWindow) {
                fullscreenWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Live Match - ${getPlayer1Name()} vs ${getPlayer2Name()}</title>
                      <script src="https://cdn.tailwindcss.com"></script>
                      <style>
                        body { margin: 0; padding: 0; background: #1f2937; color: white; font-family: system-ui, sans-serif; }
                        .score-display { display: flex; justify-content: space-between; align-items: center; height: 100vh; padding: 2rem; }
                        .player-section { text-align: center; flex: 1; }
                        .player-name { font-size: 3rem; font-weight: bold; margin-bottom: 1rem; }
                        .player-score { font-size: 8rem; font-weight: bold; margin-bottom: 1rem; }
                        .player-legs { font-size: 5rem; font-weight: bold; color: #3b82f6; }
                        .current-player { color: #10b981; }
                        .center-info { text-align: center; flex: 1; }
                        .legs-to-win { font-size: 2rem; font-weight: bold; margin-bottom: 1rem; }
                        .score-label { font-size: 1.5rem; color: #9ca3af; margin-bottom: 0.5rem; }
                        .legs-label { font-size: 1rem; color: #9ca3af; }
                      </style>
                    </head>
                    <body>
                      <div class="score-display">
                        <div class="player-section">
                          <div class="player-name">${getPlayer1Name()}</div>
                          <div class="player-score ${matchState.currentLegData.currentPlayer === 1 ? 'current-player' : ''}">${matchState.currentLegData.player1Remaining}</div>
                          <div class="player-legs">${matchState.player1LegsWon || 0}</div>
                        </div>
                        <div class="center-info">
                          <div class="legs-to-win">${matchState.legsToWin || 3} to win</div>
                          <div class="score-label">Score</div>
                          <div class="legs-label">Legs</div>
                        </div>
                        <div class="player-section">
                          <div class="player-name">${getPlayer2Name()}</div>
                          <div class="player-score ${matchState.currentLegData.currentPlayer === 2 ? 'current-player' : ''}">${matchState.currentLegData.player2Remaining}</div>
                          <div class="player-legs">${matchState.player2LegsWon || 0}</div>
                        </div>
                      </div>
                      <script>
                        // Auto-refresh every 2 seconds to keep scores updated
                        setInterval(() => {
                          if (window.opener && !window.opener.closed) {
                            try {
                              const openerState = window.opener.matchState;
                              if (openerState) {
                                document.querySelector('.player-section:first-child .player-score').textContent = openerState.currentLegData.player1Remaining;
                                document.querySelector('.player-section:first-child .player-legs').textContent = openerState.player1LegsWon || 0;
                                document.querySelector('.player-section:last-child .player-score').textContent = openerState.currentLegData.player2Remaining;
                                document.querySelector('.player-section:last-child .player-legs').textContent = openerState.player2LegsWon || 0;
                                
                                // Update current player highlighting
                                document.querySelectorAll('.player-score').forEach(el => el.classList.remove('current-player'));
                                if (openerState.currentLegData.currentPlayer === 1) {
                                  document.querySelector('.player-section:first-child .player-score').classList.add('current-player');
                                } else {
                                  document.querySelector('.player-section:last-child .player-score').classList.add('current-player');
                                }
                              }
                            } catch (e) {
                              console.log('Parent window closed or not accessible');
                            }
                          }
                        }, 2000);
                      </script>
                    </body>
                  </html>
                `);
                fullscreenWindow.document.close();
              }
            }}
          >
            Fullscreen Display
          </button>
        </div>
      </div>

      {/* Current leg */}
      <div className="mb-6">
        {/* Current leg header */}
        <div className="bg-base-200 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center">
            <div className="text-lg font-bold text-base-content">Leg {matchState.currentLeg}</div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-base-content/70">Started by:</span>
              <span className="font-semibold text-base-content">
                {matchState.currentLegData.currentPlayer === 1 ? getPlayer2Name() : getPlayer1Name()}
              </span>
              <IconDart className="w-4 h-4 text-primary" />
            </div>
            <div className="text-sm text-base-content/70">
              {matchState.currentLegData.player1Remaining} : {matchState.currentLegData.player2Remaining}
            </div>
          </div>
        </div>

        {/* Current leg throws */}
        {getCurrentLegProgression().length > 0 && (
          <div className="space-y-1">
            {getCurrentLegProgression().map((progression, index) => (
              <div key={index} className="text-sm flex justify-between items-center">
                <span className="text-base-content/70">
                  {getPlayerName(progression.throwData.player)} 
                  {progression.throwData.isCheckout && (
                    <span className="text-success font-bold ml-2">CHECKOUT!</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className={progression.currentPlayer === 1 ? 'font-bold text-base-content' : 'text-base-content/60'}>
                    {Number(progression.player1Score) || 501}
                  </span>
                  <span className="text-base-content/60">:</span>
                  <span className={progression.currentPlayer === 2 ? 'font-bold text-base-content' : 'text-base-content/60'}>
                    {Number(progression.player2Score) || 501}
                  </span>
                  <span className={getScoreHighlight(progression.throwData.score)}>
                    ({progression.throwData.score})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed legs */}
      {matchState.completedLegs.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3 text-base-content">Completed Legs</h3>
          <div className="space-y-4">
            {matchState.completedLegs.map((leg, index) => {
              const startingPlayer = getStartingPlayer(leg.player1Throws, leg.player2Throws);
              const progression: ScoreProgression[] = getScoreProgression(leg.player1Throws, leg.player2Throws, startingPlayer);
              const finalPlayer1Score = progression.length > 0 ? progression[progression.length - 1].player1Score : 501;
              const finalPlayer2Score = progression.length > 0 ? progression[progression.length - 1].player2Score : 501;
              const winner = leg.winnerId === getPlayerId(1) ? 1 : 2;
              
              return (
                <div key={index} className="border border-base-300 rounded-lg p-4">
                  {/* Leg header */}
                  <div className="bg-base-200 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-center">
                      <div className="text-lg font-bold text-base-content">Leg {index + 1}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-base-content/70">Started by:</span>
                        <span className="font-semibold text-base-content">
                          {getPlayerName(startingPlayer)}
                        </span>
                        <IconDart className="w-4 h-4 text-primary" />
                      </div>
                      <div className={`text-sm font-bold ${winner === 1 ? 'text-primary' : 'text-base-content/70'}`}>
                        {finalPlayer1Score} : {finalPlayer2Score}
                      </div>
                    </div>
                  </div>
                  
                  {/* Leg throws */}
                  {progression.length > 0 && (
                    <div className="space-y-1">
                      {progression.map((prog, throwIndex) => (
                        <div key={throwIndex} className="text-sm flex justify-between items-center">
                          <span className="text-base-content/70">
                            {getPlayerName(prog.currentPlayer)}
                            {prog.throwData.isCheckout && (
                              <span className="text-success font-bold ml-2">CHECKOUT!</span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={prog.currentPlayer === 1 ? 'font-bold text-base-content' : 'text-base-content/60'}>
                              {Number(prog.player1Score) || 501}
                            </span>
                            <span className="text-base-content/60">:</span>
                            <span className={prog.currentPlayer === 2 ? 'font-bold text-base-content' : 'text-base-content/60'}>
                              {Number(prog.player2Score) || 501}
                            </span>
                            <span className={getScoreHighlight(prog.throwData.score)}>
                              ({prog.throwData.score})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMatchViewer; 