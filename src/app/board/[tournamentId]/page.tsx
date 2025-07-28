"use client"
import React, { useState, useEffect } from "react";
import axios from "axios";

// --- Types ---
interface Player {
  playerId: {
    _id: string;
    name: string;
  };
  name: string;
  legsWon?: number;
  legsLost?: number;
  average?: number;
}

interface Scorer {
  playerId: string;
  name: string;
}

interface Throw {
  score: number;
}

interface LegState {
  player1Score: number;
  player2Score: number;
  player1Throws: Throw[];
  player2Throws: Throw[];
}

interface Board {
  boardNumber: number;
  name?: string;
  status: string;
  currentMatch?: string;
  nextMatch?: string;
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
  legs: Array<{
    player1Score: number;
    player2Score: number;
    player1Throws: Throw[];
    player2Throws: Throw[];
    createdAt: Date;
  }>;
}

const CHECKOUT_TIP = ["T20 D20", "T19 D12", "T18 D18", "T17 D20", "T16 D16"] as const;
type CheckoutTip = typeof CHECKOUT_TIP[number];

// LocalStorage keys
const getTournamentPasswordKey = (tournamentId: string) => `tournament_password_${tournamentId}`;
const getSelectedBoardKey = (tournamentId: string) => `selected_board_${tournamentId}`;
const getCurrentMatchKey = (tournamentId: string, boardNumber: number) => `current_match_${tournamentId}_${boardNumber}`;
const getLegStateKey = (tournamentId: string, boardNumber: number) => `leg_state_${tournamentId}_${boardNumber}`;
const getMatchSettingsKey = (tournamentId: string, boardNumber: number, matchId: string) => `match_settings_${tournamentId}_${boardNumber}_${matchId}`;

interface BoardPageProps {
  params: { tournamentId: string };
}

