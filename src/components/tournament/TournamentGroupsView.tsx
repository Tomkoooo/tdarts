import React, { useState } from 'react';
import LegsViewModal from './LegsViewModal';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import axios from 'axios';
import toast from 'react-hot-toast';

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

interface Match {
  _id: string;
  player1: Player;
  player2: Player;
  status: string;
  winnerId?: string;
  legsToWin?: number;
  scorer?: {
    _id: string;
    name: string;
  };
  stats?: {
    player1: {
      average: number;
      legsWon: number;
    };
    player2: {
      average: number;
      legsWon: number;
    };
  };
}

interface TournamentGroupsViewProps {
  tournament: any;
  userClubRole?: 'admin' | 'moderator' | 'member' | 'none';
}

const TournamentGroupsView: React.FC<TournamentGroupsViewProps> = ({ tournament, userClubRole }) => {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [player1Legs, setPlayer1Legs] = useState(0);
  const [player2Legs, setPlayer2Legs] = useState(0);
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());
  const [matchFilter, setMatchFilter] = useState<'all' | 'pending' | 'ongoing' | 'finished'>('all');
  const [showLegsModal, setShowLegsModal] = useState(false);
  const [selectedMatchForLegs, setSelectedMatchForLegs] = useState<Match | null>(null);

  const isAdminOrModerator = userClubRole === 'admin' || userClubRole === 'moderator';

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleMatches = (groupId: string) => {
    const newExpanded = new Set(expandedMatches);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedMatches(newExpanded);
  };


  const handleEditMatch = (match: Match) => {
    setSelectedMatch(match);
    setPlayer1Legs(match.player1.legsWon || 0);
    setPlayer2Legs(match.player2.legsWon || 0);
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
    setShowAdminModal(true);
    setError('');
  };

  const handleViewLegs = (match: Match) => {
    setSelectedMatchForLegs(match);
    setShowLegsModal(true);
  };

  const handleMovePlayer = async (groupId: string, playerId: string, direction: 'up' | 'down') => {
    if (userClubRole !== 'admin' && userClubRole !== 'moderator') {
      toast.error('Nincs jogosultságod a helyezés módosításához!');
      return;
    }

    // Show warning about manual standing adjustment
    const confirmMessage = `Biztosan módosítod a játékos helyezését?\n\n⚠️ FONTOS: Ez a módosítás minden meccs végén újra szükséges lehet, mivel a rendszer automatikusan újraszámolja a helyezéseket.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await axios.patch(`/api/tournaments/${tournament.tournamentId}/groups/${groupId}/move-player`, {
        playerId,
        direction
      });

      if (response.data.success) {
        toast.success('Helyezés sikeresen módosítva!', {
          duration: 4000,
        });
        // Refresh the page to show updated standings
        window.location.reload();
      } else {
        toast.error('Hiba történt a helyezés módosítása során!');
      }
    } catch (error) {
      console.error('Error moving player:', error);
      toast.error('Hiba történt a helyezés módosítása során!');
    }
  };

  const handleSaveMatch = async () => {
    if (!selectedMatch) return;

    // Validate no tie
    if (player1Legs === player2Legs) {
      setError('Nem lehet döntetlen! Egyik játékosnak több leg-et kell nyernie.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/matches/${selectedMatch._id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1LegsWon: player1Legs,
          player2LegsWon: player2Legs,
          player1Stats,
          player2Stats
        })
      });

      if (!response.ok) {
        throw new Error('Hiba történt a mentés során');
      }

      setShowAdminModal(false);
      setSelectedMatch(null);
      // Optionally trigger a refetch of tournament data
      window.location.reload();
    } catch (err) {
      setError('Hiba történt a mentés során!');
      console.error('Save match error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!tournament.groups || tournament.groups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-base-content/70">Még nincsenek csoportok generálva.</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold">Csoportok</h2>
      <div className="space-y-4 mt-4">
        {tournament.groups.map((group: any, groupIndex: number) => {
          const groupPlayers = tournament.tournamentPlayers
            .filter((player: any) => player.groupId === group._id)
            .sort((a: any, b: any) => (a.groupStanding || 0) - (b.groupStanding || 0));
          
          const isExpanded = expandedGroups.has(group._id);
          const isMatchesExpanded = expandedMatches.has(group._id);

          return (
            <div key={group._id} className="card bg-base-200 shadow-md w-full">
              <div className="card-body">
                <div className="flex justify-between items-center">
                  <h3 className="card-title">
                    Csoport {groupIndex + 1} (Tábla {group.board})
                  </h3>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleGroup(group._id)}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Collapsed State - Compact Player Cards */}
                {!isExpanded && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {groupPlayers.map((player: any, index: number) => (
                      <div key={player._id} className="bg-base-100 rounded-md p-2 hover:bg-base-300 transition-colors ">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="badge badge-primary badge-xs font-bold">
                              {player.groupStanding || index + 1}.
                            </span>
                            <span className="font-medium text-xs truncate">
                              {player.playerReference?.name || 'Ismeretlen'}
                            </span>
                          </div>
                          <div className="text-xs text-base-content/70 ml-2">
                            {(player.stats?.matchesWon || 0) * 2}p
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expanded State */}
                {isExpanded && (
                  <div className="mt-4">
                    {/* Players Table */}
                    <div className="mb-6">
                      <h4 className="font-bold text-lg mb-3">Játékosok Rangsora</h4>
                      <div className="overflow-x-auto">
                        <table className="table table-zebra w-full">
                          <thead>
                            <tr>
                              <th className="text-center">Sorszám</th>
                              <th className="text-center">Helyezés</th>
                              <th>Név</th>
                              {(userClubRole === 'admin' || userClubRole === 'moderator') && (
                                <th className="text-center">Mozgatás</th>
                              )}
                              <th className="text-center">Pontok</th>
                              <th className="text-center">Nyert Meccsek</th>
                              <th className="text-center">Vesztett Meccsek</th>
                              <th className="text-center">Nyert Legek</th>
                              <th className="text-center">Vesztett Legek</th>
                              <th className="text-center">Legkülönbség</th>
                              <th className="text-center">Átlag</th>
                              <th className="text-center">180-ak</th>
                              <th className="text-center">Legmagasabb Kiszálló</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupPlayers.map((player: any, index: number) => {
                              const stats = player.stats || {};
                              const legDifference = (stats.legsWon || 0) - (stats.legsLost || 0);
                              
                              return (
                                <tr key={player._id} className="hover:bg-base-200">
                                  <td className="text-center font-bold">
                                    {player.groupOrdinalNumber +1}.
                                  </td>
                                  <td className="text-center font-bold">
                                    {player.groupStanding || index + 1}.
                                  </td>
                                  <td className="font-semibold">
                                    {player.playerReference?.name || 'Ismeretlen'}
                                  </td>
                                  {(userClubRole === 'admin' || userClubRole === 'moderator') && (
                                    <td className="text-center">
                                      <div className="flex flex-col gap-1">
                                        <button
                                          onClick={() => handleMovePlayer(group._id, player._id, 'up')}
                                          disabled={index === 0}
                                          className="btn btn-xs btn-ghost p-1"
                                          title="Fel mozgatás"
                                        >
                                          <IconArrowUp size={12} />
                                        </button>
                                        <button
                                          onClick={() => handleMovePlayer(group._id, player._id, 'down')}
                                          disabled={index === groupPlayers.length - 1}
                                          className="btn btn-xs btn-ghost p-1"
                                          title="Le mozgatás"
                                        >
                                          <IconArrowDown size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                  <td className="text-center">
                                    {(stats.matchesWon || 0) * 2}
                                  </td>
                                  <td className="text-center text-success">
                                    {stats.matchesWon || 0}
                                  </td>
                                  <td className="text-center text-error">
                                    {stats.matchesLost || 0}
                                  </td>
                                  <td className="text-center text-success">
                                    {stats.legsWon || 0}
                                  </td>
                                  <td className="text-center text-error">
                                    {stats.legsLost || 0}
                                  </td>
                                  <td className={`text-center font-bold ${legDifference > 0 ? 'text-success' : legDifference < 0 ? 'text-error' : ''}`}>
                                    {legDifference > 0 ? '+' : ''}{legDifference}
                                  </td>
                                  <td className="text-center">
                                    {stats.avg || 0}
                                  </td>
                                  <td className="text-center">
                                    {stats.oneEightiesCount || 0}
                                  </td>
                                  <td className="text-center">
                                    {stats.highestCheckout || 0}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Matches Section */}
                    <div>
                      <button
                        className="btn shadow-md btn-sm w-full flex justify-between items-center mb-4"
                        onClick={() => toggleMatches(group._id)}
                      >
                        <span>Mérkőzések</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${isMatchesExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isMatchesExpanded && (
                        <div className="mt-4">
                          <div className="mb-4 flex flex-col items-start gap-2">
                            <label className="label">
                              <span className="label-text">Szűrés állapot szerint:</span>
                            </label>
                            <select
                              className="select select-sm select-bordered"
                              value={matchFilter}
                              onChange={(e) => setMatchFilter(e.target.value as 'all' | 'pending' | 'ongoing' | 'finished')}
                            >
                              <option value="all">Összes</option>
                              <option value="pending">Függőben</option>
                              <option value="ongoing">Folyamatban</option>
                              <option value="finished">Befejezve</option>
                            </select>
                          </div>

                          {group.matches && group.matches.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="table table-zebra w-full">
                                <thead>
                                  <tr>
                                    <th className="text-center">Sorszám</th>
                                    <th>Játékosok</th>
                                    <th>Pontozó</th>
                                    <th className="text-center">Állapot</th>
                                    <th className="text-center">Átlag</th>
                                    <th className="text-center">Eredmény</th>
                                    <th className="text-center">Műveletek</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.matches
                                    .filter((match: Match) =>
                                      matchFilter === 'all' ? true : match.status === matchFilter
                                    )
                                    .map((match: Match, matchIndex: number) => (
                                    <tr key={match._id} className="hover:bg-base-200">
                                      <td className="text-center font-bold">
                                        {matchIndex + 1}.
                                      </td>
                                      <td className="font-semibold">
                                        {match.player1?.playerId?.name || 'Ismeretlen'} vs {match.player2?.playerId?.name || 'Ismeretlen'}
                                      </td>
                                      <td>
                                        {match.scorer?.name || 'Nincs'}
                                      </td>
                                      <td className="text-center">
                                        <span className={`badge ${
                                          match.status === 'pending' ? 'badge-warning' : 
                                          match.status === 'ongoing' ? 'badge-primary' : 
                                          match.status === 'finished' ? 'badge-success' : 'badge-ghost'
                                        }`}>
                                          {match.status === 'pending' ? 'Függőben' : 
                                           match.status === 'ongoing' ? 'Folyamatban' : 
                                           match.status === 'finished' ? 'Befejezett' : 'Ismeretlen'}
                                        </span>
                                      </td>
                                      <td className="text-center">
                                        {match.player1.average && match.player2.average ? (
                                          <span>
                                            {match.player1.average?.toFixed(1)} - {match.player2.average?.toFixed(1)}
                                          </span>
                                        ) : (
                                          '-'
                                        )}
                                      </td>
                                      <td className="text-center">
                                        {(match.status === 'finished' || match.status === 'ongoing') ? (
                                          <span className="badge badge-neutral">
                                            {match.player1.legsWon} - {match.player2.legsWon}
                                          </span>
                                        ) : (
                                          '-'
                                        )}
                                      </td>
                                      <td className="text-center">
                                        <div className="flex gap-1">
                                          {(match.status === 'ongoing' || match.status === 'finished') && (
                                            <button
                                              className="btn btn-info btn-sm"
                                              onClick={() => handleViewLegs(match)}
                                              title="Legek megtekintése"
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                              </svg>
                                              Legek
                                            </button>
                                          )}
                                          {isAdminOrModerator && (
                                            <button
                                              className="btn btn-warning btn-sm"
                                              onClick={() => handleEditMatch(match)}
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                              </svg>
                                              Szerkesztés
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p>Nincsenek mérkőzések a csoportban.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Modal */}
      {showAdminModal && selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-2xl p-8 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-center mb-6">Meccs Szerkesztése</h3>
            
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold mb-2">
                {selectedMatch.player1?.playerId?.name} vs {selectedMatch.player2?.playerId?.name}
              </h4>
              <p className="text-base-content/70">Állítsd be a meccs eredményét és statisztikáit</p>
            </div>
            
            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Player 1 Stats */}
              <div className="space-y-4">
                <h5 className="font-bold text-lg text-primary">{selectedMatch.player1?.playerId?.name}</h5>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Nyert legek:</span>
                  </label>
                  <input
                    type="number"
                    max="10"
                    className="input input-bordered w-full"
                    value={player1Legs}
                    onChange={(e) => setPlayer1Legs(parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">180-ak száma:</span>
                  </label>
                  <input
                    type="number"
                    max="50"
                    className="input input-bordered w-full"
                    value={player1Stats.oneEightiesCount || 0 }
                    onChange={(e) => setPlayer1Stats(prev => ({
                      ...prev,
                      oneEightiesCount: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Legmagasabb kiszálló:</span>
                  </label>
                  <input
                    type="number"
                    max="170"
                    className="input input-bordered w-full"
                    value={player1Stats.highestCheckout || 0}
                    onChange={(e) => setPlayer1Stats(prev => ({
                      ...prev,
                      highestCheckout: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>

              {/* Player 2 Stats */}
              <div className="space-y-4">
                <h5 className="font-bold text-lg text-primary">{selectedMatch.player2?.playerId?.name}</h5>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Nyert legek:</span>
                  </label>
                  <input
                    type="number"
                    max="10"
                    className="input input-bordered w-full"
                    value={player2Legs}
                    onChange={(e) => setPlayer2Legs(parseInt(e.target.value) || 0)}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">180-ak száma:</span>
                  </label>
                  <input
                    type="number"
                    max="50"
                    className="input input-bordered w-full"
                    value={player2Stats.oneEightiesCount || 0}
                    onChange={(e) => setPlayer2Stats(prev => ({
                      ...prev,
                      oneEightiesCount: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Legmagasabb kiszálló:</span>
                  </label>
                  <input
                    type="number"
                    max="170"
                    className="input input-bordered w-full"
                    value={player2Stats.highestCheckout || 0}
                    onChange={(e) => setPlayer2Stats(prev => ({
                      ...prev,
                      highestCheckout: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                className="btn btn-error flex-1"
                onClick={() => {
                  setShowAdminModal(false);
                  setSelectedMatch(null);
                  setError('');
                }}
              >
                Mégse
              </button>
              <button
                className="btn btn-success flex-1"
                onClick={handleSaveMatch}
                disabled={loading || player1Legs === player2Legs}
              >
                {loading ? (
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
        match={selectedMatchForLegs}
      />
    </div>
  );
};

export default TournamentGroupsView; 