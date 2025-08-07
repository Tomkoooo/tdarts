import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LegsViewModal from './LegsViewModal';

interface TournamentKnockoutBracketProps {
  tournamentCode: string;
  userClubRole: 'admin' | 'moderator' | 'member' | 'none';
  tournamentPlayers?: any[];
  knockoutMethod?: 'automatic' | 'manual';
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

const TournamentKnockoutBracket: React.FC<TournamentKnockoutBracketProps> = ({ 
  tournamentCode, 
  userClubRole, 
  tournamentPlayers = [],
  knockoutMethod
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
  const [addingMatch, setAddingMatch] = useState(false);
  const [editForm, setEditForm] = useState({
    player1LegsWon: 0,
    player2LegsWon: 0,
    player1Stats: { highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 },
    player2Stats: { highestCheckout: 0, oneEightiesCount: 0, totalThrows: 0, totalScore: 0 }
  });
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [currentKnockoutMethod, setCurrentKnockoutMethod] = useState<'automatic' | 'manual' | undefined>(knockoutMethod);
  const [showGenerateEmptyRoundsModal, setShowGenerateEmptyRoundsModal] = useState(false);
  const [roundsToGenerate, setRoundsToGenerate] = useState(2);
  const [generatingEmptyRounds, setGeneratingEmptyRounds] = useState(false);
  const [showRandomPairingModal, setShowRandomPairingModal] = useState(false);
  const [selectedPlayersForPairing, setSelectedPlayersForPairing] = useState<string[]>([]);
  const [generatingPairings, setGeneratingPairings] = useState(false);
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [showMatchPlayerEditModal, setShowMatchPlayerEditModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<KnockoutMatch | null>(null);
  const [editingPlayerPosition, setEditingPlayerPosition] = useState<'player1' | 'player2'>('player1');
  const [updatingMatchPlayer, setUpdatingMatchPlayer] = useState(false);
  const [showLegsModal, setShowLegsModal] = useState(false);
  const [selectedMatchForLegs, setSelectedMatchForLegs] = useState<KnockoutMatch | null>(null);

  useEffect(() => {
    fetchKnockoutData();
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
        console.log('Fetched knockout method:', response.data.knockoutMethod);
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
        console.log('Fetched tournament players:', response.data.tournamentPlayers);
      }
    } catch (err) {
      console.error('Failed to fetch tournament players:', err);
    }
  };

  const fetchKnockoutData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/tournaments/${tournamentCode}/knockout`);
      if (response.data && response.data.success) {
        setKnockoutData(response.data.knockout || []);
      } else {
        setError(response.data?.error || 'Nem sikerült betölteni a knockout adatokat.');
      }
    } catch (err: any) {
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
    if (!selectedMatch || !selectedMatch.matchReference) return;

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
    if (!selectedPlayer1 && !selectedPlayer2) {
      setError('Kérjük válassz ki legalább egy játékost.');
      return;
    }

    if (selectedPlayer1 && selectedPlayer2 && selectedPlayer1 === selectedPlayer2) {
      setError('Kérjük válassz ki két különböző játékost.');
      return;
    }

    setAddingMatch(true);
    setError('');
    
    try {
      const response = await axios.post(`/api/tournaments/${tournamentCode}/addManualMatch`, {
        round: selectedRound,
        player1Id: selectedPlayer1 || undefined,
        player2Id: selectedPlayer2 || undefined
      });
      
      if (response.data && response.data.success) {
        await fetchKnockoutData();
        setShowAddMatchModal(false);
        setSelectedPlayer1('');
        setSelectedPlayer2('');
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

  const handleUpdateMatchPlayer = async (playerId: string) => {
    if (!editingMatch || !editingMatch.matchReference) return;

    setUpdatingMatchPlayer(true);
    setError('');
    
    try {
      const matchId = typeof editingMatch.matchReference === 'object' ? editingMatch.matchReference._id : editingMatch.matchReference;
      const response = await axios.post(`/api/matches/${matchId}/updatePlayer`, {
        tournamentId: tournamentCode,
        playerPosition: editingPlayerPosition,
        playerId: playerId
      });
      
      if (response.data && response.data.success) {
        await fetchKnockoutData();
        setShowMatchPlayerEditModal(false);
        setEditingMatch(null);
      } else {
        setError(response.data?.error || 'Nem sikerült frissíteni a meccset.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült frissíteni a meccset.');
    } finally {
      setUpdatingMatchPlayer(false);
    }
  };

  const handleViewLegs = (match: KnockoutMatch) => {
    setSelectedMatchForLegs(match);
    setShowLegsModal(true);
  };

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

  const getAvailablePlayersForRound = (roundNumber: number) => {
    const playersInRound = new Set<string>();
    
    // Get all players already in this round
    const roundData = knockoutData.find(r => r.round === roundNumber);
    if (roundData) {
      roundData.matches.forEach(match => {
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
    
    // Return players not in this round
    return availablePlayers.filter((player: any) => {
      const playerId = player.playerReference?._id || player.playerReference || player._id;
      return !playersInRound.has(playerId.toString());
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

  console.log('Knockout data:', knockoutData);
  console.log('Available players:', availablePlayers);

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
    <div className="mt-6">
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
      `}</style>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Egyenes Kiesés</h2>
        <div className="flex gap-2">
          {(userClubRole === 'admin' || userClubRole === 'moderator') && currentKnockoutMethod === 'manual' && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowGenerateEmptyRoundsModal(true)}
                disabled={generatingEmptyRounds}
              >
                {generatingEmptyRounds ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Generálás...
                  </>
                ) : (
                  'Üres körök generálása'
                )}
              </button>
              <button
                className="btn btn-accent btn-sm"
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
            </>
          )}
          {(userClubRole === 'admin' || userClubRole === 'moderator') && 
           knockoutData.length > 0 && currentKnockoutMethod === 'automatic' && (
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
              {generatingNextRound ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Következő kör...
                </>
              ) : (
                'Következő kör generálása'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Knockout Bracket Display - Horizontal Layout */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100">
        <div className="flex gap-20 min-w-max p-6" style={{ minHeight: '600px' }}>
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
              console.log('Rendering round:', round.round, 'with matches:', round.matches.length);
              console.log('userClubRole:', userClubRole, 'currentKnockoutMethod:', currentKnockoutMethod);
              
              const roundMatches = round.matches || [];
              const nextRound = knockoutData[roundIndex + 1];
              const nextRoundMatches = nextRound?.matches || [];
              
              // Calculate optimal height based on matches in this round and next round
              const matchCardHeight = 220; // Approximate height of a match card
              const matchSpacing = 30; // Space between matches (increased for better visibility)
              
              // Calculate round height based on bracket positioning
              // Always use the maximum number of matches from any round to ensure consistent spacing
              const allRounds = knockoutData.filter(r => currentKnockoutMethod === 'manual' ? true : (r.matches && r.matches.length > 0));
              const maxMatchesInAnyRound = Math.max(...allRounds.map(r => (r.matches || []).length));
              const roundHeight = Math.max(maxMatchesInAnyRound * (matchCardHeight + matchSpacing) + matchSpacing, 300);
              
              return (
                <div key={round.round} className="flex flex-col relative min-w-[320px]">
                  {/* Round Header */}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-lg font-bold">
                        {(() => {
                          const allRounds = knockoutData.filter(r => currentKnockoutMethod === 'manual' ? true : (r.matches && r.matches.length > 0));
                          const totalRounds = allRounds.length;
                          const currentRoundIndex = allRounds.findIndex(r => r.round === round.round);
                          
                          if (currentRoundIndex === 0) {
                            return 'Első kör';
                          } else if (currentRoundIndex === totalRounds - 1) {
                            // Utolsó kör - döntő
                            return 'Döntő';
                          } else if (currentRoundIndex === totalRounds - 2) {
                            // Utolsó előtti kör - elődöntő
                            return 'Elődöntő';
                          } else if (currentRoundIndex === totalRounds - 3) {
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
                          className="btn btn-circle btn-xs btn-outline btn-primary"
                          onClick={() => {
                            console.log('Add match button clicked for round:', round.round);
                            setSelectedRound(round.round);
                            setShowAddMatchModal(true);
                          }}
                          title="Meccs hozzáadása"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        // Debug logging for match data
                        console.log(`Match ${matchIndex} in round ${round.round}:`, {
                          player1: match.player1,
                          player2: match.player2,
                          matchReference: match.matchReference
                        });
                        
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
                            key={match.matchReference._id} 
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
                            
                            {/* Match Card */}
                            <div className="card bg-base-100 shadow-lg border-2 border-base-200 min-w-[280px] max-w-[320px] hover:shadow-xl transition-shadow relative z-10">
                              <div className="card-body p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <span className={`badge badge-sm ${getStatusColor(match.matchReference?.status || '')}`}>
                                    {getStatusText(match.matchReference?.status || '')}
                                  </span>
                                  <span className="text-xs text-base-content/60">Tábla: {match.matchReference.boardReference}</span>
                                  <div className="flex gap-1">
                                    {(match.matchReference?.status === 'ongoing' || match.matchReference?.status === 'finished') && (
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
                                    {(userClubRole === 'admin' || userClubRole === 'moderator') && (
                                      <button
                                        className="btn btn-xs btn-ghost"
                                        onClick={() => handleMatchEdit(match)}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className={`flex justify-between items-center p-2 rounded text-sm ${match.matchReference.winnerId === match.player1?._id ? 'bg-success/20 border border-success/30' : 'bg-base-200'}`}>
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="font-medium truncate">{match.player1?.name || 'TBD'}</span>
                                      {(userClubRole === 'admin' || userClubRole === 'moderator') && (!match.player1 || !match.player1._id) && (
                                        <button
                                          className="btn btn-xs btn-ghost"
                                          onClick={() => {
                                            setEditingMatch(match);
                                            setEditingPlayerPosition('player1');
                                            setShowMatchPlayerEditModal(true);
                                          }}
                                          title="Játékos hozzáadása"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                    <span className="text-lg font-bold ml-2">{match.matchReference.player1?.legsWon || 0}</span>
                                  </div>
                                  <div className="text-center text-xs text-base-content/60 font-medium">vs</div>
                                  <div className={`flex justify-between items-center p-2 rounded text-sm ${match.matchReference.winnerId === match.player2?._id ? 'bg-success/20 border border-success/30' : 'bg-base-200'}`}>
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="font-medium truncate">{match.player2?.name || 'TBD'}</span>
                                      {(userClubRole === 'admin' || userClubRole === 'moderator') && (!match.player2 || !match.player2._id) && (
                                        <button
                                          className="btn btn-xs btn-ghost"
                                          onClick={() => {
                                            setEditingMatch(match);
                                            setEditingPlayerPosition('player2');
                                            setShowMatchPlayerEditModal(true);
                                          }}
                                          title="Játékos hozzáadása"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                    <span className="text-lg font-bold ml-2">{match.matchReference.player2?.legsWon || 0}</span>
                                  </div>
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
            })}
        </div>
      </div>

      {/* Generate Next Round Modal */}
      {showGenerateNextRound && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Következő Kör Generálása</h3>
            <p className="text-base-content/70 mb-6">
              Biztosan generálni szeretnéd a következő kört? Ez automatikusan létrehozza az új meccseket a győztesekből.
            </p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-center mb-6">Meccs Szerkesztése</h3>
            
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold mb-2">
                {selectedMatch.player1?.name || 'TBD'} vs {selectedMatch.player2?.name || 'TBD'}
              </h4>
              <p className="text-base-content/70">Állítsd be a meccs eredményét és statisztikáit</p>
            </div>
            
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                <select
                  className="select select-bordered w-full"
                  value={selectedPlayer1}
                  onChange={(e) => setSelectedPlayer1(e.target.value)}
                >
                  <option value="">Válassz játékost (opcionális)</option>
                  {getAvailablePlayersForRound(selectedRound).map((player: any) => {
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
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">2. játékos:</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedPlayer2}
                  onChange={(e) => setSelectedPlayer2(e.target.value)}
                >
                  <option value="">Válassz játékost (opcionális)</option>
                  {getAvailablePlayersForRound(selectedRound).map((player: any) => {
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
            
            <div className="flex gap-3 mt-6">
              <button
                className="btn btn-error flex-1"
                onClick={() => {
                  setShowAddMatchModal(false);
                  setSelectedPlayer1('');
                  setSelectedPlayer2('');
                }}
              >
                Mégse
              </button>
              <button
                className="btn btn-success flex-1"
                onClick={handleAddMatch}
                disabled={addingMatch || !selectedPlayer1 || selectedPlayer1 === selectedPlayer2}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Játékos Hozzáadása</h3>
            <p className="text-base-content/70 mb-4">
              {editingPlayerPosition === 'player1' ? '1. játékos' : '2. játékos'} pozícióhoz
            </p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {getAvailablePlayersForRound(selectedRound).map((player: any) => {
                const playerId = player.playerReference?._id || player.playerReference || player._id;
                const playerName = player.playerReference?.name || player.name || 'Ismeretlen játékos';
                
                return (
                  <div
                    key={playerId}
                    className="flex items-center p-3 rounded-lg cursor-pointer bg-base-200 hover:bg-base-300 transition-colors"
                    onClick={() => handleUpdateMatchPlayer(playerId)}
                  >
                    <span className="font-medium">{playerName}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                className="btn btn-error flex-1"
                onClick={() => {
                  setShowMatchPlayerEditModal(false);
                  setEditingMatch(null);
                }}
                disabled={updatingMatchPlayer}
              >
                Mégse
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
        match={selectedMatchForLegs ? {
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
          }
        } : null}
      />
    </div>
  );
};

export default TournamentKnockoutBracket; 