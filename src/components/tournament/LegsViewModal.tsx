import React, { useState, useEffect } from 'react';

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

  console.log(match);

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
          <button
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
            {legs.map((leg, legIndex) => {
              const isPlayer1Winner = leg.winnerId._id === match.player1?.playerId?._id;
              const isPlayer2Winner = leg.winnerId._id === match.player2?.playerId?._id;
              
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

                    {/* Players and Throws */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Player 1 */}
                      <div className={`p-4 rounded-lg ${isPlayer1Winner ? 'bg-success/20 border border-success/30' : 'bg-base-100'}`}>
                        <div className="flex justify-between items-center mb-3">
                          <h5 className="font-bold text-lg">
                            {match.player1?.playerId?.name}
                          </h5>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {leg.player1Throws.map((throwData, throwIndex) => (
                              <div key={throwIndex} className="flex items-center gap-1">
                                {formatThrow(throwData, isPlayer1Winner)}
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
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {leg.player2Throws.map((throwData, throwIndex) => (
                              <div key={throwIndex} className="flex items-center gap-1">
                                {formatThrow(throwData, isPlayer2Winner)}
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

                    {/* Leg Stats */}
                    <div className="mt-4 pt-4 border-t border-base-300">
                      <div className="flex justify-between items-center text-sm text-base-content/70">
                        <span>
                          {new Date(leg.createdAt).toLocaleString('hu-HU')}
                        </span>
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