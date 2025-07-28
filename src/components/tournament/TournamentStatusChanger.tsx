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
  const [useSeededPlayers, setUseSeededPlayers] = useState(false);
  const [seededPlayersCount, setSeededPlayersCount] = useState(4);
  const [knockoutMode, setKnockoutMode] = useState<'automatic' | 'manual'>('automatic');
  const code = tournament?.tournamentId;
  const tournamentStatus = tournament?.tournamentSettings?.status;
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

  // Calculate maximum possible seeded players for a given bracket size
  const getMaxSeededPlayers = (bracketSize: number) => {
    if (bracketSize <= 2) return 0; // No seeding possible for 2 players
    if (bracketSize <= 4) return 1; // Only 1 seeded player possible for 4 players
    if (bracketSize <= 8) return 2; // 2 seeded players for 8 players
    if (bracketSize <= 16) return 4; // 4 seeded players for 16 players
    return 8; // 8 seeded players for 32 players
  };

  // Generate available seeded player counts
  const getAvailableSeededCounts = (bracketSize: number) => {
    const maxSeeded = getMaxSeededPlayers(bracketSize);
    const counts = [];
    for (let i = 1; i <= maxSeeded; i++) {
      counts.push(i);
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
      if (knockoutMode === 'automatic') {
        response = await axios.post(`/api/tournaments/${code}/generateKnockout`, {
          playersCount: selectedPlayers,
          useSeededPlayers,
          seededPlayersCount: useSeededPlayers ? seededPlayersCount : 0
        });
      } else {
        response = await axios.post(`/api/tournaments/${code}/generateManualKnockout`);
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

  // Update seeded players count when bracket size changes
  const handleBracketSizeChange = (newSize: number) => {
    setSelectedPlayers(newSize);
    const maxSeeded = getMaxSeededPlayers(newSize);
    if (seededPlayersCount > maxSeeded) {
      setSeededPlayersCount(maxSeeded);
    }
  };

  if (userClubRole !== 'admin' && userClubRole !== 'moderator') return null;

  const availablePlayerCounts = getAvailablePlayerCounts();
  const availableSeededCounts = getAvailableSeededCounts(selectedPlayers);
  const maxSeededPlayers = getMaxSeededPlayers(selectedPlayers);

  return (
    <div className="mb-4">
      {/* Group Generation Button - only show when tournament is pending */}
      {tournamentStatus === 'pending' && (
        <button 
          className="btn btn-secondary" 
          onClick={handleGenerateGroups} 
          disabled={loading}
        >
          {loading ? 'Csoportok generálása...' : 'Csoportok generálása'}
        </button>
      )}

      {/* Knockout Generation Button - only show when tournament is in group-stage */}
      {tournamentStatus === 'group-stage' && (
        <button 
          className="btn btn-primary" 
          onClick={() => setShowKnockoutModal(true)} 
          disabled={loading}
        >
          {loading ? 'Egyenes kiesés generálása...' : 'Egyenes kiesés generálása'}
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
                <div className="text-center mb-6">
                  <p className="text-base-content/70 mb-4">
                    Válaszd ki, hogy hány játékos jusson tovább az egyenes kiesésbe:
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
                  onChange={(e) => handleBracketSizeChange(parseInt(e.target.value))}
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
                <div className="form-control mb-6">
                  <label className="label cursor-pointer">
                    <span className="label-text font-bold">Kiemelt játékosok használata</span>
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-primary" 
                      checked={useSeededPlayers}
                      onChange={(e) => setUseSeededPlayers(e.target.checked)}
                      disabled={maxSeededPlayers === 0}
                    />
                  </label>
                  {maxSeededPlayers === 0 && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        Kiemelt játékosok nem lehetségesek {selectedPlayers} játékosnál
                      </span>
                    </label>
                  )}
                </div>

                {/* Seeded Players Count Selection */}
                {useSeededPlayers && maxSeededPlayers > 0 && (
                  <div className="form-control mb-6">
                    <label className="label">
                      <span className="label-text font-bold">Kiemelt játékosok száma:</span>
                    </label>
                    <select 
                      className="select select-bordered w-full"
                      value={seededPlayersCount}
                      onChange={(e) => setSeededPlayersCount(parseInt(e.target.value))}
                    >
                      {availableSeededCounts.map(count => (
                        <option key={count} value={count}>
                          {count} kiemelt játékos
                        </option>
                      ))}
                    </select>
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Maximum {maxSeededPlayers} kiemelt játékos lehetséges {selectedPlayers} játékosnál
                      </span>
                    </label>
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        Kiemelt játékosok a csoportok tetejéről kerülnek ki
                      </span>
                    </label>
                  </div>
                )}

                {/* Bracket Type Info */}
                {useSeededPlayers && seededPlayersCount > 0 && (
                  <div className="alert alert-info mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>
                      <strong>Double-knockout</strong> bracket lesz generálva {seededPlayersCount} kiemelt játékossal.
                    </span>
                  </div>
                )}
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
                  setUseSeededPlayers(false);
                  setSeededPlayersCount(4);
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