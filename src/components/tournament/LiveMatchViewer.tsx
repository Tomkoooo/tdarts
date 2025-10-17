"use client";

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { getMatchState } from '@/lib/socketApi';
import IconDart from '@/components/homapage/icons/IconDart';
import { IconChevronDown, IconEye, IconArrowLeft, IconTarget, IconPencil } from '@tabler/icons-react';

interface LiveMatchViewerProps {
  matchId: string;
  tournamentCode: string;
  player1: any;
  player2: any;
  onBack?: () => void;
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
  winnerArrowCount?: number;
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




const LiveMatchViewer: React.FC<LiveMatchViewerProps> = ({ matchId, tournamentCode, player1, player2, onBack }) => {
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
  const [showCompletedLegs, setShowCompletedLegs] = useState(false);

  // Use the useSocket hook for proper socket management
  const { socket } = useSocket({ 
    tournamentId: tournamentCode, 
    matchId: matchId 
  });

  // Update global matchState and matchData for fullscreen popup
  useEffect(() => {
    if (matchState) {
      (window as any).matchState = matchState;
      console.log('📺 Updated global matchState for fullscreen popup:', matchState);
    }
  }, [matchState]);

  useEffect(() => {
    if (matchData) {
      (window as any).matchData = matchData;
      console.log('📺 Updated global matchData for fullscreen popup:', matchData);
    }
  }, [matchData]);

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


  // Get current leg starter from match data
  const getCurrentLegStarter = (): number => {
    if (!matchData) return 1;
    
    const currentLegNumber = matchState.currentLeg;
    
    // First leg: use match startingPlayer
    if (currentLegNumber === 1) {
      return matchData.startingPlayer || 1;
    }
    
    // For subsequent legs, alternate based on last leg's starter
    // If we have completed legs in matchData
    if (matchData.legs && matchData.legs.length > 0) {
      const lastCompletedLeg = matchData.legs[matchData.legs.length - 1];
      
      // Try to get starter from last leg's throw pattern
      if (lastCompletedLeg.player1Throws && lastCompletedLeg.player2Throws) {
        const p1Throws = lastCompletedLeg.player1Throws.length;
        const p2Throws = lastCompletedLeg.player2Throws.length;
        
        // Who started the last leg? Whoever has more throws or equal throws and didn't win
        let lastLegStarter;
        if (p1Throws > p2Throws) {
          lastLegStarter = 1;
        } else if (p2Throws > p1Throws) {
          lastLegStarter = 2;
        } else {
          // Equal throws - who won?
          const player1Id = getPlayerId(1);
          lastLegStarter = lastCompletedLeg.winnerId === player1Id ? 2 : 1;
        }
        
        // Current leg starter is the opposite of last leg starter
        return lastLegStarter === 1 ? 2 : 1;
      }
    }
    
    // Fallback: alternate based on leg number
    return matchData.startingPlayer === 1 
      ? (currentLegNumber % 2 === 1 ? 1 : 2)
      : (currentLegNumber % 2 === 1 ? 2 : 1);
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
    <div className="bg-base-100 rounded-lg shadow-lg p-4 max-w-6xl mx-auto relative">
      {/* Header with back button and streaming button */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onBack}
          className="btn btn-ghost btn-sm"
        >
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Vissza a meccsekhez
        </button>
        
        {/* Streaming Button */}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            const fullscreenWindow = window.open('', '_blank', 'width=1200,height=500,scrollbars=no,resizable=yes');
            if (fullscreenWindow) {
              // Make matchState globally accessible for the popup
              (window as any).matchState = matchState;
              
              fullscreenWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Live Match - ${getPlayer1Name()} vs ${getPlayer2Name()}</title>
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      body { 
                        margin: 0; 
                        padding: 0; 
                        background: linear-gradient(131deg, rgba(66, 1, 11, 1) 0%, rgba(20, 0, 0, 1) 65%);
                        color: white; 
                        font-family: 'Arial', sans-serif; 
                        height: 100vh;
                        overflow: hidden;
                      }
                      .container { 
                        display: flex; 
                        flex-direction: column; 
                        height: 100vh;
                        padding: 1rem;
                      }
                      .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1rem 2rem;
                        background: oklch(15% 0.02 12 / 0.95);
                        border-radius: 1rem;
                        border: 1px solid oklch(51% 0.18 16 / 0.3);
                        margin-bottom: 1rem;
                      }
                      .logo-section {
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                      }
                      .logo {
                        width: 50px;
                        height: 50px;
                      }
                      .title {
                        font-size: 1.5rem;
                        font-weight: bold;
                        background: linear-gradient(to right, oklch(61% 0.18 16), oklch(41% 0.18 16));
                        background-clip: text;
                        -webkit-background-clip: text;
                        color: transparent;
                      }
                      .match-info {
                        text-align: center;
                        flex: 1;
                      }
                      .match-title {
                        font-size: 1.5rem;
                        font-weight: bold;
                        color: oklch(95% 0.005 0);
                      }
                      .match-subtitle {
                        font-size: 1rem;
                        color: oklch(70% 0.01 12);
                        margin-top: 0.25rem;
                      }
                      .stats-header {
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr 2fr;
                        background: oklch(51% 0.18 16);
                        padding: 0.75rem 2rem;
                        font-weight: bold;
                        font-size: 1.2rem;
                        color: white;
                        text-align: center;
                        border-radius: 0.5rem;
                        margin-bottom: 0.5rem;
                      }
                      .players-container {
                        flex: 1;
                      }
                      .player-row {
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr 2fr;
                        align-items: center;
                        padding: 1.5rem 2rem;
                        margin-bottom: 0.5rem;
                        border-radius: 0.75rem;
                        background: oklch(15% 0.02 12 / 0.8);
                        border: 1px solid oklch(51% 0.18 16 / 0.3);
                        position: relative;
                      }
                      .player-name-section {
                        display: flex;
                        align-items: center;
                        gap: 0.75rem;
                      }
                      .player-name {
                        font-size: 1.8rem;
                        font-weight: bold;
                        color: oklch(95% 0.005 0);
                      }
                      .current-player-icon {
                        width: 20px;
                        height: 20px;
                        background: #ef4444;
                        border-radius: 50%;
                        margin-left: 0.5rem;
                        flex-shrink: 0;
                      }
                      .starter-arrow {
                        width: 24px;
                        height: 24px;
                        fill: oklch(51% 0.18 16);
                        flex-shrink: 0;
                      }
                      .stat {
                        font-size: 2rem;
                        font-weight: bold;
                        text-align: center;
                        color: oklch(95% 0.005 0);
                      }
                      .score-section {
                        text-align: right;
                      }
                      .score {
                        font-size: 3.5rem;
                        font-weight: bold;
                        position: relative;
                        color: oklch(95% 0.005 0);
                      }
                      .darts-info {
                        font-size: 1rem;
                        color: oklch(70% 0.01 12);
                        margin-top: 0.25rem;
                      }
                      .throw-animation { 
                        position: absolute; 
                        top: -50px; 
                        right: 0; 
                        font-size: 3rem; 
                        font-weight: bold; 
                        color: #ffffff; 
                        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                        opacity: 0; 
                        animation: throwShow 1.5s ease-out; 
                      }
                      @keyframes throwShow { 
                        0% { opacity: 0; transform: translateY(20px); }
                        50% { opacity: 1; transform: translateY(0); }
                        100% { opacity: 0; transform: translateY(-30px); }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <div class="logo-section">
                          <img class="logo" src="/android-chrome-192x192.png" alt="tDarts">
                          <span class="title">tDarts</span>
                        </div>
                        <div class="match-info">
                          <div class="match-title">Scoring on: tDarts</div>
                          <div class="match-subtitle">BO${(matchState.legsToWin || 3) * 2 - 1} • Leg ${matchState.currentLeg}</div>
                        </div>
                        <div style="width: 120px;"></div>
                      </div>
                      
                      <div class="stats-header">
                        <div></div>
                        <div>AVG</div>
                        <div>LEGS</div>
                        <div>SCORE</div>
                      </div>
                      
                      <div class="players-container">
                        <div class="player-row" id="player1-row">
                          <div class="player-name-section">
                            <div class="player-name">${getPlayer1Name()}</div>
                          </div>
                          <div class="stat" id="player1-avg">0.00</div>
                          <div class="stat" id="player1-legs">${matchState.player1LegsWon || 0}</div>
                          <div class="score-section">
                            <div class="score" id="player1-score">${matchState.currentLegData.player1Remaining}</div>
                            <div class="darts-info" id="player1-darts">(0)</div>
                          </div>
                        </div>
                        
                        <div class="player-row" id="player2-row">
                          <div class="player-name-section">
                            <div class="player-name">${getPlayer2Name()}</div>
                          </div>
                          <div class="stat" id="player2-avg">0.00</div>
                          <div class="stat" id="player2-legs">${matchState.player2LegsWon || 0}</div>
                          <div class="score-section">
                            <div class="score" id="player2-score">${matchState.currentLegData.player2Remaining}</div>
                            <div class="darts-info" id="player2-darts">(0)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <script>
                      let lastState = null;
                      
                      function updateDisplay(state) {
                        if (!state) return;
                        
                        const player1Score = document.getElementById('player1-score');
                        const player2Score = document.getElementById('player2-score');
                        const player1Row = document.getElementById('player1-row');
                        const player2Row = document.getElementById('player2-row');
                        
                        if (lastState && lastState.currentLegData) {
                          if (lastState.currentLegData.player1Remaining !== state.currentLegData.player1Remaining) {
                            const throwValue = lastState.currentLegData.player1Remaining - state.currentLegData.player1Remaining;
                            showThrowAnimation(player1Score, throwValue);
                          }
                          
                          if (lastState.currentLegData.player2Remaining !== state.currentLegData.player2Remaining) {
                            const throwValue = lastState.currentLegData.player2Remaining - state.currentLegData.player2Remaining;
                            showThrowAnimation(player2Score, throwValue);
                          }
                        }
                        
                        player1Score.textContent = state.currentLegData.player1Remaining;
                        player2Score.textContent = state.currentLegData.player2Remaining;
                        
                        // Update indicators dynamically
                        updateIndicators(state, player1Row, player2Row);
                        
                        // Update leg counts
                        document.getElementById('player1-legs').textContent = state.player1LegsWon || 0;
                        document.getElementById('player2-legs').textContent = state.player2LegsWon || 0;
                        
                        updateDartCounters(state);
                        
                        lastState = JSON.parse(JSON.stringify(state));
                      }
                      
                      let lastLegNumber = 0; // Track leg changes
                      
                      function updateIndicators(state, player1Row, player2Row) {
                        const player1Section = player1Row.querySelector('.player-name-section');
                        const player2Section = player2Row.querySelector('.player-name-section');
                        
                        // Check if leg number changed (new leg started)
                        const currentLegNumber = state.currentLeg || 1;
                        const legChanged = lastLegNumber !== currentLegNumber;
                        if (legChanged) {
                          lastLegNumber = currentLegNumber;
                          // Remove old arrows when leg changes
                          player1Section.querySelectorAll('.starter-arrow').forEach(el => el.remove());
                          player2Section.querySelectorAll('.starter-arrow').forEach(el => el.remove());
                        }
                        
                        // Use the same getCurrentLegStarter logic from parent window
                        let legStarter = 1; // Default
                        
                        try {
                          if (window.opener && window.opener.matchData) {
                            const matchData = window.opener.matchData;
                            
                            // First leg: use match startingPlayer
                            if (currentLegNumber === 1) {
                              legStarter = matchData.startingPlayer || 1;
                            } else if (matchData.legs && matchData.legs.length > 0) {
                              // Get last completed leg
                              const lastCompletedLeg = matchData.legs[matchData.legs.length - 1];
                              
                              if (lastCompletedLeg.player1Throws && lastCompletedLeg.player2Throws) {
                                const p1Throws = lastCompletedLeg.player1Throws.length;
                                const p2Throws = lastCompletedLeg.player2Throws.length;
                                
                                let lastLegStarter;
                                if (p1Throws > p2Throws) {
                                  lastLegStarter = 1;
                                } else if (p2Throws > p1Throws) {
                                  lastLegStarter = 2;
                                } else {
                                  // Equal throws - check winner
                                  lastLegStarter = 1; // Fallback
                                }
                                
                                // Current leg starter is opposite
                                legStarter = lastLegStarter === 1 ? 2 : 1;
                              } else {
                                // Fallback: alternate based on leg number
                                legStarter = matchData.startingPlayer === 1 
                                  ? (currentLegNumber % 2 === 1 ? 1 : 2)
                                  : (currentLegNumber % 2 === 1 ? 2 : 1);
                              }
                            } else {
                              // Fallback: alternate based on leg number
                              legStarter = matchData.startingPlayer === 1 
                                ? (currentLegNumber % 2 === 1 ? 1 : 2)
                                : (currentLegNumber % 2 === 1 ? 2 : 1);
                            }
                          }
                        } catch (e) {
                          console.log('Could not access matchData from parent:', e);
                        }
                        
                        // Hozzáadjuk a háromszöget ha nincs ott (új leg vagy első betöltés)
                        if (!player1Section.querySelector('.starter-arrow') && !player2Section.querySelector('.starter-arrow')) {
                          const arrowSvg = '<svg class="starter-arrow" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 19.5h20L12 2z"/></svg>';
                          
                          if (legStarter === 1) {
                            player1Section.insertAdjacentHTML('afterbegin', arrowSvg);
                          } else {
                            player2Section.insertAdjacentHTML('afterbegin', arrowSvg);
                          }
                        }
                        
                        // Csak a piros pötty mozgatása (mindig töröljük és újra hozzáadjuk)
                        player1Section.querySelectorAll('.current-player-icon').forEach(el => el.remove());
                        player2Section.querySelectorAll('.current-player-icon').forEach(el => el.remove());
                        
                        const currentDot = '<span class="current-player-icon"></span>';
                        
                        if (state.currentLegData.currentPlayer === 1) {
                          player1Section.insertAdjacentHTML('beforeend', currentDot);
                        } else {
                          player2Section.insertAdjacentHTML('beforeend', currentDot);
                        }
                      }
                      
                      function showThrowAnimation(element, throwValue) {
                        const animation = document.createElement('div');
                        animation.className = 'throw-animation';
                        animation.textContent = '-' + throwValue;
                        element.parentNode.parentNode.appendChild(animation);
                        
                        setTimeout(() => animation.remove(), 1500);
                      }
                      
                      function updateDartCounters(state) {
                        // Calculate MATCH totals for average
                        let player1TotalThrows = 0, player2TotalThrows = 0;
                        let player1TotalScore = 0, player2TotalScore = 0;
                        
                        // Current leg throws and scores for match totals
                        if (state.currentLegData.player1Throws) {
                          player1TotalThrows += state.currentLegData.player1Throws.length;
                          state.currentLegData.player1Throws.forEach(t => player1TotalScore += (t.score || 0));
                        }
                        if (state.currentLegData.player2Throws) {
                          player2TotalThrows += state.currentLegData.player2Throws.length;
                          state.currentLegData.player2Throws.forEach(t => player2TotalScore += (t.score || 0));
                        }
                        
                        // Add completed legs to match totals
                        if (state.completedLegs && state.completedLegs.length > 0) {
                          state.completedLegs.forEach(leg => {
                            if (leg.player1Throws) {
                              player1TotalThrows += leg.player1Throws.length;
                              leg.player1Throws.forEach(t => player1TotalScore += (t.score || 0));
                            }
                            if (leg.player2Throws) {
                              player2TotalThrows += leg.player2Throws.length;
                              leg.player2Throws.forEach(t => player2TotalScore += (t.score || 0));
                            }
                          });
                        }
                        
                        // Calculate match averages (3-dart average from ALL legs)
                        const player1Avg = player1TotalThrows > 0 ? (player1TotalScore / player1TotalThrows).toFixed(2) : '0.00';
                        const player2Avg = player2TotalThrows > 0 ? (player2TotalScore / player2TotalThrows).toFixed(2) : '0.00';
                        
                        // Calculate CURRENT LEG dart count only
                        const player1CurrentLegDarts = state.currentLegData.player1Throws ? state.currentLegData.player1Throws.length * 3 : 0;
                        const player2CurrentLegDarts = state.currentLegData.player2Throws ? state.currentLegData.player2Throws.length * 3 : 0;
                        
                        // Display current leg darts and match average
                        document.getElementById('player1-darts').textContent = '(' + player1CurrentLegDarts + ')';
                        document.getElementById('player2-darts').textContent = '(' + player2CurrentLegDarts + ')';
                        document.getElementById('player1-avg').textContent = player1Avg;
                        document.getElementById('player2-avg').textContent = player2Avg;
                      }
                      
                      // Initial display update
                      if (window.opener && !window.opener.closed) {
                        try {
                          const initialState = window.opener.matchState;
                          if (initialState) updateDisplay(initialState);
                        } catch (e) {}
                      }
                      
                      // Auto-refresh every 2 seconds to keep scores updated
                      setInterval(() => {
                        if (window.opener && !window.opener.closed) {
                          try {
                            const openerState = window.opener.matchState;
                            if (openerState) updateDisplay(openerState);
                          } catch (e) {}
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
          <IconEye className="w-4 h-4 mr-2" />
          Streaming
        </button>
      </div>

      {/* Integrated Chalkboard with Players */}
      <div className="bg-base-200 rounded-lg shadow-lg p-2 sm:p-4 mb-4">
        {/* Player Cards - Responsive */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Player 1 Card */}
          <div className="bg-base-100 rounded-lg p-2 sm:p-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 sm:gap-2 justify-between">
                <div className="flex items-center gap-1">
                  {/* Kezdő játékos indikátor (zöld ikon) - match adatokból */}
                  {getCurrentLegStarter() === 1 && (
                    <IconPencil size={16} className="text-green-500 flex-shrink-0" />
                  )}
                  <span className="text-sm sm:text-base font-bold text-base-content truncate">{getPlayer1Name()}</span>
                </div>
                {/* Jelenlegi dobó (piros pont) */}
                {matchState.currentLegData.currentPlayer === 1 && (
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xl sm:text-2xl font-bold text-primary">{matchState.currentLegData.player1Remaining}</div>
                <div className="text-xs sm:text-sm text-base-content/70">Legs: {matchState.player1LegsWon || 0}</div>
              </div>
            </div>
          </div>

          {/* Player 2 Card */}
          <div className="bg-base-100 rounded-lg p-2 sm:p-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 sm:gap-2 justify-between">
                <div className="flex items-center gap-1">
                  {/* Kezdő játékos indikátor (zöld ikon) - match adatokból */}
                  {getCurrentLegStarter() === 2 && (
                    <IconTarget size={16} className="text-green-500 flex-shrink-0" />
                  )}
                  <span className="text-sm sm:text-base font-bold text-base-content truncate">{getPlayer2Name()}</span>
                </div>
                {/* Jelenlegi dobó (piros pont) */}
                {matchState.currentLegData.currentPlayer === 2 && (
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0"></div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xl sm:text-2xl font-bold text-primary">{matchState.currentLegData.player2Remaining}</div>
                <div className="text-xs sm:text-sm text-base-content/70">Legs: {matchState.player2LegsWon || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Chalkboard Header */}
        <div className="text-center text-sm sm:text-base font-bold text-base-content mb-2">
          Leg {matchState.currentLeg} - Dobások
        </div>

        {/* Chalkboard Style Throw Display - Responsive */}
        <div className="bg-base-300 rounded-lg p-2 overflow-x-auto">
          <div className="flex w-full min-w-[300px]">
            {/* Player 1 Throws */}
            <div className="flex-1 flex flex-col">
              <div className="space-y-1">
                {matchState.currentLegData.player1Throws.map((throwValue: any, index: number) => (
                  <div key={index} className="rounded p-1 sm:p-2 h-[2rem] sm:h-[2.5rem] bg-base-200 flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-bold">
                      {throwValue.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Round Numbers */}
            <div className="w-10 sm:w-14 flex flex-col items-center bg-base-100 mx-1">
              <div className="space-y-1">
                {Array.from({ length: Math.max(matchState.currentLegData.player1Throws.length, matchState.currentLegData.player2Throws.length) }).map((_, index) => (
                  <div key={index} className="rounded p-1 sm:p-2 h-[2rem] sm:h-[2.5rem] bg-base-200 flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-bold text-base-content">
                      {(index + 1) * 3}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Player 2 Throws */}
            <div className="flex-1 flex flex-col">
              <div className="space-y-1">
                {matchState.currentLegData.player2Throws.map((throwValue: any, index: number) => (
                  <div key={index} className="rounded p-1 sm:p-2 h-[2rem] sm:h-[2.5rem] bg-base-200 flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-bold">
                      {throwValue.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Completed legs - Collapsible */}
      {matchState.completedLegs.length > 0 && (
        <div className="bg-base-200 rounded-lg p-4">
          <button
            className="flex items-center justify-between w-full mb-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowCompletedLegs(!showCompletedLegs)}
          >
            <div className="flex items-center gap-2">
              <IconEye className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-base-content">
                Befejezett Legek ({matchState.completedLegs.length})
              </h3>
            </div>
            <IconChevronDown 
              className={`w-5 h-5 text-base-content transition-transform duration-200 ${
                showCompletedLegs ? 'rotate-180' : ''
              }`} 
            />
          </button>
          
          {showCompletedLegs && (
            <div className="mt-4 space-y-4">
              
              {matchState.completedLegs.map((leg, index) => {
                const startingPlayer = getStartingPlayer(leg.player1Throws, leg.player2Throws);
                const winner = leg.winnerId === getPlayerId(1) ? 1 : 2;
                const loser = winner === 1 ? 2 : 1;
                
                // Calculate remaining score for loser
                let loserRemaining = 501;
                const loserThrows = loser === 1 ? leg.player1Throws : leg.player2Throws;
                loserThrows.forEach((t: any) => {
                  if (t.remainingScore !== undefined) {
                    loserRemaining = t.remainingScore;
                  } else {
                    loserRemaining -= t.score;
                  }
                });
                
                // Helper to get score highlight class
                const getCompletedLegScoreClass = (score: number, isCheckout: boolean) => {
                  if (isCheckout) return 'text-green-500 font-bold';
                  if (score === 180) return 'text-yellow-500 font-bold';
                  if (score >= 140) return 'text-orange-500 font-bold';
                  if (score >= 100) return 'text-blue-500 font-semibold';
                  return 'text-base-content';
                };
                
                return (
                  <div key={index} className="bg-base-100 rounded-lg p-2 sm:p-4">
                    {/* Leg header */}
                    <div className="bg-base-200 rounded-lg p-2 sm:p-3 mb-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="text-base sm:text-lg font-bold text-base-content">Leg {index + 1}</div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <span className="text-base-content/70">Kezdte:</span>
                          <span className="font-semibold text-base-content">{getPlayerName(startingPlayer)}</span>
                          <IconDart size={16} className="text-green-500" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`text-sm sm:text-base font-bold ${winner === 1 ? 'text-green-500' : 'text-base-content'}`}>
                            {getPlayerName(winner)} ✓
                          </div>
                          <div className="text-xs sm:text-sm text-base-content/70">
                            ({getPlayerName(loser)}: {loserRemaining})
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Chalkboard - Same style as current leg */}
                    <div className="bg-base-300 rounded-lg p-2 overflow-x-auto">
                      <div className="flex w-full min-w-[300px]">
                        {/* Player 1 Throws */}
                        <div className="flex-1 flex flex-col">
                          <div className="space-y-1">
                            {leg.player1Throws.map((throwValue: any, throwIndex: number) => {
                              const isLastThrow = throwIndex === leg.player1Throws.length - 1;
                              const isCheckout = throwValue.isCheckout || (winner === 1 && isLastThrow);
                              
                              return (
                                <div key={throwIndex} className="rounded p-1 sm:p-2 h-[2rem] sm:h-[2.5rem] bg-base-200 flex items-center justify-center">
                                  <span className={`text-xs sm:text-sm font-bold ${getCompletedLegScoreClass(throwValue.score, isCheckout)}`}>
                                    {throwValue.score}{isCheckout ? ' ✓' : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Round Numbers */}
                        <div className="w-10 sm:w-14 flex flex-col items-center bg-base-100 mx-1">
                          <div className="space-y-1">
                            {Array.from({ length: Math.max(leg.player1Throws.length, leg.player2Throws.length) }).map((_, throwIndex) => {
                              const isLastPlayer1Throw = throwIndex === leg.player1Throws.length - 1;
                              const isLastPlayer2Throw = throwIndex === leg.player2Throws.length - 1;
                              const isWinnerLastThrow = (winner === 1 && isLastPlayer1Throw) || (winner === 2 && isLastPlayer2Throw);
                              
                              // Calculate arrow count for this row
                              let arrowCount = (throwIndex + 1) * 3;
                              if (isWinnerLastThrow && leg.winnerArrowCount) {
                                // For the winning throw, use the actual arrow count
                                arrowCount = (throwIndex * 3) + leg.winnerArrowCount;
                              }
                              
                              return (
                                <div key={throwIndex} className="rounded p-1 sm:p-2 h-[2rem] sm:h-[2.5rem] bg-base-200 flex items-center justify-center">
                                  <span className="text-xs sm:text-sm font-bold text-base-content">
                                    {arrowCount}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Player 2 Throws */}
                        <div className="flex-1 flex flex-col">
                          <div className="space-y-1">
                            {leg.player2Throws.map((throwValue: any, throwIndex: number) => {
                              const isLastThrow = throwIndex === leg.player2Throws.length - 1;
                              const isCheckout = throwValue.isCheckout || (winner === 2 && isLastThrow);
                              
                              return (
                                <div key={throwIndex} className="rounded p-1 sm:p-2 h-[2rem] sm:h-[2.5rem] bg-base-200 flex items-center justify-center">
                                  <span className={`text-xs sm:text-sm font-bold ${getCompletedLegScoreClass(throwValue.score, isCheckout)}`}>
                                    {throwValue.score}{isCheckout ? ' ✓' : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveMatchViewer; 