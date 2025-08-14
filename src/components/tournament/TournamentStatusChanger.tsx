import React, {  useState } from 'react';
import axios from 'axios';
import {
  CreateManualGroupsRequest,
  ManualGroupsContextResponse,
  ManualGroupsAvailablePlayer,
  Tournament,
} from '@/interface/tournament.interface';

interface TournamentGroupsGeneratorProps {
  tournament: Tournament;
  userClubRole: 'admin' | 'moderator' | 'member' | 'none';
  onRefetch: () => void;
}

const TournamentGroupsGenerator: React.FC<TournamentGroupsGeneratorProps> = ({ tournament, userClubRole, onRefetch }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKnockoutModal, setShowKnockoutModal] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState(8);
  const [knockoutMode, setKnockoutMode] = useState<'automatic' | 'manual'>('automatic');
  const [groupsMode, setGroupsMode] = useState<'automatic' | 'manual'>('automatic');
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [showManualGroupsBuilder, setShowManualGroupsBuilder] = useState(false);
  const [manualContext, setManualContext] = useState<(ManualGroupsContextResponse & { searchQuery: string }) | null>(null);
  const [manualBoard, setManualBoard] = useState<number | null>(null);
  const [manualSelectedPlayers, setManualSelectedPlayers] = useState<string[]>([]);
  const [boardAssignments, setBoardAssignments] = useState<Record<number, string[]>>({});
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
    setShowGroupsModal(true);
  };

  const startAutomaticGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`/api/tournaments/${code}/generateGroups`);
      if (response.data && response.status === 200) {
        onRefetch();
        setShowGroupsModal(false);
      } else {
        setError(response.data?.error || 'Nem sikerült csoportokat generálni.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült csoportokat generálni.');
    } finally {
      setLoading(false);
    }
  };

  const openManualGroupsBuilder = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.get(`/api/tournaments/${code}/manualGroups/context`);
      if (data?.success) {
        const availableBoards = (data.boards || []).filter((b: { isUsed: boolean }) => !b.isUsed);
        const defaultBoard = availableBoards.length > 0 ? availableBoards[0].boardNumber : null;

        setManualContext({ boards: data.boards || [], searchQuery: '', availablePlayers: data.availablePlayers || [] });
        setShowGroupsModal(false);
        setShowManualGroupsBuilder(true);
        setManualBoard(defaultBoard);
      } else {
        setError(data?.error || 'Nem sikerült betölteni a manuális csoport kontextust.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült betölteni a manuális csoport kontextust.');
    } finally {
      setLoading(false);
    }
  };

  // Single-group creation disabled per product requirement; only all-groups creation is allowed

  const createAllManualGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const entries = Object.entries(boardAssignments)
        .map(([bn, ids]) => ({ boardNumber: parseInt(bn, 10), playerIds: ids }))
        .filter(({ playerIds }) => playerIds.length >= 3 && playerIds.length <= 6);

      if (entries.length === 0) {
        setError('Nincs érvényes csoport kijelölés. (3-6 játékos szükséges táblánként)');
        return;
      }

      const payload: CreateManualGroupsRequest = { groups: entries };
      const { data } = await axios.post(`/api/tournaments/${code}/manualGroups/create`, payload);
      if (!data?.success) {
        setError(data?.error || 'Nem sikerült létrehozni az összes csoportot.');
        return;
      }

      setShowManualGroupsBuilder(false);
      setManualBoard(null);
      setManualSelectedPlayers([]);
      setBoardAssignments({});
      onRefetch();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült létrehozni az összes csoportot.');
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

  const handleCancelKnockout = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`/api/tournaments/${code}/cancel-knockout`);
      if (response.data && response.data.success) {
        onRefetch();
      } else {
        setError(response.data?.error || 'Nem sikerült visszavonni az egyenes kiesést.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Nem sikerült visszavonni az egyenes kiesést.');
    } finally {
      setLoading(false);
    }
  };

  if (userClubRole !== 'admin' && userClubRole !== 'moderator') return null;

  const availablePlayerCounts = getAvailablePlayerCounts();

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2">
        {/* Group Generation Button - only show when tournament is pending and format allows groups */}
        {tournamentStatus === 'pending' && (tournamentFormat === 'group' || tournamentFormat === 'group_knockout') && (
          <button 
            className="btn btn-secondary flex-1 min-w-[200px] sm:flex-none" 
            onClick={handleGenerateGroups} 
            disabled={loading}
          >
            {loading ? 'Csoportok generálása...' : 'Csoportok generálása'}
          </button>
        )}

        {/* Knockout Generation Button - show when tournament is in group-stage and format allows knockout, OR when format is knockout and status is pending */}
        {((tournamentStatus === 'group-stage' && (tournamentFormat === 'knockout' || tournamentFormat === 'group_knockout')) ||
          (tournamentStatus === 'pending' && tournamentFormat === 'knockout')) && (
          <button 
            className="btn btn-primary flex-1 min-w-[200px] sm:flex-none" 
            onClick={() => setShowKnockoutModal(true)} 
            disabled={loading}
          >
            {loading ? 'Egyenes kiesés generálása...' : 'Egyenes kiesés generálása'}
          </button>
        )}

        {/* Cancel Knockout Button - show when tournament is in knockout stage */}
        {tournamentStatus === 'knockout' && (
          <button 
            className="btn btn-error flex-1 min-w-[200px] sm:flex-none" 
            onClick={handleCancelKnockout} 
            disabled={loading}
          >
            {loading ? 'Egyenes kiesés visszavonása...' : 'Egyenes kiesés visszavonása'}
          </button>
        )}

        {/* Finish Tournament Button - show when tournament is in knockout stage or when format is group/knockout only */}
        {(tournamentStatus === 'knockout' || 
          (tournamentStatus === 'group-stage' && tournamentFormat === 'group') ||
          (tournamentStatus === 'pending' && tournamentFormat === 'knockout')) && (
          <button 
            className="btn btn-success flex-1 min-w-[200px] sm:flex-none" 
            onClick={handleFinishTournament} 
            disabled={loading}
          >
            {loading ? 'Torna befejezése...' : 'Torna befejezése'}
          </button>
        )}
      </div>

      {error && <div className="mt-2 text-error">{error}</div>}

      {/* Knockout Modal */}
      {showKnockoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-base-100 rounded-2xl p-4 sm:p-8 shadow-2xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">Egyenes Kiesés Generálása</h3>
            
            {/* Knockout Mode Selection */}
            <div className="form-control mb-4 sm:mb-6">
              <label className="label">
                <span className="label-text font-bold">Generálás módja:</span>
              </label>
              <div className="flex flex-wrap gap-2 sm:gap-4">
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
                      ? 'Minden jelentkező játékos részt vesz az egyenes kiesésben.'
                      : 'Válaszd ki, hogy hány játékos jusson tovább az egyenes kiesésbe:'
                    }
                  </p>
                  <p className="text-sm text-base-content/60">
                    Összesen {totalPlayers} játékos van a tornán
                  </p>
                </div>
              </>
            )}
            
            {knockoutMode === 'automatic' && tournamentFormat !== 'knockout' && (
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
            
            <div className="flex flex-wrap gap-3">
              <button
                className="btn btn-error flex-1 min-w-[120px]"
                onClick={() => {
                  setShowKnockoutModal(false);
                  setError('');
                  // Removed seeded players state reset
                }}
              >
                Mégse
              </button>
              <button
                className="btn btn-success flex-1 min-w-[120px]"
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

      {/* Groups Mode Modal */}
      {showGroupsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-base-100 rounded-2xl p-4 sm:p-8 shadow-2xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">Csoportok generálása</h3>
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text font-bold">Generálás módja:</span>
              </label>
              <div className="flex gap-4">
                <label className="label cursor-pointer">
                  <input 
                    type="radio" 
                    name="groupsMode" 
                    className="radio radio-primary" 
                    checked={groupsMode === 'automatic'}
                    onChange={() => setGroupsMode('automatic')}
                  />
                  <span className="label-text ml-2">Automatikus</span>
                </label>
                <label className="label cursor-pointer">
                  <input 
                    type="radio" 
                    name="groupsMode" 
                    className="radio radio-primary" 
                    checked={groupsMode === 'manual'}
                    onChange={() => setGroupsMode('manual')}
                  />
                  <span className="label-text ml-2">Manuális</span>
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-error flex-1 min-w-[120px]" onClick={() => setShowGroupsModal(false)}>Mégse</button>
              {groupsMode === 'automatic' ? (
                <button className="btn btn-success flex-1 min-w-[120px]" onClick={startAutomaticGroups} disabled={loading}>
                  {loading ? 'Generálás...' : 'Automatikus generálás'}
                </button>
              ) : (
                <button className="btn btn-info flex-1 min-w-[120px]" onClick={openManualGroupsBuilder} disabled={loading}>
                  {loading ? 'Betöltés...' : 'Manuális csoport létrehozás'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Groups Builder Modal */}
      {showManualGroupsBuilder && manualContext && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-base-100 rounded-2xl p-4 sm:p-8 shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6">Manuális csoport felvétele</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="font-bold mb-2">Táblák</h4>
                <div className="space-y-2">
                  {manualContext.boards.map((b) => (
                    <button
                      key={b.boardNumber}
                      className={`btn btn-sm w-full ${manualBoard === b.boardNumber ? 'btn-primary' : 'btn-ghost'} ${b.isUsed ? 'btn-disabled' : ''}`}
                      disabled={b.isUsed}
                      onClick={() => {
                        setManualBoard(b.boardNumber);
                        setManualSelectedPlayers(boardAssignments[b.boardNumber] || []);
                      }}
                    >
                      Tábla {b.boardNumber} {b.isUsed ? '(már használt)' : ''}
                      <span className="ml-2 opacity-70">({(boardAssignments[b.boardNumber]?.length || 0)} játékos)</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold mb-2">Játékosok (3-6)</h4>
                <input
                  type="text"
                  placeholder="Keresés név szerint..."
                  className="input input-bordered input-sm w-full mb-2"
                  value={manualContext.searchQuery || ''}
                  onChange={(e) => {
                    const q = e.target.value;
                    setManualContext(prev => prev ? { ...prev, searchQuery: q } : prev);
                  }}
                />
                 {(() => {
                  const normalize = (s: string) =>
                    (s || '')
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/\p{Diacritic}/gu, '')
                      .trim();
                  const query = normalize(manualContext.searchQuery || '');
                  const isNumeric = /^\d+$/.test(query);
                                   // Get all players assigned to other boards
                 const assignedToOtherBoards = Object.entries(boardAssignments)
                   .filter(([boardNum]) => parseInt(boardNum) !== manualBoard)
                   .flatMap(([, playerIds]) => playerIds);
                 
                 const filtered = (manualContext.availablePlayers || []).filter((p: ManualGroupsAvailablePlayer) => {
                   // Skip players already assigned to other boards
                   if (assignedToOtherBoards.includes(p._id)) return false;
                   
                   const name = normalize(p.name || '');
                   if (!query) return true;
                   if (isNumeric) {
                     // numeric query: match as a standalone token only
                     const tokens = name.split(/[^a-z0-9]+/);
                     return tokens.some((t) => t === query);
                   }
                   return name.includes(query);
                 });
                   return (
                   <div className="h-48 sm:h-72 overflow-y-auto space-y-2 border border-base-300 rounded-lg p-2">
                      {filtered.map((p) => {
                        const selected = manualSelectedPlayers.includes(p._id);
                        return (
                          <label key={p._id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={selected}
                                                          onChange={(e) => {
                              if (e.target.checked) {
                                if (manualSelectedPlayers.length < 6) {
                                  const newSelected = [...manualSelectedPlayers, p._id];
                                  setManualSelectedPlayers(newSelected);
                                  setBoardAssignments(prev => ({
                                    ...prev,
                                    [manualBoard!]: newSelected
                                  }));
                                }
                              } else {
                                const newSelected = manualSelectedPlayers.filter(id => id !== p._id);
                                setManualSelectedPlayers(newSelected);
                                setBoardAssignments(prev => ({
                                  ...prev,
                                    [manualBoard!]: newSelected
                                }));
                              }
                            }}
                            />
                            <span>{p.name || p._id}</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
            {/* Assignments summary */}
            <div className="mt-4">
              <h4 className="font-bold mb-2">Kijelölt csoportok</h4>
              <div className="space-y-2">
                {Object.entries(boardAssignments).filter(([, ids]) => ids.length > 0).map(([boardNum, ids]) => (
                  <div key={boardNum} className="text-sm">
                    <span className="font-semibold mr-2">Tábla {boardNum}:</span>
                    <span>
                      {ids.map((id, idx) => {
                        const p = manualContext.availablePlayers.find(ap => ap._id === id);
                        return (
                          <span key={id}>
                            {p?.name || id}{idx < ids.length - 1 ? ', ' : ''}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                ))}
                {Object.values(boardAssignments).every(ids => ids.length === 0) && (
                  <div className="text-sm opacity-70">Nincs kijelölt játékos egyik táblán sem.</div>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="btn btn-error flex-1 min-w-[120px]" onClick={() => setShowManualGroupsBuilder(false)}>Mégse</button>
              <button
                className="btn btn-success flex-1 min-w-[120px]"
                onClick={createAllManualGroups}
                disabled={
                  loading ||
                  (manualContext?.boards || [])
                    .filter(b => !b.isUsed)
                    .some(b => {
                      const c = (boardAssignments[b.boardNumber]?.length || 0);
                      return c < 3 || c > 6;
                    })
                }
              >
                {loading ? 'Létrehozás...' : 'Összes csoport létrehozása'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentGroupsGenerator; 