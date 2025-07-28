import React, { useState, useEffect } from 'react';

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
}

interface Throw {
  score: number;
  darts: number;
  isDouble?: boolean;
  isCheckout?: boolean;
}

interface MatchGameProps {
  match: Match;
  onBack: () => void;
}

const MatchGame: React.FC<MatchGameProps> = ({ match, onBack }) => {
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

  // Load saved game state from localStorage only once on mount
  useEffect(() => {
    if (isInitialized) return; // Prevent re-running after initialization
    
    const savedState = localStorage.getItem(`match_game_${match._id}`);
    if (savedState) {
      const state = JSON.parse(savedState);
      setPlayer1Score(state.player1Score);
      setPlayer2Score(state.player2Score);
      setCurrentPlayer(state.currentPlayer);
      setPlayer1Throws(state.player1Throws);
      setPlayer2Throws(state.player2Throws);
      setPlayer1LegsWon(state.player1LegsWon || 0);
      setPlayer2LegsWon(state.player2LegsWon || 0);
      setLegStartingPlayer(state.legStartingPlayer || match.startingPlayer || 1);
      setPlayer1Stats(state.player1Stats || { highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 });
      setPlayer2Stats(state.player2Stats || { highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 });
    } else {
      // Initialize with match settings if no saved state
      setPlayer1Score(match.startingScore);
      setPlayer2Score(match.startingScore);
      setCurrentPlayer(match.startingPlayer || 1);
      setPlayer1Throws([]);
      setPlayer2Throws([]);
      setPlayer1LegsWon(0);
      setPlayer2LegsWon(0);
      setLegStartingPlayer(match.startingPlayer || 1);
      setPlayer1Stats({ highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 });
      setPlayer2Stats({ highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 });
    }
    setIsInitialized(true);
  }, [match._id]); // Only depend on match._id, not other match properties

  // Save game state to localStorage whenever it changes (but only after initialization)
  useEffect(() => {
    if (!isInitialized) return; // Don't save before initialization is complete
    
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
    localStorage.setItem(`match_game_${match._id}`, JSON.stringify(gameState));
  }, [player1Score, player2Score, currentPlayer, player1Throws, player2Throws, player1LegsWon, player2LegsWon, legStartingPlayer, player1Stats, player2Stats, match._id, isInitialized]);

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
  };

  const handleThrow = () => {
    const throwValue = parseInt(throwInput);
    if (throwValue >= 0 && throwValue <= 180) {
      if (currentPlayer === 1) {
        const newScore = Math.max(0, player1Score - throwValue);
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
      } else {
        const newScore = Math.max(0, player2Score - throwValue);
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
      }
      setThrowInput('');
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  const confirmLegEnd = async () => {
    if (!pendingLegWinner) return;
    
    // Update legs won
    if (pendingLegWinner === 1) {
      setPlayer1LegsWon(player1LegsWon + 1);
    } else {
      setPlayer2LegsWon(player2LegsWon + 1);
    }

    // Check if match is won
    const newPlayer1Legs = pendingLegWinner === 1 ? player1LegsWon + 1 : player1LegsWon;
    const newPlayer2Legs = pendingLegWinner === 2 ? player2LegsWon + 1 : player2LegsWon;
    
    if (newPlayer1Legs >= (match.legsToWin || 3) || newPlayer2Legs >= (match.legsToWin || 3)) {
      // Match is finished
      setPendingMatchWinner(pendingLegWinner);
      setShowMatchConfirmation(true);
      setShowLegConfirmation(false);
      return;
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
    }

    // Reset for next leg
    setPlayer1Score(match.startingScore);
    setPlayer2Score(match.startingScore);
    
    // The player who didn't start this leg starts the next leg
    const nextLegStartingPlayer = legStartingPlayer === 1 ? 2 : 1;
    setLegStartingPlayer(nextLegStartingPlayer);
    setCurrentPlayer(nextLegStartingPlayer);
    
    setPlayer1Throws([]);
    setPlayer2Throws([]);
    setThrowInput('');
    
    setShowLegConfirmation(false);
    setPendingLegWinner(null);
  };

  const confirmMatchEnd = async () => {
    if (!pendingMatchWinner) return;
    
    try {
      await fetch(`/api/matches/${match._id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1LegsWon: pendingMatchWinner === 1 ? player1LegsWon + 1 : player1LegsWon,
          player2LegsWon: pendingMatchWinner === 2 ? player2LegsWon + 1 : player2LegsWon,
          player1Stats,
          player2Stats
        })
      });
    } catch (error) {
      console.error('Error finishing match:', error);
    }

    // Clear localStorage and go back
    localStorage.removeItem(`match_game_${match._id}`);
    alert(`Meccs vége! ${pendingMatchWinner === 1 ? match.player1.playerId.name : match.player2.playerId.name} nyert!`);
    onBack();
  };

  const cancelLegEnd = () => {
    setShowLegConfirmation(false);
    setPendingLegWinner(null);
  };

  const cancelMatchEnd = () => {
    setShowMatchConfirmation(false);
    setPendingMatchWinner(null);
  };

  // Calculate averages
  const player1Average = player1Stats.totalThrows > 0 ? Math.round(player1Stats.totalScore / player1Stats.totalThrows) : 0;
  const player2Average = player2Stats.totalThrows > 0 ? Math.round(player2Stats.totalScore / player2Stats.totalThrows) : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-100 p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-4">
        {/* Header */}
        <div className="flex w-full justify-between items-center">
          <button className="btn btn-sm btn-accent" onClick={onBack}>
            Vissza
          </button>
          <div className="text-lg font-bold">
            {match.player1.playerId.name} vs {match.player2.playerId.name}
          </div>
        </div>

        {/* Legs Display */}
        <div className="w-full bg-base-300 rounded-xl p-4 text-center">
          <div className="text-lg font-bold mb-2">Legs</div>
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <div className="text-2xl font-bold">{player1LegsWon}</div>
              <div className="text-sm">{match.player1.playerId.name}</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-lg opacity-75">vs</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-2xl font-bold">{player2LegsWon}</div>
              <div className="text-sm">{match.player2.playerId.name}</div>
            </div>
          </div>
          <div className="text-sm opacity-75 mt-2">
            {match.legsToWin || 3} legig
          </div>
        </div>

        {/* Score Display */}
        <div className="w-full bg-base-200 rounded-xl p-4">
          <div className="text-center mb-2">
            <div className="text-sm opacity-75">Író: {match.scorer.name}</div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <div className={`text-xl font-bold ${currentPlayer === 1 ? 'text-primary' : ''}`}>
                {match.player1.playerId.name}
              </div>
              <div className="text-3xl font-bold">{player1Score}</div>
              <div className="text-sm opacity-75">
                Átlag: {player1Average} | 180: {player1Stats.oneEightiesCount}
              </div>
            </div>
            
            <div className="text-center flex-1">
              <div className={`text-xl font-bold ${currentPlayer === 2 ? 'text-primary' : ''}`}>
                {match.player2.playerId.name}
              </div>
              <div className="text-3xl font-bold">{player2Score}</div>
              <div className="text-sm opacity-75">
                Átlag: {player2Average} | 180: {player2Stats.oneEightiesCount}
              </div>
            </div>
          </div>
        </div>

        {/* Current Player Indicator */}
        <div className="w-full bg-base-300 rounded-xl p-4 text-center">
          <div className="text-lg font-bold mb-2">
            {currentPlayer === 1 ? match.player1.playerId.name : match.player2.playerId.name} dob
          </div>
          <div className="text-2xl font-bold">{throwInput || '0'}</div>
        </div>

        {/* Number Input */}
        <div className="w-full bg-base-200 rounded-xl p-4">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
              <button
                key={num}
                className="btn btn-lg text-2xl"
                onClick={() => handleNumberInput(num)}
              >
                {num}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button
              className="btn btn-error flex-1"
              onClick={handleClear}
            >
              Törlés
            </button>
            <button
              className="btn btn-warning flex-1"
              onClick={handleUndo}
              disabled={player1Throws.length === 0 && player2Throws.length === 0}
            >
              Visszavonás
            </button>
            <button
              className="btn btn-success flex-1"
              onClick={handleThrow}
              disabled={!throwInput || parseInt(throwInput) < 0 || parseInt(throwInput) > 180}
            >
              Dobás
            </button>
          </div>
        </div>

        {/* Throw History */}
        <div className="w-full bg-base-200 rounded-xl p-4">
          <div className="text-lg font-bold mb-2">Dobások</div>
          <div className="flex justify-between">
            <div className="flex-1 text-center">
              <div className="font-bold">{match.player1.playerId.name}</div>
              <div className="text-lg">
                {player1Throws.map((score, i) => (
                  <span key={i} className="inline-block mx-1">{score}</span>
                ))}
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="font-bold">{match.player2.playerId.name}</div>
              <div className="text-lg">
                {player2Throws.map((score, i) => (
                  <span key={i} className="inline-block mx-1">{score}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Leg Confirmation Dialog */}
        {showLegConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-base-200 p-6 rounded-xl max-w-sm w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Leg vége?</h3>
              <p className="mb-4">
                {pendingLegWinner === 1 ? match.player1.playerId.name : match.player2.playerId.name} nyerte ezt a leg-et!
              </p>
              <div className="flex gap-2">
                <button className="btn btn-error flex-1" onClick={cancelLegEnd}>
                  Mégse
                </button>
                <button className="btn btn-success flex-1" onClick={confirmLegEnd}>
                  Igen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Match Confirmation Dialog */}
        {showMatchConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-base-200 p-6 rounded-xl max-w-sm w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Meccs vége?</h3>
              <p className="mb-4">
                {pendingMatchWinner === 1 ? match.player1.playerId.name : match.player2.playerId.name} nyerte a meccset!
              </p>
              <div className="flex gap-2">
                <button className="btn btn-error flex-1" onClick={cancelMatchEnd}>
                  Mégse
                </button>
                <button className="btn btn-success flex-1" onClick={confirmMatchEnd}>
                  Igen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchGame; 