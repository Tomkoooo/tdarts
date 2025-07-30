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
  winnerId?: string; // Added for finished matches
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

  // Calculate the correct starting player for the next leg
  const calculateNextLegStartingPlayer = (totalLegsPlayed: number, originalStartingPlayer: number): number => {
    // If odd number of legs played, the opposite player starts
    // If even number of legs played, the original starting player starts
    return totalLegsPlayed % 2 === 1 ? (originalStartingPlayer === 1 ? 2 : 1) : originalStartingPlayer;
  };

  // Load saved game state from localStorage only once on mount
  useEffect(() => {
    // Reset initialization flag when match settings change
    setIsInitialized(false);
    
    const savedState = localStorage.getItem(`match_game_${match._id}`);
    if (savedState) {
      const state = JSON.parse(savedState);
      // Check if the saved state has the same starting player as the current match
      const savedStartingPlayer = state.legStartingPlayer || 1;
      if (savedStartingPlayer !== (match.startingPlayer || 1)) {
        // Starting player changed, clear saved state and start fresh
        localStorage.removeItem(`match_game_${match._id}`);
      } else {
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
        setIsInitialized(true);
        return;
      }
    }
    
    // Initialize with match settings if no saved state or starting player changed
    // Load current leg counts from match data to preserve progress
    const totalLegsPlayed = (match.player1.legsWon || 0) + (match.player2.legsWon || 0);
    const nextLegStartingPlayer = calculateNextLegStartingPlayer(totalLegsPlayed, match.startingPlayer || 1);
    
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

    // Check if match is won - use the updated leg counts
    const newPlayer1Legs = pendingLegWinner === 1 ? player1LegsWon + 1 : player1LegsWon;
    const newPlayer2Legs = pendingLegWinner === 2 ? player2LegsWon + 1 : player2LegsWon;
    
    // Use the configured legsToWin from match settings
    const requiredLegsToWin = match.legsToWin || 3;
    
    if (newPlayer1Legs >= requiredLegsToWin || newPlayer2Legs >= requiredLegsToWin) {
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
    // This ensures proper alternating of starting players
    const nextLegStartingPlayer = legStartingPlayer === 1 ? 2 : 1;
    setLegStartingPlayer(nextLegStartingPlayer);
    setCurrentPlayer(nextLegStartingPlayer);
    
    setPlayer1Throws([]);
    setPlayer2Throws([]);
    setThrowInput('');
    
    // Clear localStorage after leg completion to prevent loading old state
    localStorage.removeItem(`match_game_${match._id}`);
    
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
    
    setShowLegConfirmation(false);
    setPendingLegWinner(null);
  };

  const cancelMatchEnd = () => {
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
    
    setShowMatchConfirmation(false);
    setPendingMatchWinner(null);
  };

  // Calculate averages
  const player1Average = player1Stats.totalThrows > 0 ? Math.round(player1Stats.totalScore / player1Stats.totalThrows) : 0;
  const player2Average = player2Stats.totalThrows > 0 ? Math.round(player2Stats.totalScore / player2Stats.totalThrows) : 0;

  return (
    <div className="flex flex-col h-screen bg-base-100">
      {/* Header - Mobile only */}
      <div className="md:hidden flex justify-between items-center p-2">
        <button className="btn btn-sm btn-accent" onClick={onBack}>
          ← Vissza
        </button>
        <div className="text-sm font-bold text-center flex-1">
          {match.player1.playerId.name} vs {match.player2.playerId.name} | {match.legsToWin}
        </div>
        <div className="w-16"></div>
      </div>

      {/* Main Layout - Side by side on tablet */}
      <div className="flex flex-col md:flex-row h-full">
        {/* Left Side - Score Input (Tablet) / Full width (Mobile) */}
        <div className={`md:w-1/2 flex flex-col p-2 ${!scoreInputOnLeft ? 'md:order-2' : ''}`}>
          {/* Header - Tablet only */}
          <div className="hidden md:flex justify-between items-center mb-4">
            <button className="btn btn-sm btn-accent" onClick={onBack}>
              ← Vissza
            </button>
            <div className="text-lg font-bold text-center flex-1">
              {match.player1.playerId.name} vs {match.player2.playerId.name}
            </div>
            <div className="w-16"></div>
          </div>

          {/* Player Cards - Mobile only, side by side at top */}
          <div className="md:hidden flex gap-2 mb-2 h-[10rem]">
            {/* Player 1 Card - Mobile */}
            <div className={`flex-1 bg-base-200 rounded-lg p-3 ${currentPlayer === 1 ? 'ring-2 ring-primary' : ''}`}>
              <div className="text-center">
                <div className="text-lg font-bold mb-1">
                  {match.player1.playerId.name}
                </div>
                <div className="text-5xl font-bold">
                  {player1Score}
                </div>
                <div className="text-xs opacity-75">

                  <p className="text-md">Átlag: {player1Average}</p>
                  <p className="text-md font-bold">Legek: {player1LegsWon}</p>
                </div>
              </div>
            </div>

            {/* Player 2 Card - Mobile */}
            <div className={`flex-1 bg-base-200 rounded-lg p-3 ${currentPlayer === 2 ? 'ring-2 ring-primary' : ''}`}>
              <div className="text-center">
                <div className="text-lg font-bold mb-1">
                  {match.player2.playerId.name}
                </div>
                <div className="text-5xl font-bold">
                  {player2Score}
                </div>
                <div className="text-xs opacity-75">
                <p className="text-md">Átlag: {player2Average}</p>
                <p className="text-md font-bold">Legek: {player2LegsWon}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Current Player Indicator */}
          <div className="bg-base-300 rounded-lg p-4 mb-4">
            <div className="text-center flex h-6">
              <div className="text-4xl font-bold">{throwInput || '0'}</div>
            </div>
          </div>

          {/* Number Input - More compact on tablet */}
          <div className="md:max-w-md md:mx-auto bg-base-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  className="btn btn-lg h-16 text-2xl"
                  onClick={() => handleNumberInput(num)}
                >
                  {num}
                </button>
              ))}
              <button
                className="btn btn-warning h-16 text-2xl"
                onClick={handleBackspace}
                disabled={!throwInput}
              >
                ⌫
              </button>
              <button
                className="btn btn-outline h-16 text-2xl"
                onClick={() => handleNumberInput(0)}
              >
                0
              </button>
              <button
                className="btn btn-error h-16 text-2xl"
                onClick={handleClear}
                disabled={!throwInput}
              >
                C
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                className="btn btn-warning flex-1 h-16 text-lg"
                onClick={handleUndo}
                disabled={player1Throws.length === 0 && player2Throws.length === 0}
              >
                Visszavonás
              </button>
              <button
                className="btn btn-success flex-1 h-16 text-lg"
                onClick={handleThrow}
                disabled={!throwInput || parseInt(throwInput) < 0 || parseInt(throwInput) > 180}
              >
                Dobás
              </button>
            </div>
          </div>

          {/* Scorer Info */}
          <div className="text-center text-sm opacity-75 mb-4">
            Író: {match.scorer.name}
          </div>

          {/* Throw History Button - Moved to bottom */}
          <div className="mt-auto">
            <button
              className="btn btn-outline w-full"
              onClick={() => setShowThrowHistory(!showThrowHistory)}
            >
              {showThrowHistory ? 'Elrejtés' : 'Dobások megjelenítése'}
            </button>
          </div>
        </div>

        {/* Right Side - Player Cards (Tablet) / Hidden on Mobile */}
        <div className={`hidden md:flex md:w-1/2 flex-col p-2 ${!scoreInputOnLeft ? 'md:order-1' : ''}`}>
          {/* Swap Button - Tablet only */}
          <div className="flex justify-center mb-4">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setScoreInputOnLeft(!scoreInputOnLeft)}
            >
              Oldalak cseréje
            </button>
          </div>

          {/* Player 1 Card */}
          <div className={`flex-1 bg-base-200 rounded-lg p-6 mb-4 ${currentPlayer === 1 ? 'ring-4 ring-primary' : ''}`}>
            <div className="text-center h-full flex flex-col justify-center">
              {/* Player Name with Leg Count */}
              <div className="mb-4">
                <div className="text-2xl md:text-3xl font-bold mb-2">
                  {match.player1.playerId.name}
                </div>
                <div className="text-lg md:text-xl font-bold text-primary">
                  {player1LegsWon} nyert leg
                </div>
              </div>
              
              {/* Score */}
              <div className="mb-4">
                <div className="text-6xl md:text-8xl font-bold text-center">
                  {player1Score}
                </div>
              </div>
              
              {/* Stats */}
              <div className="text-sm md:text-base opacity-75">
                <div>Átlag: {player1Average}</div>
                <div>180: {player1Stats.oneEightiesCount}</div>
              </div>
            </div>
          </div>

          {/* Player 2 Card */}
          <div className={`flex-1 bg-base-200 rounded-lg p-6 ${currentPlayer === 2 ? 'ring-4 ring-primary' : ''}`}>
            <div className="text-center h-full flex flex-col justify-center">
              {/* Player Name with Leg Count */}
              <div className="mb-4">
                <div className="text-2xl md:text-3xl font-bold mb-2">
                  {match.player2.playerId.name}
                </div>
                <div className="text-lg md:text-xl font-bold text-primary">
                  {player2LegsWon} nyert leg
                </div>
              </div>
              
              {/* Score */}
              <div className="mb-4">
                <div className="text-6xl md:text-8xl font-bold text-center">
                  {player2Score}
                </div>
              </div>
              
              {/* Stats */}
              <div className="text-sm md:text-base opacity-75">
                <div>Átlag: {player2Average}</div>
                <div>180: {player2Stats.oneEightiesCount}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Throw History - Mobile only, appears when toggled */}
      {showThrowHistory && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-200 rounded-lg p-4 max-w-sm w-full max-h-96 overflow-y-auto">
            <div className="text-lg font-bold mb-4">Dobások</div>
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
              className="btn btn-primary w-full mt-4"
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
            <p className="mb-4 text-sm">
              {pendingLegWinner === 1 ? match.player1.playerId.name : match.player2.playerId.name} nyerte ezt a leg-et!
            </p>
            <div className="flex gap-2">
              <button className="btn btn-error flex-1" onClick={cancelLegEnd}>
                Visszavonás
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-200 p-4 rounded-lg max-w-sm w-full">
            <h3 className="text-lg font-bold mb-3">Meccs vége?</h3>
            <p className="mb-4 text-sm">
              {pendingMatchWinner === 1 ? match.player1.playerId.name : match.player2.playerId.name} nyerte a meccset!
            </p>
            <div className="flex gap-2">
              <button className="btn btn-error flex-1" onClick={cancelMatchEnd}>
                Visszavonás
              </button>
              <button className="btn btn-success flex-1" onClick={confirmMatchEnd}>
                Igen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchGame; 