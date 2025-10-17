import React, { useState, useEffect } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import MatchStatisticsCharts from './MatchStatisticsCharts';
import { IconTrophy, IconTarget, IconTrendingDown, IconCheck, IconClock } from '@tabler/icons-react';

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
  winnerArrowCount?: number; // Hány nyílból szállt ki a győztes
  loserRemainingScore?: number; // A vesztes játékos maradék pontjai
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
  onBackToMatches?: () => void;
}

const LegsViewModal: React.FC<LegsViewModalProps> = ({ isOpen, onClose, match: initialMatch, onBackToMatches }) => {
  const [match, setMatch] = useState<Match | null>(initialMatch);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [clubId, setClubId] = useState<string | undefined>(undefined);

  // Feature flag for detailed statistics (requires pro subscription)
  const { isEnabled: isDetailedStatsEnabled, isLoading: isFeatureFlagLoading } = useFeatureFlag('detailedStatistics', clubId);



  // Update match when initialMatch changes
  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  // Fetch match data to get opponent name
  useEffect(() => {
    if (match?._id && isOpen) {
      fetchMatchData();
      fetchClubId();
    }
  }, [match?._id, isOpen]);

  const fetchMatchData = async () => {
    if (!match?._id) return;

    try {
      const response = await fetch(`/api/matches/${match._id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.match) {
          // Update match data with full player information
          setMatch(data.match);
        }
      }
    } catch (err) {
      console.error('Error fetching match data:', err);
    }
  };

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

  // Calculate total arrows for a player in a leg
  const calculatePlayerArrows = (throws: Throw[], isWinner: boolean, winnerArrowCount?: number) => {
    if (throws.length === 0) return 0;
    
    if (isWinner) {
      // Győztes: (dobások száma - 1) * 3 + kiszálló nyilak
      return (throws.length - 1) * 3 + (winnerArrowCount || 3);
    } else {
      // Vesztes: dobások száma * 3
      return throws.length * 3;
    }
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
    const baseClasses = "inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs sm:text-sm font-medium min-w-[32px] sm:min-w-[40px]";
    let classes = baseClasses;

    if (throwData.isCheckout && isWinner) {
      classes += " bg-success text-success-content ring-2 ring-success/50";
    } else if (throwData.score === 180) {
      classes += " bg-warning text-warning-content ring-2 ring-warning/50";
    } else if (throwData.score === 0) {
      classes += " bg-error text-error-content ring-2 ring-error/50";
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-base-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold truncate" title={`${match.player1?.playerId?.name} vs ${match.player2?.playerId?.name}`}>
              <span className="text-primary">{match.player1?.playerId?.name}</span>
              <span className="text-base-content/40 mx-2">vs</span>
              <span className="text-error">{match.player2?.playerId?.name}</span>
            </h3>
            <p className="text-xs sm:text-sm text-base-content/70">Legek részletei</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Back to matches button */}
            {onBackToMatches && (
              <button
                onClick={onBackToMatches}
                className="btn btn-outline btn-sm flex items-center gap-1"
                title="Vissza a meccsekhez"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Vissza</span>
              </button>
            )}
            {/* Detailed Stats Toggle Button - Only for Pro */}
            {!isFeatureFlagLoading && isDetailedStatsEnabled && (
              <button
                onClick={() => setShowDetailedStats(!showDetailedStats)}
                className={`btn btn-xs sm:btn-sm flex-1 sm:flex-none ${showDetailedStats ? 'btn-primary' : 'btn-outline'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden sm:inline ml-1">Részletes</span>
                <span className="sm:hidden ml-1">Stats</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="btn btn-circle btn-ghost btn-xs sm:btn-sm flex-shrink-0"
              aria-label="Bezárás"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Pro Subscription Notice - Only show if detailed stats are not enabled */}
        {!isFeatureFlagLoading && !isDetailedStatsEnabled && (
          <div className="alert alert-info mb-3 sm:mb-4 p-3 sm:p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm sm:text-base">Pro funkció</h3>
              <div className="text-[10px] sm:text-xs space-y-1 mt-1">
                <p>• <strong>Ingyenes:</strong> Dobások, győztesek, kiszállók</p>
                <p>• <strong>Pro:</strong> Átlagok, grafikonok, statisztikák</p>
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
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Match Overview Stats */}
            {showDetailedStats && (
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body p-3 sm:p-4 md:p-6">
                  <h4 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Meccs összesítő
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {(() => {
                      const { player1Stats, player2Stats } = calculateMatchStats();
                      return (
                        <>
                          <div className="card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                            <div className="card-body p-3 sm:p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-bold text-primary text-sm sm:text-base truncate flex-1 mr-2" title={match.player1?.playerId?.name}>
                                  {match.player1?.playerId?.name}
                                </h5>
                                <div className="badge badge-primary badge-xs sm:badge-sm">P1</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="bg-base-100 rounded-lg p-2 sm:p-3 text-center">
                                  <div className="text-[10px] sm:text-xs text-base-content/60 mb-1">Átlag</div>
                                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-primary">{player1Stats.average}</div>
                                </div>
                                <div className="bg-base-100 rounded-lg p-2 sm:p-3 text-center">
                                  <div className="text-[10px] sm:text-xs text-base-content/60 mb-1">Max dobás</div>
                                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-info">{player1Stats.highestThrow}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="card bg-gradient-to-br from-error/10 to-error/5 border border-error/20">
                            <div className="card-body p-3 sm:p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-bold text-error text-sm sm:text-base truncate flex-1 mr-2" title={match.player2?.playerId?.name}>
                                  {match.player2?.playerId?.name}
                                </h5>
                                <div className="badge badge-error badge-xs sm:badge-sm">P2</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div className="bg-base-100 rounded-lg p-2 sm:p-3 text-center">
                                  <div className="text-[10px] sm:text-xs text-base-content/60 mb-1">Átlag</div>
                                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-error">{player2Stats.average}</div>
                                </div>
                                <div className="bg-base-100 rounded-lg p-2 sm:p-3 text-center">
                                  <div className="text-[10px] sm:text-xs text-base-content/60 mb-1">Max dobás</div>
                                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-info">{player2Stats.highestThrow}</div>
                                </div>
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
                <div className="card-body p-3 sm:p-4 md:p-6">
                  <h4 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    Statisztikai grafikonok
                  </h4>
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
              
              // Calculate loser's remaining score
              const loserThrows = isPlayer1Winner ? leg.player2Throws : leg.player1Throws;
              const loserTotalScore = loserThrows.reduce((sum, t) => sum + t.score, 0);
              const loserRemainingScore = leg.loserRemainingScore !== undefined 
                ? leg.loserRemainingScore 
                : Math.abs(loserTotalScore - 501);
              
              // Calculate running averages for this leg (only for pro users)
              const player1RunningAverages = showDetailedStats ? calculateRunningAverages(leg.player1Throws) : [];
              const player2RunningAverages = showDetailedStats ? calculateRunningAverages(leg.player2Throws) : [];
              
              // Calculate leg stats (only for pro users)
              const player1LegStats = showDetailedStats ? calculateLegStats(leg.player1Throws) : null;
              const player2LegStats = showDetailedStats ? calculateLegStats(leg.player2Throws) : null;
              
              return (
                <div key={legIndex} className="card bg-base-200 shadow-lg">
                  <div className="card-body p-3 sm:p-4 md:p-5">
                    {/* Leg Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/20 flex-shrink-0">
                          <span className="text-sm sm:text-base font-bold text-accent">{legIndex + 1}</span>
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base md:text-lg font-bold">
                            {legIndex + 1}. Leg
                          </h4>
                          <div className="text-xs sm:text-sm text-base-content/60 space-y-1">
                            <div className="flex items-center gap-2">
                              <IconTrophy size={12} className="text-warning" />
                              <span>{leg.winnerId.name}</span>
                              <IconTarget size={12} className="text-primary" />
                              <span className="text-primary">{leg.winnerArrowCount || 3} nyíl</span>
                            </div>
                            <div className="flex items-center gap-1 text-error text-[10px] sm:text-xs">
                              <IconTrendingDown size={10} />
                              <span>Vesztes maradt: {loserRemainingScore} pont</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {leg.checkoutScore && (
                          <div className="badge badge-success badge-sm gap-1">
                            <IconCheck size={12} />
                            <span className="text-xs">{leg.checkoutScore}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Players and Throws - Basic info for everyone */}
                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      {/* Player 1 */}
                      <div className={`p-3 sm:p-4 rounded-lg ${isPlayer1Winner ? 'bg-success/20 border-2 border-success/40' : 'bg-base-100 border border-base-300'}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="badge badge-primary badge-xs sm:badge-sm flex-shrink-0">P1</div>
                            <h5 className="font-bold text-sm sm:text-base md:text-lg text-primary truncate" title={match.player1?.playerId?.name}>
                              {match.player1?.playerId?.name}
                            </h5>
                            {isPlayer1Winner && (
                              <IconTrophy size={16} className="text-warning" />
                            )}
                            <div className="flex items-center gap-1 text-xs text-base-content/60">
                              <IconTarget size={12} className="text-primary" />
                              <span>{calculatePlayerArrows(leg.player1Throws, isPlayer1Winner, leg.winnerArrowCount)} nyíl</span>
                            </div>
                          </div>
                          {/* Pro-only detailed stats */}
                          {showDetailedStats && player1LegStats && (
                            <div className="flex gap-2 sm:gap-3 text-xs sm:text-sm">
                              <div className="bg-base-200 rounded px-2 py-1">
                                <span className="text-base-content/60">Átlag:</span>
                                <span className="font-bold ml-1">{player1LegStats.average}</span>
                              </div>
                              <div className="bg-base-200 rounded px-2 py-1">
                                <span className="text-base-content/60">Max:</span>
                                <span className="font-bold ml-1">{player1LegStats.highestThrow}</span>
                              </div>
                              <div className="bg-base-200 rounded px-2 py-1">
                                <span className="text-base-content/60">Nyilak:</span>
                                <span className="font-bold ml-1">{calculatePlayerArrows(leg.player1Throws, isPlayer1Winner, leg.winnerArrowCount)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1 sm:gap-1.5">
                            {leg.player1Throws.map((throwData, throwIndex) => (
                              <div key={throwIndex} className="flex items-center gap-1">
                                {formatThrow(throwData, isPlayer1Winner)}
                                {/* Pro-only running averages */}
                                {showDetailedStats && player1RunningAverages[throwIndex] !== undefined && (
                                  <span className="text-[10px] sm:text-xs text-base-content/50 hidden sm:inline">
                                    ({player1RunningAverages[throwIndex]})
                                  </span>
                                )}
                                {throwIndex < leg.player1Throws.length - 1 && (
                                  <span className="text-base-content/30 text-xs hidden sm:inline">→</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {leg.player1Throws.length === 0 && (
                            <span className="text-base-content/50 text-xs sm:text-sm">Nincs dobás</span>
                          )}
                        </div>
                      </div>

                      {/* Player 2 */}
                      <div className={`p-3 sm:p-4 rounded-lg ${isPlayer2Winner ? 'bg-success/20 border-2 border-success/40' : 'bg-base-100 border border-base-300'}`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="badge badge-error badge-xs sm:badge-sm flex-shrink-0">P2</div>
                            <h5 className="font-bold text-sm sm:text-base md:text-lg text-error truncate" title={match.player2?.playerId?.name}>
                              {match.player2?.playerId?.name}
                            </h5>
                            {isPlayer2Winner && (
                              <IconTrophy size={16} className="text-warning" />
                            )}
                            <div className="flex items-center gap-1 text-xs text-base-content/60">
                              <IconTarget size={12} className="text-error" />
                              <span>{calculatePlayerArrows(leg.player2Throws, isPlayer2Winner, leg.winnerArrowCount)} nyíl</span>
                            </div>
                          </div>
                          {/* Pro-only detailed stats */}
                          {showDetailedStats && player2LegStats && (
                            <div className="flex gap-2 sm:gap-3 text-xs sm:text-sm">
                              <div className="bg-base-200 rounded px-2 py-1">
                                <span className="text-base-content/60">Átlag:</span>
                                <span className="font-bold ml-1">{player2LegStats.average}</span>
                              </div>
                              <div className="bg-base-200 rounded px-2 py-1">
                                <span className="text-base-content/60">Max:</span>
                                <span className="font-bold ml-1">{player2LegStats.highestThrow}</span>
                              </div>
                              <div className="bg-base-200 rounded px-2 py-1">
                                <span className="text-base-content/60">Nyilak:</span>
                                <span className="font-bold ml-1">{calculatePlayerArrows(leg.player2Throws, isPlayer2Winner, leg.winnerArrowCount)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1 sm:gap-1.5">
                            {leg.player2Throws.map((throwData, throwIndex) => (
                              <div key={throwIndex} className="flex items-center gap-1">
                                {formatThrow(throwData, isPlayer2Winner)}
                                {/* Pro-only running averages */}
                                {showDetailedStats && player2RunningAverages[throwIndex] !== undefined && (
                                  <span className="text-[10px] sm:text-xs text-base-content/50 hidden sm:inline">
                                    ({player2RunningAverages[throwIndex]})
                                  </span>
                                )}
                                {throwIndex < leg.player2Throws.length - 1 && (
                                  <span className="text-base-content/30 text-xs hidden sm:inline">→</span>
                                )}
                              </div>
                            ))}
                          </div>
                          {leg.player2Throws.length === 0 && (
                            <span className="text-base-content/50 text-xs sm:text-sm">Nincs dobás</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Leg Footer Info */}
                    <div className="mt-3 pt-3 border-t border-base-300">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs sm:text-sm text-base-content/60">
                        <div className="flex items-center gap-2">
                          <IconClock size={14} />
                          <span>{new Date(leg.createdAt).toLocaleString('hu-HU', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}</span>
                        </div>
                      </div>
                    </div>
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

export default LegsViewModal; 