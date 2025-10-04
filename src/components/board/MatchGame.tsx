import { IconHistory, IconX, IconArrowLeft} from '@tabler/icons-react';
import React, { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface Player {
  playerId: {
    _id: string;
    name: string;
  };
  legsWon?: number;
  legsLost?: number;
  average?: number;
  highestCheckout?: number;
  oneEightiesCount?: number;
}

interface Scorer {
  playerId: string;
  name: string;
}

interface Match {
  _id: string;
  boardReference: number;
  type: string;
  round: number;
  player1: Player;
  player2: Player;
  scorer: Scorer;
  status: string;
  startingScore: number;
  legsToWin?: number;
  startingPlayer?: 1 | 2;
  winnerId?: string; // Added for finished matches
}

interface MatchGameProps {
  match: Match;
  onBack: () => void;
  clubId?: string; // Add clubId for feature flag checking
}

const MatchGame: React.FC<MatchGameProps> = ({ match, onBack, clubId }) => {
  const [player1Score, setPlayer1Score] = useState<number>(match.startingScore);
  const [player2Score, setPlayer2Score] = useState<number>(match.startingScore);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(match.startingPlayer || 1);
  const [throwInput, setThrowInput] = useState<string>('');
  const [player1Throws, setPlayer1Throws] = useState<number[]>([]);
  const [player2Throws, setPlayer2Throws] = useState<number[]>([]);
  const [player1LegsWon, setPlayer1LegsWon] = useState<number>(0);
  const [player2LegsWon, setPlayer2LegsWon] = useState<number>(0);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [legStartingPlayer, setLegStartingPlayer] = useState<1 | 2>(match.startingPlayer || 1);
  const [showThrowHistory, setShowThrowHistory] = useState<boolean>(false);
  const [scoreInputOnLeft, setScoreInputOnLeft] = useState<boolean>(true);
  
  // Statistics
  const [player1Stats, setPlayer1Stats] = useState({
    highestCheckout: 0,
    oneEightiesCount: 0,
    totalThrows: 0,
    totalScore: 0
  });
  const [player2Stats, setPlayer2Stats] = useState({
    highestCheckout: 0,
    oneEightiesCount: 0,
    totalThrows: 0,
    totalScore: 0
  });
  
  // Confirmation dialogs
  const [showLegConfirmation, setShowLegConfirmation] = useState<boolean>(false);
  const [showMatchConfirmation, setShowMatchConfirmation] = useState<boolean>(false);
  const [pendingLegWinner, setPendingLegWinner] = useState<1 | 2 | null>(null);
  const [pendingMatchWinner, setPendingMatchWinner] = useState<1 | 2 | null>(null);
  
  // Loading states
  const [isSavingLeg, setIsSavingLeg] = useState<boolean>(false);
  const [isSavingMatch, setIsSavingMatch] = useState<boolean>(false);

  // Socket hook with feature flag support
  const { socket, isConnected } = useSocket({ 
    matchId: match._id, 
    clubId 
  });

  // Debug socket connection
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
      console.log('🔌 MatchGame socket status:', {
        isConnected,
        socketConnected: socket?.connected,
        matchId: match._id,
        clubId
      });
    }
    
    // Global debug info for production (only in console)
    if (typeof window !== 'undefined') {
      (window as any).matchGameDebug = {
        isConnected,
        socketConnected: socket?.connected,
        matchId: match._id,
        clubId,
        socket
      };
    }
  }, [isConnected, socket?.connected, match._id, clubId]);

  // Calculate the correct starting player for the next leg
  const calculateNextLegStartingPlayer = (totalLegsPlayed: number, originalStartingPlayer: number): number => {
    // If odd number of legs played, the opposite player starts
    // If even number of legs played, the original starting player starts
    return totalLegsPlayed % 2 === 1 ? (originalStartingPlayer === 1 ? 2 : 1) : originalStartingPlayer;
  };

  // Socket.IO connection and match state management
  useEffect(() => {
    if (!isConnected) return;
    // Initialize match config on server
    socket.emit('init-match', {
      matchId: match._id,
      startingScore: match.startingScore,
      legsToWin: match.legsToWin || 3,
      startingPlayer: match.startingPlayer || 1
    });
    // Set player IDs in socket for match state
    socket.emit('set-match-players', {
      matchId: match._id,
      player1Id: match.player1.playerId._id,
      player2Id: match.player2.playerId._id,
      player1Name: match.player1.playerId.name,
      player2Name: match.player2.playerId.name
    });
    
    // Notify tournament room that match has started
    const tournamentCode = window.location.pathname.split('/')[2]; // Extract tournament code from URL
    socket.emit('match-started', {
      matchId: match._id,
      tournamentCode: tournamentCode,
      matchData: {
        player1: match.player1,
        player2: match.player2,
        startingScore: match.startingScore,
        legsToWin: match.legsToWin || 3
      }
    });
  }, [isConnected, match._id, match.player1.playerId._id, match.player2.playerId._id, match.startingScore, match.legsToWin, match.startingPlayer]);

  // Initialize game state - always try to load from localStorage first
  useEffect(() => {
    // Reset initialization flag when match settings change
    setIsInitialized(false);
    
    console.log('🔄 Initializing game state for match:', match._id);
    
    // Always try to load from localStorage first
    const savedState = localStorage.getItem(`match_game_${match._id}`);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        console.log('💾 Found saved state in localStorage:', {
          player1Score: state.player1Score,
          player2Score: state.player2Score,
          player1LegsWon: state.player1LegsWon,
          player2LegsWon: state.player2LegsWon,
          currentPlayer: state.currentPlayer
        });
        
        // Load saved state
        setPlayer1Score(state.player1Score || match.startingScore);
        setPlayer2Score(state.player2Score || match.startingScore);
        setCurrentPlayer(state.currentPlayer || (match.startingPlayer || 1));
        setPlayer1Throws(state.player1Throws || []);
        setPlayer2Throws(state.player2Throws || []);
        setPlayer1LegsWon(state.player1LegsWon || 0);
        setPlayer2LegsWon(state.player2LegsWon || 0);
        setLegStartingPlayer(state.legStartingPlayer || (match.startingPlayer || 1));
        setPlayer1Stats(state.player1Stats || { highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 });
        setPlayer2Stats(state.player2Stats || { highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 });
        
        console.log('✅ Successfully loaded game state from localStorage');
        setIsInitialized(true);
        return;
      } catch (error) {
        console.error('❌ Error parsing saved state, clearing localStorage:', error);
        localStorage.removeItem(`match_game_${match._id}`);
      }
    }
    
    // No saved state found - initialize with default values from database
    console.log('🔄 No saved state found, initializing with default values from database');
    
    // Calculate starting player for current leg based on completed legs
    const totalLegsPlayed = (match.player1.legsWon || 0) + (match.player2.legsWon || 0);
    const nextLegStartingPlayer = calculateNextLegStartingPlayer(totalLegsPlayed, match.startingPlayer || 1);
    
    console.log('📊 Database values:', {
      startingScore: match.startingScore,
      player1LegsWon: match.player1.legsWon || 0,
      player2LegsWon: match.player2.legsWon || 0,
      nextLegStartingPlayer
    });
    
    // Initialize with database values
    setPlayer1Score(match.startingScore);
    setPlayer2Score(match.startingScore);
    setCurrentPlayer(nextLegStartingPlayer as 1 | 2);
    setPlayer1Throws([]);
    setPlayer2Throws([]);
    setPlayer1LegsWon(match.player1.legsWon || 0);
    setPlayer2LegsWon(match.player2.legsWon || 0);
    setLegStartingPlayer(nextLegStartingPlayer as 1 | 2);
    setPlayer1Stats({ 
      highestCheckout: match.player1.highestCheckout || 0, 
      oneEightiesCount: match.player1.oneEightiesCount || 0, 
      totalThrows: 0, 
      totalScore: 0 
    });
    setPlayer2Stats({ 
      highestCheckout: match.player2.highestCheckout || 0, 
      oneEightiesCount: match.player2.oneEightiesCount || 0, 
      totalThrows: 0, 
      totalScore: 0 
    });
    
    setIsInitialized(true);
  }, [match._id, match.startingPlayer, match.legsToWin]); // Depend on match._id, startingPlayer, and legsToWin

  // Save game state to localStorage whenever it changes (but only after initialization and only if there's an ongoing game)
  useEffect(() => {
    if (!isInitialized) return; // Don't save before initialization is complete
    
    // Only save if there's an ongoing game (not just default starting state)
    const hasOngoingGame = player1Throws.length > 0 || player2Throws.length > 0 || 
                          (player1Score !== match.startingScore) || (player2Score !== match.startingScore) ||
                          player1LegsWon > 0 || player2LegsWon > 0;
    
    if (!hasOngoingGame) {
      console.log('⏭️ Skipping localStorage save - no ongoing game detected');
      return;
    }
    
    const gameState = {
      player1Score,
      player2Score,
      currentPlayer,
      player1Throws,
      player2Throws,
      player1LegsWon,
      player2LegsWon,
      legStartingPlayer,
      player1Stats,
      player2Stats,
    };
    
    console.log('💾 Saving ongoing game state to localStorage:', {
      player1LegsWon,
      player2LegsWon,
      player1Score,
      player2Score,
      currentPlayer,
      hasThrows: player1Throws.length > 0 || player2Throws.length > 0
    });
    
    localStorage.setItem(`match_game_${match._id}`, JSON.stringify(gameState));
  }, [player1Score, player2Score, currentPlayer, player1Throws, player2Throws, player1LegsWon, player2LegsWon, legStartingPlayer, player1Stats, player2Stats, match._id, isInitialized, match.startingScore]);

  // Check for leg completion when scores change
  useEffect(() => {
    if (!isInitialized) return;
    
    if (player1Score === 0 || player2Score === 0) {
      const legWinner = player1Score === 0 ? 1 : 2;
      setPendingLegWinner(legWinner);
      setShowLegConfirmation(true);
    }
  }, [player1Score, player2Score, isInitialized]);

  const handleNumberInput = (num: number) => {
    if (throwInput.length < 3) { // Max 3 digits
      setThrowInput(throwInput + num.toString());
    }
  };

  const handleClear = () => {
    setThrowInput('');
  };

  const handleBackspace = () => {
    setThrowInput(throwInput.slice(0, -1));
  };

  const handleUndo = () => {
    // Determine which player just threw (the other player is current)
    const playerWhoJustThrew = currentPlayer === 1 ? 2 : 1;
    
    if (playerWhoJustThrew === 1 && player1Throws.length > 0) {
      const lastThrow = player1Throws[player1Throws.length - 1];
      setPlayer1Score(player1Score + lastThrow);
      setPlayer1Throws(player1Throws.slice(0, -1));
      setCurrentPlayer(1); // Switch back to player 1
      
      // Update stats - properly handle 180 count
      setPlayer1Stats(prev => ({
        ...prev,
        totalThrows: prev.totalThrows - 1,
        totalScore: prev.totalScore - lastThrow,
        oneEightiesCount: lastThrow === 180 ? prev.oneEightiesCount - 1 : prev.oneEightiesCount
      }));
    } else if (playerWhoJustThrew === 2 && player2Throws.length > 0) {
      const lastThrow = player2Throws[player2Throws.length - 1];
      setPlayer2Score(player2Score + lastThrow);
      setPlayer2Throws(player2Throws.slice(0, -1));
      setCurrentPlayer(2); // Switch back to player 2
      
      // Update stats - properly handle 180 count
      setPlayer2Stats(prev => ({
        ...prev,
        totalThrows: prev.totalThrows - 1,
        totalScore: prev.totalScore - lastThrow,
        oneEightiesCount: lastThrow === 180 ? prev.oneEightiesCount - 1 : prev.oneEightiesCount
      }));
    }
    
    // Notify server to undo last throw for live viewer sync
    if (isConnected) {
      socket.emit('undo-throw', {
        matchId: match._id,
        playerId: playerWhoJustThrew === 1 ? match.player1.playerId._id : match.player2.playerId._id,
        tournamentCode: window.location.pathname.split('/')[2]
      });
    }
  };

  const handleThrow = () => {
    const throwValue = parseInt(throwInput);
    if (throwValue >= 0 && throwValue <= 180) {
      if (currentPlayer === 1) {
        // Check for bust - if throw is greater than remaining score
        if (throwValue > player1Score) {
          setThrowInput('');
          setCurrentPlayer(2); // Switch to next player
          return;
        }
        
        const newScore = player1Score - throwValue;
        setPlayer1Score(newScore);
        setPlayer1Throws([...player1Throws, throwValue]);
        
        // Update stats
        setPlayer1Stats(prev => ({
          ...prev,
          totalThrows: prev.totalThrows + 1,
          totalScore: prev.totalScore + throwValue,
          oneEightiesCount: throwValue === 180 ? prev.oneEightiesCount + 1 : prev.oneEightiesCount,
          highestCheckout: newScore === 0 ? Math.max(prev.highestCheckout, throwValue) : prev.highestCheckout
        }));

        // Send throw event to socket only if it's not a checkout
        if (isConnected && newScore !== 0) {
          if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
            console.log('🎯 Sending throw event for player 1:', {
              matchId: match._id,
              playerId: match.player1.playerId._id,
              score: throwValue,
              remainingScore: newScore,
              isConnected,
              socketConnected: socket?.connected
            });
          }
          socket.emit('throw', {
            matchId: match._id,
            playerId: match.player1.playerId._id,
            score: throwValue,
            darts: 3, // Assuming 3 darts per throw
            isDouble: false,
            isCheckout: false,
            remainingScore: newScore,
            legNumber: player1LegsWon + player2LegsWon + 1,
            tournamentCode: window.location.pathname.split('/')[2]
          });
        } else {
          if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
            console.log('🚫 Not sending throw event for player 1:', {
              isConnected,
              socketConnected: socket?.connected,
              newScore,
              reason: newScore === 0 ? 'checkout' : 'not connected'
            });
          }
        }
      } else {
        // Check for bust - if throw is greater than remaining score
        if (throwValue > player2Score) {
          setThrowInput('');
          setCurrentPlayer(1); // Switch to next player
          return;
        }
        
        const newScore = player2Score - throwValue;
        setPlayer2Score(newScore);
        setPlayer2Throws([...player2Throws, throwValue]);
        
        // Update stats
        setPlayer2Stats(prev => ({
          ...prev,
          totalThrows: prev.totalThrows + 1,
          totalScore: prev.totalScore + throwValue,
          oneEightiesCount: throwValue === 180 ? prev.oneEightiesCount + 1 : prev.oneEightiesCount,
          highestCheckout: newScore === 0 ? Math.max(prev.highestCheckout, throwValue) : prev.highestCheckout
        }));

        // Send throw event to socket only if it's not a checkout
        if (isConnected && newScore !== 0) {
          if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
            console.log('🎯 Sending throw event for player 2:', {
              matchId: match._id,
              playerId: match.player2.playerId._id,
              score: throwValue,
              remainingScore: newScore,
              isConnected,
              socketConnected: socket?.connected
            });
          }
          socket.emit('throw', {
            matchId: match._id,
            playerId: match.player2.playerId._id,
            score: throwValue,
            darts: 3, // Assuming 3 darts per throw
            isDouble: false,
            isCheckout: false,
            remainingScore: newScore,
            legNumber: player1LegsWon + player2LegsWon + 1,
            tournamentCode: window.location.pathname.split('/')[2]
          });
        } else {
          if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_SOCKET === 'true') {
            console.log('🚫 Not sending throw event for player 2:', {
              isConnected,
              socketConnected: socket?.connected,
              newScore,
              reason: newScore === 0 ? 'checkout' : 'not connected'
            });
          }
        }
      }
      setThrowInput('');
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  const confirmLegEnd = async () => {
    if (!pendingLegWinner || isSavingLeg) return;
    
    setIsSavingLeg(true);
    
    // Calculate new leg counts
    const newPlayer1Legs = pendingLegWinner === 1 ? player1LegsWon + 1 : player1LegsWon;
    const newPlayer2Legs = pendingLegWinner === 2 ? player2LegsWon + 1 : player2LegsWon;
    
    // Update legs won
    if (pendingLegWinner === 1) {
      setPlayer1LegsWon(newPlayer1Legs);
    } else {
      setPlayer2LegsWon(newPlayer2Legs);
    }
    
    // Use the configured legsToWin from match settings
    const requiredLegsToWin = match.legsToWin || 3;
    
    console.log('🏆 Leg completion check:', {
      requiredLegsToWin,
      newPlayer1Legs,
      newPlayer2Legs,
      matchLegsToWin: match.legsToWin,
      shouldFinish: newPlayer1Legs >= requiredLegsToWin || newPlayer2Legs >= requiredLegsToWin
    });
    
    if (newPlayer1Legs >= requiredLegsToWin || newPlayer2Legs >= requiredLegsToWin) {
      // Match is finished - pass the correct leg counts
      setPendingMatchWinner(pendingLegWinner);
      // Store the final leg counts for the match end
      setPlayer1LegsWon(newPlayer1Legs);
      setPlayer2LegsWon(newPlayer2Legs);
      setShowMatchConfirmation(true);
      setShowLegConfirmation(false);
      return;
    }

    // Send the final checkout throw to socket now that leg is confirmed
    if (isConnected) {
      const lastThrow = pendingLegWinner === 1 ? player1Throws[player1Throws.length - 1] : player2Throws[player2Throws.length - 1];
      socket.emit('throw', {
        matchId: match._id,
        playerId: pendingLegWinner === 1 ? match.player1.playerId._id : match.player2.playerId._id,
        score: lastThrow,
        darts: 3,
        isDouble: true,
        isCheckout: true,
        remainingScore: 0,
        legNumber: player1LegsWon + player2LegsWon + 1,
        tournamentCode: window.location.pathname.split('/')[2]
      });
    }

    // Send leg completion to API
    try {
      await fetch(`/api/matches/${match._id}/finish-leg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner: pendingLegWinner,
          player1Throws,
          player2Throws,
          player1Stats,
          player2Stats
        })
      });
    } catch (error) {
      console.error('Error saving leg:', error);
    } finally {
      setIsSavingLeg(false);
    }

    // Send leg completion to socket
    const completedLeg = {
      legNumber: player1LegsWon + player2LegsWon + 1,
      winnerId: pendingLegWinner === 1 ? match.player1.playerId._id : match.player2.playerId._id,
      player1Throws,
      player2Throws,
      player1Stats,
      player2Stats,
      completedAt: Date.now()
    };

    if (isConnected) {
      socket.emit('leg-complete', {
        matchId: match._id,
        legNumber: completedLeg.legNumber,
        winnerId: completedLeg.winnerId,
        completedLeg,
        tournamentCode: window.location.pathname.split('/')[2]
      });
    }

    // Reset for next leg - use tournament starting score
    setPlayer1Score(match.startingScore);
    setPlayer2Score(match.startingScore);
    
    // The player who didn't start this leg starts the next leg
    // This ensures proper alternating of starting players
    const nextLegStartingPlayer = legStartingPlayer === 1 ? 2 : 1;
    setLegStartingPlayer(nextLegStartingPlayer);
    setCurrentPlayer(nextLegStartingPlayer);
    
    setPlayer1Throws([]);
    setPlayer2Throws([]);
    setThrowInput('');
    
    // Don't save to localStorage after leg completion - let the next throw trigger the save
    console.log('🏆 Leg completed, reset to tournament starting score:', match.startingScore);
    
    setShowLegConfirmation(false);
    setPendingLegWinner(null);
  };

  const confirmMatchEnd = async () => {
    if (!pendingMatchWinner || isSavingMatch) return;
    
    setIsSavingMatch(true);
    
    // Send the final checkout throw to socket now that match is confirmed
    if (isConnected) {
      const lastThrow = pendingMatchWinner === 1 ? player1Throws[player1Throws.length - 1] : player2Throws[player2Throws.length - 1];
      socket.emit('throw', {
        matchId: match._id,
        playerId: pendingMatchWinner === 1 ? match.player1.playerId._id : match.player2.playerId._id,
        score: lastThrow,
        darts: 3,
        isDouble: true,
        isCheckout: true,
        remainingScore: 0,
        legNumber: player1LegsWon + player2LegsWon + 1,
        tournamentCode: window.location.pathname.split('/')[2]
      });
    }
    
    try {
      await fetch(`/api/matches/${match._id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1LegsWon: player1LegsWon,
          player2LegsWon: player2LegsWon,
          player1Stats,
          player2Stats,
          finalLegData: {
            player1Throws,
            player2Throws
          }
        })
      });
    } catch (error) {
      console.error('Error finishing match:', error);
    } finally {
      setIsSavingMatch(false);
    }

    // Inform server to cleanup live state for this match
    if (isConnected) {
      socket.emit('match-complete', { 
        matchId: match._id,
        tournamentCode: window.location.pathname.split('/')[2]
      });
    }

    // Clear localStorage and go back
    localStorage.removeItem(`match_game_${match._id}`);
    alert(`Meccs vége! ${pendingMatchWinner === 1 ? match.player1.playerId.name : match.player2.playerId.name} nyert!`);
    onBack();
  };

  const cancelLegEnd = () => {
    if (isSavingLeg) return; // Don't allow cancel while saving
    
    // Undo the last throw that caused the leg to end
    // pendingLegWinner is the player who just won the leg (who threw the last throw)
    const playerWhoJustThrew = pendingLegWinner;
    
    if (playerWhoJustThrew === 1 && player1Throws.length > 0) {
      const lastThrow = player1Throws[player1Throws.length - 1];
      setPlayer1Score(player1Score + lastThrow);
      setPlayer1Throws(player1Throws.slice(0, -1));
      setCurrentPlayer(1); // This player stays on turn
      
      // Update stats - properly handle 180 count
      setPlayer1Stats(prev => ({
        ...prev,
        totalThrows: prev.totalThrows - 1,
        totalScore: prev.totalScore - lastThrow,
        oneEightiesCount: lastThrow === 180 ? prev.oneEightiesCount - 1 : prev.oneEightiesCount
      }));
    } else if (playerWhoJustThrew === 2 && player2Throws.length > 0) {
      const lastThrow = player2Throws[player2Throws.length - 1];
      setPlayer2Score(player2Score + lastThrow);
      setPlayer2Throws(player2Throws.slice(0, -1));
      setCurrentPlayer(2); // This player stays on turn
      
      // Update stats - properly handle 180 count
      setPlayer2Stats(prev => ({
        ...prev,
        totalThrows: prev.totalThrows - 1,
        totalScore: prev.totalScore - lastThrow,
        oneEightiesCount: lastThrow === 180 ? prev.oneEightiesCount - 1 : prev.oneEightiesCount
      }));
    }
    
    // No need to send socket event since the checkout throw was never sent
    setShowLegConfirmation(false);
    setPendingLegWinner(null);
  };

  const cancelMatchEnd = () => {
    if (isSavingMatch) return; // Don't allow cancel while saving
    
    // Undo the last throw that caused the match to end
    // pendingMatchWinner is the player who just won the match (who threw the last throw)
    const playerWhoJustThrew = pendingMatchWinner;
    
    if (playerWhoJustThrew === 1 && player1Throws.length > 0) {
      const lastThrow = player1Throws[player1Throws.length - 1];
      setPlayer1Score(player1Score + lastThrow);
      setPlayer1Throws(player1Throws.slice(0, -1));
      setCurrentPlayer(1); // This player stays on turn
      
      // Update stats - properly handle 180 count
      setPlayer1Stats(prev => ({
        ...prev,
        totalThrows: prev.totalThrows - 1,
        totalScore: prev.totalScore - lastThrow,
        oneEightiesCount: lastThrow === 180 ? prev.oneEightiesCount - 1 : prev.oneEightiesCount
      }));
    } else if (playerWhoJustThrew === 2 && player2Throws.length > 0) {
      const lastThrow = player2Throws[player2Throws.length - 1];
      setPlayer2Score(player2Score + lastThrow);
      setPlayer2Throws(player2Throws.slice(0, -1));
      setCurrentPlayer(2); // This player stays on turn
      
      // Update stats - properly handle 180 count
      setPlayer2Stats(prev => ({
        ...prev,
        totalThrows: prev.totalThrows - 1,
        totalScore: prev.totalScore - lastThrow,
        oneEightiesCount: lastThrow === 180 ? prev.oneEightiesCount - 1 : prev.oneEightiesCount
      }));
    }
    
    // No need to send socket event since the checkout throw was never sent
    setShowMatchConfirmation(false);
    setPendingMatchWinner(null);
  };

  // Calculate averages
  const player1Average = player1Stats.totalThrows > 0 ? Math.round(player1Stats.totalScore / player1Stats.totalThrows) : 0;
  const player2Average = player2Stats.totalThrows > 0 ? Math.round(player2Stats.totalScore / player2Stats.totalThrows) : 0;

  return (
    <div className="flex flex-col h-[100dvh] bg-base-100 overflow-hidden">
      {/* Header - Mobile & Tablet Portrait */}
      <div className="lg:hidden flex justify-between items-center p-1 sm:p-2 flex-shrink-0 h-12 sm:h-14">
        <button className="btn btn-xs sm:btn-sm btn-accent matchgame-btn" onClick={onBack}>
          <IconArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
        <div className="text-xs sm:text-sm font-bold text-center flex-1 px-2">
          {match.player1.playerId.name} vs {match.player2.playerId.name} | {match.legsToWin}
        </div>
        <div className="flex-shrink-0">
          <button
            className="btn btn-outline w-full matchgame-btn btn-xs sm:btn-sm"
            onClick={() => setShowThrowHistory(!showThrowHistory)}
          >
            {showThrowHistory ? <IconX className="w-3 h-3 sm:w-4 sm:h-4" /> : <IconHistory className="w-3 h-3 sm:w-4 sm:h-4" />}
          </button>
        </div>
         {/* Swap Button - Large Tablets and iPad Pro */}
         <div className="justify-center mb-2 sm:mb-4 flex-shrink-0 hidden xl:flex">
            <button
              className="btn btn-sm sm:btn-md lg:btn-lg btn-outline matchgame-btn  "
              onClick={() => setScoreInputOnLeft(!scoreInputOnLeft)}
            >
              Oldalak cseréje
            </button>
          </div>
      </div>

      {/* Main Layout - Side by side on large tablets and iPad Pro */}
      <div className="flex flex-col xl:flex-row h-full overflow-hidden">

        {/* Top Header - Mobile & Tablet Portrait */}
         {/* Right Side - Player Cards (Large Tablets and iPad Pro) / Hidden on Mobile & Small Tablets */}
         <div className={`flex xl:w-1/2  p-1 sm:p-2 overflow-hidden ${!scoreInputOnLeft ? 'md:order-1' : ''}`}>
         

          {/* Player 1 Card */}
          <div className={`flex-1 bg-base-200 rounded-lg p-3 sm:p-6 md:p-8 lg:p-10 xl:p-12 mb-2 sm:mb-4 ${currentPlayer === 1 ? 'ring-4 ring-primary' : ''}`}>
            <div className="text-center h-full flex flex-col justify-center">
              {/* Player Name with Leg Count */}
              <div className="mb-4 sm:mb-6 md:mb-8 lg:mb-10">
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold mb-2 sm:mb-3">
                  {match.player1.playerId.name}
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-primary">
                  {player1LegsWon} nyert leg
                </div>
              </div>
              
              {/* Score */}
              <div className="mb-4 sm:mb-6 md:mb-8 lg:mb-10">
                <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] 2xl:text-[16rem] font-bold text-center leading-none">
                  {player1Score}
                </div>
              </div>
              
              {/* Stats */}
              <div className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl opacity-75">
                <div>Átlag: {player1Average}</div>
                <div>180: {player1Stats.oneEightiesCount}</div>
              </div>
            </div>
          </div>

          {/* Player 2 Card */}
          <div className={`flex-1 bg-base-200 rounded-lg p-3 sm:p-6 md:p-8 lg:p-10 xl:p-12 ${currentPlayer === 2 ? 'ring-4 ring-primary' : ''}`}>
            <div className="text-center h-full flex flex-col justify-center">
              {/* Player Name with Leg Count */}
              <div className="mb-4 sm:mb-6 md:mb-8 lg:mb-10">
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold mb-2 sm:mb-3">
                  {match.player2.playerId.name}
                </div>
                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-primary">
                  {player2LegsWon} nyert leg
                </div>
              </div>
              
              {/* Score */}
              <div className="mb-4 sm:mb-6 md:mb-8 lg:mb-10">
                <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[12rem] 2xl:text-[16rem] font-bold text-center leading-none">
                  {player2Score}
                </div>
              </div>
              
              {/* Stats */}
              <div className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl opacity-75">
                <div>Átlag: {player2Average}</div>
                <div>180: {player2Stats.oneEightiesCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Side - Score Input (Large Tablets) / Full width (Mobile & Small Tablets) */}
        <div className={`xl:w-1/2 flex flex-col p-1 sm:p-2 overflow-hidden ${!scoreInputOnLeft ? 'md:order-2' : ''}`}>




          {/* Current Player Indicator */}
          <div className="bg-base-300 rounded-lg p-1 sm:p-2 md:p-3 mb-1 sm:mb-2 flex-shrink-0 h-8 sm:h-10 md:h-[6rem]">
            <div className="text-center flex h-full items-center my-auto justify-center">
              <div className="text-lg sm:text-md md:text-5xl font-bold leading-none">{throwInput}</div>
            </div>
          </div>

          {/* Number Input - Responsive sizing */}
          <div className="bg-base-200 rounded-lg p-1 sm:p-2 md:p-3 mb-1 sm:mb-2 flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-3 gap-1 flex-1 min-h-0">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  className="btn btn-xs h-5 sm:h-6 md:h-[5rem] text-lg md:text-2xl font-bold matchgame-btn"
                  onClick={() => handleNumberInput(num)}
                >
                  {num}
                </button>
              ))}
              <button
                className="btn btn-xs h-5 sm:h-6 md:h-[5rem] text-lg md:text-2xl font-bold matchgame-btn btn-warning"
                onClick={handleBackspace}
                disabled={!throwInput}
              >
                ⌫
              </button>
              <button
                className="btn btn-xs h-5 sm:h-6 md:h-[5rem] text-lg md:text-2xl font-bold matchgame-btn"
                onClick={() => handleNumberInput(0)}
              >
                0
              </button>
              <button
                className="btn btn-xs h-5 sm:h-6 md:h-[5rem] text-lg md:text-2xl font-bold matchgame-btn btn-error"
                onClick={handleClear}
                disabled={!throwInput}
              >
                C
              </button>
            </div>
          </div>
          
          {/* Action Buttons - Separate section */}
          <div className="bg-base-300 rounded-lg p-1 sm:p-2 md:p-3 mb-1 sm:mb-2 flex-shrink-0">
            <div className="flex gap-1 h-6 sm:h-8 md:h-[5rem]">
              <button
                className="btn btn-warning flex-1 btn-xs h-6 sm:h-8 md:h-[5rem] text-xs sm:text-sm md:text-base matchgame-btn"
                onClick={handleUndo}
                disabled={player1Throws.length === 0 && player2Throws.length === 0}
              >
                ↶
              </button>
              <button
                className="btn btn-success flex-1 btn-xs h-6 sm:h-8 md:h-[5rem] text-xs sm:text-sm md:text-base matchgame-btn"
                onClick={handleThrow}
                disabled={!throwInput || parseInt(throwInput) < 0 || parseInt(throwInput) > 180 || isNaN(parseInt(throwInput))}
              >
                ➤
              </button>
            </div>
          </div>

          {/* Scorer Info */}
          <div className="text-center text-xs opacity-75 flex-shrink-0 py-1">
            Író: {match.scorer.name}
          </div>
        </div>

       
      </div>

      {/* Throw History - Mobile and Tablet */}
      {showThrowHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-200 rounded-lg p-4 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="text-lg font-bold mb-2">Dobások</div>
            <div className="flex justify-between text-sm">
              <div className="flex-1 text-center">
                <div className="font-bold mb-2">{match.player1.playerId.name}</div>
                <div className="flex flex-wrap justify-center gap-1">
                  {player1Throws.map((score, i) => (
                    <span key={i} className="bg-base-300 px-2 py-1 rounded text-lg">{score}</span>
                  ))}
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="font-bold mb-2">{match.player2.playerId.name}</div>
                <div className="flex flex-wrap justify-center gap-1">
                  {player2Throws.map((score, i) => (
                    <span key={i} className="bg-base-300 px-2 py-1 rounded text-lg">{score}</span>
                  ))}
                </div>
              </div>
            </div>
            <button 
              className="btn btn-primary w-full mt-4 matchgame-btn"
              onClick={() => setShowThrowHistory(false)}
            >
              Bezárás
            </button>
          </div>
        </div>
      )}

      {/* Leg Confirmation Dialog */}
      {showLegConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-200 p-4 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-3">Leg vége?</h3>
            <p className="mb-2 text-sm">
              {pendingLegWinner === 1 ? match.player1.playerId.name : match.player2.playerId.name} nyerte ezt a leg-et!
            </p>
            <div className="flex gap-2">
              <button 
                className="btn btn-error flex-1 matchgame-btn" 
                onClick={cancelLegEnd}
                disabled={isSavingLeg}
              >
                Visszavonás
              </button>
              <button 
                className="btn btn-success flex-1 matchgame-btn" 
                onClick={confirmLegEnd}
                disabled={isSavingLeg}
              >
                {isSavingLeg ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Mentés...
                  </>
                ) : (
                  "Igen"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Confirmation Dialog */}
      {showMatchConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-200 p-4 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-3">Meccs vége?</h3>
            <p className="mb-2 text-sm">
              {pendingMatchWinner === 1 ? match.player1.playerId.name : match.player2.playerId.name} nyerte a meccset!
            </p>
            <div className="flex gap-2">
              <button 
                className="btn btn-error flex-1 matchgame-btn" 
                onClick={cancelMatchEnd}
                disabled={isSavingMatch}
              >
                Visszavonás
              </button>
              <button 
                className="btn btn-success flex-1 matchgame-btn" 
                onClick={confirmMatchEnd}
                disabled={isSavingMatch}
              >
                {isSavingMatch ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Mentés...
                  </>
                ) : (
                  "Igen"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchGame; 