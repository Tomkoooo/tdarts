import React, { useState } from 'react';

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

  const isAdminOrModerator = userClubRole === 'admin' || userClubRole === 'moderator';

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
    <div className="space-y-6">
      {tournament.groups.map((group: any, groupIndex: number) => (
        <div key={group._id} className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-lg font-bold text-primary mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Csoport {groupIndex + 1} - Tábla {group.board}
            </h3>

            {/* Group Players */}
            <div className="mb-6">
              <h4 className="font-bold text-base mb-2">Játékosok:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {tournament.tournamentPlayers
                  .filter((player: any) => player.groupId === group._id)
                  .sort((a: any, b: any) => (a.groupStanding || 0) - (b.groupStanding || 0))
                  .map((player: any, index: number) => (
                    <div key={player._id} className="badge badge-primary badge-lg">
                      {index + 1}. {player.playerReference?.name || 'Ismeretlen'}
                      {player.groupStanding && ` (${player.groupStanding}.)`}
                    </div>
                  ))}
              </div>
            </div>

            {/* Group Matches */}
            <div>
              <h4 className="font-bold text-base mb-3">Meccsek:</h4>
              <div className="space-y-3">
                {group.matches && group.matches.map((match: Match) => (
                  <div key={match._id} className="card bg-base-100 shadow-sm">
                    <div className="card-body p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-semibold">
                            {match.player1?.playerId?.name || 'Ismeretlen'} vs {match.player2?.playerId?.name || 'Ismeretlen'}
                          </div>
                          <div className="text-sm text-base-content/70">
                            Állás: {match.player1?.legsWon || 0} - {match.player2?.legsWon || 0}
                          </div>
                          <div className="text-xs text-base-content/50">
                            Státusz: {match.status === 'pending' ? 'Várakozik' : 
                                     match.status === 'ongoing' ? 'Folyamatban' : 
                                     match.status === 'finished' ? 'Befejezett' : 'Ismeretlen'}
                          </div>
                        </div>
                        
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

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
                    min="0"
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
                    min="0"
                    max="50"
                    className="input input-bordered w-full"
                    value={player1Stats.oneEightiesCount}
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
                    min="0"
                    max="170"
                    className="input input-bordered w-full"
                    value={player1Stats.highestCheckout}
                    onChange={(e) => setPlayer1Stats(prev => ({
                      ...prev,
                      highestCheckout: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>

              {/* Player 2 Stats */}
              <div className="space-y-4">
                <h5 className="font-bold text-lg text-secondary">{selectedMatch.player2?.playerId?.name}</h5>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Nyert legek:</span>
                  </label>
                  <input
                    type="number"
                    min="0"
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
                    min="0"
                    max="50"
                    className="input input-bordered w-full"
                    value={player2Stats.oneEightiesCount}
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
                    min="0"
                    max="170"
                    className="input input-bordered w-full"
                    value={player2Stats.highestCheckout}
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
    </div>
  );
};

export default TournamentGroupsView; 