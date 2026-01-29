"use client"
import { IconSettings, IconPlayerPlay } from '@tabler/icons-react';
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/switch';
import { useDartGame } from '@/hooks/useDartGame';
import { useScolia } from '@/hooks/useScolia';

interface LocalMatchGameProps {
  legsToWin: number;
  startingScore: number;
  onBack: () => void;
  onRematch?: () => void;
}

const LocalMatchGame: React.FC<LocalMatchGameProps> = ({ legsToWin: initialLegsToWin, startingScore, onBack, onRematch }) => {
  // --- Game State via Custom Hook ---
  const { 
    gameState, 
    handleThrow: gameHandleThrow, 
    undoThrow, 
    editThrow,
    startNextLeg,
    setGameState 
  } = useDartGame({
      initialScore: startingScore,
      legsToWin: initialLegsToWin,
  });

  // --- Local State ---
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempLegsToWin, setTempLegsToWin] = useState(initialLegsToWin);
  const [legsToWin, setLegsToWin] = useState(initialLegsToWin);
  
  // Scolia Settings
  const [scoliaSerial, setScoliaSerial] = useState('');
  const [scoliaToken, setScoliaToken] = useState('');
  const [isScoliaEnabled, setIsScoliaEnabled] = useState(false);

  // Inputs
  const [scoreInput, setScoreInput] = useState('');
  const [editingThrow, setEditingThrow] = useState<{player: 1 | 2, throwIndex: number} | null>(null);
  const [editScoreInput, setEditScoreInput] = useState('');
  
  // Confirmation Modals
  const [showLegConfirmation, setShowLegConfirmation] = useState(false);
  const [showMatchConfirmation, setShowMatchConfirmation] = useState(false);
  const [pendingLegWinner, setPendingLegWinner] = useState<1 | 2 | null>(null);
  const [pendingMatchWinner, setPendingMatchWinner] = useState<1 | 2 | null>(null);
  const [arrowCount, setArrowCount] = useState(3);
  const [matchFinished, setMatchFinished] = useState(false);
  const [matchStats, setMatchStats] = useState<any>(null);
  
  const chalkboardRef = useRef<HTMLDivElement>(null);
  const quickAccessScores = [180, 140, 100, 95, 85, 81, 80, 60, 45, 41, 40, 26];

  const currentPlayer = gameState.currentPlayer;
  const currentLeg = gameState.currentLeg;
  const player1 = gameState.player1;
  const player2 = gameState.player2;

  // --- Effects ---

  // Detect Leg Win
  useEffect(() => {
     if (gameState.winner) {
         setPendingLegWinner(gameState.winner === 'player1' ? 1 : 2);
         setShowLegConfirmation(true);
     }
  }, [gameState.winner]);

  // Detect Game Win
  useEffect(() => {
      if (gameState.gameStatus === 'finished') {
          setPendingMatchWinner(gameState.player1.legsWon > gameState.player2.legsWon ? 1 : 2);
          setShowMatchConfirmation(true);
      }
  }, [gameState.gameStatus]);

  // Buffer for Scolia
  const scoliaBuffer = useRef<number[]>([]);

  const submitScoliaBuffer = () => {
      if (scoliaBuffer.current.length === 0) return;
      const total = scoliaBuffer.current.reduce((a, b) => a + b, 0);
      gameHandleThrow(total);
      scoliaBuffer.current = [];
  };

  const handleScoliaThrow = (score: number) => {
      const currentPlayerData = gameState.currentPlayer === 1 ? gameState.player1 : gameState.player2;
      const currentScore = currentPlayerData.score;
      
      const currentBufferSum = scoliaBuffer.current.reduce((a, b) => a + b, 0);
      const newBufferSum = currentBufferSum + score;
      scoliaBuffer.current.push(score);
      
      const remaining = currentScore - newBufferSum;
      
      if (remaining <= 0 || remaining === 1) {
          submitScoliaBuffer();
      } else if (scoliaBuffer.current.length === 3) {
          submitScoliaBuffer();
      }
  };

  useScolia({
      serialNumber: scoliaSerial,
      accessToken: scoliaToken,
      isEnabled: isScoliaEnabled,
      onThrow: handleScoliaThrow
  });

  // Auto-scroll chalkboard
  useEffect(() => {
    if (chalkboardRef.current) {
      chalkboardRef.current.scrollTop = chalkboardRef.current.scrollHeight;
    }
  }, [player1.allThrows.length, player2.allThrows.length]);

  // --- Handlers ---
  const handleThrow = (score: number) => {
    gameHandleThrow(score);
  };

  const handleNumberInput = (num: number) => {
    if (editingThrow) {
      setEditScoreInput(editScoreInput + num.toString());
    } else {
      setScoreInput(scoreInput + num.toString());
    }
  };

  const handleEditThrow = (player: 1 | 2, throwIndex: number, currentValue: number) => {
    setEditingThrow({ player, throwIndex });
    setEditScoreInput(currentValue.toString());
  };

  const handleSaveEdit = () => {
    if (!editingThrow) return;
    const score = parseInt(editScoreInput);
    if (!isNaN(score) && score >= 0 && score <= 180) {
      editThrow(editingThrow.player, editingThrow.throwIndex, score);
      setEditingThrow(null);
      setEditScoreInput('');
    } else {
      toast.error('Érvénytelen pontszám! (0-180)');
    }
  };

  const handleCancelEdit = () => {
    setEditingThrow(null);
    setEditScoreInput('');
  };


  const handleBack = () => {
    undoThrow();
  };

  // Keyboard Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field (like settings)
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (editingThrow) {
        if (e.key === 'Enter') {
          handleSaveEdit();
        } else if (e.key === 'Escape') {
          handleCancelEdit();
        } else if (/^[0-9]$/.test(e.key)) {
          handleNumberInput(parseInt(e.key));
        } else if (e.key === 'Backspace') {
          setEditScoreInput(prev => prev.slice(0, -1));
        }
        return;
      }

      // Normal scoring mode
      // Prevent shortcut interference when modals are open
      if (showLegConfirmation || showMatchConfirmation || showSettingsModal) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        handleNumberInput(parseInt(e.key));
      } else if (e.key === 'Backspace') {
        setScoreInput(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        const score = parseInt(scoreInput);
        if (!isNaN(score) && score >= 0 && score <= 180) {
          handleThrow(score);
          setScoreInput('');
        }
      } else if (e.key === 'Escape') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editingThrow, 
    editScoreInput, 
    scoreInput, 
    showLegConfirmation, 
    showMatchConfirmation, 
    showSettingsModal,
    handleSaveEdit, 
    handleCancelEdit, 
    handleBack, 
    handleNumberInput,
    handleThrow
  ]);

  const confirmLegEnd = () => {
    startNextLeg();
    setShowLegConfirmation(false);
    setPendingLegWinner(null);
    setArrowCount(3);
  };

  const cancelLegEnd = () => {
    undoThrow();
    setShowLegConfirmation(false);
    setPendingLegWinner(null);
  };

  const confirmMatchEnd = () => {
    setMatchStats({
      winner: pendingMatchWinner,
      player1: gameState.player1,
      player2: gameState.player2
    });
    setMatchFinished(true);
    setShowMatchConfirmation(false);
  };

  const cancelMatchEnd = () => {
    undoThrow();
    setShowMatchConfirmation(false);
    setPendingMatchWinner(null);
  };

  const getPossibleArrowCounts = (checkoutScore: number): number[] => {
    if (checkoutScore <= 40 || checkoutScore === 50 || (checkoutScore < 100 && checkoutScore % 3 === 0)) {
      return [1, 2, 3]; // 1-40: 1-3 nyíl lehetséges
    } else if (checkoutScore <= 98 || checkoutScore === 100 || checkoutScore === 101 || checkoutScore === 104 || checkoutScore === 107 || checkoutScore === 110) {
      return [2, 3]; // 41-98: 2-3 nyíl lehetséges
    } else {
      return [3]; // 99-180: csak 3 nyíl lehetséges
    }
  };

  const handleSaveLegsToWin = () => {
    setLegsToWin(tempLegsToWin);
    setGameState(prev => ({ ...prev, legsToWin: tempLegsToWin }));
    setShowSettingsModal(false);
    toast.success('Beállítások mentve!');
  };

  const handleRestartWithNewSettings = () => {
    setLegsToWin(tempLegsToWin);
    setGameState(prev => ({ ...prev, legsToWin: tempLegsToWin }));
    setShowSettingsModal(false);
    if (onRematch) {
      onRematch();
    }
  };

  const count180s = (throws: number[]): number => {
    return throws.filter(t => t === 180).length;
  };


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
                Győztes: {matchStats.winner === 1 ? 'Játékos 1' : 'Játékos 2'}
              </h3>
              <p className="text-muted-foreground">
                {matchStats.player1.legsWon} - {matchStats.player2.legsWon}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Játékos 1</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Átlag:</span>
                    <span className="font-bold">{matchStats.player1.stats.average.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Leg nyert:</span>
                    <span className="font-bold">{matchStats.player1.legsWon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>180:</span>
                    <span className="font-bold">{count180s(matchStats.player1.allThrows)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Legnagyobb kiszálló:</span>
                    <span className="font-bold">{matchStats.player1.stats.highestCheckout}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Játékos 2</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Átlag:</span>
                    <span className="font-bold">{matchStats.player2.stats.average.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Leg nyert:</span>
                    <span className="font-bold">{matchStats.player2.legsWon}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>180:</span>
                    <span className="font-bold">{count180s(matchStats.player2.allThrows)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Legnagyobb kiszálló:</span>
                    <span className="font-bold">{matchStats.player2.stats.highestCheckout}</span>
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
              <div className="truncate max-w-full">Játékos 1</div>
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
              <div className="truncate max-w-full">Játékos 2</div>
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
              <div className="text-center text-base-content font-bold mb-2 text-xs sm:text-sm lg:text-base sticky top-0 bg-base-200 z-10 pb-1">Játékos 1</div>
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
              <div className="text-center text-base-content font-bold mb-2 text-xs sm:text-sm lg:text-base sticky top-0 bg-base-200 z-10 pb-1">Játékos 2</div>
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
            className="bg-base-300 hover:bg-base-100 text-base-content font-bold px-3 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors text-xs sm:text-base border uppercase tracking-widest"
          >
            UNDO
          </button>
          <div className="flex flex-col items-center flex-1">
            {editingThrow && (
              <div className="text-xs sm:text-sm text-primary mb-1">
                Szerkesztés: Játékos {editingThrow.player} - Dobás #{editingThrow.throwIndex + 1}
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
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meccs beállítások</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Nyert legek száma</Label>
              <select 
                onChange={(e) => setTempLegsToWin(parseInt(e.target.value))} 
                value={tempLegsToWin} 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
              >
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Best of {tempLegsToWin * 2 - 1}</p>
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Scolia Autoscoring</Label>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="scolia-serial">Scolia Szériaszám</Label>
                  <Input
                    id="scolia-serial"
                    placeholder="Scolia Szériaszám"
                    value={scoliaSerial}
                    onChange={(e) => setScoliaSerial(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scolia-token">Hozzáférési Token</Label>
                  <Input
                    id="scolia-token"
                    type="password"
                    placeholder="Hozzáférési Token"
                    value={scoliaToken}
                    onChange={(e) => setScoliaToken(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="scolia-enable">Scolia engedélyezése</Label>
                  <Switch
                    id="scolia-enable"
                    checked={isScoliaEnabled}
                    onCheckedChange={setIsScoliaEnabled}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 pt-4 border-t">
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

      {/* Leg Confirmation Dialog */}
      <Dialog open={showLegConfirmation} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Leg vége?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-medium">
              Játékos {pendingLegWinner} nyerte ezt a leg-et!
            </p>
            
            {(() => {
              const lastThrow = pendingLegWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1];
              const possibleArrowCounts = getPossibleArrowCounts(lastThrow || 0);
              
              return (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Kiszálló: <span className="font-bold text-foreground">{lastThrow}</span> - Hány nyílból?
                  </p>
                  <div className="flex gap-2 justify-center">
                    {possibleArrowCounts.map((count) => (
                      <Button
                        key={count}
                        onClick={() => setArrowCount(count)}
                        variant={arrowCount === count ? "default" : "outline"}
                        size="sm"
                        className="min-w-[80px]"
                      >
                        {count} nyíl
                      </Button>
                    ))}
                  </div>
                  {possibleArrowCounts.length === 1 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Csak {possibleArrowCounts[0]} nyíl lehetséges
                    </p>
                  )}
                </div>
              );
            })()}
            
            <div className="flex gap-2 pt-2">
              <Button variant="destructive" className="flex-1" onClick={cancelLegEnd}>
                Visszavonás
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={confirmLegEnd}>
                Igen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Confirmation Dialog */}
      <Dialog open={showMatchConfirmation} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Meccs vége?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="font-medium">
              Játékos {pendingMatchWinner} nyerte a meccset!
            </p>
            
            {(() => {
              const lastThrow = pendingMatchWinner === 1 ? player1.allThrows[player1.allThrows.length - 1] : player2.allThrows[player2.allThrows.length - 1];
              const possibleArrowCounts = getPossibleArrowCounts(lastThrow || 0);
              
              return (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Utolsó kiszálló: <span className="font-bold text-foreground">{lastThrow}</span> - Hány nyílból?
                  </p>
                  <div className="flex gap-2 justify-center">
                    {possibleArrowCounts.map((count) => (
                      <Button
                        key={count}
                        onClick={() => setArrowCount(count)}
                        variant={arrowCount === count ? "default" : "outline"}
                        size="sm"
                        className="min-w-[80px]"
                      >
                        {count} nyíl
                      </Button>
                    ))}
                  </div>
                  {possibleArrowCounts.length === 1 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Csak {possibleArrowCounts[0]} nyíl lehetséges
                    </p>
                  )}
                </div>
              );
            })()}
            
            <div className="flex gap-2 pt-2">
              <Button variant="destructive" className="flex-1" onClick={cancelMatchEnd}>
                Visszavonás
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={confirmMatchEnd}>
                Igen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocalMatchGame;