const BoardPage: React.FC<BoardPageProps> = ({ params }) => {
  const { tournamentId } = params;
  
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [legState, setLegState] = useState<LegState | null>(null);
  const [throwInput, setThrowInput] = useState<number>(0);
  const [throwing, setThrowing] = useState<1 | 2>(1);
  const [checkout, setCheckout] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  
  // Match setup state
  const [showMatchSetup, setShowMatchSetup] = useState<boolean>(false);
  const [legsToWin, setLegsToWin] = useState<number>(3);
  const [startingPlayer, setStartingPlayer] = useState<1 | 2>(1);
  const [setupLoading, setSetupLoading] = useState<boolean>(false);

  // Check URL parameters for QR code authentication
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPassword = urlParams.get('password');
      const urlBoard = urlParams.get('board');
      
      if (urlPassword) {
        setPassword(urlPassword);
        handlePasswordSubmit(urlPassword);
      }
      
      if (urlBoard) {
        const boardNum = parseInt(urlBoard);
        localStorage.setItem(getSelectedBoardKey(tournamentId), boardNum.toString());
      }
    }
  }, [tournamentId]);

  // Check for saved authentication on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPassword = localStorage.getItem(getTournamentPasswordKey(tournamentId));
      if (savedPassword) {
        setPassword(savedPassword);
        handlePasswordSubmit(savedPassword);
      }
    }
  }, [tournamentId]);

  // Check for saved board selection
  useEffect(() => {
    if (isAuthenticated && boards.length > 0) {
      const savedBoardNum = localStorage.getItem(getSelectedBoardKey(tournamentId));
      if (savedBoardNum) {
        const boardNum = parseInt(savedBoardNum);
        const savedBoard = boards.find(b => b.boardNumber === boardNum);
        if (savedBoard) {
          setSelectedBoard(savedBoard);
        }
      }
    }
  }, [isAuthenticated, boards, tournamentId]);

  // Load match when board is selected
  useEffect(() => {
    if (selectedBoard) {
      loadMatch();
    }
  }, [selectedBoard, tournamentId]);

  // Save leg state to localStorage
  useEffect(() => {
    if (selectedBoard && legState) {
      const key = getLegStateKey(tournamentId, selectedBoard.boardNumber);
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(legState));
      }
    }
  }, [selectedBoard, legState, tournamentId]);

  const handlePasswordSubmit = async (pwd?: string) => {
    setLoading(true);
    setError("");
    
    try {
      const pwdToUse = pwd || password;
      const response = await axios.post(`/api/boards/${tournamentId}/validate`, {
        password: pwdToUse
      });
      
      if (response.data.isValid) {
        setIsAuthenticated(true);
        localStorage.setItem(getTournamentPasswordKey(tournamentId), pwdToUse);
        await loadBoards();
      } else {
        setError("Hibás jelszó!");
      }
    } catch (err) {
      setError("Hiba történt a bejelentkezés során!");
    } finally {
      setLoading(false);
    }
  };

  const loadBoards = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/boards/${tournamentId}/getBoards`);
      setBoards(response.data.boards);
    } catch (err) {
      setError("Nem sikerült betölteni a táblákat!");
    } finally {
      setLoading(false);
    }
  };

  const loadMatch = async () => {
    if (!selectedBoard) return;
    
    setLoading(true);
    try {
      // Check for saved match ID
      const savedMatchId = localStorage.getItem(getCurrentMatchKey(tournamentId, selectedBoard.boardNumber));
      
      const url = `/api/boards/${tournamentId}/${selectedBoard.boardNumber}/match`;
      const params = savedMatchId ? { matchId: savedMatchId } : {};
      
      const response = await axios.get(url, { params });
      const matchData = response.data.match;
      
      setMatch(matchData);
      
      // Save match ID for future requests
      localStorage.setItem(getCurrentMatchKey(tournamentId, selectedBoard.boardNumber), matchData._id);
      
      // Check if match is pending and needs setup
      if (matchData.status === 'pending') {
        // Check for saved settings
        const settingsKey = getMatchSettingsKey(tournamentId, selectedBoard.boardNumber, matchData._id);
        const savedSettings = typeof window !== 'undefined' ? localStorage.getItem(settingsKey) : null;
        
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setLegsToWin(settings.legsToWin);
          setStartingPlayer(settings.startingPlayer);
        }
        
        setShowMatchSetup(true);
      } else {
        setShowMatchSetup(false);
        // Load saved leg state or create new one for ongoing matches
        const key = getLegStateKey(tournamentId, selectedBoard.boardNumber);
        const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        
        if (saved) {
          setLegState(JSON.parse(saved) as LegState);
        } else {
          setLegState({
            player1Score: matchData.startingScore || 501,
            player2Score: matchData.startingScore || 501,
            player1Throws: [],
            player2Throws: [],
          });
        }
        
        setThrowing(matchData.startingPlayer || 1);
        setCheckout(Math.floor(Math.random() * CHECKOUT_TIP.length));
      }
    } catch (err) {
      setError("Nem sikerült betölteni a meccset!");
    } finally {
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    if (!match || !selectedBoard) return;
    
    setSetupLoading(true);
    try {
      // Save settings to localStorage
      const settingsKey = getMatchSettingsKey(tournamentId, selectedBoard.boardNumber, match._id);
      const settings = { legsToWin, startingPlayer };
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      
      // Start the match
      const response = await axios.post(`/api/boards/${tournamentId}/${selectedBoard.boardNumber}/start`, {
        matchId: match._id,
        legsToWin,
        startingPlayer
      });
      
      if (response.data.success) {
        setShowMatchSetup(false);
        // Reload match to get updated status
        await loadMatch();
      }
    } catch (err) {
      setError("Nem sikerült elindítani a meccset!");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleThrow = (score: number) => {
    if (!match || !legState) return;
    
    const newLeg: LegState = { ...legState };
    if (throwing === 1) {
      newLeg.player1Throws = [...newLeg.player1Throws, { score }];
      newLeg.player1Score = Math.max(0, newLeg.player1Score - score);
    } else {
      newLeg.player2Throws = [...newLeg.player2Throws, { score }];
      newLeg.player2Score = Math.max(0, newLeg.player2Score - score);
    }
    
    setLegState(newLeg);
    setThrowInput(0);
    setThrowing(throwing === 1 ? 2 : 1);
  };

  const handleEndLeg = () => {
    if (!selectedBoard) return;
    
    // Clear leg state from localStorage
    const key = getLegStateKey(tournamentId, selectedBoard.boardNumber);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
    
    // Reset for next leg
    setLegState({
      player1Score: match?.startingScore || 501,
      player2Score: match?.startingScore || 501,
      player1Throws: [],
      player2Throws: [],
    });
    setThrowing(1);
    setCheckout(Math.floor(Math.random() * CHECKOUT_TIP.length));
  };

  const handleBoardSelect = (board: Board) => {
    setSelectedBoard(board);
    localStorage.setItem(getSelectedBoardKey(tournamentId), board.boardNumber.toString());
  };

  const handleBackToBoards = () => {
    setSelectedBoard(null);
    setMatch(null);
    setLegState(null);
    setShowMatchSetup(false);
    localStorage.removeItem(getSelectedBoardKey(tournamentId));
  };

  // Password authentication screen
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 p-4">
        <div className="w-full max-w-md bg-base-100 rounded-xl p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">Torna jelszó</h1>
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}
          <div className="form-control">
            <input
              type="password"
              placeholder="Írd be a torna jelszavát"
              className="input input-bordered w-full mb-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <button
              className="btn btn-primary w-full"
              onClick={() => handlePasswordSubmit()}
              disabled={loading || !password.trim()}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Bejelentkezés...
                </>
              ) : (
                "Bejelentkezés"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Board selection screen
  if (!selectedBoard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 p-4">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-bold text-center mb-6">Válassz táblát</h1>
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <button
                  key={board.boardNumber}
                  className={`btn btn-lg text-xl p-6 rounded-xl shadow-lg ${
                    board.status === 'playing' ? 'btn-primary' : 
                    board.status === 'waiting' ? 'btn-warning' : 'btn-ghost'
                  }`}
                  onClick={() => handleBoardSelect(board)}
                >
                  <div className="flex flex-col items-center">
                    <span className="font-bold">
                      {board.name ? `${board.boardNumber} - ${board.name}` : board.boardNumber}
                    </span>
                    <span className="text-sm opacity-75">
                      {board.status === 'playing' ? 'Játékban' :
                       board.status === 'waiting' ? 'Várakozik' : 'Szabad'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Match setup screen
  if (showMatchSetup && match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 p-4">
        <div className="w-full max-w-md bg-base-100 rounded-xl p-6 shadow-lg">
          <div className="flex w-full justify-between items-center mb-4">
            <button className="btn btn-sm btn-accent" onClick={handleBackToBoards}>
              Vissza
            </button>
            <div className="text-lg font-bold">
              Tábla: {selectedBoard.name || selectedBoard.boardNumber}
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-center mb-6">Meccs beállítások</h2>
          
          <div className="mb-6">
            <div className="text-lg font-bold mb-2">{match.player1.playerId.name} vs {match.player2.playerId.name}</div>
            <div className="text-sm opacity-75 mb-4">Író: {match.scorer.name}</div>
          </div>
          
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-bold">Hány nyert legig?</span>
            </label>
            <select 
              className="select select-bordered w-full"
              value={legsToWin}
              onChange={(e) => setLegsToWin(parseInt(e.target.value))}
            >
              <option value={1}>1 leg</option>
              <option value={2}>2 leg</option>
              <option value={3}>3 leg</option>
              <option value={4}>4 leg</option>
              <option value={5}>5 leg</option>
            </select>
          </div>
          
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text font-bold">Ki kezdi?</span>
            </label>
            <div className="flex gap-2">
              <button
                className={`btn flex-1 ${startingPlayer === 1 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStartingPlayer(1)}
              >
                {match.player1.playerId.name}
              </button>
              <button
                className={`btn flex-1 ${startingPlayer === 2 ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStartingPlayer(2)}
              >
                {match.player2.playerId.name}
              </button>
            </div>
          </div>
          
          <button
            className="btn btn-success w-full btn-lg"
            onClick={handleStartMatch}
            disabled={setupLoading}
          >
            {setupLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Meccs indítása...
              </>
            ) : (
              "Meccs indítása"
            )}
          </button>
        </div>
      </div>
    );
  }

  // Match view (no scroll, mobile/tablet optimized)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-100 p-2">
      <div className="w-full max-w-md flex flex-col items-center gap-2">
        <div className="flex w-full justify-between items-center mb-2">
          <button className="btn btn-sm btn-accent" onClick={handleBackToBoards}>
            Vissza
          </button>
          <div className="text-lg font-bold">
            Tábla: {selectedBoard.name || selectedBoard.boardNumber}
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : match && legState ? (
          <>
            <div className="w-full flex flex-col items-center bg-base-200 rounded-xl p-4 mb-2">
              <div className="text-xl font-bold mb-1">
                {match.player1.playerId.name} 
                <span className={throwing === 1 ? "text-primary" : ""}>
                  ({legState.player1Score})
                </span>
              </div>
              <div className="text-xl font-bold mb-1">
                {match.player2.playerId.name} 
                <span className={throwing === 2 ? "text-primary" : ""}>
                  ({legState.player2Score})
                </span>
              </div>
              <div className="text-base-content/60 text-sm mb-1">
                Író: {match.scorer.name}
              </div>
            </div>
            
            <div className="w-full flex flex-col items-center bg-base-300 rounded-xl p-4 mb-2">
              <div className="text-2xl font-bold mb-2">
                Checkout tipp: <span className="text-accent">{CHECKOUT_TIP[checkout]}</span>
              </div>
              <div className="flex gap-2 mb-2 flex-wrap justify-center">
                {[20, 19, 18, 17, 16, 15, 10, 8, 5, 1].map((n) => (
                  <button
                    key={n}
                    className="btn btn-lg btn-primary text-2xl px-4 py-2"
                    onClick={() => setThrowInput(throwInput * 10 + n)}
                  >
                    {n}
                  </button>
                ))}
                <button 
                  className="btn btn-lg btn-error text-2xl px-4 py-2" 
                  onClick={() => setThrowInput(0)}
                >
                  C
                </button>
              </div>
              <div className="text-4xl font-bold mb-2">Dobás: {throwInput}</div>
              <button
                className="btn btn-success btn-lg w-full text-2xl mb-2"
                onClick={() => handleThrow(throwInput)}
                disabled={throwInput <= 0}
              >
                Dobás rögzítése
              </button>
            </div>
            
            <div className="w-full flex flex-col items-center bg-base-200 rounded-xl p-4 mb-2">
              <div className="text-lg font-bold mb-2">Leg dobások</div>
              <div className="flex w-full justify-between">
                <div className="flex-1 text-center">
                  <div className="font-bold">{match.player1.playerId.name}</div>
                  <div className="text-2xl">
                    {legState.player1Throws.map((t, i) => (
                      <span key={i} className="inline-block mx-1">{t.score}</span>
                    ))}
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="font-bold">{match.player2.playerId.name}</div>
                  <div className="text-2xl">
                    {legState.player2Throws.map((t, i) => (
                      <span key={i} className="inline-block mx-1">{t.score}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              className="btn btn-warning btn-lg w-full mt-2" 
              onClick={handleEndLeg}
            >
              Leg vége (Mentés)
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className="loading loading-spinner loading-lg"></div>
            <p className="mt-4">Meccs betöltése...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardPage;
