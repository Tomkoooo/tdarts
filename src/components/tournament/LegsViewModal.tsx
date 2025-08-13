import React, { useState, useEffect } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import MatchStatisticsCharts from './MatchStatisticsCharts';

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
  doubleAttempts: number;
  createdAt: string;
}

interface Match {
  _id: string;
  player1: {
    playerId: {
      _id: string;
      name: string;
    };
  };
  player2: {
    playerId: {
      _id: string;
      name: string;
    };
  };
  legs?: Leg[];
  clubId?: string;
}

interface LegsViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
}

const LegsViewModal: React.FC<LegsViewModalProps> = ({ isOpen, onClose, match }) => {
  const [legs, setLegs] = useState<Leg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [clubId, setClubId] = useState<string | undefined>(undefined);

  // Feature flag for detailed statistics (requires pro subscription)
  const { isEnabled: isDetailedStatsEnabled, isLoading: isFeatureFlagLoading } = useFeatureFlag('detailedStatistics', clubId);



  // Fetch clubId from tournament
  useEffect(() => {
    if (match?._id) {
      fetchClubId();
    }
  }, [match?._id]);

  const fetchClubId = async () => {
    if (!match?._id) return;

    try {
      const response = await fetch(`/api/matches/${match._id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.match?.tournamentRef) {
          // Fetch tournament to get clubId using tournamentRef (ObjectId)
          const tournamentResponse = await fetch(`/api/tournaments/by-id/${data.match.tournamentRef}`);
          if (tournamentResponse.ok) {
            const tournamentData = await tournamentResponse.json();
            if (tournamentData.success && tournamentData.tournament?.clubId) {
              setClubId(tournamentData.tournament.clubId);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching clubId:', err);
    }
  };

  useEffect(() => {
    if (isOpen && match) {
      fetchLegs();
    }
  }, [isOpen, match]);

  const fetchLegs = async () => {
    if (!match) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/matches/${match._id}/legs`);
      if (!response.ok) {
        throw new Error('Nem sikerült betölteni a legeket');
      }

      const data = await response.json();
      if (data.success) {
        setLegs(data.legs || []);
      } else {
        setError(data.error || 'Nem sikerült betölteni a legeket');
      }
    } catch (err) {
      setError('Hiba történt a legek betöltése során');
      console.error('Fetch legs error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate running averages for a player's throws
  const calculateRunningAverages = (throws: Throw[]) => {
    const averages: number[] = [];
    let totalScore = 0;

    throws.forEach((throwData, index) => {
      totalScore += throwData.score;
      // 3-dart average: total score / number of throws so far
      const average = (index + 1) > 0 ? Math.round((totalScore / (index + 1)) * 100) / 100 : 0;
      averages.push(average);
    });

    return averages;
  };

  // Calculate leg statistics
  const calculateLegStats = (throws: Throw[]) => {
    if (throws.length === 0) return { average: 0, highestThrow: 0 };

    const totalScore = throws.reduce((sum, t) => sum + t.score, 0);
    // 3-dart average: total score / number of throws
    const average = throws.length > 0 ? Math.round((totalScore / throws.length) * 100) / 100 : 0;
    const highestThrow = Math.max(...throws.map(t => t.score));

    return { average, highestThrow };
  };

  // Calculate match statistics
  const calculateMatchStats = () => {
    const player1AllThrows = legs.flatMap(leg => leg.player1Throws);
    const player2AllThrows = legs.flatMap(leg => leg.player2Throws);

    const player1Stats = calculateLegStats(player1AllThrows);
    const player2Stats = calculateLegStats(player2AllThrows);

    return { player1Stats, player2Stats };
  };


  const formatThrow = (throwData: Throw, isWinner: boolean) => {
    const baseClasses = "px-2 py-1 rounded text-sm font-medium";
    let classes = baseClasses;

    if (throwData.isCheckout && isWinner) {
      classes += " bg-success text-success-content";
    } else if (throwData.score === 180) {
      classes += " bg-warning text-warning-content";
    } else if (throwData.score >= 140) {
      classes += " bg-info text-info-content";
    } else if (throwData.score >= 100) {
      classes += " bg-primary text-primary-content";
    } else {
      classes += " bg-base-300 text-base-content";
    }

    return (
      <span className={classes} title={`${throwData.score} pont (${throwData.darts} nyil)`}>
        {throwData.score}
      </span>
    );
  };

  if (!isOpen || !match) return null;



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-2xl p-6 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold">
              {match.player1?.playerId?.name} vs {match.player2?.playerId?.name}
            </h3>
            <p className="text-base-content/70">Legek részletei</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Detailed Stats Toggle Button - Only for Pro */}
            {!isFeatureFlagLoading && isDetailedStatsEnabled && (
              <button
                onClick={() => setShowDetailedStats(!showDetailedStats)}
                className={`btn btn-sm ${showDetailedStats ? 'btn-primary' : 'btn-outline'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Részletes statisztikák
              </button>
            )}
            <button
              onClick={onClose}
              className="btn btn-circle btn-ghost btn-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Pro Subscription Notice - Only show if detailed stats are not enabled */}
        {!isFeatureFlagLoading && !isDetailedStatsEnabled && (
          <div className="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-bold">Pro funkció</h3>
              <div className="text-xs">
                <p>• <strong>Ingyenes:</strong> Dobások megjelenítése, győztesek, kiszállók</p>
                <p>• <strong>Pro:</strong> Átlagok, futó átlagok, összesített statisztikák, grafikonok</p>
              </div>
            </div>
          </div>
        )}

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

        {!loading && !error && legs.length === 0 && (
          <div className="alert alert-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Még nincsenek rögzített legek ehhez a meccshez.</span>
          </div>
        )}

        {!loading && !error && legs.length > 0 && (
          <div className="space-y-6">
            {/* Match Overview Stats */}
            {showDetailedStats && (
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body">
                  <h4 className="text-lg font-bold mb-4">Meccs áttekintés</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(() => {
                      const { player1Stats, player2Stats } = calculateMatchStats();
                      return (
                        <>
                          <div className="space-y-3">
                            <h5 className="font-bold text-primary">{match.player1?.playerId?.name}</h5>
                            <div className="stats stats-vertical shadow">
                              <div className="stat">
                                <div className="stat-title">Átlag</div>
                                <div className="stat-value text-primary">{player1Stats.average}</div>
                              </div>
                              <div className="stat">
                                <div className="stat-title">Legmagasabb dobás</div>
                                <div className="stat-value text-base-content/70">{player1Stats.highestThrow}</div>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h5 className="font-bold text-primary">{match.player2?.playerId?.name}</h5>
                            <div className="stats stats-vertical shadow">
                              <div className="stat">
                                <div className="stat-title">Átlag</div>
                                <div className="stat-value text-primary">{player2Stats.average}</div>
                              </div>
                              <div className="stat">
                                <div className="stat-title">Legmagasabb dobás</div>
                                <div className="stat-value text-base-content/70">{player2Stats.highestThrow}</div>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Charts Section - Only for Pro users */}
            {showDetailedStats && legs.length > 0 && (
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body">
                  <h4 className="text-lg font-bold mb-4">Statisztikai Grafikonok</h4>
                  <MatchStatisticsCharts
                    legs={legs}
                    player1Name={match.player1?.playerId?.name || 'Player 1'}
                    player2Name={match.player2?.playerId?.name || 'Player 2'}
                  />
                </div>
              </div>
            )}

            {legs.map((leg, legIndex) => {
              const isPlayer1Winner = leg.winnerId._id === match.player1?.playerId?._id;
              const isPlayer2Winner = leg.winnerId._id === match.player2?.playerId?._id;
              
              // Calculate running averages for this leg (only for pro users)
              const player1RunningAverages = showDetailedStats ? calculateRunningAverages(leg.player1Throws) : [];
              const player2RunningAverages = showDetailedStats ? calculateRunningAverages(leg.player2Throws) : [];
              
              // Calculate leg stats (only for pro users)
              const player1LegStats = showDetailedStats ? calculateLegStats(leg.player1Throws) : null;
              const player2LegStats = showDetailedStats ? calculateLegStats(leg.player2Throws) : null;
              
              return (
                <div key={legIndex} className="card bg-base-200 shadow-lg">
                  <div className="card-body">
                    {/* Leg Header */}
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-bold">
                        {legIndex + 1}. Leg
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-base-content/70">
                          Győztes: {leg.winnerId.name}
                        </span>
                        {leg.checkoutScore && (
                          <span className="badge badge-success">
                            {leg.checkoutScore} kiszálló
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Players and Throws - Basic info for everyone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Player 1 */}
                      <div className={`p-4 rounded-lg ${isPlayer1Winner ? 'bg-success/20 border border-success/30' : 'bg-base-100'}`}>
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-bold text-lg">
                            {match.player1?.playerId?.name}
                          </h5>
                          {/* Pro-only detailed stats */}
                          {showDetailedStats && player1LegStats && (
                            <div className="text-right text-sm">
                              <div className="font-medium">Átlag: {player1LegStats.average}</div>
                              <div className="text-base-content/70">Legmagasabb: {player1LegStats.highestThrow}</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {leg.player1Throws.map((throwData, throwIndex) => (
                              <div key={throwIndex} className="flex items-center gap-1">
                                {formatThrow(throwData, isPlayer1Winner)}
                                {/* Pro-only running averages */}
                                {showDetailedStats && player1RunningAverages[throwIndex] !== undefined && (
                                  <span className="text-xs text-base-content/50">
                                    ({player1RunningAverages[throwIndex]})
                                  </span>
                                )}
                                {throwIndex < leg.player1Throws.length - 1 && (
                                  <span className="text-base-content/50">→</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {leg.player1Throws.length === 0 && (
                            <span className="text-base-content/50 text-sm">Nincs dobás</span>
                          )}
                        </div>
                      </div>

                      {/* Player 2 */}
                      <div className={`p-4 rounded-lg ${isPlayer2Winner ? 'bg-success/20 border border-success/30' : 'bg-base-100'}`}>
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-bold text-lg">
                            {match.player2?.playerId?.name}
                          </h5>
                          {/* Pro-only detailed stats */}
                          {showDetailedStats && player2LegStats && (
                            <div className="text-right text-sm">
                              <div className="font-medium">Átlag: {player2LegStats.average}</div>
                              <div className="text-base-content/70">Legmagasabb: {player2LegStats.highestThrow}</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {leg.player2Throws.map((throwData, throwIndex) => (
                              <div key={throwIndex} className="flex items-center gap-1">
                                {formatThrow(throwData, isPlayer2Winner)}
                                {/* Pro-only running averages */}
                                {showDetailedStats && player2RunningAverages[throwIndex] !== undefined && (
                                  <span className="text-xs text-base-content/50">
                                    ({player2RunningAverages[throwIndex]})
                                  </span>
                                )}
                                {throwIndex < leg.player2Throws.length - 1 && (
                                  <span className="text-base-content/50">→</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {leg.player2Throws.length === 0 && (
                            <span className="text-base-content/50 text-sm">Nincs dobás</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Leg Stats - Basic info for everyone, detailed for pro */}
                    <div className="mt-4 pt-4 border-t border-base-300">
                      <div className="flex justify-between items-center text-sm text-base-content/70">
                        <span>
                          {new Date(leg.createdAt).toLocaleString('hu-HU')}
                        </span>
                        {/* Pro-only detailed stats */}
                        {showDetailedStats && (
                          <div className="flex gap-4 text-xs">
                            <span>Dobások száma: {leg.player1Throws.length + leg.player2Throws.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-4 border-t border-base-300">
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegsViewModal; 