"use client"
import { IconSettings, IconPlayerPlay } from '@tabler/icons-react';
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

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

interface Leg {
  legNumber: number;
  player1Throws: number[];
  player2Throws: number[];
  player1Score: number;
  player2Score: number;
  winner: 1 | 2;
  checkoutScore?: number;
  checkoutDarts?: number;
  createdAt: Date;
}

interface MatchStats {
  player1: {
    legsWon: number;
    legsLost: number;
    totalScore: number;
    totalDarts: number;
    average: number;
    highestCheckout: number;
    oneEightiesCount: number;
  };
  player2: {
    legsWon: number;
    legsLost: number;
    totalScore: number;
    totalDarts: number;
    average: number;
    highestCheckout: number;
    oneEightiesCount: number;
  };
  legs: Leg[];
  finishedAt: Date;
  winner: 1 | 2;
}

interface LocalMatchGameProps {
  legsToWin: number;
  startingScore: number;
  onBack: () => void;
  onRematch?: () => void;
  matchId: string;
}

const LocalMatchGame: React.FC<LocalMatchGameProps> = ({ legsToWin: initialLegsToWin, startingScore, onBack, onRematch, matchId }) => {
  const initialScore = startingScore;
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [legsToWin, setLegsToWin] = useState(initialLegsToWin);
  const [tempLegsToWin, setTempLegsToWin] = useState(initialLegsToWin);

  // Helper function to count 180s dynamically from throws
  const count180s = (throws: number[]): number => {
    return throws.filter(t => t === 180).length;
  };

  const [player1, setPlayer1] = useState<Player>({
    name: "1",
    score: initialScore,
    legsWon: 0,
    allThrows: [],
    stats: {
      highestCheckout: 0,
      totalThrows: 0,
      average: 0
    }
  });

  const [player2, setPlayer2] = useState<Player>({
    name: "2",
    score: initialScore,
    legsWon: 0,
    allThrows: [],
    stats: {
      highestCheckout: 0,
      totalThrows: 0,
      average: 0
    }
  });

  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [currentLeg, setCurrentLeg] = useState(1);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [editingThrow, setEditingThrow] = useState<{player: 1 | 2, throwIndex: number} | null>(null);
  const [editScoreInput, setEditScoreInput] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [legStartingPlayer, setLegStartingPlayer] = useState<1 | 2>(1);
  const [legs, setLegs] = useState<Leg[]>([]);
  
  // Confirmation dialogs
  const [showLegConfirmation, setShowLegConfirmation] = useState<boolean>(false);
  const [showMatchConfirmation, setShowMatchConfirmation] = useState<boolean>(false);
  const [pendingLegWinner, setPendingLegWinner] = useState<1 | 2 | null>(null);
  const [pendingMatchWinner, setPendingMatchWinner] = useState<1 | 2 | null>(null);
  
  // Arrow count for checkout
  const [arrowCount, setArrowCount] = useState<number>(3);
  
  // Match finished state
  const [matchFinished, setMatchFinished] = useState<boolean>(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);

  const chalkboardRef = useRef<HTMLDivElement>(null);
  const quickAccessScores = [180, 140, 100, 95, 85, 81, 80, 60, 45, 41, 40, 26];

  // Initialize from localStorage
  useEffect(() => {
    // Check for finished match stats first
    const savedStats = localStorage.getItem(`local_match_stats_${matchId}`);
    if (savedStats) {
      try {
        const stats = JSON.parse(savedStats);
        const savedDate = new Date(stats.finishedAt);
        const daysSinceSaved = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Clear if older than 5 days
        if (daysSinceSaved > 5) {
          localStorage.removeItem(`local_match_stats_${matchId}`);
        } else {
          // Restore finished match stats
          setMatchStats({
            ...stats,
            finishedAt: new Date(stats.finishedAt),
            legs: stats.legs.map((l: any) => ({ ...l, createdAt: new Date(l.createdAt) }))
          });
          setMatchFinished(true);
          setIsInitialized(true);
          return;
        }
      } catch (error) {
        console.error('Error parsing saved stats:', error);
        localStorage.removeItem(`local_match_stats_${matchId}`);
      }
    }
    
    // Check for ongoing match
    const savedState = localStorage.getItem(`local_match_${matchId}`);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        const savedDate = new Date(state.savedAt);
        const daysSinceSaved = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Clear if older than 5 days
        if (daysSinceSaved > 5) {
          localStorage.removeItem(`local_match_${matchId}`);
          setIsInitialized(true);
          return;
        }
        
        // Restore state
        setPlayer1(state.player1 || player1);
        setPlayer2(state.player2 || player2);
        setCurrentPlayer(state.currentPlayer || 1);
        setLegStartingPlayer(state.legStartingPlayer || 1);
        setCurrentLeg(state.currentLeg || 1);
        setLegs(state.legs || []);
        setLegsToWin(state.legsToWin || initialLegsToWin);
        setTempLegsToWin(state.legsToWin || initialLegsToWin);
        setIsInitialized(true);
        return;
      } catch (error) {
        console.error('Error parsing saved state:', error);
        localStorage.removeItem(`local_match_${matchId}`);
      }
    }
    
    setIsInitialized(true);
  }, [matchId, initialLegsToWin]);

  // Save game state to localStorage
  useEffect(() => {
    if (!isInitialized || matchFinished) return;
    
    const hasOngoingGame = player1.allThrows.length > 0 || player2.allThrows.length > 0 || 
                          (player1.score !== initialScore) || (player2.score !== initialScore) ||
                          player1.legsWon > 0 || player2.legsWon > 0;
    
    if (!hasOngoingGame) return;
    
    const gameState = {
      player1,
      player2,
      currentPlayer,
      legStartingPlayer,
      currentLeg,
      legsToWin,
      legs,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem(`local_match_${matchId}`, JSON.stringify(gameState));
  }, [player1, player2, currentPlayer, legStartingPlayer, currentLeg, legsToWin, legs, matchId, isInitialized, matchFinished]);

  // Auto-scroll chalkboard
  useEffect(() => {
    if (chalkboardRef.current) {
      chalkboardRef.current.scrollTop = chalkboardRef.current.scrollHeight;
    }
  }, [player1.allThrows.length, player2.allThrows.length]);

  const handleThrow = (score: number) => {
    console.log("handleThrow - Input Score:", score, "Current Player:", currentPlayer);
    
    if (matchFinished) return;

    const currentPlayerData = currentPlayer === 1 ? player1 : player2;
    
    // Check for bust
    if (currentPlayerData.score - score < 0) {
      console.log("handleThrow - BUST");
      const newAllThrows = [...currentPlayerData.allThrows, 0]; // Record 0 for bust? Or just keep throws? Usually bust records the throws but score resets. 
      // Actually, standard bust means no score change, but throws are recorded? 
      // The original code recorded 0? Let's check what it did.
      // It seems it added 0 to allThrows.
      
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
      
      toast.error('Túl sok pont!');
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
      setScoreInput('');
      return;
    }

    const newScore = currentPlayerData.score - score;
    const newAllThrows = [...currentPlayerData.allThrows, score];
    console.log("handleThrow - New Score:", newScore, "New Throws:", newAllThrows);

    // Check for win condition
    if (newScore === 0) {
      // Validate checkout (must be double) - simplified for now as per original code which didn't seem to strictly enforce double out logic here, or maybe it did?
      // The original code just checked newScore === 0.
      
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

  const getPossibleArrowCounts = (checkoutScore: number): number[] => {
    if (checkoutScore <= 40) {
      return [1, 2, 3];
    } else if (checkoutScore <= 98) {
      return [2, 3];
    } else {
      return [3];
    }
  };

  const calculateMatchStats = (allLegs: Leg[]): MatchStats => {
    let player1TotalScore = 0;
    let player1TotalDarts = 0;
    let player1OneEighties = 0;
    let player1HighestCheckout = 0;

    let player2TotalScore = 0;
    let player2TotalDarts = 0;
    let player2OneEighties = 0;
    let player2HighestCheckout = 0;

    // Process all legs (including final leg)
    console.log("calculateMatchStats - Processing legs:", allLegs.length);
    
    for (const leg of allLegs) {
      console.log(`calculateMatchStats - Leg ${leg.legNumber || '?'}:`, leg);
      
      // Player 1 stats
      player1TotalScore += leg.player1Score;
      let legP1OneEighties = 0;
      
      leg.player1Throws.forEach((score, index) => {
        // Last throw of winner uses checkoutDarts, others use 3
        const isLastThrow = index === leg.player1Throws.length - 1;
        const darts = (leg.winner === 1 && isLastThrow && leg.checkoutDarts) ? leg.checkoutDarts : 3;
        player1TotalDarts += darts;
        if (score === 180) {
           player1OneEighties++;
           legP1OneEighties++;
        }
      });
      console.log(`calculateMatchStats - Leg ${leg.legNumber} P1 180s:`, legP1OneEighties);
      
      if (leg.winner === 1 && leg.checkoutScore) {
        player1HighestCheckout = Math.max(player1HighestCheckout, leg.checkoutScore);
      }

      // Player 2 stats
      player2TotalScore += leg.player2Score;
      let legP2OneEighties = 0;
      
      leg.player2Throws.forEach((score, index) => {
        // Last throw of winner uses checkoutDarts, others use 3
        const isLastThrow = index === leg.player2Throws.length - 1;
        const darts = (leg.winner === 2 && isLastThrow && leg.checkoutDarts) ? leg.checkoutDarts : 3;
        player2TotalDarts += darts;
        if (score === 180) {
           player2OneEighties++;
           legP2OneEighties++;
        }
      });
      console.log(`calculateMatchStats - Leg ${leg.legNumber} P2 180s:`, legP2OneEighties);

      if (leg.winner === 2 && leg.checkoutScore) {
        player2HighestCheckout = Math.max(player2HighestCheckout, leg.checkoutScore);
      }
    }
    
    console.log("calculateMatchStats - Final Totals:", {
       p1OneEighties: player1OneEighties,
       p2OneEighties: player2OneEighties
    });

    return {
      player1: {
        legsWon: player1.legsWon,
        legsLost: player2.legsWon,
        totalScore: player1TotalScore,
        totalDarts: player1TotalDarts,
        average: player1TotalDarts > 0 ? Math.round((player1TotalScore / player1TotalDarts) * 3 * 100) / 100 : 0,
        highestCheckout: player1HighestCheckout,
        oneEightiesCount: player1OneEighties
      },
      player2: {
        legsWon: player2.legsWon,
        legsLost: player1.legsWon,
        totalScore: player2TotalScore,
        totalDarts: player2TotalDarts,
        average: player2TotalDarts > 0 ? Math.round((player2TotalScore / player2TotalDarts) * 3 * 100) / 100 : 0,
        highestCheckout: player2HighestCheckout,
        oneEightiesCount: player2OneEighties
      },
      legs: allLegs,
      finishedAt: new Date(),
      winner: pendingMatchWinner || 1
    };
  };

  const confirmLegEnd = () => {
    if (!pendingLegWinner) return;
    
    const lastThrow = pendingLegWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1];
    const possibleArrowCounts = getPossibleArrowCounts(lastThrow);
    if (possibleArrowCounts.length === 1) {
      setArrowCount(possibleArrowCounts[0]);
    }
    
    const newPlayer1Legs = pendingLegWinner === 1 ? player1.legsWon + 1 : player1.legsWon;
    const newPlayer2Legs = pendingLegWinner === 2 ? player2.legsWon + 1 : player2.legsWon;
    
    if (pendingLegWinner === 1) {
      setPlayer1(prev => ({ ...prev, legsWon: newPlayer1Legs }));
    } else {
      setPlayer2(prev => ({ ...prev, legsWon: newPlayer2Legs }));
    }
    
    // Save leg
    const leg: Leg = {
      legNumber: currentLeg,
      player1Throws: [...player1.allThrows],
      player2Throws: [...player2.allThrows],
      player1Score: player1.allThrows.reduce((a, b) => a + b, 0),
      player2Score: player2.allThrows.reduce((a, b) => a + b, 0),
      winner: pendingLegWinner,
      checkoutScore: lastThrow,
      checkoutDarts: arrowCount,
      createdAt: new Date()
    };
    setLegs(prev => [...prev, leg]);
    
    // Check if match is won
    if (newPlayer1Legs >= legsToWin || newPlayer2Legs >= legsToWin) {
      setPendingMatchWinner(pendingLegWinner);
      setShowMatchConfirmation(true);
      setShowLegConfirmation(false);
      return;
    }

    // Reset for next leg
    setPlayer1(prev => ({ ...prev, score: initialScore, allThrows: [] }));
    setPlayer2(prev => ({ ...prev, score: initialScore, allThrows: [] }));
    
    const nextLegStartingPlayer = legStartingPlayer === 1 ? 2 : 1;
    setLegStartingPlayer(nextLegStartingPlayer);
    setCurrentPlayer(nextLegStartingPlayer);
    setCurrentLeg(prev => prev + 1);
    setScoreInput('');
    
    setShowLegConfirmation(false);
    setPendingLegWinner(null);
  };

  const confirmMatchEnd = () => {
    if (!pendingMatchWinner) return;
    
    const allLegs = [...legs];
    const lastLeg = legs[legs.length - 1];
    
    // Only add final leg if it's not already in the legs array
    // confirmLegEnd adds the leg before showing the match confirmation, so it should be there.
    if (!lastLeg || lastLeg.legNumber !== currentLeg) {
      const finalLeg: Leg = {
        legNumber: currentLeg,
        player1Throws: [...player1.allThrows],
        player2Throws: [...player2.allThrows],
        player1Score: player1.allThrows.reduce((a, b) => a + b, 0),
        player2Score: player2.allThrows.reduce((a, b) => a + b, 0),
        winner: pendingMatchWinner,
        checkoutScore: pendingMatchWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1],
        checkoutDarts: arrowCount,
        createdAt: new Date()
      };
      allLegs.push(finalLeg);
    }
    
    // Do NOT update legs state here to prevent double counting if cancelled/retried
    // setLegs(allLegs);
    
    // Calculate and save match stats from all legs (including final)
    console.log("confirmMatchEnd - Calculating stats from legs:", allLegs);
    const stats = calculateMatchStats(allLegs);
    console.log("confirmMatchEnd - Calculated Stats:", stats);
    setMatchStats(stats);
    setMatchFinished(true);
    
    // Save finished match stats to localStorage
    localStorage.setItem(`local_match_stats_${matchId}`, JSON.stringify({
      ...stats,
      finishedAt: stats.finishedAt.toISOString(),
      legs: stats.legs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() }))
    }));
    
    // Clear ongoing match from localStorage
    localStorage.removeItem(`local_match_${matchId}`);
    
    toast.success(`Meccs vége! ${pendingMatchWinner === 1 ? player1.name : player2.name} nyert!`);
    setShowMatchConfirmation(false);
  };

  const cancelLegEnd = () => {
    const playerWhoJustThrew = pendingLegWinner;
    
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
      setCurrentPlayer(2);
    }
    
    setShowLegConfirmation(false);
    setPendingLegWinner(null);
    setArrowCount(3);
  };

  const cancelMatchEnd = () => {
    const playerWhoJustThrew = pendingMatchWinner;
    
    if (playerWhoJustThrew === 1 && player1.allThrows.length > 0) {
      const lastThrow = player1.allThrows[player1.allThrows.length - 1];
      setPlayer1(prev => ({
        ...prev,
        score: prev.score + lastThrow,
        legsWon: Math.max(0, prev.legsWon - 1),
        allThrows: prev.allThrows.slice(0, -1),
        stats: {
          ...prev.stats,
          totalThrows: Math.max(0, prev.stats.totalThrows - 1),
          average: (prev.stats.totalThrows - 1) > 0 ? 
            Math.round(((prev.stats.totalThrows * prev.stats.average) - lastThrow) / (prev.stats.totalThrows - 1)) : 0
        }
      }));
      setCurrentPlayer(1);
    } else if (playerWhoJustThrew === 2 && player2.allThrows.length > 0) {
      const lastThrow = player2.allThrows[player2.allThrows.length - 1];
      setPlayer2(prev => ({
        ...prev,
        score: prev.score + lastThrow,
        legsWon: Math.max(0, prev.legsWon - 1),
        allThrows: prev.allThrows.slice(0, -1),
        stats: {
          ...prev.stats,
          totalThrows: Math.max(0, prev.stats.totalThrows - 1),
          average: (prev.stats.totalThrows - 1) > 0 ? 
            Math.round(((prev.stats.totalThrows * prev.stats.average) - lastThrow) / (prev.stats.totalThrows - 1)) : 0
        }
      }));
      setCurrentPlayer(2);
    }
    
    setShowMatchConfirmation(false);
    setPendingMatchWinner(null);
    setArrowCount(3);
  };

  const handleSaveLegsToWin = () => {
    if (tempLegsToWin < 1 || tempLegsToWin > 20) {
      toast.error('A nyert legek száma 1 és 20 között kell legyen!');
      return;
    }

    const player1HasWon = player1.legsWon >= tempLegsToWin;
    const player2HasWon = player2.legsWon >= tempLegsToWin;
    
    if (player1HasWon || player2HasWon) {
      let winner: 1 | 2;
      if (player1HasWon && player2HasWon) {
        winner = player1.legsWon >= player2.legsWon ? 1 : 2;
      } else {
        winner = player1HasWon ? 1 : 2;
      }
      
      setPendingMatchWinner(winner);
      setShowMatchConfirmation(true);
      setShowSettingsModal(false);
      setLegsToWin(tempLegsToWin);
      return;
    }

    setLegsToWin(tempLegsToWin);
    setShowSettingsModal(false);
    toast.success('Beállítások mentve!');
  };

  const handleRestartWithNewSettings = () => {
    if (tempLegsToWin < 1 || tempLegsToWin > 20) {
      toast.error('A nyert legek száma 1 és 20 között kell legyen!');
      return;
    }

    // Reset all game state
    setPlayer1({
      name: "1",
      score: initialScore,
      legsWon: 0,
      allThrows: [],
      stats: {
        highestCheckout: 0,
        totalThrows: 0,
        average: 0
      }
    });

    setPlayer2({
      name: "2",
      score: initialScore,
      legsWon: 0,
      allThrows: [],
      stats: {
        highestCheckout: 0,
        totalThrows: 0,
        average: 0
      }
    });

    setCurrentPlayer(1);
    setCurrentLeg(1);
    setLegStartingPlayer(1);
    setLegs([]);
    setLegsToWin(tempLegsToWin);
    setScoreInput('');
    setEditingThrow(null);
    setEditScoreInput('');
    setShowLegConfirmation(false);
    setShowMatchConfirmation(false);
    setPendingLegWinner(null);
    setPendingMatchWinner(null);
    setMatchFinished(false);
    setMatchStats(null);
    setArrowCount(3);

    // Clear localStorage
    localStorage.removeItem(`local_match_${matchId}`);
    localStorage.removeItem(`local_match_stats_${matchId}`);

    setShowSettingsModal(false);
    toast.success('Meccs újraindítva új beállításokkal!');
  };

  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Betöltés...</p>
        </div>
      </div>
    );
  }

  if (matchFinished && matchStats) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-4xl w-full mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Meccs Statisztikák</CardTitle>
              <div className="flex gap-2">
                {onRematch && (
                  <Button onClick={onRematch} className="gap-2">
                    <IconPlayerPlay size={18} />
                    Rematch
                  </Button>
                )}
                <Button onClick={onBack} variant="outline">Vissza</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">
                Győztes: {matchStats.winner === 1 ? player1.name : player2.name}
              </h3>
              <p className="text-muted-foreground">
                {matchStats.player1.legsWon} - {matchStats.player2.legsWon}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{player1.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Átlag:</span>
                    <span className="font-bold">{matchStats.player1.average.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Leg nyert:</span>
                    <span className="font-bold">{matchStats.player1.legsWon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Leg vesztett:</span>
                    <span className="font-bold">{matchStats.player1.legsLost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>180:</span>
                    <span className="font-bold">{matchStats.player1.oneEightiesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Legnagyobb kiszálló:</span>
                    <span className="font-bold">{matchStats.player1.highestCheckout}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{player2.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Átlag:</span>
                    <span className="font-bold">{matchStats.player2.average.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Leg nyert:</span>
                    <span className="font-bold">{matchStats.player2.legsWon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Leg vesztett:</span>
                    <span className="font-bold">{matchStats.player2.legsLost}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>180:</span>
                    <span className="font-bold">{matchStats.player2.oneEightiesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Legnagyobb kiszálló:</span>
                    <span className="font-bold">{matchStats.player2.highestCheckout}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col landscape:flex-row bg-black text-white">
      {/* Left Side - Players & Chalkboard */}
      <div className="flex flex-col landscape:w-1/2 landscape:h-full">
        {/* Header - Score Display */}
        <header className="flex h-[28dvh] landscape:h-[35dvh] w-full bg-gradient-to-b from-gray-900 to-black relative">
          {/* Player 1 */}
          <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 ${currentPlayer === 1 ? 'border-2 border-primary' : 'bg-gray-900/50'}`}>
            <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 text-white text-center px-2">
              <div className="truncate max-w-full">{player1.name}</div>
              <div className="text-gray-400 text-2xl sm:text-3xl md:text-4xl lg:text-5xl mt-1">{player1.legsWon}</div>
            </div>
            <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-1 sm:mb-2 leading-none">{player1.score}</div>
            <div className="flex gap-1 sm:gap-2 md:gap-3 text-xs sm:text-sm md:text-base">
              <span className="text-gray-400">Avg: {player1.stats.average.toFixed(2)}</span>
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
          <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 z-50 ${currentPlayer === 2 ? 'border-2 border-primary' : 'bg-gray-900/50'}`}>
            <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 text-white text-center px-2">
              <div className="truncate max-w-full">{player2.name}</div>
              <div className="text-gray-400 text-2xl sm:text-3xl md:text-4xl lg:text-5xl mt-1">{player2.legsWon}</div>
            </div>
            <div className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-1 sm:mb-2 leading-none">{player2.score}</div>
            <div className="flex gap-1 sm:gap-2 md:gap-3 text-xs sm:text-sm md:text-base">
              <span className="text-gray-400">Avg: {player2.stats.average.toFixed(2)}</span>
              <span className="text-gray-400">180: {count180s(player2.allThrows)}</span>
            </div>
          </div>
        </header>

        {/* Throw History - Chalkboard Style */}
        <section className="h-[10dvh] landscape:flex-1 bg-base-200 flex overflow-hidden">
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
            <div className="w-14 sm:w-16 lg:w-20 flex flex-col items-center bg-base-100 p-2">
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

      {/* Right Side - Input & Numpad */}
      <div className="flex flex-col landscape:w-1/2 landscape:h-full">
        {/* Score Display with BACK button */}
        <section className="h-[6dvh] landscape:h-[15dvh] bg-gradient-to-b from-base-300 to-base-200 flex items-center justify-between px-2 sm:px-4">
          <button
            onClick={() => handleBack()}
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
                  className="flex-1 bg-base-300 hover:bg-base-100 text-base-content font-bold text-lg portrait:sm:text-xl portrait:md:text-2xl md:text-xl rounded-lg transition-colors"
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
                  className="bg-base-300 hover:bg-base-100 text-base-content font-bold text-xl portrait:sm:text-2xl portrait:md:text-3xl sm:text-lg md:text-xl rounded-lg transition-colors"
                >
                  ⌫
                </button>
                <button
                  onClick={() => handleNumberInput(0)}
                  className="bg-base-200 hover:bg-base-300 text-base-content font-bold text-3xl portrait:sm:text-4xl portrait:md:text-5xl sm:text-3xl md:text-4xl rounded-lg transition-colors"
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
                  className="flex-1 bg-base-300 hover:bg-base-100 text-base-content font-bold text-lg portrait:sm:text-xl portrait:md:text-2xl md:text-xl rounded-lg transition-colors"
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
        <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Meccs beállítások</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nyert legek száma</label>
                <select 
                  onChange={(e) => setTempLegsToWin(parseInt(e.target.value))} 
                  value={tempLegsToWin} 
                  className="select select-bordered w-full"
                >
                  {Array.from({ length: 20 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">Best of {tempLegsToWin * 2 - 1}</p>
              </div>
              
              <div className="space-y-2 pt-2 border-t">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleSaveLegsToWin}
                >
                  Beállítások mentése
                </Button>
                
                <Button 
                  variant="default" 
                  className="w-full" 
                  onClick={handleRestartWithNewSettings}
                >
                  Újraindítás új beállításokkal
                </Button>
                
                {onRematch && (
                  <Button 
                    variant="secondary" 
                    className="w-full" 
                    onClick={() => {
                      setShowSettingsModal(false);
                      onRematch();
                    }}
                  >
                    Újraindítás (ugyanazokkal a beállításokkal)
                  </Button>
                )}
                
                <Button 
                  variant="destructive" 
                  className="w-full" 
                  onClick={() => {
                    setShowSettingsModal(false);
                    onBack();
                  }}
                >
                  Kilépés
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Leg Confirmation Dialog */}
      {showLegConfirmation && (
        <Dialog open={showLegConfirmation} onOpenChange={() => {}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leg vége?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                {pendingLegWinner === 1 ? player1.name : player2.name} nyerte ezt a leg-et!
              </p>
              
              {(() => {
                const lastThrow = pendingLegWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1];
                const possibleArrowCounts = getPossibleArrowCounts(lastThrow);
                
                return (
                  <div>
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
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Csak {possibleArrowCounts[0]} nyíl lehetséges
                      </p>
                    )}
                  </div>
                );
              })()}
              
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" onClick={cancelLegEnd}>
                  Visszavonás
                </Button>
                <Button className="flex-1" onClick={confirmLegEnd}>
                  Igen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Match Confirmation Dialog */}
      {showMatchConfirmation && (
        <Dialog open={showMatchConfirmation} onOpenChange={() => {}}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Meccs vége?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>
                {pendingMatchWinner === 1 ? player1.name : player2.name} nyerte a meccset!
              </p>
              
              {(() => {
                const lastThrow = pendingMatchWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1];
                const possibleArrowCounts = getPossibleArrowCounts(lastThrow);
                
                return (
                  <div>
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
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Csak {possibleArrowCounts[0]} nyíl lehetséges
                      </p>
                    )}
                  </div>
                );
              })()}
              
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1" onClick={cancelMatchEnd}>
                  Visszavonás
                </Button>
                <Button className="flex-1" onClick={confirmMatchEnd}>
                  Igen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default LocalMatchGame;

