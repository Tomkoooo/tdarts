"use client"
import {  IconSettings } from '@tabler/icons-react';
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';
import { showErrorToast } from '@/lib/toastUtils';
import { useDebounce } from '@/hooks/useDebounce';

interface PlayerData {
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
  player1: PlayerData;
  player2: PlayerData;
  scorer: Scorer;
  status: string;
  startingScore: number;
  legsToWin?: number;
  startingPlayer?: 1 | 2;
  winnerId?: string;
}

interface Player {
  name: string;
  score: number;
  legsWon: number;
  allThrows: number[];
  stats: {
    highestCheckout: number;
    // oneEightiesCount removed - calculated dynamically from allThrows
    totalThrows: number;
    average: number;
  };
}

interface MatchGameProps {
  match: Match;
  onBack: () => void;
  onMatchFinished?: () => void;
  clubId?: string;
}

const MatchGame: React.FC<MatchGameProps> = ({ match, onBack, onMatchFinished, clubId }) => {
  // Helper to format full names as initials + last name (e.g., "D. S. Erika")
  const formatName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return '';
    const last = parts.pop() as string;
    const initials = parts.map(p => p.charAt(0).toUpperCase() + '.');
    return [...initials, last].join(' ');
  };
  const initialScore = match.startingScore;
  const [legsToWin, setLegsToWin] = useState(match.legsToWin || 3);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempLegsToWin, setTempLegsToWin] = useState(legsToWin);
  const [tempStartingPlayer, setTempStartingPlayer] = useState<1 | 2>(match.startingPlayer || 1);

  // Helper function to count 180s dynamically from throws
  const count180s = (throws: number[]): number => {
    return throws.filter(t => t === 180).length;
  };

  const [player1, setPlayer1] = useState<Player>({
    name: formatName(match.player1.playerId.name),
    score: initialScore,
    legsWon: match.player1.legsWon || 0,
    allThrows: [],
    stats: {
      highestCheckout: match.player1.highestCheckout || 0,
      totalThrows: 0,
      average: match.player1.average || 0,
    },
  });

  const [player2, setPlayer2] = useState<Player>({
    name: formatName(match.player2.playerId.name),
    score: initialScore,
    legsWon: match.player2.legsWon || 0,
    allThrows: [],
    stats: {
      highestCheckout: match.player2.highestCheckout || 0,
      totalThrows: 0,
      average: match.player2.average || 0,
    },
  });

  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(match.startingPlayer || 1);
  const [currentLeg, setCurrentLeg] = useState(1);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [editingThrow, setEditingThrow] = useState<{player: 1 | 2, throwIndex: number} | null>(null);
  const [editScoreInput, setEditScoreInput] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [legStartingPlayer, setLegStartingPlayer] = useState<1 | 2>(match.startingPlayer || 1);
  
  // Confirmation dialogs
  const [showLegConfirmation, setShowLegConfirmation] = useState<boolean>(false);
  const [showMatchConfirmation, setShowMatchConfirmation] = useState<boolean>(false);
  const [pendingLegWinner, setPendingLegWinner] = useState<1 | 2 | null>(null);
  const [pendingMatchWinner, setPendingMatchWinner] = useState<1 | 2 | null>(null);
  
  // Loading states
  const [isSavingLeg, setIsSavingLeg] = useState<boolean>(false);
  const [isSavingMatch, setIsSavingMatch] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  
  // Arrow count for checkout
  const [arrowCount, setArrowCount] = useState<number>(3);

  const chalkboardRef = useRef<HTMLDivElement>(null);
  const quickAccessScores = [180, 140, 100, 95, 85, 81, 80, 60, 45, 41, 40, 26];

  // Socket hook
  const { socket, isConnected } = useSocket({ 
    matchId: match._id, 
    clubId 
  });

  // Calculate the correct starting player for the next leg
  const calculateNextLegStartingPlayer = (totalLegsPlayed: number, originalStartingPlayer: number): number => {
    return totalLegsPlayed % 2 === 1 ? (originalStartingPlayer === 1 ? 2 : 1) : originalStartingPlayer;
  };

  // Socket.IO initialization
  useEffect(() => {
    if (!isConnected) return;
    
    socket.emit('init-match', {
      matchId: match._id,
      startingScore: initialScore,
      legsToWin: legsToWin,
      startingPlayer: match.startingPlayer || 1
    });
    
    socket.emit('set-match-players', {
      matchId: match._id,
      player1Id: match.player1.playerId._id,
      player2Id: match.player2.playerId._id,
      player1Name: match.player1.playerId.name,
      player2Name: match.player2.playerId.name
    });
    
    const tournamentCode = window.location.pathname.split('/')[2];
    socket.emit('match-started', {
      matchId: match._id,
      tournamentCode: tournamentCode,
      matchData: {
        player1: match.player1,
        player2: match.player2,
        startingScore: initialScore,
        legsToWin: legsToWin
      }
    });
  }, [isConnected, match._id]);

  // Initialize game state from localStorage or database
  useEffect(() => {
    setIsInitialized(false);
    
    const savedState = localStorage.getItem(`match_game_${match._id}`);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setPlayer1(state.player1 || player1);
        setPlayer2(state.player2 || player2);
        setCurrentPlayer(state.currentPlayer || (match.startingPlayer || 1));
        setLegStartingPlayer(state.legStartingPlayer || (match.startingPlayer || 1));
        setCurrentLeg(state.currentLeg || 1);
        setLegsToWin(state.legsToWin || legsToWin);
        setIsInitialized(true);
        return;
      } catch (error) {
        console.error('Error parsing saved state:', error);
        localStorage.removeItem(`match_game_${match._id}`);
      }
    }
    
    // Initialize with database values
    const totalLegsPlayed = (match.player1.legsWon || 0) + (match.player2.legsWon || 0);
    const nextLegStartingPlayer = calculateNextLegStartingPlayer(totalLegsPlayed, match.startingPlayer || 1);
    
    setPlayer1(prev => ({
      ...prev,
      score: initialScore,
      legsWon: match.player1.legsWon || 0,
      allThrows: []
    }));
    
    setPlayer2(prev => ({
      ...prev,
      score: initialScore,
      legsWon: match.player2.legsWon || 0,
      allThrows: []
    }));
    
    setCurrentPlayer(nextLegStartingPlayer as 1 | 2);
    setLegStartingPlayer(nextLegStartingPlayer as 1 | 2);
    setCurrentLeg(totalLegsPlayed + 1);
    setIsInitialized(true);
  }, [match._id]);

  // Prepare game state object for debouncing
  const gameState = {
    player1,
    player2,
    currentPlayer,
    legStartingPlayer,
    currentLeg,
    legsToWin
  };

  const debouncedGameState = useDebounce(gameState, 1000);

  // Save game state to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    
    const hasOngoingGame = debouncedGameState.player1.allThrows.length > 0 || debouncedGameState.player2.allThrows.length > 0 || 
                          (debouncedGameState.player1.score !== initialScore) || (debouncedGameState.player2.score !== initialScore) ||
                          debouncedGameState.player1.legsWon > 0 || debouncedGameState.player2.legsWon > 0;
    
    if (!hasOngoingGame) return;
    
    localStorage.setItem(`match_game_${match._id}`, JSON.stringify(debouncedGameState));
  }, [debouncedGameState, match._id, isInitialized, initialScore]);

  // Auto-scroll chalkboard
  useEffect(() => {
    if (chalkboardRef.current) {
      chalkboardRef.current.scrollTop = chalkboardRef.current.scrollHeight;
    }
  }, [player1.allThrows.length, player2.allThrows.length]);

  const handleThrow = (score: number) => {
    console.log("handleThrow - Input Score:", score, "Current Player:", currentPlayer);
    
    const currentPlayerData = currentPlayer === 1 ? player1 : player2;
    
    // Check for bust
    if (currentPlayerData.score - score < 0) {
      console.log("handleThrow - BUST");
      // Add bust (0 score) to throws
      const newAllThrows = [...currentPlayerData.allThrows, 0];
      
      if (currentPlayer === 1) {
        setPlayer1(prev => ({ 
          ...prev, 
          allThrows: newAllThrows,
          stats: {
            ...prev.stats,
            totalThrows: prev.stats.totalThrows + 1,
            average: ((prev.stats.totalThrows + 1) > 0) ? 
              Math.round((((prev.stats.totalThrows * prev.stats.average) + 0) / (prev.stats.totalThrows + 1)) * 100) / 100 : 0
          }
        }));
      } else {
        setPlayer2(prev => ({ 
          ...prev, 
          allThrows: newAllThrows,
          stats: {
            ...prev.stats,
            totalThrows: prev.stats.totalThrows + 1,
            average: ((prev.stats.totalThrows + 1) > 0) ? 
              Math.round((((prev.stats.totalThrows * prev.stats.average) + 0) / (prev.stats.totalThrows + 1)) * 100) / 100 : 0
          }
        }));
      }
      
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      setScoreInput('');
      return;
    }

    const newScore = currentPlayerData.score - score;
    const newAllThrows = [...currentPlayerData.allThrows, score];
    console.log("handleThrow - New Score:", newScore, "New Throws:", newAllThrows);

    // Check for win condition (any finish, not just double-out)
    if (newScore === 0) {
      // Update player with the throw - this is a checkout!
      if (currentPlayer === 1) {
        setPlayer1(prev => ({ 
          ...prev, 
          score: newScore, 
          allThrows: newAllThrows,
          stats: {
            ...prev.stats,
            totalThrows: prev.stats.totalThrows + 1,
            average: ((prev.stats.totalThrows + 1) > 0) ? 
              Math.round((((prev.stats.totalThrows * prev.stats.average) + score) / (prev.stats.totalThrows + 1)) * 100) / 100 : 0
          }
        }));
      } else {
        setPlayer2(prev => ({ 
          ...prev, 
          score: newScore, 
          allThrows: newAllThrows,
          stats: {
            ...prev.stats,
            totalThrows: prev.stats.totalThrows + 1,
            average: ((prev.stats.totalThrows + 1) > 0) ? 
              Math.round((((prev.stats.totalThrows * prev.stats.average) + score) / (prev.stats.totalThrows + 1)) * 100) / 100 : 0
          }
        }));
      }
      
      // Show leg confirmation modal with arrow count
      setPendingLegWinner(currentPlayer);
      setShowLegConfirmation(true);
      setScoreInput('');
    } else {
      // Regular throw
      if (currentPlayer === 1) {
        setPlayer1(prev => ({ 
          ...prev, 
          score: newScore, 
          allThrows: newAllThrows,
          stats: {
            ...prev.stats,
            totalThrows: prev.stats.totalThrows + 1,
            average: ((prev.stats.totalThrows + 1) > 0) ? 
              Math.round((((prev.stats.totalThrows * prev.stats.average) + score) / (prev.stats.totalThrows + 1)) * 100) / 100 : 0
          }
        }));

        // Send throw event to socket
        if (isConnected) {
          socket.emit('throw', {
            matchId: match._id,
            playerId: match.player1.playerId._id,
            score: score,
            remainingScore: newScore,
            legNumber: currentLeg,
            tournamentCode: window.location.pathname.split('/')[2]
          });
        }
      } else {
        setPlayer2(prev => ({ 
          ...prev, 
          score: newScore, 
          allThrows: newAllThrows,
          stats: {
            ...prev.stats,
            totalThrows: prev.stats.totalThrows + 1,
            average: ((prev.stats.totalThrows + 1) > 0) ? 
              Math.round((((prev.stats.totalThrows * prev.stats.average) + score) / (prev.stats.totalThrows + 1)) * 100) / 100 : 0
          }
        }));

        // Send throw event to socket
        if (isConnected) {
          socket.emit('throw', {
            matchId: match._id,
            playerId: match.player2.playerId._id,
            score: score,
            remainingScore: newScore,
            legNumber: currentLeg,
            tournamentCode: window.location.pathname.split('/')[2]
          });
        }
      }
      
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      setScoreInput('');
    }
  };

  const handleBack = () => {
    const playerWhoJustThrew = currentPlayer === 1 ? 2 : 1;
    const playerData = playerWhoJustThrew === 1 ? player1 : player2;
    
    if (playerData.allThrows.length > 0) {
      const lastThrow = playerData.allThrows[playerData.allThrows.length - 1];
      const newAllThrows = playerData.allThrows.slice(0, -1);
      const newScore = playerData.score + lastThrow;
      
      if (playerWhoJustThrew === 1) {
        setPlayer1(prev => ({ 
        ...prev,
          score: newScore,
          allThrows: newAllThrows,
          stats: {
            ...prev.stats,
            totalThrows: Math.max(0, prev.stats.totalThrows - 1),
            average: (prev.stats.totalThrows - 1) > 0 ? 
              Math.round((((prev.stats.totalThrows * prev.stats.average) - lastThrow) / (prev.stats.totalThrows - 1)) * 100) / 100 : 0
          }
        }));
      } else {
        setPlayer2(prev => ({ 
        ...prev,
          score: newScore,
          allThrows: newAllThrows,
          stats: {
            ...prev.stats,
            totalThrows: Math.max(0, prev.stats.totalThrows - 1),
            average: (prev.stats.totalThrows - 1) > 0 ? 
              Math.round((((prev.stats.totalThrows * prev.stats.average) - lastThrow) / (prev.stats.totalThrows - 1)) * 100) / 100 : 0
          }
      }));
    }
    
      setCurrentPlayer(playerWhoJustThrew);
      setScoreInput('');

      // Notify socket
    if (isConnected) {
      socket.emit('undo-throw', {
        matchId: match._id,
        playerId: playerWhoJustThrew === 1 ? match.player1.playerId._id : match.player2.playerId._id,
        tournamentCode: window.location.pathname.split('/')[2]
      });
      }
    }
  };

  const handleNumberInput = (num: number) => {
    if (editingThrow) {
      const newValue = editScoreInput + num.toString();
      if (parseInt(newValue) <= 180) {
        setEditScoreInput(newValue);
      }
    } else {
      const newValue = scoreInput + num.toString();
      if (parseInt(newValue) <= 180) {
        setScoreInput(newValue);
      }
    }
  };

  const handleEditThrow = (player: 1 | 2, throwIndex: number, currentScore: number) => {
    setEditingThrow({ player, throwIndex });
    setEditScoreInput(currentScore.toString());
  };

  const handleSaveEdit = () => {
    if (!editingThrow) return;
    
    const newScore = parseInt(editScoreInput);
    if (isNaN(newScore) || newScore < 0 || newScore > 180) return;

    const playerData = editingThrow.player === 1 ? player1 : player2;
    const oldThrows = [...playerData.allThrows];
    
    // Calculate what the score would be if we recalculate from scratch
    let recalculatedScore = initialScore;
    for (let i = 0; i <= editingThrow.throwIndex; i++) {
      if (i === editingThrow.throwIndex) {
        recalculatedScore -= newScore;
        } else {
        recalculatedScore -= oldThrows[i];
      }
    }
    
    if (recalculatedScore < 0) {
      toast.error('Érvénytelen pontszám!');
          return;
        }
        
    oldThrows[editingThrow.throwIndex] = newScore;

    // Recalculate player score from all throws
    let newPlayerScore = initialScore;
    for (const throwValue of oldThrows) {
      newPlayerScore -= throwValue;
    }

    if (editingThrow.player === 1) {
      setPlayer1(prev => ({
        ...prev,
        score: newPlayerScore,
        allThrows: oldThrows,
        stats: {
          ...prev.stats,
          average: oldThrows.length > 0 ? Math.round((oldThrows.reduce((a, b) => a + b, 0) / oldThrows.length) * 100) / 100 : 0
        }
      }));
        } else {
      setPlayer2(prev => ({
        ...prev,
        score: newPlayerScore,
        allThrows: oldThrows,
        stats: {
          ...prev.stats,
          average: oldThrows.length > 0 ? Math.round((oldThrows.reduce((a, b) => a + b, 0) / oldThrows.length) * 100) / 100 : 0
        }
      }));
    }

    setEditingThrow(null);
    setEditScoreInput('');

    // Check if the edit resulted in a win (score === 0)
    if (newPlayerScore === 0) {
      setPendingLegWinner(editingThrow.player);
      setShowLegConfirmation(true);
    }
  };

  const handleCancelEdit = () => {
    setEditingThrow(null);
    setEditScoreInput('');
  };

  // Calculate possible arrow counts based on checkout score
  const getPossibleArrowCounts = (checkoutScore: number): number[] => {
    if (checkoutScore <= 40) {
      return [1, 2, 3]; // 1-40: 1-3 nyíl lehetséges
    } else if (checkoutScore <= 98) {
      return [2, 3]; // 41-98: 2-3 nyíl lehetséges
    } else {
      return [3]; // 99-180: csak 3 nyíl lehetséges
    }
  };

  const confirmLegEnd = async () => {
    if (!pendingLegWinner || isSavingLeg) return;
    
    console.log("confirmLegEnd - Winner:", pendingLegWinner);

    // Auto-set arrow count if only one option is possible
    const lastThrow = pendingLegWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1];
    const possibleArrowCounts = getPossibleArrowCounts(lastThrow);
    if (possibleArrowCounts.length === 1) {
      setArrowCount(possibleArrowCounts[0]);
    }
    
    setIsSavingLeg(true);
    
    const newPlayer1Legs = pendingLegWinner === 1 ? player1.legsWon + 1 : player1.legsWon;
    const newPlayer2Legs = pendingLegWinner === 2 ? player2.legsWon + 1 : player2.legsWon;
    
    // Update legs won
    if (pendingLegWinner === 1) {
      setPlayer1(prev => ({ ...prev, legsWon: newPlayer1Legs }));
    } else {
      setPlayer2(prev => ({ ...prev, legsWon: newPlayer2Legs }));
    }
    
    // Check if match is won
    if (newPlayer1Legs >= legsToWin || newPlayer2Legs >= legsToWin) {
      setPendingMatchWinner(pendingLegWinner);
      setShowMatchConfirmation(true);
      setShowLegConfirmation(false);
      setIsSavingLeg(false);
      return;
    }

    // Send checkout throw to socket
    if (isConnected) {
      const lastThrow = pendingLegWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1];
      socket.emit('throw', {
        matchId: match._id,
        playerId: pendingLegWinner === 1 ? match.player1.playerId._id : match.player2.playerId._id,
        score: lastThrow,
        isCheckout: true,
        remainingScore: 0,
        legNumber: currentLeg,
        tournamentCode: window.location.pathname.split('/')[2],
        arrowCount: arrowCount
      });
    }

    // Save leg to API - simplified, only send throws and arrow count
    try {
      const response = await fetch(`/api/matches/${match._id}/finish-leg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner: pendingLegWinner,
          player1Throws: player1.allThrows,
          player2Throws: player2.allThrows,
          winnerArrowCount: arrowCount,
          legNumber: currentLeg
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error saving leg:', errorData);
        showErrorToast('Hiba történt a leg mentése során!', {
          error: errorData?.error,
          context: 'Leg mentése',
          errorName: 'Leg mentése sikertelen',
        });
      }
    } catch (error: any) {
      console.error('Error saving leg:', error);
      showErrorToast('Hiba történt a leg mentése során!', {
        error: error?.message,
        context: 'Leg mentése',
        errorName: 'Leg mentése sikertelen',
      });
    } finally {
      setIsSavingLeg(false);
    }

    // Send leg completion to socket
    if (isConnected) {
      socket.emit('leg-complete', {
        matchId: match._id,
        legNumber: currentLeg,
        winnerId: pendingLegWinner === 1 ? match.player1.playerId._id : match.player2.playerId._id,
        tournamentCode: window.location.pathname.split('/')[2]
      });
    }

    // Reset for next leg
    setPlayer1(prev => ({ ...prev, score: initialScore, allThrows: [] }));
    setPlayer2(prev => ({ ...prev, score: initialScore, allThrows: [] }));
    
    // Switch starting player for next leg
    const nextLegStartingPlayer = legStartingPlayer === 1 ? 2 : 1;
    setLegStartingPlayer(nextLegStartingPlayer);
    setCurrentPlayer(nextLegStartingPlayer);
    setCurrentLeg(prev => prev + 1);
    setScoreInput('');
    
    setShowLegConfirmation(false);
    setPendingLegWinner(null);
  };

  const confirmMatchEnd = async () => {
    if (!pendingMatchWinner || isSavingMatch) return;
    
    console.log("confirmMatchEnd - Winner:", pendingMatchWinner);
    
    setIsSavingMatch(true);
    
    const hasThrows = player1.allThrows.length > 0 || player2.allThrows.length > 0;
    
    // If there are throws, save the final leg first
    if (hasThrows) {
      console.log('Saving final leg before finishing match...');
      
      // Send final checkout throw to socket
      if (isConnected) {
        const lastThrow = pendingMatchWinner === 1 
          ? (player1.allThrows.length > 0 ? player1.allThrows[player1.allThrows.length - 1] : 0)
          : (player2.allThrows.length > 0 ? player2.allThrows[player2.allThrows.length - 1] : 0);
          
        socket.emit('throw', {
          matchId: match._id,
          playerId: pendingMatchWinner === 1 ? match.player1.playerId._id : match.player2.playerId._id,
          score: lastThrow,
          isCheckout: true,
          remainingScore: 0,
          legNumber: currentLeg,
          tournamentCode: window.location.pathname.split('/')[2],
          arrowCount: arrowCount
        });
      }
      
      // Save final leg
      try {
        const legResponse = await fetch(`/api/matches/${match._id}/finish-leg`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            winner: pendingMatchWinner,
            player1Throws: player1.allThrows,
            player2Throws: player2.allThrows,
            winnerArrowCount: arrowCount
          })
        });
        
        if (!legResponse.ok) {
          const errorData = await legResponse.json();
          console.error('Error saving final leg:', errorData);
          showErrorToast('Hiba történt az utolsó leg mentése során!', {
            error: errorData?.error,
            context: 'Meccs lezárása',
            errorName: 'Leg mentése sikertelen',
          });
          setIsSavingMatch(false);
          return;
        }
      } catch (error: any) {
        console.error('Error saving final leg:', error);
        showErrorToast('Hiba történt az utolsó leg mentése során!', {
          error: error?.message,
          context: 'Meccs lezárása',
          errorName: 'Leg mentése sikertelen',
        });
        setIsSavingMatch(false);
        return;
      }
    }
    
    try {
      // Use current legs won from state
      const finalPlayer1LegsWon = player1.legsWon;
      const finalPlayer2LegsWon = player2.legsWon;
      
      console.log("confirmMatchEnd - Final Legs Won:", { p1: finalPlayer1LegsWon, p2: finalPlayer2LegsWon });

      // Finish match - simplified, only send leg counts
      const response = await fetch(`/api/matches/${match._id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1LegsWon: finalPlayer1LegsWon,
          player2LegsWon: finalPlayer2LegsWon,
          fromScoreboard: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error finishing match:', errorData);
        showErrorToast('Hiba történt a meccs befejezése során!', {
          error: errorData?.error,
          context: 'Meccs lezárása',
          errorName: 'Meccs lezárása sikertelen',
        });
        setIsSavingMatch(false);
        return;
      }
    } catch (error: any) {
      console.error('Error finishing match:', error);
      showErrorToast('Hiba történt a meccs befejezése során!', {
        error: error?.message,
        context: 'Meccs lezárása',
        errorName: 'Meccs lezárása sikertelen',
      });
      setIsSavingMatch(false);
      return;
    } finally {
      setIsSavingMatch(false);
    }

    // Inform server to cleanup
    if (isConnected) {
      socket.emit('match-complete', { 
        matchId: match._id,
        tournamentCode: window.location.pathname.split('/')[2]
      });
    }

    localStorage.removeItem(`match_game_${match._id}`);
    toast.success(`Meccs vége! ${pendingMatchWinner === 1 ? player1.name : player2.name} nyert!`);
    
    // Call onMatchFinished callback if provided to refresh matches
    if (onMatchFinished) {
      await onMatchFinished();
    }
    
    onBack();
  };



  const cancelLegEnd = () => {
    if (isSavingLeg) return;
    
    const playerWhoJustThrew = pendingLegWinner;
    
    // Undo the last throw and keep the same player
    if (playerWhoJustThrew === 1 && player1.allThrows.length > 0) {
      const lastThrow = player1.allThrows[player1.allThrows.length - 1];
      setPlayer1(prev => ({
        ...prev,
        score: prev.score + lastThrow,
        allThrows: prev.allThrows.slice(0, -1),
        stats: {
          ...prev.stats,
          totalThrows: Math.max(0, prev.stats.totalThrows - 1),
          average: (prev.stats.totalThrows - 1) > 0 ? 
            Math.round(((prev.stats.totalThrows * prev.stats.average) - lastThrow) / (prev.stats.totalThrows - 1)) : 0
        }
      }));
      // Keep player 1 as current player
      setCurrentPlayer(1);
    } else if (playerWhoJustThrew === 2 && player2.allThrows.length > 0) {
      const lastThrow = player2.allThrows[player2.allThrows.length - 1];
      setPlayer2(prev => ({
        ...prev,
        score: prev.score + lastThrow,
        allThrows: prev.allThrows.slice(0, -1),
        stats: {
          ...prev.stats,
          totalThrows: Math.max(0, prev.stats.totalThrows - 1),
          average: (prev.stats.totalThrows - 1) > 0 ? 
            Math.round(((prev.stats.totalThrows * prev.stats.average) - lastThrow) / (prev.stats.totalThrows - 1)) : 0
        }
      }));
      // Keep player 2 as current player
      setCurrentPlayer(2);
    }
    
    setShowLegConfirmation(false);
    setPendingLegWinner(null);
    setArrowCount(3);
  };

  const cancelMatchEnd = () => {
    if (isSavingMatch) return;
    
    const playerWhoJustThrew = pendingMatchWinner;
    
    // Undo the last throw, revert leg count, and keep the same player
    if (playerWhoJustThrew === 1 && player1.allThrows.length > 0) {
      const lastThrow = player1.allThrows[player1.allThrows.length - 1];
      setPlayer1(prev => ({
        ...prev,
        score: prev.score + lastThrow,
        legsWon: Math.max(0, prev.legsWon - 1), // Revert leg count
        allThrows: prev.allThrows.slice(0, -1),
      }));
      // Keep player 1 as current player
      setCurrentPlayer(1);
    } else if (playerWhoJustThrew === 2 && player2.allThrows.length > 0) {
      const lastThrow = player2.allThrows[player2.allThrows.length - 1];
      setPlayer2(prev => ({
        ...prev,
        score: prev.score + lastThrow,
        legsWon: Math.max(0, prev.legsWon - 1), // Revert leg count
        allThrows: prev.allThrows.slice(0, -1),
      }));
      // Keep player 2 as current player
      setCurrentPlayer(2);
    }
    
    setShowMatchConfirmation(false);
    setPendingMatchWinner(null);
    setArrowCount(3);
  };

  const handleSaveLegsToWin = async () => {
    if (tempLegsToWin < 1 || tempLegsToWin > 20) {
      toast.error('A nyert legek száma 1 és 20 között kell legyen!');
      return;
    }

    // Check if any player has already reached the new legsToWin value
    const player1HasWon = player1.legsWon >= tempLegsToWin;
    const player2HasWon = player2.legsWon >= tempLegsToWin;
    
    if (player1HasWon || player2HasWon) {
      // Determine winner (player who reached the target first or has more legs)
      let winner: 1 | 2;
      if (player1HasWon && player2HasWon) {
        // Both reached it, winner is the one who reached it first (has more legs)
        winner = player1.legsWon >= player2.legsWon ? 1 : 2;
      } else {
        // Only one reached it
        winner = player1HasWon ? 1 : 2;
      }
      
      // Ask for match confirmation
      setPendingMatchWinner(winner);
      setShowMatchConfirmation(true);
      setShowSettingsModal(false);
      
      // Update legsToWin without closing modal yet
      setLegsToWin(tempLegsToWin);
      
      try {
        const response = await fetch(`/api/matches/${match._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ legsToWin: tempLegsToWin })
        });

        if (!response.ok) {
          showErrorToast('Hiba történt a beállítások mentése során!', {
            context: 'Meccs beállítások',
            errorName: 'Beállítás mentése sikertelen',
          });
        }
      } catch (error: any) {
        console.error('Error updating legsToWin:', error);
        showErrorToast('Hiba történt a beállítások mentése során!', {
          error: error?.message,
          context: 'Meccs beállítások',
          errorName: 'Beállítás mentése sikertelen',
        });
      }
      
      return;
    }

    try {
      const response = await fetch(`/api/matches/${match._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legsToWin: tempLegsToWin })
      });

      if (response.ok) {
        setLegsToWin(tempLegsToWin);
        setShowSettingsModal(false);
        toast.success('Beállítások mentve!');
      } else {
        showErrorToast('Hiba történt a mentés során!', {
          context: 'Meccs beállítások',
          errorName: 'Beállítás mentése sikertelen',
        });
      }
    } catch (error: any) {
      console.error('Error updating legsToWin:', error);
      showErrorToast('Hiba történt a mentés során!', {
        error: error?.message,
        context: 'Meccs beállítások',
        errorName: 'Beállítás mentése sikertelen',
      });
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col landscape:flex-row bg-black text-white">
      {/* Left Side - Players & Chalkboard (Landscape) / Top (Portrait) */}
      <div className="flex flex-col landscape:w-1/2 landscape:h-full">
        {/* Header - Score Display */}
        <header className="flex h-[28dvh] landscape:h-[35dvh] w-full bg-gradient-to-b from-gray-900 to-black relative">

          {/* Player 1 */}
          <div className={`flex-1 flex flex-col items-center justify-center   transition-all duration-300 ${currentPlayer === 1 ? 'border-2 border-primary' : 'bg-gray-900/50'}`}>
            <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 text-white text-center px-2">
              <div className="truncate max-w-full">{player1.name}</div>
              <div className="text-gray-400 text-2xl sm:text-3xl md:text-4xl lg:text-5xl mt-1">{player1.legsWon}</div>
            </div>
            <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-1 sm:mb-2 leading-none">{player1.score}</div>
            <div className="flex gap-1 sm:gap-2 md:gap-3 text-xs sm:text-sm md:text-base">
              <span className="text-gray-400">Avg: {player1.stats.average}</span>
              <span className="text-gray-400">180: {count180s(player1.allThrows)}</span>
            </div>
          </div>

          {/* Center Info */}
          <div className="flex w-12 flex-col items-center justify-center bg-gray-800 sm:w-16 md:w-24">
            <div className="text-xs sm:text-sm font-bold text-warning mb-1">tDarts</div>
            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1">{currentLeg}</div>
            <div className="text-xs text-gray-400">Leg</div>
            <div className="text-xs text-gray-400 mt-1">BO{legsToWin * 2 - 1}</div>
          </div>
          
          {/* Player 2 */}
          <div className={`flex-1 flex flex-col items-center justify-center   transition-all duration-300 z-50 ${currentPlayer === 2 ? 'border-2 border-primary' : 'bg-gray-900/50'}`}>
            <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 text-white text-center px-2">
              <div className="truncate max-w-full">{player2.name}</div>
              <div className="text-gray-400 text-2xl sm:text-3xl md:text-4xl lg:text-5xl mt-1">{player2.legsWon}</div>
            </div>
            <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-1 sm:mb-2 leading-none">{player2.score}</div>
            <div className="flex gap-1 sm:gap-2 md:gap-3 text-xs sm:text-sm md:text-base">
              <span className="text-gray-400">Avg: {player2.stats.average}</span>
              <span className="text-gray-400">180: {count180s(player2.allThrows)}</span>
            </div>
          </div>
        </header>

        {/* Throw History - Chalkboard Style */}
        <section className="h-[10dvh] landscape:flex-1 bg-base-200 flex  landscape:  overflow-hidden">
          <div ref={chalkboardRef} className="flex w-full overflow-y-auto">
            {/* Player 1 All Throws */}
            <div className="flex flex-1 flex-col p-2 sm:p-3 lg:p-4">
              <div className="text-center text-base-content font-bold mb-2 text-xs sm:text-sm lg:text-base sticky top-0 bg-base-200 z-10 pb-1">{player1.name}</div>
              <div className="flex-1">
                <div className="space-y-1">
                  {player1.allThrows.map((throwValue, index) => (
                    <div key={index} className={`flex items-center justify-between rounded p-2 h-[2.5rem] ${editingThrow?.player === 1 && editingThrow?.throwIndex === index ? 'bg-primary/40 ring-2 ring-primary' : 'bg-base-300'}`}>
                      <div className="flex items-center gap-2 flex-1">
                        <span 
                          className="text-center text-sm sm:text-base lg:text-lg font-bold cursor-pointer hover:bg-base-100 px-2 py-1 rounded transition-colors"
                          onClick={() => handleEditThrow(1, index, throwValue)}
                        >
                          {editingThrow?.player === 1 && editingThrow?.throwIndex === index ? editScoreInput || '0' : throwValue}
                        </span>
                        {editingThrow?.player === 1 && editingThrow?.throwIndex === index && (
                          <button 
                            onClick={handleSaveEdit}
                            className="bg-primary text-primary-content text-xs sm:text-sm px-2 py-1 rounded hover:bg-primary-dark transition-colors"
                          >
                            ✓
                          </button>
                        )}
                </div>
                      {editingThrow?.player === 1 && editingThrow?.throwIndex === index && (
                        <button 
                          onClick={handleCancelEdit}
                          className="bg-base-100 text-base-content text-xs sm:text-sm px-2 py-1 rounded hover:bg-base-300 transition-colors"
                        >
                          ✗
                        </button>
                      )}
              </div>
                  ))}
              </div>
            </div>
          </div>

            {/* Round Numbers */}
            <div className="w-14 sm:w-16 lg:w-20 flex flex-col items-center   bg-base-100 p-2">
              <div className="text-center text-base-content font-bold mb-2 text-xs sm:text-sm lg:text-base sticky top-0 bg-base-100 z-10 pb-1">Nyilak</div>
              <div className="flex-1">
                <div className="space-y-1">
                  {Array.from({ length: Math.max(player1.allThrows.length, player2.allThrows.length) }).map((_, index) => (
                    <div key={index} className="text-center text-xs sm:text-sm lg:text-base font-bold bg-base-300 rounded p-2 text-base-content h-[2.5rem] flex items-center justify-center">
                      {(index + 1) * 3}
                    </div>
                  ))}
                </div>
              </div>
            </div>
              
            {/* Player 2 All Throws */}
            <div className="flex-1 flex flex-col p-2 sm:p-3 lg:p-4">
              <div className="text-center text-base-content font-bold mb-2 text-xs sm:text-sm lg:text-base sticky top-0 bg-base-200 z-10 pb-1">{player2.name}</div>
              <div className="flex-1">
                <div className="space-y-1">
                  {player2.allThrows.map((throwValue, index) => (
                    <div key={index} className={`flex items-center justify-between rounded p-2 h-[2.5rem] ${editingThrow?.player === 2 && editingThrow?.throwIndex === index ? 'bg-primary/40 ring-2 ring-primary' : 'bg-base-300'}`}>
                      <div className="flex items-center gap-2 flex-1">
                        <span 
                          className="text-center text-sm sm:text-base lg:text-lg font-bold cursor-pointer hover:bg-base-100 px-2 py-1 rounded transition-colors"
                          onClick={() => handleEditThrow(2, index, throwValue)}
                        >
                          {editingThrow?.player === 2 && editingThrow?.throwIndex === index ? editScoreInput || '0' : throwValue}
                        </span>
                        {editingThrow?.player === 2 && editingThrow?.throwIndex === index && (
                          <button 
                            onClick={handleSaveEdit}
                            className="bg-primary text-primary-content text-xs sm:text-sm px-2 py-1 rounded hover:bg-primary-dark transition-colors"
                          >
                            ✓
                          </button>
                        )}
                </div>
                      {editingThrow?.player === 2 && editingThrow?.throwIndex === index && (
                        <button 
                          onClick={handleCancelEdit}
                          className="bg-base-100 text-base-content text-xs sm:text-sm px-2 py-1 rounded hover:bg-base-300 transition-colors"
                        >
                          ✗
                        </button>
                      )}
              </div>
                  ))}
              </div>
            </div>
          </div>
          </div>
        </section>
        </div>

      {/* Right Side - Input & Numpad (Landscape) / Bottom (Portrait) */}
      <div className="flex flex-col landscape:w-1/2 landscape:h-full">
        {/* Score Display with BACK button */}
        <section className="h-[6dvh] landscape:h-[15dvh] bg-gradient-to-b from-base-300 to-base-200 flex items-center justify-between   px-2 sm:px-4">
          <button
            onClick={handleBack}
            className="bg-base-300 hover:bg-base-100 text-base-content font-bold px-3 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors text-xs sm:text-base border"
          >
            BACK
          </button>
          <div className="flex flex-col items-center flex-1">
            {editingThrow && (
              <div className="text-xs sm:text-sm text-primary mb-1">
                Szerkesztés: {editingThrow.player === 1 ? player1.name : player2.name} - Dobás #{editingThrow.throwIndex + 1}
            </div>
            )}
            <div className={`text-5xl sm:text-6xl md:text-7xl font-bold ${editingThrow ? 'text-primary' : 'text-base-content'}`}>
              {editingThrow ? (editScoreInput || '0') : (scoreInput || '0')}
          </div>
          </div>
          <button
            onClick={() => {
              setTempLegsToWin(legsToWin);
              setTempStartingPlayer(currentPlayer);
              setShowSettingsModal(true);
            }}
            className="bg-base-300 hover:bg-base-100 text-base-content font-bold px-3 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors text-xs sm:text-base border flex items-center justify-center w-[80px] sm:w-[120px]"
          >
            <IconSettings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </section>

        {/* Number Pad */}
        <main className="h-[56dvh] landscape:flex-[0_0_85dvh] bg-black p-1 sm:p-2 md:p-4">
          <div className="h-full flex gap-1 sm:gap-2 md:gap-4">
            {/* Quick Access Scores - Left */}
            <div className="w-1/5 sm:w-1/4 flex flex-col gap-1 sm:gap-2">
              {quickAccessScores.slice(0, 6).map((score) => (
                <button
                  key={score}
                  onClick={() => {
                    handleThrow(score);
                    setScoreInput('');
                  }}
                  className="flex-1 bg-base-300 hover:bg-base-100 text-base-content font-bold text-lg portrait:sm:text-xl portrait:md:text-2xl md:text-xl rounded-lg transition-colors "
                >
                  {score}
                </button>
              ))}
            </div>
            
            {/* Main Number Grid */}
            <div className="flex-1 flex flex-col gap-1 sm:gap-2 md:gap-3">
              <div className="flex-1 grid grid-cols-3 gap-1 sm:gap-2 md:gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
              <button
                    key={number}
                    onClick={() => handleNumberInput(number)}
                    className="bg-base-200 hover:bg-base-300 text-base-content font-bold text-3xl portrait:sm:text-4xl portrait:md:text-5xl md:text-4xl rounded-lg transition-colors"
                  >
                    {number}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1 sm:gap-2 md:gap-3 h-14 portrait:sm:h-16 portrait:md:h-20 sm:h-16 md:h-20">
                <button
                  onClick={() => {
                    if (editingThrow) {
                      setEditScoreInput(editScoreInput.slice(0, -1));
                    } else {
                      setScoreInput(scoreInput.slice(0, -1));
                    }
                  }}
                  className="bg-base-300 hover:bg-base-100 text-base-content font-bold text-xl portrait:sm:text-2xl portrait:md:text-3xl sm:text-lg md:text-xl rounded-lg transition-colors "
              >
                ⌫
              </button>
              <button
                onClick={() => handleNumberInput(0)}
                  className="bg-base-200 hover:bg-base-300 text-base-content font-bold text-3xl portrait:sm:text-4xl portrait:md:text-5xl sm:text-3xl md:text-4xl rounded-lg transition-colors "
              >
                0
              </button>
              <button
                  onClick={() => {
                    if (editingThrow) {
                      handleSaveEdit();
                    } else {
                      const score = parseInt(scoreInput);
                      if (!isNaN(score) && score >= 0 && score <= 180) {
                        handleThrow(score);
                        setScoreInput('');
                      }
                    }
                  }}
                  disabled={editingThrow ? !editScoreInput || parseInt(editScoreInput) > 180 : !scoreInput || parseInt(scoreInput) > 180}
                  className="bg-primary hover:bg-primary-dark text-primary-content font-bold text-lg portrait:sm:text-xl portrait:md:text-2xl sm:text-lg md:text-xl rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingThrow ? 'SAVE' : 'SEND'}
              </button>
            </div>
          </div>
          
            {/* Quick Access Scores - Right */}
            <div className="w-1/5 sm:w-1/4 flex flex-col gap-1 sm:gap-2">
              {quickAccessScores.slice(6, 12).map((score) => (
              <button
                  key={score}
                  onClick={() => {
                    handleThrow(score);
                    setScoreInput('');
                  }}
                  className="flex-1 bg-base-300 hover:bg-base-100 text-base-content font-bold text-lg portrait:sm:text-xl portrait:md:text-2xl md:text-xl rounded-lg transition-colors "
                >
                  {score}
              </button>
              ))}
            </div>
          </div>
        </main>
        </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-200 p-6 rounded-lg max-w-sm w-full">
            <div className="flex w-full justify-between items-center mb-4">
              <h3 className="text-lg font-bold ">Meccs beállítások</h3>
              <button
                  onClick={() => {
                    if (window.confirm('Biztosan ki szeretnél lépni a meccsből? A jelenlegi állás nem kerül mentésre.')) {
                      onBack();
                    }
                  }}
                  className="btn btn-error btn-outline btn-sm"
                >
                  Kilépés a meccsből
                </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Nyert legek száma</label>
              <select name="" id="" onChange={(e) => setTempLegsToWin(parseInt(e.target.value))} defaultValue={tempLegsToWin} className="select select-bordered w-full">
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Best of {tempLegsToWin * 2 - 1}</p>
            </div>

            {/* Starting Player - only if no throws have been made */}
            {player1.allThrows.length === 0 && player2.allThrows.length === 0 && player1.score === initialScore && player2.score === initialScore && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Kezdő játékos</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTempStartingPlayer(1)}
                    className={`btn flex-1 ${tempStartingPlayer === 1 ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {player1.name}
                  </button>
                  <button
                    onClick={() => setTempStartingPlayer(2)}
                    className={`btn flex-1 ${tempStartingPlayer === 2 ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {player2.name}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button 
                className="btn btn-ghost  flex-1" 
                onClick={() => setShowSettingsModal(false)}
              >
                Mégse
              </button>
              <button 
                className="btn btn-success flex-1" 
                onClick={async () => {
                  setIsSavingSettings(true);
                  try {
                    // Save starting player if changed and no throws made
                    if (player1.allThrows.length === 0 && player2.allThrows.length === 0 && 
                        player1.score === initialScore && player2.score === initialScore &&
                        tempStartingPlayer !== currentPlayer) {
                      setCurrentPlayer(tempStartingPlayer);
                      setLegStartingPlayer(tempStartingPlayer);
                      
                      // Update match starting player via API
                      try {
                        await fetch(`/api/matches/${match._id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ startingPlayer: tempStartingPlayer })
                        });
                      } catch (error) {
                        console.error('Error updating starting player:', error);
                      }
                    }
                    
                    // Save legs to win
                    await handleSaveLegsToWin();
                  } finally {
                    setIsSavingSettings(false);
                  }
                }}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Mentés...
                  </>
                ) : (
                  "Mentés"
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Leg Confirmation Dialog with Arrow Count */}
      {showLegConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-200 p-6 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-3">Leg vége?</h3>
            <p className="mb-4">
              {pendingLegWinner === 1 ? player1.name : player2.name} nyerte ezt a leg-et!
            </p>
            
            {/* Arrow count selection */}
            {(() => {
              const lastThrow = pendingLegWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1];
              const possibleArrowCounts = getPossibleArrowCounts(lastThrow);
              
              return (
                <div className="mb-4">
                  <p className="text-sm mb-2">
                    Kiszálló: {lastThrow} - Hány nyílból?
                  </p>
                  <div className="flex gap-2 justify-center">
                    {possibleArrowCounts.map((count) => (
                      <button
                        key={count}
                        onClick={() => setArrowCount(count)}
                        className={`btn btn-sm ${arrowCount === count ? 'btn-primary' : 'btn-outline'}`}
                      >
                        {count} nyíl
                      </button>
                    ))}
                  </div>
                  {possibleArrowCounts.length === 1 && (
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Csak {possibleArrowCounts[0]} nyíl lehetséges
                    </p>
                  )}
                </div>
              );
            })()}
            
            <div className="flex gap-2">
              <button 
                className="btn btn-error flex-1" 
                onClick={cancelLegEnd}
                disabled={isSavingLeg}
              >
                Visszavonás
              </button>
              <button 
                className="btn btn-success flex-1" 
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
          <div className="bg-base-200 p-6 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-3">Meccs vége?</h3>
            <p className="mb-4">
              {pendingMatchWinner === 1 ? player1.name : player2.name} nyerte a meccset!
            </p>
            
            {/* Arrow count selection for final leg */}
            {(() => {
              const lastThrow = pendingMatchWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1];
              const possibleArrowCounts = getPossibleArrowCounts(lastThrow);
              
              return (
                <div className="mb-4">
                  <p className="text-sm mb-2">
                    Utolsó kiszálló: {lastThrow} - Hány nyílból?
                  </p>
                  <div className="flex gap-2 justify-center">
                    {possibleArrowCounts.map((count) => (
                      <button
                        key={count}
                        onClick={() => setArrowCount(count)}
                        className={`btn btn-sm ${arrowCount === count ? 'btn-primary' : 'btn-outline'}`}
                      >
                        {count} nyíl
                      </button>
                    ))}
                  </div>
                  {possibleArrowCounts.length === 1 && (
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      Csak {possibleArrowCounts[0]} nyíl lehetséges
                    </p>
                  )}
                </div>
              );
            })()}
            
            <div className="flex gap-2">
              <button 
                className="btn btn-error flex-1" 
                onClick={cancelMatchEnd}
                disabled={isSavingMatch}
              >
                Visszavonás
              </button>
              <button 
                className="btn btn-success flex-1" 
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
