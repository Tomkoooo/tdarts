import React, { useState, useEffect } from 'react';
import { IconTrophy, IconClock, IconX, IconChartBar } from '@tabler/icons-react';

interface Throw {
  score: number;
  darts: number;
  isDouble: boolean;
  isCheckout: boolean;
}

interface Leg {
  player1Score: number;
  player2Score: number;
  player1Throws: Throw[];
  player2Throws: Throw[];
  winnerId: {
    _id: string;
    name: string;
  };
  checkoutScore?: number;
  checkoutDarts?: number;
  winnerArrowCount?: number;
  loserRemainingScore?: number;
  doubleAttempts: number;
  createdAt: string;
}

interface Match {
  _id: string;
  player1: {
    legsWon: number;
    playerId: {
      _id: string;
      name: string;
    };
  };
  player2: {
    legsWon: number;
    playerId: {
      _id: string;
      name: string;
    };
  };
  winnerId?: string;
  status: string;
  legs?: Leg[];
  createdAt: string;
  round?: string;
  groupName?: string;
}

interface PlayerMatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  tournamentCode: string;
  onShowDetailedStats?: (matchId: string) => void;
}

const PlayerMatchesModal: React.FC<PlayerMatchesModalProps> = ({ 
  isOpen, 
  onClose, 
  playerId, 
  playerName, 
  tournamentCode,
  onShowDetailedStats,
}) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && playerId) {
      fetchPlayerMatches();
    }
  }, [isOpen, playerId, tournamentCode]);

  const fetchPlayerMatches = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentCode}/player-matches/${playerId}`);
      if (!response.ok) {
        throw new Error('Nem sikerült betölteni a meccseket');
      }

      const data = await response.json();
      if (data.success) {
        setMatches(data.matches || []);
      } else {
        setError(data.error || 'Nem sikerült betölteni a meccseket');
      }
    } catch (err) {
      setError('Hiba történt a meccsek betöltése során');
      console.error('Fetch player matches error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-base-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold truncate text-primary">
              {playerName} meccsei
            </h3>
            <p className="text-xs sm:text-sm text-base-content/70">
              {matches.length} meccs • {matches.filter(m => m.winnerId === playerId).length} győzelem • {matches.filter(m => m.winnerId !== playerId && m.status === 'finished').length} vereség
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn btn-circle btn-ghost btn-xs sm:btn-sm flex-shrink-0"
              aria-label="Bezárás"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}

        {error && (
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && matches.length === 0 && (
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Még nincsenek rögzített meccsek ehhez a játékoshoz.</span>
          </div>
        )}

        {!loading && !error && matches.length > 0 && (
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {matches.map((match, matchIndex) => {
              const isPlayerWinner = match.winnerId === playerId;
              const opponent = playerId === match.player1?.playerId?._id ? match.player2 : match.player1;
              const isPlayer1 = playerId === match.player1?.playerId?._id;
              
              return (
                <div key={match._id} className="card bg-base-200 shadow-lg">
                  <div className="card-body p-3 sm:p-4 md:p-5">
                    {/* Match Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/20 flex-shrink-0">
                          <span className="text-sm sm:text-base font-bold text-accent">{matchIndex + 1}</span>
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base md:text-lg font-bold">
                            vs {opponent?.playerId?.name}
                          </h4>
                          <div className="text-xs sm:text-sm text-base-content/60 space-y-1">
                            <div className="flex items-center gap-2">
                              {match.groupName && (
                                <>
                                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs">
                                    {match.groupName}
                                  </span>
                                </>
                              )}
                              {match.round && (
                                <span className="bg-accent/20 text-accent px-2 py-0.5 rounded text-xs">
                                  {match.round}
                                </span>
                              )}
                              {/* Match Score */}
                              {match.status === 'finished' && (
                                <div className="badge badge-outline font-bold">
                                  {isPlayer1 ? `${match.player1.legsWon} - ${match.player2.legsWon}` : `${match.player2.legsWon} - ${match.player1.legsWon}`}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isPlayerWinner ? (
                                <>
                                  <IconTrophy size={12} className="text-warning" />
                                  <span className="text-success font-semibold">Győzelem</span>
                                </>
                              ) : match.status === 'finished' ? (
                                <>
                                  <span className="text-error font-semibold">Vereség</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-warning font-semibold">Folyamatban</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-base-content/60">
                          <IconClock size={14} />
                          <span className="ml-1">{new Date(match.createdAt).toLocaleDateString('hu-HU')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Match Summary */}
                    <div className="bg-base-100 rounded-lg p-3 border border-base-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {match.legs ? `${match.legs.length} leg` : '0 leg'}
                          </span>
                          {match.status === 'finished' && (
                            <span className="text-xs text-base-content/60">
                              • {isPlayerWinner ? 'Győzelem' : 'Vereség'}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => (match._id && onShowDetailedStats && onShowDetailedStats(match._id))}
                          className="btn btn-outline btn-primary btn-sm flex items-center gap-1"
                          disabled={!match.legs || match.legs.length === 0}
                        >
                          <IconChartBar size={14} />
                          <span>Legek</span>
                        </button>
                      </div>
                    </div>

                    {/* Match Status */}
                    {match.status !== 'finished' && (
                      <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded-lg">
                        <div className="text-sm text-warning">
                          <IconClock size={14} className="inline mr-1" />
                          Meccs folyamatban...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-base-300">
          <button
            onClick={onClose}
            className="btn btn-primary btn-sm sm:btn-md w-full sm:w-auto"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerMatchesModal;
