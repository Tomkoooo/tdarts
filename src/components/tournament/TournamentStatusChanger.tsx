import React, { useState } from 'react';
import axios from 'axios';

interface TournamentGroupsGeneratorProps {
  tournament: any;
  userClubRole: 'admin' | 'moderator' | 'member' | 'none';
  onRefetch: () => void;
}

const TournamentGroupsGenerator: React.FC<TournamentGroupsGeneratorProps> = ({ tournament, userClubRole, onRefetch }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKnockoutModal, setShowKnockoutModal] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState(8);
  const [knockoutMode, setKnockoutMode] = useState<'automatic' | 'manual'>('automatic');
  const code = tournament?.tournamentId;
  const tournamentStatus = tournament?.tournamentSettings?.status;
  const tournamentFormat = tournament?.tournamentSettings?.format || 'group_knockout';
  const totalPlayers = tournament?.tournamentPlayers?.length || 0;

  // Generate available player counts (powers of 2, max totalPlayers)
  const getAvailablePlayerCounts = () => {
    const counts = [];
    let count = 2;
    while (count <= totalPlayers && count <= 32) { // Max 32 players for knockout
      counts.push(count);
      count *= 2;
    }
    return counts;
  };

  const handleGenerateGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`/api/tournaments/${code}/generateGroups`);
      if (response.data && response.data.success) {
        onRefetch();
      } else {
        setError(response.data?.error || 'Nem sikerült csoportokat generálni.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült csoportokat generálni.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKnockout = async () => {
    setLoading(true);
    setError('');
    try {
      let response;
      
      if (tournamentFormat === 'knockout') {
        // For knockout-only tournaments, generate knockout directly from pending status
        if (knockoutMode === 'automatic') {
          response = await axios.post(`/api/tournaments/${code}/generateKnockout`, {
            playersCount: selectedPlayers,
            useSeededPlayers: false,
            seededPlayersCount: 0
          });
        } else {
          response = await axios.post(`/api/tournaments/${code}/generateManualKnockout`);
        }
      } else {
        // For group_knockout tournaments, use existing logic
        if (knockoutMode === 'automatic') {
          response = await axios.post(`/api/tournaments/${code}/generateKnockout`, {
            playersCount: selectedPlayers,
            useSeededPlayers: false,
            seededPlayersCount: 0
          });
        } else {
          response = await axios.post(`/api/tournaments/${code}/generateManualKnockout`);
        }
      }
      
      if (response.data && response.data.success) {
        onRefetch();
        setShowKnockoutModal(false);
      } else {
        setError(response.data?.error || 'Nem sikerült egyenes kiesést generálni.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült egyenes kiesést generálni.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishTournament = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`/api/tournaments/${code}/finish`);
      if (response.data && response.data.success) {
        onRefetch();
      } else {
        setError(response.data?.error || 'Nem sikerült befejezni a tornát.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült befejezni a tornát.');
    } finally {
      setLoading(false);
    }
  };

  if (userClubRole !== 'admin' && userClubRole !== 'moderator') return null;

  const availablePlayerCounts = getAvailablePlayerCounts();

  return (
    <div className="mb-4">
      {/* Group Generation Button - only show when tournament is pending and format allows groups */}
      {tournamentStatus === 'pending' && (tournamentFormat === 'group' || tournamentFormat === 'group_knockout') && (
        <button 
          className="btn btn-secondary" 
          onClick={handleGenerateGroups} 
          disabled={loading}
        >
          {loading ? 'Csoportok generálása...' : 'Csoportok generálása'}
        </button>
      )}

      {/* Knockout Generation Button - only show when tournament is in group-stage and format allows knockout */}
      {tournamentStatus === 'group-stage' && (tournamentFormat === 'knockout' || tournamentFormat === 'group_knockout') && (
        <button 
          className="btn btn-primary" 
          onClick={() => setShowKnockoutModal(true)} 
          disabled={loading}
        >
          {loading ? 'Egyenes kiesés generálása...' : 'Egyenes kiesés generálása'}
        </button>
      )}

      {/* Finish Tournament Button - show when tournament is in knockout stage or when format is group/knockout only */}
      {(tournamentStatus === 'knockout' || 
        (tournamentStatus === 'group-stage' && tournamentFormat === 'group') ||
        (tournamentStatus === 'pending' && tournamentFormat === 'knockout')) && (
        <button 
          className="btn btn-success" 
          onClick={handleFinishTournament} 
          disabled={loading}
        >
          {loading ? 'Torna befejezése...' : 'Torna befejezése'}
        </button>
      )}

      {error && <div className="mt-2 text-error">{error}</div>}

      {/* Knockout Modal */}
      {showKnockoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-2xl p-8 shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-center mb-6">Egyenes Kiesés Generálása</h3>
            
            {/* Knockout Mode Selection */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text font-bold">Generálás módja:</span>
              </label>
              <div className="flex gap-4">
                <label className="label cursor-pointer">
                  <input 
                    type="radio" 
                    name="knockoutMode" 
                    className="radio radio-primary" 
                    checked={knockoutMode === 'automatic'}
                    onChange={() => setKnockoutMode('automatic')}
                  />
                  <span className="label-text ml-2">Automatikus</span>
                </label>
                <label className="label cursor-pointer">
                  <input 
                    type="radio" 
                    name="knockoutMode" 
                    className="radio radio-primary" 
                    checked={knockoutMode === 'manual'}
                    onChange={() => setKnockoutMode('manual')}
                  />
                  <span className="label-text ml-2">Manuális</span>
                </label>
              </div>
              <label className="label">
                <span className="label-text-alt text-base-content/60">
                  Automatikus: játékosok automatikusan párosítva. 
                  <br />
                  Manuel: te választod ki a játékosokat és párosítod őket.
                </span>
              </label>
            </div>

            {/* Automatic Mode Settings */}
            {knockoutMode === 'automatic' && (
              <>
                <div className="alert alert-warning mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h3 className="font-bold">Kiemelt játékosok!</h3>
                    <div className="text-xs">
                      Az automatikus mód nem támogatja a kiemelt játékosokat. 
                      <br />
                      <strong>Javaslat:</strong> Válts manuális módra a pontos játékos párosításhoz.
                    </div>
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-base-content/70 mb-4">
                    {tournamentFormat === 'knockout' 
                      ? 'Válaszd ki, hogy hány játékos jusson tovább az egyenes kiesésbe:'
                      : 'Válaszd ki, hogy hány játékos jusson tovább az egyenes kiesésbe:'
                    }
                  </p>
                  <p className="text-sm text-base-content/60">
                    Összesen {totalPlayers} játékos van a tornán
                  </p>
                </div>
              </>
            )}
            
            {knockoutMode === 'automatic' && (
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text font-bold">Továbbjutók száma:</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={selectedPlayers}
                  onChange={(e) => setSelectedPlayers(parseInt(e.target.value))}
                >
                  {availablePlayerCounts.map(count => (
                    <option key={count} value={count}>
                      {count} játékos
                    </option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    Csak 2 hatványai választhatók (2, 4, 8, 16, 32)
                  </span>
                </label>
              </div>
            )}

            {/* Seeded Players Section - Only for Automatic Mode */}
            {knockoutMode === 'automatic' && (
              <>
                {/* Removed seeded players checkbox */}
                {/* Removed seeded players count selection */}
                {/* Removed bracket type info */}
              </>
            )}

            {/* Manual Mode Info */}
            {knockoutMode === 'manual' && (
              <div className="alert alert-info mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>
                  <strong>Manuális mód:</strong> Üres körök jönnek létre, ahol te választhatod ki a játékosokat és párosítod őket. 
                  Minden kör után új üres kör jön létre a következő szinthez.
                </span>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                className="btn btn-error flex-1"
                onClick={() => {
                  setShowKnockoutModal(false);
                  setError('');
                  // Removed seeded players state reset
                }}
              >
                Mégse
              </button>
              <button
                className="btn btn-success flex-1"
                onClick={handleGenerateKnockout}
                disabled={loading}
              >
                {loading ? (
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
    </div>
  );
};

export default TournamentGroupsGenerator; 