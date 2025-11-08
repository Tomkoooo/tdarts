import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LegsViewModal from './LegsViewModal';
import { toast } from 'react-hot-toast';

// Error Boundary Component
class KnockoutErrorBoundary extends React.Component<
  { children: React.ReactNode; tournamentCode: string; userClubRole: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Knockout component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mt-6">
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <div className="font-bold">Hiba történt a knockout bracket betöltése során</div>
              <div className="text-sm">{this.state.error?.message || 'Ismeretlen hiba'}</div>
            </div>
          </div>
          
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-error">Sürgősségi Helyreállítás</h2>
              <p className="text-base-content/70 mb-4">
                A knockout bracket hibás adatokat tartalmaz. Az alábbi műveletek segíthetnek a probléma megoldásában:
              </p>
              
              <div className="space-y-3">
                {(this.props.userClubRole === 'admin' || this.props.userClubRole === 'moderator') && (
                  <>
                    <button
                      className="btn btn-error btn-block"
                      onClick={async () => {
                        if (confirm('Biztosan törölni szeretnéd az utolsó kört? Ez visszaállíthatja a működést.')) {
                          try {
                            const response = await axios.post(`/api/tournaments/${this.props.tournamentCode}/deleteLastRound`);
                            if (response.data && response.data.success) {
                              toast.success('Utolsó kör törölve! Frissítsd az oldalt.');
                              this.setState({ hasError: false, error: null });
                              window.location.reload();
                            } else {
                              toast.error('Nem sikerült törölni az utolsó kört.');
                            }
                          } catch (err: any) {
                            toast.error(err.response?.data?.error || 'Nem sikerült törölni az utolsó kört.');
                          }
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Utolsó kör törlése (Sürgősségi)
                    </button>
                    
                    <div className="divider">VAGY</div>
                  </>
                )}
                
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    window.location.reload();
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Oldal újratöltése
                </button>
                
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div className="text-sm">
                    <p className="font-bold">Ha a probléma továbbra is fennáll:</p>
                    <p>Vedd fel a kapcsolatot az adminisztrátorokkal a Hibabejelentés menüpont alatt.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface TournamentKnockoutBracketProps {
  tournamentCode: string;
  userClubRole: 'admin' | 'moderator' | 'member' | 'none';
  tournamentPlayers?: any[];
  knockoutMethod?: 'automatic' | 'manual';
  clubId?: string;
}

interface KnockoutMatch {
  player1: any;
  player2: any;
  matchReference: {
    player1: {
      legsWon: number;
      highestCheckout?: number;
      oneEightiesCount?: number;
    };
    player2: {
      legsWon: number;
      highestCheckout?: number;
      oneEightiesCount?: number;
    };
    winnerId: string;
    _id: string;
    status: string;
    boardReference: number;
    scorer?: { _id: string; name: string }; // Added scorer field
  };
  player1Name?: string;
  player2Name?: string;
  player1LegsWon?: number;
  player2LegsWon?: number;
  winnerId?: string | null;
  status?: 'pending' | 'ongoing' | 'finished';
}

interface KnockoutRound {
  round: number;
  matches: KnockoutMatch[];
}

const TournamentKnockoutBracketContent: React.FC<TournamentKnockoutBracketProps> = ({ 
  tournamentCode, 
  userClubRole, 
  tournamentPlayers = [],
  knockoutMethod,
  clubId
}) => {
  const [knockoutData, setKnockoutData] = useState<KnockoutRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGenerateNextRound, setShowGenerateNextRound] = useState(false);
  const [generatingNextRound, setGeneratingNextRound] = useState(false);
  const [showMatchEditModal, setShowMatchEditModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<KnockoutMatch | null>(null);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [selectedPlayer1, setSelectedPlayer1] = useState<string>('');
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>('');
  const [selectedScorer, setSelectedScorer] = useState<string>('');
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [addingMatch, setAddingMatch] = useState(false);
  const [editForm, setEditForm] = useState({
    player1LegsWon: 0,
    player2LegsWon: 0,
    player1Stats: { highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 },
    player2Stats: { highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 }
  });
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [availableBoards, setAvailableBoards] = useState<any[]>([]);
  const [currentKnockoutMethod, setCurrentKnockoutMethod] = useState<'automatic' | 'manual' | undefined>(knockoutMethod);
  const [showGenerateEmptyRoundsModal, setShowGenerateEmptyRoundsModal] = useState(false);
  const [roundsToGenerate, setRoundsToGenerate] = useState(2);
  const [generatingEmptyRounds, setGeneratingEmptyRounds] = useState(false);
  const [showRandomPairingModal, setShowRandomPairingModal] = useState(false);
  const [selectedPlayersForPairing, setSelectedPlayersForPairing] = useState<string[]>([]);
  const [generatingPairings, setGeneratingPairings] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [player1SearchTerm, setPlayer1SearchTerm] = useState('');
  const [player2SearchTerm, setPlayer2SearchTerm] = useState('');
  const [scorerSearchTerm, setScorerSearchTerm] = useState('');
  const [showPlayer1Dropdown, setShowPlayer1Dropdown] = useState(false);
  const [showPlayer2Dropdown, setShowPlayer2Dropdown] = useState(false);
  const [showScorerDropdown, setShowScorerDropdown] = useState(false);
  const [showMatchPlayerEditModal, setShowMatchPlayerEditModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<KnockoutMatch | null>(null);
  const [updatingMatchPlayer, setUpdatingMatchPlayer] = useState(false);
  const [editPairPlayer1, setEditPairPlayer1] = useState<string>('');
  const [editPairPlayer2, setEditPairPlayer2] = useState<string>('');
  const [editPairScorer, setEditPairScorer] = useState<string>('');
  const [editPairBoard, setEditPairBoard] = useState<string>('');
  const [editPairPlayer1Search, setEditPairPlayer1Search] = useState<string>('');
  const [editPairPlayer2Search, setEditPairPlayer2Search] = useState<string>('');
  const [editPairScorerSearch, setEditPairScorerSearch] = useState<string>('');
  const [showEditPairPlayer1Dropdown, setShowEditPairPlayer1Dropdown] = useState(false);
  const [showEditPairPlayer2Dropdown, setShowEditPairPlayer2Dropdown] = useState(false);
  const [showEditPairScorerDropdown, setShowEditPairScorerDropdown] = useState(false);
  const [showLegsModal, setShowLegsModal] = useState(false);
  const [selectedMatchForLegs, setSelectedMatchForLegs] = useState<KnockoutMatch | null>(null);
  const [showMatchSettingsModal, setShowMatchSettingsModal] = useState(false);
  const [editingMatchSettings, setEditingMatchSettings] = useState<KnockoutMatch | null>(null);
  const [editSettingsLoading, setEditSettingsLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showDeleteMatchModal, setShowDeleteMatchModal] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<{ match: KnockoutMatch; round: number; index: number } | null>(null);
  const [deletingMatch, setDeletingMatch] = useState(false);
  const [showDeleteLastRoundModal, setShowDeleteLastRoundModal] = useState(false);
  const [deletingLastRound, setDeletingLastRound] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchKnockoutData();
    fetchAvailableBoards();
  }, [tournamentCode]);

  // Debug logging for tournamentPlayers
  useEffect(() => {
    if (tournamentPlayers && tournamentPlayers.length > 0) {
      setAvailablePlayers(tournamentPlayers);
    } else {
      // Fallback: fetch players directly
      fetchTournamentPlayers();
    }
  }, [tournamentPlayers]);

  // Fetch knockoutMethod if not provided
  useEffect(() => {
    if (!knockoutMethod) {
      fetchKnockoutMethod();
    } else {
      setCurrentKnockoutMethod(knockoutMethod);
    }
  }, [knockoutMethod]);

  const fetchKnockoutMethod = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentCode}/knockoutMethod`);
      if (response.data && response.data.success) {
        setCurrentKnockoutMethod(response.data.knockoutMethod);
      }
    } catch (err) {
      console.error('Failed to fetch knockout method:', err);
      setCurrentKnockoutMethod('automatic'); // Default fallback
    }
  };

  const fetchTournamentPlayers = async () => {
    try {
      const response = await axios.get(`/api/tournaments/${tournamentCode}`);
      if (response.data && response.data.tournamentPlayers) {
        setAvailablePlayers(response.data.tournamentPlayers);
      }
    } catch (err) {
      console.error('Failed to fetch tournament players:', err);
    }
  };

  const fetchAvailableBoards = async () => {
    try {
      console.log('🔍 Fetching boards for tournament:', tournamentCode);
      const response = await axios.get(`/api/tournaments/${tournamentCode}/board-context`);
      console.log('📊 Board context API response:', response.data);
      if (response.data && response.data.availableBoards) {
        setAvailableBoards(response.data.availableBoards);
        console.log('✅ Available boards set:', response.data.availableBoards);
      } else {
        console.warn('⚠️ No available boards in response');
      }
    } catch (err) {
      console.error('❌ Failed to fetch available boards:', err);
    }
  };

  const fetchKnockoutData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/tournaments/${tournamentCode}/knockout`);
      if (response.data && response.data.success) {
        // Validate knockout data structure
        const knockoutRounds = response.data.knockout || [];
        
        // Check for data integrity
        for (const round of knockoutRounds) {
          if (!round.matches) {
            console.warn(`Round ${round.round} has no matches array`);
            round.matches = [];
          }
          
          // Validate each match
          for (const match of round.matches) {
            if (match.player1 && typeof match.player1 === 'object' && !match.player1._id) {
              console.warn('Invalid player1 data in match:', match);
            }
            if (match.player2 && typeof match.player2 === 'object' && !match.player2._id) {
              console.warn('Invalid player2 data in match:', match);
            }
          }
        }
        
        setKnockoutData(knockoutRounds);
      } else {
        setError(response.data?.error || 'Nem sikerült betölteni a knockout adatokat.');
      }
    } catch (err: any) {
      console.error('Error fetching knockout data:', err);
      setError(err.response?.data?.error || 'Nem sikerült betölteni a knockout adatokat.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNextRound = async () => {
    if (knockoutData.length === 0) return;
    
    // Get the last round that actually has matches
    const roundsWithMatches = knockoutData.filter((round) => round.matches && round.matches.length > 0);
    if (roundsWithMatches.length === 0) return;
    
    const currentRound = roundsWithMatches[roundsWithMatches.length - 1].round;
    setGeneratingNextRound(true);
    setError('');
    
    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/generateNextRound`, {
        currentRound
      });
      if (response.data && response.data.success) {
        await fetchKnockoutData();
        setShowGenerateNextRound(false);
      } else {
        setError(response.data?.error || 'Nem sikerült generálni a következő kört.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült generálni a következő kört.');
    } finally {
      setGeneratingNextRound(false);
    }
  };

  const handleMatchEdit = (match: KnockoutMatch) => {
    // Don't allow editing bye matches
    if (!match.matchReference) {
      setError('Bye meccseket nem lehet szerkeszteni - automatikusan befejeződnek.');
      return;
    }
    
    // Check if this is a bye match by looking at the match players
    if (!match.player1 || !match.player2) {
      setError('Bye meccseket nem lehet szerkeszteni - automatikusan befejeződnek.');
      return;
    }
    
    setSelectedMatch(match);
    setEditForm({
      player1LegsWon: match.matchReference?.player1?.legsWon || 0,
      player2LegsWon: match.matchReference?.player2?.legsWon || 0,
      player1Stats: { 
        highestCheckout: match.matchReference?.player1?.highestCheckout || 0, 
        oneEightiesCount: match.matchReference?.player1?.oneEightiesCount || 0, 
        totalThrows: 0, 
        totalScore: 0 
      },
      player2Stats: { 
        highestCheckout: match.matchReference?.player2?.highestCheckout || 0, 
        oneEightiesCount: match.matchReference?.player2?.oneEightiesCount || 0, 
        totalThrows: 0, 
        totalScore: 0 
      }
    });
    setShowMatchEditModal(true);
  };

  const handleSaveMatch = async () => {
    if (!selectedMatch || !selectedMatch.matchReference) {
      setError('Nem lehet menteni a meccset.');
      return;
    }

    try {
      const matchId = typeof selectedMatch.matchReference === 'object' ? selectedMatch.matchReference._id : selectedMatch.matchReference;
      const response = await axios.post(`/api/matches/${matchId}/finish`, editForm);
      if (response.data && response.data.success) {
        await fetchKnockoutData();
        setShowMatchEditModal(false);
        setSelectedMatch(null);
      } else {
        setError(response.data?.error || 'Nem sikerült frissíteni a meccset.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült frissíteni a meccset.');
    }
  };

  const handleAddMatch = async () => {
    // Allow creating matches without players (empty pairs)
    if (selectedPlayer1 && selectedPlayer2 && selectedPlayer1 === selectedPlayer2) {
      setError('Kérjük válassz ki két különböző játékost.');
      return;
    }

    // Board is only required if at least one player is selected
    if ((selectedPlayer1 || selectedPlayer2) && !selectedBoard) {
      setError('Kérjük válassz ki egy táblát ha játékosokat adsz hozzá.');
      return;
    }

    setAddingMatch(true);
    setError('');
    
    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/addManualMatch`, {
        round: selectedRound,
        player1Id: selectedPlayer1 || undefined,
        player2Id: selectedPlayer2 || undefined,
        scorerId: selectedScorer || undefined,
        boardNumber: selectedBoard ? parseInt(selectedBoard) : undefined
      });
      
      if (response.data && response.data.success) {
        await fetchKnockoutData();
        setShowAddMatchModal(false);
        setSelectedPlayer1('');
        setSelectedPlayer2('');
        setSelectedScorer('');
        setSelectedBoard('');
        setPlayer1SearchTerm('');
        setPlayer2SearchTerm('');
        setScorerSearchTerm('');
        setShowPlayer1Dropdown(false);
        setShowPlayer2Dropdown(false);
        setShowScorerDropdown(false);
      } else {
        setError(response.data?.error || 'Nem sikerült hozzáadni a meccset.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült hozzáadni a meccset.');
    } finally {
      setAddingMatch(false);
    }
  };

  const handleGenerateEmptyRounds = async () => {
    setGeneratingEmptyRounds(true);
    setError('');
    
    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/generateEmptyRounds`, {
        roundsCount: roundsToGenerate
      });
      
      if (response.data && response.data.success) {
        await fetchKnockoutData();
        setShowGenerateEmptyRoundsModal(false);
      } else {
        setError(response.data?.error || 'Nem sikerült generálni az üres köröket.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült generálni az üres köröket.');
    } finally {
      setGeneratingEmptyRounds(false);
    }
  };

  const handleGenerateRandomPairings = async () => {
    if (selectedPlayersForPairing.length < 2) {
      setError('Kérjük válassz ki legalább 2 játékost.');
      return;
    }

    setGeneratingPairings(true);
    setError('');
    
    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/generateRandomPairings`, {
        round: selectedRound,
        selectedPlayerIds: selectedPlayersForPairing
      });
      
      if (response.data && response.data.success) {
        await fetchKnockoutData();
        setShowRandomPairingModal(false);
        setSelectedPlayersForPairing([]);
      } else {
        setError(response.data?.error || 'Nem sikerült generálni a párosításokat.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült generálni a párosításokat.');
    } finally {
      setGeneratingPairings(false);
    }
  };

  const handleUpdateMatchPlayer = async () => {
    if (!editingMatch) {
      toast.error('Nem lehet frissíteni a meccset.');
      return;
    }

    // Allow clearing players if match already exists (for swapping)
    const isNewMatch = !editingMatch.matchReference;
    
    // For new matches, at least one player must be selected
    if (isNewMatch && !editPairPlayer1 && !editPairPlayer2) {
      toast.error('Kérjük válassz ki legalább egy játékost!');
      return;
    }

    // Validate: board is required for new matches if at least one player is selected
    if (isNewMatch && (editPairPlayer1 || editPairPlayer2) && !editPairBoard) {
      toast.error('Kérjük válassz ki egy táblát!');
      return;
    }

    setUpdatingMatchPlayer(true);
    
    try {
      // If match has no matchReference, we need to update the empty pair
      if (!editingMatch.matchReference) {
        // This is an empty pair - update it to a match
        // Find which round and pair index this match is in
        let matchRound = 1;
        let pairIndex = 0;
        for (const round of knockoutData) {
          const idx = round.matches.findIndex(m => m === editingMatch);
          if (idx !== -1) {
            matchRound = round.round;
            pairIndex = idx;
            break;
          }
        }
        
        const response = await axios.post(`/api/tournaments/${tournamentCode}/updateEmptyPair`, {
          round: matchRound,
          pairIndex: pairIndex,
          player1Id: editPairPlayer1 || undefined,
          player2Id: editPairPlayer2 || undefined,
          scorerId: editPairScorer || undefined,
          boardNumber: editPairBoard ? parseInt(editPairBoard) : undefined
        });
        
        if (response.data && response.data.success) {
          await fetchKnockoutData();
          toast.success('Meccs sikeresen létrehozva!');
          setShowMatchPlayerEditModal(false);
          setEditingMatch(null);
          // Reset form
          setEditPairPlayer1('');
          setEditPairPlayer2('');
          setEditPairScorer('');
          setEditPairBoard('');
          setEditPairPlayer1Search('');
          setEditPairPlayer2Search('');
          setEditPairScorerSearch('');
        } else {
          toast.error(response.data?.error || 'Nem sikerült létrehozni a meccset.');
        }
      } else {
        // Match already exists, update via match settings API
        const matchId = typeof editingMatch.matchReference === 'object' ? editingMatch.matchReference._id : editingMatch.matchReference;
        
        // editPairPlayer1/2 are initialized with current player IDs when modal opens
        // If user clears them, they become empty strings which we send as null
        // If user selects a different player, we send that new ID
        const response = await axios.post(`/api/matches/${matchId}/update-settings`, {
          player1Id: editPairPlayer1 || null,
          player2Id: editPairPlayer2 || null,
          scorerId: editPairScorer || undefined,
          boardNumber: editPairBoard ? parseInt(editPairBoard) : undefined
      });
      
      if (response.data && response.data.success) {
        await fetchKnockoutData();
          toast.success('Meccs sikeresen frissítve!');
        setShowMatchPlayerEditModal(false);
        setEditingMatch(null);
          // Reset form
          setEditPairPlayer1('');
          setEditPairPlayer2('');
          setEditPairScorer('');
          setEditPairBoard('');
          setEditPairPlayer1Search('');
          setEditPairPlayer2Search('');
          setEditPairScorerSearch('');
      } else {
          toast.error(response.data?.error || 'Nem sikerült frissíteni a meccset.');
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült frissíteni a meccset.');
    } finally {
      setUpdatingMatchPlayer(false);
    }
  };

  const handleViewLegs = (match: KnockoutMatch) => {
    // Don't allow viewing legs for bye matches
    if (!match.matchReference) {
      setError('Bye meccsekhez nincsenek legek.');
      return;
    }
    
    setSelectedMatchForLegs(match);
    setShowLegsModal(true);
  };

  const handleDeleteMatch = async () => {
    if (!matchToDelete) return;

    setDeletingMatch(true);
    
    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/deleteMatch`, {
        round: matchToDelete.round,
        pairIndex: matchToDelete.index
      });
      
      if (response.data && response.data.success) {
        await fetchKnockoutData();
        toast.success('Meccs sikeresen törölve!');
        setShowDeleteMatchModal(false);
        setMatchToDelete(null);
      } else {
        toast.error(response.data?.error || 'Nem sikerült törölni a meccset.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült törölni a meccset.');
    } finally {
      setDeletingMatch(false);
    }
  };

  const handleDeleteLastRound = async () => {
    setDeletingLastRound(true);
    
    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/deleteLastRound`);
      
      if (response.data && response.data.success) {
        await fetchKnockoutData();
        toast.success('Utolsó kör sikeresen törölve!');
        setShowDeleteLastRoundModal(false);
      } else {
        toast.error(response.data?.error || 'Nem sikerült törölni az utolsó kört.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Nem sikerült törölni az utolsó kört.');
    } finally {
      setDeletingLastRound(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  const handlePlayerSelectionForPairing = (playerId: string) => {
    setSelectedPlayersForPairing(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const filteredPlayers = availablePlayers.filter((player: any) => {
    const playerName = player.playerReference?.name || player.name || '';
    return playerName.toLowerCase().includes(playerSearchTerm.toLowerCase());
  });

  const getFilteredPlayersForSelection = (searchTerm: string, availablePlayers: any[]) => {
    return availablePlayers.filter((player: any) => {
      const playerName = player.playerReference?.name || player.name || '';
      return playerName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  const getAllTournamentPlayers = () => {
    return availablePlayers; // Return all players for scorer selection
  };

  const handlePlayer1Select = (playerId: string, playerName: string) => {
    setSelectedPlayer1(playerId);
    setPlayer1SearchTerm(playerName);
    setShowPlayer1Dropdown(false);
  };

  const handlePlayer2Select = (playerId: string, playerName: string) => {
    setSelectedPlayer2(playerId);
    setPlayer2SearchTerm(playerName);
    setShowPlayer2Dropdown(false);
  };

  const handleScorerSelect = (playerId: string, playerName: string) => {
    setSelectedScorer(playerId);
    setScorerSearchTerm(playerName);
    setShowScorerDropdown(false);
  };

  const handleEditMatchSettings = (match: KnockoutMatch) => {
    if (!match.matchReference) {
      setError('Bye meccseket nem lehet szerkeszteni.');
      return;
    }
    
    setEditingMatchSettings(match);
    
    // Set current values as defaults
    setSelectedPlayer1(match.player1?._id || '');
    setSelectedPlayer2(match.player2?._id || '');
    setSelectedScorer(match.matchReference.scorer?._id || '');
    setSelectedBoard(match.matchReference.boardReference?.toString() || '');
    
    // Set search terms to current player names
    setPlayer1SearchTerm(match.player1?.name || '');
    setPlayer2SearchTerm(match.player2?.name || '');
    setScorerSearchTerm(match.matchReference.scorer?.name || '');
    
    // Hide dropdowns
    setShowPlayer1Dropdown(false);
    setShowPlayer2Dropdown(false);
    setShowScorerDropdown(false);
    
    setShowMatchSettingsModal(true);
  };

  const handleSaveMatchSettings = async () => {
    if (!editingMatchSettings || !editingMatchSettings.matchReference) return;
    
    setEditSettingsLoading(true);
    setError('');
    
    try {
      const matchId = typeof editingMatchSettings.matchReference === 'object' 
        ? editingMatchSettings.matchReference._id 
        : editingMatchSettings.matchReference;
      
      const response = await axios.post(`/api/matches/${matchId}/update-settings`, {
        player1Id: selectedPlayer1 || null,
        player2Id: selectedPlayer2 || null,
        scorerId: selectedScorer || undefined,
        boardNumber: selectedBoard ? parseInt(selectedBoard) : undefined
      });
      
      if (response.data && response.data.success) {
        await fetchKnockoutData();
        setShowMatchSettingsModal(false);
        setEditingMatchSettings(null);
        // Reset form
        setSelectedPlayer1('');
        setSelectedPlayer2('');
        setSelectedScorer('');
        setSelectedBoard('');
        setPlayer1SearchTerm('');
        setPlayer2SearchTerm('');
        setScorerSearchTerm('');
        setShowPlayer1Dropdown(false);
        setShowPlayer2Dropdown(false);
        setShowScorerDropdown(false);
      } else {
        setError(response.data?.error || 'Nem sikerült frissíteni a meccs beállításait.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült frissíteni a meccs beállításait.');
    } finally {
      setEditSettingsLoading(false);
    }
  };

  const getAvailablePlayersForRound = (roundNumber: number) => {
    const playersInRound = new Set<string>();
    const playersInPreviousRounds = new Set<string>();
    const losersInPreviousRounds = new Set<string>();
    const byePlayersInPreviousRounds = new Set<string>();
    const winnersInPreviousRounds = new Set<string>();
    
    // Get players from the match being edited (so they can be re-selected)
    const editingMatchPlayerIds = new Set<string>();
    if (editingMatch) {
      if (editingMatch.player1) {
        const player1Id = typeof editingMatch.player1 === 'object' && editingMatch.player1._id ? editingMatch.player1._id : editingMatch.player1;
        if (player1Id) editingMatchPlayerIds.add(player1Id.toString());
      }
      if (editingMatch.player2) {
        const player2Id = typeof editingMatch.player2 === 'object' && editingMatch.player2._id ? editingMatch.player2._id : editingMatch.player2;
        if (player2Id) editingMatchPlayerIds.add(player2Id.toString());
      }
    }
    
    // Get all players already in this round (excluding the match being edited)
    const roundData = knockoutData.find(r => r.round === roundNumber);
    if (roundData) {
      roundData.matches.forEach(match => {
        // Skip the match being edited
        const isEditingThisMatch = editingMatch && (
          (match.matchReference?._id && editingMatch.matchReference?._id && match.matchReference._id === editingMatch.matchReference._id) ||
          match === editingMatch
        );
        
        if (isEditingThisMatch) return;
        
        // Handle both populated and unpopulated player references
        if (match.player1) {
          const player1Id = typeof match.player1 === 'object' && match.player1._id ? match.player1._id : match.player1;
          if (player1Id) playersInRound.add(player1Id.toString());
        }
        if (match.player2) {
          const player2Id = typeof match.player2 === 'object' && match.player2._id ? match.player2._id : match.player2;
          if (player2Id) playersInRound.add(player2Id.toString());
        }
      });
    }
    
    // Get all players from previous rounds and identify losers, winners, and bye players
    knockoutData.forEach(round => {
      if (round.round < roundNumber) {
        round.matches.forEach(match => {
          // Add all players from previous rounds
          if (match.player1) {
            const player1Id = typeof match.player1 === 'object' && match.player1._id ? match.player1._id : match.player1;
            if (player1Id) playersInPreviousRounds.add(player1Id.toString());
          }
          if (match.player2) {
            const player2Id = typeof match.player2 === 'object' && match.player2._id ? match.player2._id : match.player2;
            if (player2Id) playersInPreviousRounds.add(player2Id.toString());
          }
          
          // Identify bye players (single player matches) - these automatically advance
          if (!match.player2 && match.player1) {
            const player1Id = typeof match.player1 === 'object' && match.player1._id ? match.player1._id : match.player1;
            if (player1Id) {
              byePlayersInPreviousRounds.add(player1Id.toString());
              winnersInPreviousRounds.add(player1Id.toString()); // Bye players are considered winners
            }
          }
          
          // Identify winners and losers from finished matches (only for non-bye matches)
          if (match.matchReference && match.player2 && match.matchReference.status === 'finished' && match.matchReference.winnerId) {
            const winnerId = match.matchReference.winnerId.toString();
            if (match.player1) {
              const player1Id = typeof match.player1 === 'object' && match.player1._id ? match.player1._id : match.player1;
              if (player1Id) {
                if (player1Id.toString() === winnerId) {
                  winnersInPreviousRounds.add(player1Id.toString());
                } else {
                  losersInPreviousRounds.add(player1Id.toString());
                }
              }
            }
            if (match.player2) {
              const player2Id = typeof match.player2 === 'object' && match.player2._id ? match.player2._id : match.player2;
              if (player2Id) {
                if (player2Id.toString() === winnerId) {
                  winnersInPreviousRounds.add(player2Id.toString());
                } else {
                  losersInPreviousRounds.add(player2Id.toString());
                }
              }
            }
          }
        });
      }
    });
    
    // Return players not in this round, not losers, but include winners and bye players from previous rounds
    return availablePlayers.filter((player: any) => {
      const playerId = player.playerReference?._id || player.playerReference || player._id;
      const playerIdStr = playerId.toString();
      
      // Don't show players already in this round
      if (playersInRound.has(playerIdStr)) {
        return false;
      }
      
      // Don't show losers from previous rounds
      if (losersInPreviousRounds.has(playerIdStr)) {
        return false;
      }
      
      // For manual mode: 
      // - In the first round, don't show players from previous rounds (they shouldn't exist yet)
      // - In later rounds, show winners and bye players from previous rounds
      if (roundNumber === 1) {
        if (playersInPreviousRounds.has(playerIdStr)) {
          return false;
        }
      } else {
        // In later rounds, only show winners and bye players from previous rounds
        if (playersInPreviousRounds.has(playerIdStr)) {
          // Only show if they are winners or bye players
          return winnersInPreviousRounds.has(playerIdStr) || byePlayersInPreviousRounds.has(playerIdStr);
        }
      }
      
      return true;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-warning';
      case 'ongoing': return 'text-info';
      case 'finished': return 'text-success';
      default: return 'text-base-content/70';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Várakozik';
      case 'ongoing': return 'Folyamatban';
      case 'finished': return 'Befejezve';
      default: return 'Ismeretlen';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  if (!knockoutData || knockoutData.length === 0) {
    return (
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Még nincs knockout bracket generálva.</span>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          height: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: hsl(var(--b2));
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: hsl(var(--bc) / 0.3);
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--bc) / 0.5);
        }
        
        /* Zoom/Magnification controls */
        .bracket-container {
          transition: transform 0.3s ease;
        }
        
        /* Compact match cards */
        .match-card-compact {
          min-width: 220px;
          max-width: 260px;
        }
        
        .match-card-compact .card-body {
          padding: 0.75rem;
          padding-bottom: 2.5rem; /* Extra space for action buttons */
        }
        
        .match-card-compact .player-row {
          padding: 0.5rem;
          font-size: 0.875rem;
        }
        
        .match-card-compact .action-buttons {
          position: absolute;
          bottom: 0.5rem;
          left: 0.5rem;
          display: flex;
          gap: 0.25rem;
        }
      `}</style>
      
      <div className={`${isFullscreen ? 'fixed inset-0 bg-base-100 z-50 overflow-hidden' : 'mt-6'}`}>
      <div className={`${isFullscreen ? 'h-full flex flex-col' : ''}`}>
      
      {!isFullscreen && (
      <div className="space-y-3 mb-4">
        {/* Title and Controls Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-bold">Egyenes Kiesés</h2>
          
          {/* Zoom and Fullscreen Controls */}
          <div className="flex items-center gap-2 bg-base-200 rounded-lg p-1.5">
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
              title="Kicsinyítés"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <span className="text-xs font-mono min-w-[45px] text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
              title="Nagyítás"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => setZoomLevel(1)}
              title="Alaphelyzet"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <div className="w-px h-6 bg-base-300 mx-1"></div>
            <button
              className="btn btn-xs btn-ghost"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Kilépés a teljes képernyőből" : "Teljes képernyő"}
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Moderator Action Buttons Row */}
        {(userClubRole === 'admin' || userClubRole === 'moderator') && (
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {currentKnockoutMethod === 'manual' && (
            <>
              <button
                  className="btn btn-secondary btn-sm w-full sm:flex-1"
                onClick={() => setShowGenerateEmptyRoundsModal(true)}
                disabled={generatingEmptyRounds}
              >
                {generatingEmptyRounds ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                      <span className="hidden sm:inline">Generálás...</span>
                      <span className="sm:hidden">Körök...</span>
                  </>
                ) : (
                    <>
                      <span className="hidden sm:inline">Üres kör hozzáadása</span>
                      <span className="sm:hidden">Üres körök</span>
                    </>
                )}
              </button>
              <button
                  className="btn btn-accent btn-sm w-full sm:flex-1"
                onClick={() => {
                  setSelectedRound(1);
                  setShowRandomPairingModal(true);
                }}
                disabled={generatingPairings}
              >
                {generatingPairings ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Párosítás...
                  </>
                ) : (
                  'Random párosítás'
                )}
              </button>
              {knockoutData.length > 0 && (
                  <>
                <button
                      className="btn btn-primary btn-sm w-full sm:flex-1"
                  onClick={() => setShowGenerateNextRound(true)}
                  disabled={generatingNextRound}
                >
                  {generatingNextRound ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                          <span className="hidden sm:inline">Következő kör...</span>
                          <span className="sm:hidden">Köv. kör...</span>
                    </>
                  ) : (
                        <>
                          <span className="hidden sm:inline">Következő kör generálása</span>
                          <span className="sm:hidden">Következő kör</span>
                        </>
                  )}
                </button>
                    <button
                      className="btn btn-error btn-sm w-full sm:flex-1"
                      onClick={() => setShowDeleteLastRoundModal(true)}
                      disabled={deletingLastRound}
                    >
                      {deletingLastRound ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          <span className="hidden sm:inline">Törlés...</span>
                          <span className="sm:hidden">Törlés...</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Utolsó kör visszavonása</span>
                          <span className="sm:hidden">Utolsó kör törlése</span>
                        </>
                      )}
                    </button>
            </>
          )}
              </>
            )}
            {knockoutData.length > 0 && currentKnockoutMethod === 'automatic' && (
            <button
                className="btn btn-primary btn-sm w-full"
              onClick={() => setShowGenerateNextRound(true)}
              disabled={
                generatingNextRound ||
                knockoutData.some(
                  (round) =>
                    round.matches &&
                    round.matches.some(
                      (match) => match.matchReference?.status !== 'finished'
                    )
                )
              }
            >
              {generatingNextRound ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                    <span className="hidden sm:inline">Következő kör...</span>
                    <span className="sm:hidden">Köv. kör...</span>
                </>
              ) : (
                  <>
                    <span className="hidden sm:inline">Következő kör generálása</span>
                    <span className="sm:hidden">Következő kör</span>
                  </>
              )}
            </button>
          )}
        </div>
        )}
      </div>
      )}

      {/* Knockout Bracket Display - Horizontal Layout with Zoom */}
      <div 
        className={`overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100 ${isFullscreen ? 'flex-1' : ''}`}
        style={{ maxHeight: isFullscreen ? 'none' : '800px' }}
      >
        {/* Fullscreen Controls */}
        {isFullscreen && (
          <div className="sticky top-0 left-0 right-0 bg-base-100 border-b border-base-300 p-4 z-50 flex justify-between items-center">
            <h2 className="text-xl font-bold">Egyenes Kiesés</h2>
            
            <div className="flex items-center gap-4">
              {/* Zoom Controls in Fullscreen */}
              <div className="flex items-center gap-2 bg-base-200 rounded-lg p-1.5">
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                  title="Kicsinyítés"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </button>
                <span className="text-xs font-mono min-w-[45px] text-center">{Math.round(zoomLevel * 100)}%</span>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
                  title="Nagyítás"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </button>
                <button
                  className="btn btn-xs btn-ghost"
                  onClick={() => setZoomLevel(1)}
                  title="Alaphelyzet"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {/* Action Buttons in Fullscreen */}
              {(userClubRole === 'admin' || userClubRole === 'moderator') && (
                <div className="flex gap-2">
                  {currentKnockoutMethod === 'manual' && (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowGenerateEmptyRoundsModal(true)}
                        disabled={generatingEmptyRounds}
                      >
                        Üres körök
                      </button>
                      <button
                        className="btn btn-accent btn-sm"
                        onClick={() => {
                          setSelectedRound(1);
                          setShowRandomPairingModal(true);
                        }}
                        disabled={generatingPairings}
                      >
                        Random párosítás
                      </button>
                      {knockoutData.length > 0 && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowGenerateNextRound(true)}
                            disabled={generatingNextRound}
                          >
                            Következő kör
                          </button>
                          <button
                            className="btn btn-error btn-sm"
                            onClick={() => setShowDeleteLastRoundModal(true)}
                            disabled={deletingLastRound}
                          >
                            Utolsó kör törlése
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {knockoutData.length > 0 && currentKnockoutMethod === 'automatic' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowGenerateNextRound(true)}
                      disabled={
                        generatingNextRound ||
                        knockoutData.some(
                          (round) =>
                            round.matches &&
                            round.matches.some(
                              (match) => match.matchReference?.status !== 'finished'
                            )
                        )
                      }
                    >
                      Következő kör
                    </button>
                  )}
                </div>
              )}

              {/* Exit Fullscreen */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={toggleFullscreen}
                title="Kilépés"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        <div 
          className="bracket-container flex gap-16 min-w-max p-6" 
          style={{ 
            minHeight: '700px',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left',
            width: `${100 / zoomLevel}%`
          }}
        >
          {knockoutData
            .filter((round) => {
              // In manual mode, show all rounds (including empty ones)
              // In automatic mode, only show rounds with matches
              if (currentKnockoutMethod === 'manual') {
                return true;
              }
              return round.matches && round.matches.length > 0;
            })
            .map((round, roundIndex) => {
              try {
              const roundMatches = round.matches || [];
              const nextRound = knockoutData[roundIndex + 1];
              const nextRoundMatches = nextRound?.matches || [];
              
              // Calculate optimal height based on matches in this round and next round
              const matchCardHeight = 160; // Compact card height
              const matchSpacing = 24; // Compact spacing
              
              // Calculate round height based on bracket positioning
              // Always use the maximum number of matches from any round to ensure consistent spacing
              const allRounds = knockoutData.filter(r => currentKnockoutMethod === 'manual' ? true : (r.matches && r.matches.length > 0));
              const maxMatchesInAnyRound = Math.max(...allRounds.map(r => (r.matches || []).length));
              const roundHeight = Math.max(maxMatchesInAnyRound * (matchCardHeight + matchSpacing) + matchSpacing, 300);
              
              return (
                <div key={round.round} className="flex flex-col relative min-w-[240px]">
                  {/* Round Header */}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-lg font-bold">
                        {(() => {
                          const allRounds = knockoutData.filter(r => currentKnockoutMethod === 'manual' ? true : (r.matches && r.matches.length > 0));
                          const totalRounds = allRounds.length;
                          const currentRoundIndex = allRounds.findIndex(r => r.round === round.round);
                          const currentRoundMatches = round.matches || [];
                          if (currentRoundIndex === 0) {
                            return '1. kör';
                          } else if (currentRoundIndex === totalRounds - 1 && currentRoundMatches.length === 1) {
                            // Utolsó kör - döntő
                            return 'Döntő';
                          } else if (currentRoundIndex === totalRounds - 2 && currentRoundMatches.length === 2) {
                            // Utolsó előtti kör - elődöntő
                            return 'Elődöntő';
                          } else if (currentRoundIndex === totalRounds - 3 && currentRoundMatches.length === 4) {
                            // Harmadik utolsó kör - negyeddöntő
                            return 'Negyeddöntő';
                          } else {
                            // Korábbi körök - számozott
                            return `${currentRoundIndex + 1}. kör`;
                          }
                        })()}
                      </h3>
                      
                      {/* Add Match Button for Manual Mode - Next to Round Name */}
                      {(userClubRole === 'admin' || userClubRole === 'moderator') && currentKnockoutMethod === 'manual' && (
                        <button
                          className="btn btn-circle btn-sm btn-outline btn-primary"
                          onClick={() => {
                            setSelectedRound(round.round);
                            setShowAddMatchModal(true);
                          }}
                          title="Meccs hozzáadása"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-base-content/60 mt-1">
                      {roundMatches.length} meccs
                    </div>
                  </div>
                  
                  {/* Matches Container */}
                  <div 
                    className="flex flex-col justify-around"
                    style={{ minHeight: `${roundHeight}px` }}
                  >
                    {roundMatches.length > 0 ? (
                      roundMatches.map((match, matchIndex) => {
                        // Calculate which match in the next round this feeds into
                        let nextMatchIndex = -1;
                        if (nextRoundMatches.length > 0) {
                          if (nextRoundMatches.length === roundMatches.length) {
                            // Same number of matches - direct mapping (for rematches)
                            nextMatchIndex = matchIndex;
                          } else {
                            // Standard knockout - calculate based on bracket structure
                            const matchesPerNextMatch = roundMatches.length / nextRoundMatches.length;
                            nextMatchIndex = Math.floor(matchIndex / matchesPerNextMatch);
                          }
                        }
                        
                        return (
                          <div 
                            key={match.matchReference?._id || `empty-${roundIndex}-${matchIndex}`} 
                            className="relative"
                          >
                            {/* Connection Lines to Previous Round */}
                            {roundIndex > 0 && (
                              <div className="absolute -left-8 top-1/2 transform -translate-y-1/2 z-5">
                                {/* Longer horizontal line */}
                                <div className="w-12 h-0.5 bg-base-300"></div>
                                
                                {/* Taller vertical line if 2x more matches in previous round */}
                                {(() => {
                                  const previousRound = knockoutData[roundIndex - 1];
                                  const previousRoundMatches = previousRound?.matches || [];
                                  return previousRoundMatches.length >= roundMatches.length * 2;
                                })() && (
                                  <div className="absolute top-1/2 left-0 w-0.5 bg-base-300" style={{ 
                                    height: '260px',
                                    transform: 'translateY(-130px)'
                                  }}></div>
                                )}
                              </div>
                            )}
                            
                            {/* Match Card - Compact Version */}
                            <div className={`card bg-base-100 shadow-md border-2 match-card-compact hover:shadow-lg transition-all relative z-10 ${
                              !match.player1 && !match.player2 ? 'border-dashed border-base-300' :
                              !match.player2 ? 'border-warning' : 'border-base-200'
                            }`}>
                              <div className="card-body relative">
                                {/* Status and Board - Top Right */}
                                <div className="flex justify-between items-center mb-3">
                                  <span className={`badge badge-sm ${getStatusColor(match.matchReference?.status || 'pending')}`}>
                                    {getStatusText(match.matchReference?.status || 'pending')}
                                  </span>
                                  <span className="text-xs text-base-content/60">
                                    {match.matchReference?.boardReference ? (() => {
                                      const board = availableBoards.find(b => b.boardNumber === match.matchReference.boardReference);
                                      const displayName = board?.name && board.name !== `Tábla ${board.boardNumber}` 
                                        ? board.name 
                                        : `Tábla ${match.matchReference.boardReference}`;
                                      return displayName;
                                    })() : 'Bye meccs'}
                                  </span>
                                </div>
                                
                                {/* Scorer information */}
                                {match.matchReference?.scorer && (
                                  <div className="text-xs text-base-content/60 mb-2">
                                    <span className="font-medium">Scorer:</span> {match.matchReference.scorer.name || 'Ismeretlen'}
                                  </div>
                                )}
                                
                                <div className="space-y-1">
                                  {/* Player 1 Row - Compact */}
                                  <div className={`player-row flex justify-between items-center rounded text-xs ${
                                    !match.player1 && !match.player2 ? 'bg-base-300/30' :
                                    !match.player2 ? 'bg-success/20 border border-success/30' : 
                                    (match.matchReference?.winnerId === match.player1?._id && match.player1?.name && match.player1.name !== 'TBD' ? 'bg-success/20 border border-success/30' : 'bg-base-200')
                                  }`}>
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <span className="font-medium truncate">{match.player1?.name || 'Üres'}</span>
                                      {!match.player2 && match.player1 && (
                                        <span className="badge badge-xs badge-warning">Bye</span>
                                      )}
                                      {(userClubRole === 'admin' || userClubRole === 'moderator') && (!match.player1 || !match.player1._id) && (
                                        <button
                                          className="btn btn-xs btn-circle btn-ghost"
                                          onClick={() => {
                                            setEditingMatch(match);
                                            setSelectedRound(round.round);
                                            // Initialize form with existing values
                                            setEditPairPlayer1(match.player1?._id || '');
                                            setEditPairPlayer2(match.player2?._id || '');
                                            setEditPairScorer(match.matchReference?.scorer?._id || '');
                                            setEditPairBoard(match.matchReference?.boardReference?.toString() || '');
                                            setEditPairPlayer1Search(match.player1?.name || '');
                                            setEditPairPlayer2Search(match.player2?.name || '');
                                            setEditPairScorerSearch(match.matchReference?.scorer?.name || '');
                                            setShowMatchPlayerEditModal(true);
                                          }}
                                          title="Játékos hozzáadása"
                                        >
                                          +
                                        </button>
                                      )}
                                    </div>
                                    <span className="text-sm font-bold ml-1">
                                      {!match.player1 && !match.player2 ? '-' :
                                       !match.player2 ? 'W' : (match.matchReference?.player1?.legsWon || 0)}
                                    </span>
                                  </div>
                                  
                                  {/* VS Divider - Compact */}
                                  <div className="text-center text-xs text-base-content/60 font-medium">
                                    {!match.player1 && !match.player2 ? '---' :
                                     !match.player2 ? 'Bye' : 'vs'}
                                  </div>
                                  
                                  {/* Player 2 Row - Compact */}
                                  <div className={`player-row flex justify-between items-center rounded text-xs ${
                                    !match.player1 && !match.player2 ? 'bg-base-300/30' :
                                    match.matchReference?.winnerId === match.player2?._id && match.player2?.name && match.player2.name !== 'TBD' ? 'bg-success/20 border border-success/30' : 'bg-base-200'
                                  }`}>
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <span className="font-medium truncate">{match.player2?.name || 'Üres'}</span>
                                      {(userClubRole === 'admin' || userClubRole === 'moderator') && (!match.player2 || !match.player2._id) && (
                                        <button
                                          className="btn btn-xs btn-circle btn-ghost"
                                          onClick={() => {
                                            setEditingMatch(match);
                                            setSelectedRound(round.round);
                                            // Initialize form with existing values
                                            setEditPairPlayer1(match.player1?._id || '');
                                            setEditPairPlayer2(match.player2?._id || '');
                                            setEditPairScorer(match.matchReference?.scorer?._id || '');
                                            setEditPairBoard(match.matchReference?.boardReference?.toString() || '');
                                            setEditPairPlayer1Search(match.player1?.name || '');
                                            setEditPairPlayer2Search(match.player2?.name || '');
                                            setEditPairScorerSearch(match.matchReference?.scorer?.name || '');
                                            setShowMatchPlayerEditModal(true);
                                          }}
                                          title="Játékos hozzáadása"
                                        >
                                          +
                                        </button>
                                      )}
                                    </div>
                                    <span className="text-sm font-bold ml-1">
                                      {!match.player1 && !match.player2 ? '-' :
                                       !match.player2 ? '' : (match.matchReference?.player2?.legsWon || 0)}
                                    </span>
                                  </div>
                                </div>

                                {/* Action Buttons - Bottom Left */}
                                <div className="action-buttons">
                                    {(match.matchReference?.status === 'ongoing' || match.matchReference?.status === 'finished') && match.player1 && match.player2 && (
                                      <button
                                        className="btn btn-xs btn-ghost"
                                        onClick={() => handleViewLegs(match)}
                                        title="Legek megtekintése"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                      </button>
                                    )}
                                    {(userClubRole === 'admin' || userClubRole === 'moderator') && match.matchReference && match.player1 && match.player2 && (
                                      <button
                                        className="btn btn-xs btn-ghost"
                                        onClick={() => handleMatchEdit(match)}
                                        title="Meccs eredmény rögzítése"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                    )}
                                    {(userClubRole === 'admin' || userClubRole === 'moderator') && match.matchReference && (
                                      <button
                                        className="btn btn-xs btn-ghost"
                                        onClick={() => handleEditMatchSettings(match)}
                                        title="Meccs beállítások szerkesztése"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                      </button>
                                    )}
                                  {(userClubRole === 'admin' || userClubRole === 'moderator') && currentKnockoutMethod === 'manual' && (
                                        <button
                                      className="btn btn-xs btn-ghost text-error"
                                          onClick={() => {
                                        setMatchToDelete({ match, round: round.round, index: matchIndex });
                                        setShowDeleteMatchModal(true);
                                          }}
                                      title="Meccs törlése"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                              </div>
                            </div>
                            
                            {/* Connection Lines to Next Round */}
                            {nextMatchIndex >= 0 && (
                              <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 z-5">
                                {/* Longer horizontal line */}
                                <div className="w-24 h-0.5 bg-base-300"></div>
                                
                                {/* Taller vertical line if 2x more matches in next round */}
                                {nextRoundMatches.length >= roundMatches.length * 2 && (
                                  <div className="absolute top-1/2 right-0 w-0.5 bg-base-300" style={{ 
                                    height: '60px',
                                    transform: 'translateY(-50px)'
                                  }}></div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      // Empty round message
                      <div className="flex items-center justify-center h-full">
                        <div className="alert alert-info">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span className="text-sm">Nincsenek meccsek</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
              } catch (err) {
                console.error('Error rendering round:', round.round, err);
                return (
                  <div key={round.round} className="flex flex-col relative min-w-[240px]">
                    <div className="alert alert-error">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <div className="font-bold">Hiba a {round.round}. kör megjelenítésében</div>
                        <div className="text-sm">Kérjük használd az &quot;Utolsó kör törlése&quot; gombot.</div>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
        </div>
      </div>

      {/* Modals - Inside fullscreen container */}
      {/* Generate Next Round Modal */}
      {showGenerateNextRound && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Következő Kör Generálása</h3>
            <p className="text-base-content/70 mb-4">
              {currentKnockoutMethod === 'manual' 
                ? 'Biztosan generálni szeretnéd a következő kört? Ez automatikusan létrehozza az új meccseket a győztesekből és az egyedül maradt játékosokból (ahol nincs ellenfél, ott automatikusan továbbjut).'
                : 'Biztosan generálni szeretnéd a következő kört? Ez automatikusan létrehozza az új meccseket a győztesekből.'
              }
            </p>
            {currentKnockoutMethod === 'manual' && (
              <div className="alert alert-info mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <div className="font-bold">Manuális mód működése:</div>
                  <div className="text-sm">
                    • Befejezett meccsek győztesei továbbjutnak<br/>
                    • Egyedül maradt játékosok (bye) automatikusan továbbjutnak<br/>
                    • Páratlan számú játékos esetén az utolsó bye játékos lesz
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                className="btn btn-error flex-1"
                onClick={() => setShowGenerateNextRound(false)}
                disabled={generatingNextRound}
              >
                Mégse
              </button>
              <button
                className="btn btn-success flex-1"
                onClick={handleGenerateNextRound}
                disabled={generatingNextRound}
              >
                {generatingNextRound ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Generálás...
                  </>
                ) : (
                  "Generálás"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Edit Modal */}
      {showMatchEditModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-center mb-6">Meccs Eredmény Rögzítése</h3>
            
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold mb-2">
                {selectedMatch.player1?.name || 'TBD'} vs {selectedMatch.player2?.name || 'TBD'}
              </h4>
              <p className="text-base-content/70">Állítsd be a meccs eredményét és statisztikáit</p>
            </div>
            
            {/* Warning for ongoing/pending matches */}
            {(selectedMatch.matchReference?.status === 'ongoing' || selectedMatch.matchReference?.status === 'pending') && (
              <div className="alert alert-warning mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <div className="font-bold">Figyelem!</div>
                  <div className="text-sm">
                    Az eredmény mentése után a meccs <strong>befejezett</strong> állapotba kerül és az írói programon nem lesz elérhető.
                    {selectedMatch.matchReference?.status === 'ongoing' && ' A folyamatban lévő meccs adatai elvesznek.'}
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Player 1 Stats */}
              <div className="space-y-4">
                <h5 className="font-bold text-lg text-primary">{selectedMatch.player1?.name || 'Player 1'}</h5>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Nyert legek:</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="input input-bordered w-full"
                    value={editForm.player1LegsWon}
                    onChange={(e) => setEditForm(prev => ({ ...prev, player1LegsWon: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">180-ak száma:</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    className="input input-bordered w-full"
                    value={editForm.player1Stats.oneEightiesCount}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      player1Stats: { ...prev.player1Stats, oneEightiesCount: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Legmagasabb kiszálló:</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="170"
                    className="input input-bordered w-full"
                    value={editForm.player1Stats.highestCheckout}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      player1Stats: { ...prev.player1Stats, highestCheckout: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
              </div>

              {/* Player 2 Stats */}
              <div className="space-y-4">
                <h5 className="font-bold text-lg text-primary">{selectedMatch.player2?.name || 'Player 2'}</h5>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Nyert legek:</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="input input-bordered w-full"
                    value={editForm.player2LegsWon}
                    onChange={(e) => setEditForm(prev => ({ ...prev, player2LegsWon: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">180-ak száma:</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    className="input input-bordered w-full"
                    value={editForm.player2Stats.oneEightiesCount}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      player2Stats: { ...prev.player2Stats, oneEightiesCount: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Legmagasabb kiszálló:</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="170"
                    className="input input-bordered w-full"
                    value={editForm.player2Stats.highestCheckout}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      player2Stats: { ...prev.player2Stats, highestCheckout: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                className="btn btn-error flex-1"
                onClick={() => {
                  setShowMatchEditModal(false);
                  setSelectedMatch(null);
                }}
              >
                Mégse
              </button>
              <button
                className="btn btn-success flex-1"
                onClick={handleSaveMatch}
                disabled={editForm.player1LegsWon === editForm.player2LegsWon}
              >
                Mentés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Match Modal */}
      {showAddMatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Meccs Hozzáadása</h3>
            <p className="text-base-content/70 mb-4">
              {selectedRound}. kör
            </p>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">1. játékos:</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Keresés..."
                      value={player1SearchTerm}
                      onChange={(e) => {
                        setPlayer1SearchTerm(e.target.value);
                        setShowPlayer1Dropdown(e.target.value.length > 0);
                      }}
                      onFocus={() => {
                        if (player1SearchTerm.length > 0) {
                          setShowPlayer1Dropdown(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding to allow clicking on dropdown items
                        setTimeout(() => setShowPlayer1Dropdown(false), 150);
                      }}
                    />
                    {/* Search Results Dropdown */}
                    {showPlayer1Dropdown && player1SearchTerm.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                        {getFilteredPlayersForSelection(player1SearchTerm, getAvailablePlayersForRound(selectedRound)).slice(0, 10).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id;
                          const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                          
                          return (
                            <div
                              key={playerId}
                              className="p-2 hover:bg-base-200 cursor-pointer text-sm"
                              onClick={() => handlePlayer1Select(playerId, playerName)}
                            >
                              {playerName}
                            </div>
                          );
                        })}
                        {getFilteredPlayersForSelection(player1SearchTerm, getAvailablePlayersForRound(selectedRound)).length === 0 && (
                          <div className="p-2 text-sm text-base-content/60">Nincs találat</div>
                        )}
                      </div>
                    )}
                  </div>
                  <select
                    className="select select-bordered w-48"
                    value={selectedPlayer1}
                    onChange={(e) => setSelectedPlayer1(e.target.value)}
                  >
                    <option value="">Válassz (opcionális)</option>
                    {getFilteredPlayersForSelection(player1SearchTerm, getAvailablePlayersForRound(selectedRound)).map((player: any) => {
                      // Handle different data structures
                      const playerId = player.playerReference?._id || player.playerReference || player._id;
                      const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                      
                      return (
                        <option key={playerId} value={playerId}>
                          {playerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">2. játékos:</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Keresés..."
                      value={player2SearchTerm}
                      onChange={(e) => {
                        setPlayer2SearchTerm(e.target.value);
                        setShowPlayer2Dropdown(e.target.value.length > 0);
                      }}
                      onFocus={() => {
                        if (player2SearchTerm.length > 0) {
                          setShowPlayer2Dropdown(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding to allow clicking on dropdown items
                        setTimeout(() => setShowPlayer2Dropdown(false), 150);
                      }}
                    />
                    {/* Search Results Dropdown */}
                    {showPlayer2Dropdown && player2SearchTerm.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                        {getFilteredPlayersForSelection(player2SearchTerm, getAvailablePlayersForRound(selectedRound)).slice(0, 10).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id;
                          const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                          
                          return (
                            <div
                              key={playerId}
                              className="p-2 hover:bg-base-200 cursor-pointer text-sm"
                              onClick={() => handlePlayer2Select(playerId, playerName)}
                            >
                              {playerName}
                            </div>
                          );
                        })}
                        {getFilteredPlayersForSelection(player2SearchTerm, getAvailablePlayersForRound(selectedRound)).length === 0 && (
                          <div className="p-2 text-sm text-base-content/60">Nincs találat</div>
                        )}
                      </div>
                    )}
                  </div>
                  <select
                    className="select select-bordered w-48"
                    value={selectedPlayer2}
                    onChange={(e) => setSelectedPlayer2(e.target.value)}
                  >
                    <option value="">Válassz (opcionális)</option>
                    {getFilteredPlayersForSelection(player2SearchTerm, getAvailablePlayersForRound(selectedRound)).map((player: any) => {
                      // Handle different data structures
                      const playerId = player.playerReference?._id || player.playerReference || player._id;
                      const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                      
                      return (
                        <option key={playerId} value={playerId}>
                          {playerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Scorer:</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Keresés..."
                      value={scorerSearchTerm}
                      onChange={(e) => {
                        setScorerSearchTerm(e.target.value);
                        setShowScorerDropdown(e.target.value.length > 0);
                      }}
                      onFocus={() => {
                        if (scorerSearchTerm.length > 0) {
                          setShowScorerDropdown(true);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding to allow clicking on dropdown items
                        setTimeout(() => setShowScorerDropdown(false), 150);
                      }}
                    />
                    {/* Search Results Dropdown */}
                    {showScorerDropdown && scorerSearchTerm.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                        {getFilteredPlayersForSelection(scorerSearchTerm, getAllTournamentPlayers()).slice(0, 10).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id;
                          const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                          
                          return (
                            <div
                              key={playerId}
                              className="p-2 hover:bg-base-200 cursor-pointer text-sm"
                              onClick={() => handleScorerSelect(playerId, playerName)}
                            >
                              {playerName}
                            </div>
                          );
                        })}
                        {getFilteredPlayersForSelection(scorerSearchTerm, getAllTournamentPlayers()).length === 0 && (
                          <div className="p-2 text-sm text-base-content/60">Nincs találat</div>
                        )}
                      </div>
                    )}
                  </div>
                  <select
                    className="select select-bordered w-48"
                    value={selectedScorer}
                    onChange={(e) => setSelectedScorer(e.target.value)}
                  >
                    <option value="">Válassz (opcionális)</option>
                    {getFilteredPlayersForSelection(scorerSearchTerm, getAllTournamentPlayers()).map((player: any) => {
                      // Handle different data structures
                      const playerId = player.playerReference?._id || player.playerReference || player._id;
                      const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                      
                      return (
                        <option key={playerId} value={playerId}>
                          {playerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Tábla:</span>
                  <span className="label-text-alt text-warning">*Kötelező</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedBoard}
                  onChange={(e) => setSelectedBoard(e.target.value)}
                  required
                >
                  <option value="">Válassz táblát</option>
                  {availableBoards.map((board: any) => {
                    const displayName = board.name && board.name !== `Tábla ${board.boardNumber}` 
                      ? board.name 
                      : `Tábla ${board.boardNumber}`;
                    
                    return (
                      <option key={board.boardNumber} value={board.boardNumber.toString()}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                className="btn btn-error flex-1"
                onClick={() => {
                  setShowAddMatchModal(false);
                  setSelectedPlayer1('');
                  setSelectedPlayer2('');
                  setSelectedScorer('');
                  setSelectedBoard('');
                  setPlayer1SearchTerm('');
                  setPlayer2SearchTerm('');
                  setScorerSearchTerm('');
                  setShowPlayer1Dropdown(false);
                  setShowPlayer2Dropdown(false);
                  setShowScorerDropdown(false);
                }}
              >
                Mégse
              </button>
                <button
                  className="btn btn-success flex-1"
                  onClick={handleAddMatch}
                disabled={
                  addingMatch || 
                  (!!selectedPlayer1 && !!selectedPlayer2 && selectedPlayer1 === selectedPlayer2) ||
                  ((!!selectedPlayer1 || !!selectedPlayer2) && !selectedBoard)
                }
                >
                {addingMatch ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Hozzáadás...
                  </>
                ) : (
                  "Hozzáadás"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Empty Rounds Modal */}
      {showGenerateEmptyRoundsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Üres Körök Generálása</h3>
            <p className="text-base-content/70 mb-4">
              Hány üres kört szeretnél generálni?
            </p>
            
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text font-bold">Körök száma:</span>
              </label>
              <input
                type="number"
                min="1"
                max="10"
                className="input input-bordered w-full"
                value={roundsToGenerate}
                onChange={(e) => setRoundsToGenerate(parseInt(e.target.value) || 2)}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                className="btn btn-error flex-1"
                onClick={() => setShowGenerateEmptyRoundsModal(false)}
                disabled={generatingEmptyRounds}
              >
                Mégse
              </button>
              <button
                className="btn btn-success flex-1"
                onClick={handleGenerateEmptyRounds}
                disabled={generatingEmptyRounds}
              >
                {generatingEmptyRounds ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Generálás...
                  </>
                ) : (
                  "Generálás"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Random Pairing Modal */}
      {showRandomPairingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Random Párosítás</h3>
            <p className="text-base-content/70 mb-4">
              {selectedRound}. kör - Válaszd ki a párosítandó játékosokat
            </p>
            
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-bold">Keresés:</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Játékos neve..."
                value={playerSearchTerm}
                onChange={(e) => setPlayerSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredPlayers.map((player: any) => {
                const playerId = player.playerReference?._id || player.playerReference || player._id;
                const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                const isSelected = selectedPlayersForPairing.includes(playerId);
                
                return (
                  <div
                    key={playerId}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/20 border border-primary/30' : 'bg-base-200 hover:bg-base-300'
                    }`}
                    onClick={() => handlePlayerSelectionForPairing(playerId)}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary mr-3"
                      checked={isSelected}
                      onChange={() => handlePlayerSelectionForPairing(playerId)}
                    />
                    <span className="font-medium">{playerName}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                className="btn btn-error flex-1"
                onClick={() => {
                  setShowRandomPairingModal(false);
                  setSelectedPlayersForPairing([]);
                  setPlayerSearchTerm('');
                }}
                disabled={generatingPairings}
              >
                Mégse
              </button>
              <button
                className="btn btn-success flex-1"
                onClick={handleGenerateRandomPairings}
                disabled={generatingPairings || selectedPlayersForPairing.length < 2}
              >
                {generatingPairings ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Párosítás...
                  </>
                ) : (
                  `Párosítás (${selectedPlayersForPairing.length} játékos)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Player Edit Modal */}
      {showMatchPlayerEditModal && editingMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {!editingMatch.matchReference ? 'Meccs Létrehozása' : 'Meccs Szerkesztése'}
            </h3>
            <p className="text-base-content/70 mb-4">
              {selectedRound}. kör
            </p>
            
            <div className="space-y-4">
              {/* Player 1 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">1. játékos:</span>
                  {editPairPlayer1 && (
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-error"
                      onClick={() => {
                        setEditPairPlayer1('');
                        setEditPairPlayer1Search('');
                      }}
                    >
                      ✕ Törlés
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Keresés..."
                    value={editPairPlayer1Search}
                    onChange={(e) => {
                      setEditPairPlayer1Search(e.target.value);
                      setShowEditPairPlayer1Dropdown(e.target.value.length > 0);
                    }}
                    onFocus={() => {
                      if (editPairPlayer1Search.length > 0) {
                        setShowEditPairPlayer1Dropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowEditPairPlayer1Dropdown(false), 150);
                    }}
                  />
                  {/* Dropdown */}
                  {showEditPairPlayer1Dropdown && editPairPlayer1Search.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                      {getFilteredPlayersForSelection(editPairPlayer1Search, getAvailablePlayersForRound(selectedRound)).slice(0, 10).map((player: any) => {
                const playerId = player.playerReference?._id || player.playerReference || player._id;
                const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                
                return (
                  <div
                    key={playerId}
                            className="p-2 hover:bg-base-200 cursor-pointer text-sm"
                            onClick={() => {
                              setEditPairPlayer1(playerId);
                              setEditPairPlayer1Search(playerName);
                              setShowEditPairPlayer1Dropdown(false);
                            }}
                          >
                            {playerName}
                  </div>
                );
              })}
                      {getFilteredPlayersForSelection(editPairPlayer1Search, getAvailablePlayersForRound(selectedRound)).length === 0 && (
                        <div className="p-2 text-sm text-base-content/60">Nincs találat</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Player 2 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">2. játékos:</span>
                  {editPairPlayer2 && (
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-error"
                      onClick={() => {
                        setEditPairPlayer2('');
                        setEditPairPlayer2Search('');
                      }}
                    >
                      ✕ Törlés
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Keresés..."
                    value={editPairPlayer2Search}
                    onChange={(e) => {
                      setEditPairPlayer2Search(e.target.value);
                      setShowEditPairPlayer2Dropdown(e.target.value.length > 0);
                    }}
                    onFocus={() => {
                      if (editPairPlayer2Search.length > 0) {
                        setShowEditPairPlayer2Dropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowEditPairPlayer2Dropdown(false), 150);
                    }}
                  />
                  {/* Dropdown */}
                  {showEditPairPlayer2Dropdown && editPairPlayer2Search.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                      {getFilteredPlayersForSelection(editPairPlayer2Search, getAvailablePlayersForRound(selectedRound)).slice(0, 10).map((player: any) => {
                        const playerId = player.playerReference?._id || player.playerReference || player._id;
                        const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                        
                        return (
                          <div
                            key={playerId}
                            className="p-2 hover:bg-base-200 cursor-pointer text-sm"
                            onClick={() => {
                              setEditPairPlayer2(playerId);
                              setEditPairPlayer2Search(playerName);
                              setShowEditPairPlayer2Dropdown(false);
                            }}
                          >
                            {playerName}
                          </div>
                        );
                      })}
                      {getFilteredPlayersForSelection(editPairPlayer2Search, getAvailablePlayersForRound(selectedRound)).length === 0 && (
                        <div className="p-2 text-sm text-base-content/60">Nincs találat</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Scorer */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Scorer:</span>
                  <span className="label-text-alt text-base-content/60">Opcionális</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Keresés..."
                    value={editPairScorerSearch}
                    onChange={(e) => {
                      setEditPairScorerSearch(e.target.value);
                      setShowEditPairScorerDropdown(e.target.value.length > 0);
                    }}
                    onFocus={() => {
                      if (editPairScorerSearch.length > 0) {
                        setShowEditPairScorerDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowEditPairScorerDropdown(false), 150);
                    }}
                  />
                  {/* Dropdown */}
                  {showEditPairScorerDropdown && editPairScorerSearch.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                      {getFilteredPlayersForSelection(editPairScorerSearch, getAllTournamentPlayers()).slice(0, 10).map((player: any) => {
                        const playerId = player.playerReference?._id || player.playerReference || player._id;
                        const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                        
                        return (
                          <div
                            key={playerId}
                            className="p-2 hover:bg-base-200 cursor-pointer text-sm"
                            onClick={() => {
                              setEditPairScorer(playerId);
                              setEditPairScorerSearch(playerName);
                              setShowEditPairScorerDropdown(false);
                            }}
                          >
                            {playerName}
                          </div>
                        );
                      })}
                      {getFilteredPlayersForSelection(editPairScorerSearch, getAllTournamentPlayers()).length === 0 && (
                        <div className="p-2 text-sm text-base-content/60">Nincs találat</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Board Selection */}
              {!editingMatch.matchReference && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Tábla:</span>
                    <span className="label-text-alt text-warning">*Kötelező</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={editPairBoard}
                    onChange={(e) => setEditPairBoard(e.target.value)}
                    required
                  >
                    <option value="">Válassz táblát</option>
                    {availableBoards.map((board: any) => {
                      const displayName = board.name && board.name !== `Tábla ${board.boardNumber}` 
                        ? board.name 
                        : `Tábla ${board.boardNumber}`;
                      
                      return (
                        <option key={board.boardNumber} value={board.boardNumber.toString()}>
                          {displayName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                className="btn btn-error flex-1"
                onClick={() => {
                  setShowMatchPlayerEditModal(false);
                  setEditingMatch(null);
                  setEditPairPlayer1('');
                  setEditPairPlayer2('');
                  setEditPairScorer('');
                  setEditPairBoard('');
                  setEditPairPlayer1Search('');
                  setEditPairPlayer2Search('');
                  setEditPairScorerSearch('');
                }}
                disabled={updatingMatchPlayer}
              >
                Mégse
              </button>
              <button
                className="btn btn-success flex-1"
                onClick={handleUpdateMatchPlayer}
                disabled={updatingMatchPlayer}
              >
                {updatingMatchPlayer ? (
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

      {/* Legs View Modal */}
      <LegsViewModal
        isOpen={showLegsModal}
        onClose={() => {
          setShowLegsModal(false);
          setSelectedMatchForLegs(null);
        }}
        match={selectedMatchForLegs && selectedMatchForLegs.matchReference ? {
          _id: selectedMatchForLegs.matchReference._id,
          player1: {
            playerId: {
              _id: selectedMatchForLegs.player1?._id || '',
              name: selectedMatchForLegs.player1?.name || 'TBD'
            }
          },
          player2: {
            playerId: {
              _id: selectedMatchForLegs.player2?._id || '',
              name: selectedMatchForLegs.player2?.name || 'TBD'
            }
          },
          clubId: clubId
        } : null}
      />

      {/* Match Settings Edit Modal */}
      {showMatchSettingsModal && editingMatchSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Meccs Beállítások Szerkesztése</h3>
            
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold mb-2">
                {editingMatchSettings.player1?.name || 'TBD'} vs {editingMatchSettings.player2?.name || 'TBD'}
              </h4>
              <p className="text-base-content/70">Módosítsd a meccs beállításait</p>
            </div>
            
            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">1. játékos:</span>
                  {selectedPlayer1 && (
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-error"
                      onClick={() => {
                        setSelectedPlayer1('');
                        setPlayer1SearchTerm('');
                      }}
                    >
                      ✕ Törlés
                    </button>
                  )}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Keresés..."
                      value={player1SearchTerm}
                      onChange={(e) => {
                        setPlayer1SearchTerm(e.target.value);
                        setShowPlayer1Dropdown(e.target.value.length > 0);
                      }}
                      onFocus={() => {
                        if (player1SearchTerm.length > 0) {
                          setShowPlayer1Dropdown(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowPlayer1Dropdown(false), 150);
                      }}
                    />
                    {/* Search Results Dropdown */}
                    {showPlayer1Dropdown && player1SearchTerm.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                        {getFilteredPlayersForSelection(player1SearchTerm, getAllTournamentPlayers()).slice(0, 10).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id;
                          const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                          
                          return (
                            <div
                              key={playerId}
                              className="p-2 hover:bg-base-200 cursor-pointer text-sm"
                              onClick={() => handlePlayer1Select(playerId, playerName)}
                            >
                              {playerName}
                            </div>
                          );
                        })}
                        {getFilteredPlayersForSelection(player1SearchTerm, getAllTournamentPlayers()).length === 0 && (
                          <div className="p-2 text-sm text-base-content/60">Nincs találat</div>
                        )}
                      </div>
                    )}
                  </div>
                  <select
                    className="select select-bordered w-48"
                    value={selectedPlayer1}
                    onChange={(e) => setSelectedPlayer1(e.target.value)}
                  >
                    <option value="">Válassz (opcionális)</option>
                    {getFilteredPlayersForSelection(player1SearchTerm, getAllTournamentPlayers()).map((player: any) => {
                      const playerId = player.playerReference?._id || player.playerReference || player._id;
                      const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                      
                      return (
                        <option key={playerId} value={playerId}>
                          {playerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">2. játékos:</span>
                  {selectedPlayer2 && (
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost btn-error"
                      onClick={() => {
                        setSelectedPlayer2('');
                        setPlayer2SearchTerm('');
                      }}
                    >
                      ✕ Törlés
                    </button>
                  )}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Keresés..."
                      value={player2SearchTerm}
                      onChange={(e) => {
                        setPlayer2SearchTerm(e.target.value);
                        setShowPlayer2Dropdown(e.target.value.length > 0);
                      }}
                      onFocus={() => {
                        if (player2SearchTerm.length > 0) {
                          setShowPlayer2Dropdown(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowPlayer2Dropdown(false), 150);
                      }}
                    />
                    {/* Search Results Dropdown */}
                    {showPlayer2Dropdown && player2SearchTerm.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                        {getFilteredPlayersForSelection(player2SearchTerm, getAllTournamentPlayers()).slice(0, 10).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id;
                          const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                          
                          return (
                            <div
                              key={playerId}
                              className="p-2 hover:bg-base-200 cursor-pointer text-sm"
                              onClick={() => handlePlayer2Select(playerId, playerName)}
                            >
                              {playerName}
                            </div>
                          );
                        })}
                        {getFilteredPlayersForSelection(player2SearchTerm, getAllTournamentPlayers()).length === 0 && (
                          <div className="p-2 text-sm text-base-content/60">Nincs találat</div>
                        )}
                      </div>
                    )}
                  </div>
                  <select
                    className="select select-bordered w-48"
                    value={selectedPlayer2}
                    onChange={(e) => setSelectedPlayer2(e.target.value)}
                  >
                    <option value="">Válassz (opcionális)</option>
                    {getFilteredPlayersForSelection(player2SearchTerm, getAllTournamentPlayers()).map((player: any) => {
                      const playerId = player.playerReference?._id || player.playerReference || player._id;
                      const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                      
                      return (
                        <option key={playerId} value={playerId}>
                          {playerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Scorer:</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Keresés..."
                      value={scorerSearchTerm}
                      onChange={(e) => {
                        setScorerSearchTerm(e.target.value);
                        setShowScorerDropdown(e.target.value.length > 0);
                      }}
                      onFocus={() => {
                        if (scorerSearchTerm.length > 0) {
                          setShowScorerDropdown(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowScorerDropdown(false), 150);
                      }}
                    />
                    {/* Search Results Dropdown */}
                    {showScorerDropdown && scorerSearchTerm.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                        {getFilteredPlayersForSelection(scorerSearchTerm, getAllTournamentPlayers()).slice(0, 10).map((player: any) => {
                          const playerId = player.playerReference?._id || player.playerReference || player._id;
                          const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                          
                          return (
                            <div
                              key={playerId}
                              className="p-2 hover:bg-base-200 cursor-pointer text-sm"
                              onClick={() => handleScorerSelect(playerId, playerName)}
                            >
                              {playerName}
                            </div>
                          );
                        })}
                        {getFilteredPlayersForSelection(scorerSearchTerm, getAllTournamentPlayers()).length === 0 && (
                          <div className="p-2 text-sm text-base-content/60">Nincs találat</div>
                        )}
                      </div>
                    )}
                  </div>
                  <select
                    className="select select-bordered w-48"
                    value={selectedScorer}
                    onChange={(e) => setSelectedScorer(e.target.value)}
                  >
                    <option value="">Válassz (opcionális)</option>
                    {getFilteredPlayersForSelection(scorerSearchTerm, getAllTournamentPlayers()).map((player: any) => {
                      const playerId = player.playerReference?._id || player.playerReference || player._id;
                      const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                      
                      return (
                        <option key={playerId} value={playerId}>
                          {playerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Tábla:</span>
                  <span className="label-text-alt text-warning">*Kötelező</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedBoard}
                  onChange={(e) => setSelectedBoard(e.target.value)}
                  required
                >
                  <option value="">Válassz táblát</option>
                  {availableBoards.map((board: any) => {
                    const displayName = board.name && board.name !== `Tábla ${board.boardNumber}` 
                      ? board.name 
                      : `Tábla ${board.boardNumber}`;
                    
                    return (
                      <option key={board.boardNumber} value={board.boardNumber.toString()}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                className="btn btn-error flex-1"
                onClick={() => {
                  setShowMatchSettingsModal(false);
                  setEditingMatchSettings(null);
                  setError('');
                  // Reset form
                  setSelectedPlayer1('');
                  setSelectedPlayer2('');
                  setSelectedScorer('');
                  setSelectedBoard('');
                  setPlayer1SearchTerm('');
                  setPlayer2SearchTerm('');
                  setScorerSearchTerm('');
                  setShowPlayer1Dropdown(false);
                  setShowPlayer2Dropdown(false);
                  setShowScorerDropdown(false);
                }}
                disabled={editSettingsLoading}
              >
                Mégse
              </button>
              <button
                className="btn btn-success flex-1"
                onClick={handleSaveMatchSettings}
                disabled={editSettingsLoading}
              >
                {editSettingsLoading ? (
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

      {/* Delete Match Confirmation Modal */}
      {showDeleteMatchModal && matchToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Meccs Törlése</h3>
            <p className="text-base-content/70 mb-4">
              Biztosan törölni szeretnéd ezt a meccset?
            </p>
            {matchToDelete.match.player1 && matchToDelete.match.player2 && (
              <div className="alert alert-warning mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <div className="font-bold">{matchToDelete.match.player1.name} vs {matchToDelete.match.player2.name}</div>
                  <div className="text-sm">{matchToDelete.round}. kör</div>
    </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => {
                  setShowDeleteMatchModal(false);
                  setMatchToDelete(null);
                }}
                disabled={deletingMatch}
              >
                Mégse
              </button>
              <button
                className="btn btn-error flex-1"
                onClick={handleDeleteMatch}
                disabled={deletingMatch}
              >
                {deletingMatch ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Törlés...
                  </>
                ) : (
                  "Törlés"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Last Round Confirmation Modal */}
      {showDeleteLastRoundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Utolsó Kör Visszavonása</h3>
            <p className="text-base-content/70 mb-4">
              Biztosan törölni szeretnéd az utolsó kört? Ez az összes meccset törli ebből a körből.
            </p>
            <div className="alert alert-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <div className="font-bold">Figyelem!</div>
                <div className="text-sm">Ez a művelet nem vonható vissza.</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="btn btn-ghost flex-1"
                onClick={() => setShowDeleteLastRoundModal(false)}
                disabled={deletingLastRound}
              >
                Mégse
              </button>
              <button
                className="btn btn-error flex-1"
                onClick={handleDeleteLastRound}
                disabled={deletingLastRound}
              >
                {deletingLastRound ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Törlés...
                  </>
                ) : (
                  "Törlés"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
    </>
  );
};

// Wrapper component with Error Boundary
const TournamentKnockoutBracket: React.FC<TournamentKnockoutBracketProps> = (props) => {
  return (
    <KnockoutErrorBoundary 
      tournamentCode={props.tournamentCode} 
      userClubRole={props.userClubRole}
    >
      <TournamentKnockoutBracketContent {...props} />
    </KnockoutErrorBoundary>
  );
};

export default TournamentKnockoutBracket;