"use client"
import React, { useState, useEffect, use } from "react";
import axios from "axios";
import MatchGame from "@/components/board/MatchGame";
import Link from "next/link";
import '../board.css'
import { useUserContext } from "@/hooks/useUser";

// --- Types ---
interface Player {
  playerId: {
    _id: string;
    name: string;
  };
  highestCheckout?: number;
  oneEightiesCount?: number;
  legsWon?: number;
  legsLost?: number;
  average?: number;
}

interface Scorer {
  playerId: string;
  name: string;
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
}

interface UserRole {
  clubRole: 'admin' | 'moderator' | 'member';
  tournamentRole?: 'player' | 'moderator' | 'admin';
}

// LocalStorage keys
const getTournamentPasswordKey = (tournamentId: string) => `tournament_password_${tournamentId}`;
const getSelectedBoardKey = (tournamentId: string) => `selected_board_${tournamentId}`;

interface BoardPageProps {
  params: Promise<{ tournamentId: string }>;
}

const BoardPage: React.FC<BoardPageProps> = (props) => {
  const { tournamentId } = use(props.params);
  const { user } = useUserContext();
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [tournamentData, setTournamentData] = useState<any>(null); // Add tournament data state
  
  // Match setup state
  const [showMatchSetup, setShowMatchSetup] = useState<boolean>(false);
  const [legsToWin, setLegsToWin] = useState<number>(3);
  const [startingPlayer, setStartingPlayer] = useState<1 | 2>(1);
  const [setupLoading, setSetupLoading] = useState<boolean>(false);

  // Admin modal state
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [adminMatch, setAdminMatch] = useState<Match | null>(null);
  const [player1Legs, setPlayer1Legs] = useState<number>(0);
  const [player2Legs, setPlayer2Legs] = useState<number>(0);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);

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

  // Load matches when board is selected
  useEffect(() => {
    if (selectedBoard) {
      loadMatches();
    }
  }, [selectedBoard, tournamentId]);

  // Load user role when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadUserRole();
    }
  }, [isAuthenticated, tournamentId]);

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
        
        // Load tournament data to get clubId
        try {
          const tournamentResponse = await axios.get(`/api/tournaments/${tournamentId}`);
          setTournamentData(tournamentResponse.data);
        } catch (err) {
          console.error('Failed to load tournament data:', err);
        }
        
        await loadBoards();
      } else {
        setError("Hibás jelszó!");
      }
    } catch (err) {
      setError("Hiba történt a bejelentkezés során!");
      console.error('Password submit error:', err);
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
      console.error('Load boards error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    if (!selectedBoard) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/boards/${tournamentId}/${selectedBoard.boardNumber}/matches`);
      setMatches(response.data.matches);
    } catch (err) {
      setError("Nem sikerült betölteni a meccseket!");
      console.error('Load matches error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRole = async () => {
    try {
      
      const response = await axios.get(`/api/tournaments/${tournamentId}/getUserRole`, {
        headers: {
          'x-user-id': user?._id || ''
        }
      });
      setUserRole(response.data);
    } catch (err) {
      console.error('Failed to load user role:', err);
    }
  };

  const handleMatchSelect = (match: Match) => {
    if (match.status === 'pending') {
      setSelectedMatch(match);
      setShowMatchSetup(true);
    } else if (match.status === 'ongoing') {
      setSelectedMatch(match);
    }
  };

  const handleAdminMatchFinish = async () => {
    if (!adminMatch) return;
    
    // Ensure no tie
    if (player1Legs === player2Legs) {
      setError("Nem lehet döntetlen! Egyik játékosnak több leg-et kell nyernie.");
      return;
    }
    
    setAdminLoading(true);
    setError("");
    
    try {
      await axios.post(`/api/matches/${adminMatch._id}/finish`, {
        player1LegsWon: player1Legs,
        player2LegsWon: player2Legs,
        player1Stats: {
          highestCheckout: adminMatch.player1.highestCheckout || 0,
          oneEightiesCount: adminMatch.player1.oneEightiesCount || 0,
          totalThrows: 0,
          totalScore: 0
        },
        player2Stats: {
          highestCheckout: adminMatch.player2.highestCheckout || 0,
          oneEightiesCount: adminMatch.player2.oneEightiesCount || 0,
          totalThrows: 0,
          totalScore: 0
        }
      });
      
      setShowAdminModal(false);
      setAdminMatch(null);
      await loadMatches(); // Reload matches to see updated status
    } catch (err) {
      setError("Hiba történt a meccs befejezése során!");
      console.error('Finish match error:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleStartMatch = async () => {
    if (!selectedMatch || !selectedBoard) return;
    
    setSetupLoading(true);
    try {
      // Start the match
      const response = await axios.post(`/api/boards/${tournamentId}/${selectedBoard.boardNumber}/start`, {
        matchId: selectedMatch._id,
        legsToWin,
        startingPlayer
      });
      
      if (response.data.success) {
        setShowMatchSetup(false);
        // Update selectedMatch with fresh data from the API response
        if (response.data.match) {
          setSelectedMatch(response.data.match);
        } else {
          // Fallback: reload matches to get updated status
          await loadMatches();
        }
        
        // Notify other clients that a match has started
        try {
          const { notifyMatchStarted } = await import('@/lib/socketApi');
          await notifyMatchStarted(selectedMatch._id, tournamentId, {
            matchId: selectedMatch._id,
            player1: selectedMatch.player1,
            player2: selectedMatch.player2,
            boardNumber: selectedBoard.boardNumber,
            legsToWin,
            startingPlayer
          });
        } catch (socketError) {
          console.warn('Failed to notify match start via socket:', socketError);
          // Don't fail the match start if socket notification fails
        }
      }
    } catch (err) {
      setError("Nem sikerült elindítani a meccset!");
      console.error('Start match error:', err);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleBoardSelect = (board: Board) => {
    setSelectedBoard(board);
    setSelectedMatch(null);
    setShowMatchSetup(false);
    localStorage.setItem(getSelectedBoardKey(tournamentId), board.boardNumber.toString());
  };

  const handleBackToBoards = () => {
    setSelectedBoard(null);
    setSelectedMatch(null);
    setShowMatchSetup(false);
    setMatches([]);
    localStorage.removeItem(getSelectedBoardKey(tournamentId));
  };

  const handleBackToMatches = () => {
    setSelectedMatch(null);
    setShowMatchSetup(false);
  };

  const isAdminOrModerator = userRole?.clubRole === 'admin' || userRole?.clubRole === 'moderator';

  // Password authentication screen
  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="bg-base-100 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-2">Torna Jelszó</h1>
              <p className="text-base-content/70">Add meg a torna jelszavát a folytatáshoz</p>
              <Link href={`/tournaments/${tournamentId}`} className="btn btn-primary btn-sm">Vissza a főmenübe</Link>
            </div>
            
            {error && (
              <div className="alert alert-error mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="form-control">
                <input
                  type="password"
                  placeholder="Torna jelszó"
                  className="input input-bordered input-lg w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                />
              </div>
              
              <button
                className="btn btn-primary btn-lg w-full"
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
      </div>
    );
  }

  // Board selection screen
  if (!selectedBoard) {
    return (
      <div className="h-screen bg-gradient-to-br from-base-200 to-base-300 p-4 overflow-y-auto">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          <div className="text-center mb-4 flex-shrink-0">
            <h1 className="text-4xl font-bold text-primary mb-2">Válassz Táblát</h1>
            <p className="text-lg text-base-content/70">Válaszd ki a táblát, amin játszani szeretnél</p>
            <Link href={`/tournaments/${tournamentId}`} className="btn btn-primary btn-sm">Vissza a főmenübe</Link>
          </div>
          
          {error && (
            <div className="alert alert-error mb-4 max-w-2xl mx-auto flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center flex-1">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row jsutify-center md:justify-around p-3  gap-4 overflow-y-scroll">
              {boards.map((board) => (
                <button
                  key={board.boardNumber}
                  className={`card bg-base-100  shadow-xl hover:shadow-2xl transition-all duration-300 ${
                    board.status === 'playing' ? 'ring-2 ring-primary' : 
                    board.status === 'waiting' ? 'ring-2 ring-warning' : ''
                  }`}
                  onClick={() => handleBoardSelect(board)}
                >
                  <div className="card-body text-center p-4">
                    <h2 className="card-title text-xl font-bold justify-center mb-2">
                      {board.name ? `${board.boardNumber} - ${board.name}` : `Tábla ${board.boardNumber}`}
                    </h2>
                    <div className="flex justify-between gap-3 items-center">
                        <div className={`badge badge-lg ${
                          board.status === 'playing' ? 'badge-primary' :
                          board.status === 'waiting' ? 'badge-warning' : 'badge-ghost'
                        }`}>
                          {board.status === 'playing' ? 'Játékban' :
                           board.status === 'waiting' ? 'Várakozik' : 'Szabad'}
                        </div>
                        <button className="btn btn-primary btn-sm">Kiválaszt</button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Match selection screen
  if (!selectedMatch) {
    return (
      <div className="h-screen bg-gradient-to-br from-base-200 to-base-300 p-4 overflow-y-auto">
        <div className="max-w-6xl mx-auto h-full flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 flex-shrink-0">
            <button className="btn btn-accent btn-sm mb-2 sm:mb-0" onClick={handleBackToBoards}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Vissza a táblákhoz
            </button>
            <h1 className="text-2xl font-bold text-primary">
              {selectedBoard.name ? `${selectedBoard.name}` : `Tábla ${selectedBoard.boardNumber}`}
            </h1>
          </div>
          
          {error && (
            <div className="alert alert-error mb-4 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center flex-1">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map((match) => (
                  <button
                    key={match._id}
                    className={`card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 ${
                      match.status === 'playing' ? 'ring-2 ring-primary' : 
                      match.status === 'pending' ? 'ring-2 ring-warning' : ''
                    }`}
                    onClick={() => handleMatchSelect(match)}
                  >
                    <div className="card-body text-center p-4">
                      <h3 className="card-title text-lg font-bold justify-center mb-2">
                        {match.player1.playerId.name} vs {match.player2.playerId.name}
                      </h3>
                      <h4 className="card-title text-lg font-bold justify-center mb-2">
                        iró: {match.scorer.name}
                      </h4>
                      <div className="text-sm opacity-75 mb-2">
                        Kezdő pontszám: {match.type === '501' ? '501' : match.type} • {match.legsToWin || 3} nyert leg
                      </div>
                      <div className={`badge badge-lg ${
                        match.status === 'ongoing' ? 'badge-primary' : 
                        match.status === 'pending' ? 'badge-warning' : 'badge-ghost'
                      }`}>
                        {match.status === 'ongoing' ? 'Játékban' :
                         match.status === 'pending' ? 'Várakozik' : 'Befejezett'}
                      </div>
                      <button className="btn btn-primary btn-sm">Kiválaszt</button>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Start New Match Button */}
              {isAdminOrModerator && (
                <div className="mt-6 text-center">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => setShowMatchSetup(true)}
                  >
                    Új meccs indítása
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Match setup screen
  if (showMatchSetup && selectedMatch) {
    return (
      <div className="h-screen bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <button className="btn btn-accent btn-sm" onClick={handleBackToMatches}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Vissza
              </button>
              <h2 className="text-lg font-bold text-primary">
                Tábla {selectedBoard?.boardNumber}
              </h2>
            </div>
            
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold mb-2">
                {selectedMatch.player1.playerId.name} vs {selectedMatch.player2.playerId.name}
              </h3>
              <p className="text-base-content/70 text-sm">Író: {selectedMatch.scorer.name}</p>
            </div>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Hány nyert legig?</span>
                </label>
                <select 
                  className="select select-bordered select-lg w-full"
                  value={legsToWin}
                  onChange={(e) => setLegsToWin(parseInt(e.target.value))}
                >
                  <option value={1}>1 leg</option>
                  <option value={2}>2 leg</option>
                  <option value={3}>3 leg</option>
                  <option value={4}>4 leg</option>
                  <option value={5}>5 leg</option>
                  <option value={6}>6 leg</option>
                  <option value={7}>7 leg</option>
                  <option value={8}>8 leg</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Ki kezdi?</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={`btn btn-lg ${startingPlayer === 1 ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setStartingPlayer(1)}
                  >
                    {selectedMatch.player1.playerId.name}
                  </button>
                  <button
                    className={`btn btn-lg ${startingPlayer === 2 ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setStartingPlayer(2)}
                  >
                    {selectedMatch.player2.playerId.name}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  className="btn btn-error flex-1"
                  onClick={handleBackToMatches}
                >
                  Mégse
                </button>
                <button
                  className="btn btn-success flex-1"
                  onClick={handleStartMatch}
                  disabled={setupLoading}
                >
                  {setupLoading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Indítás...
                    </>
                  ) : (
                    "Meccs indítása"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Modal
  if (showAdminModal && adminMatch) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-base-100 rounded-2xl p-8 shadow-2xl max-w-md w-full">
          <h3 className="text-2xl font-bold text-center mb-6">Admin - Meccs Beállítás</h3>
          
          <div className="text-center mb-6">
            <h4 className="text-lg font-bold mb-2">
              {adminMatch.player1.playerId.name} vs {adminMatch.player2.playerId.name}
            </h4>
            <p className="text-base-content/70">Állítsd be a nyert legek számát</p>
          </div>
          
          {error && (
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          <div className="space-y-4 mb-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">{adminMatch.player1.playerId.name} nyert legek:</span>
              </label>
              <input
                type="number"
                min="0"
                max="10"
                className="input input-bordered input-lg w-full"
                value={player1Legs}
                onChange={(e) => setPlayer1Legs(parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold">{adminMatch.player2.playerId.name} nyert legek:</span>
              </label>
              <input
                type="number"
                min="0"
                max="10"
                className="input input-bordered input-lg w-full"
                value={player2Legs}
                onChange={(e) => setPlayer2Legs(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              className="btn btn-error flex-1"
              onClick={() => {
                setShowAdminModal(false);
                setAdminMatch(null);
                setError("");
              }}
            >
              Mégse
            </button>
            <button
              className="btn btn-success flex-1"
              onClick={handleAdminMatchFinish}
              disabled={adminLoading || player1Legs === player2Legs}
            >
              {adminLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Mentés...
                </>
              ) : (
                "Meccs befejezése"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game interface
  if (selectedMatch) {
    return (
      <MatchGame 
        match={selectedMatch} 
        onBack={handleBackToMatches}
        clubId={tournamentData?.clubId?._id || tournamentData?.clubId}
      />
    );
  }

  return null;
};

export default BoardPage;
