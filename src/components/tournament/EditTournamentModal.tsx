import React, { useState, useEffect } from 'react';
import { TournamentSettings } from '@/interface/tournament.interface';
import { IconEdit, IconX, IconTarget, IconExternalLink } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface EditTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: any;
  userId: string;
  onTournamentUpdated: () => void;
}

export default function EditTournamentModal({
  isOpen,
  onClose,
  tournament,
  userId,
  onTournamentUpdated
}: EditTournamentModalProps) {
  const [settings, setSettings] = useState<TournamentSettings>(tournament.tournamentSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [availableBoards, setAvailableBoards] = useState<Array<{ boardNumber: number; name: string; isActive: boolean; isAssigned: boolean }>>([]);
  const [selectedBoards, setSelectedBoards] = useState<number[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<{
    currentCount: number;
    maxAllowed: number;
    planName: string;
  } | null>(null);
  const router = useRouter();

  // Reset form when tournament changes
  useEffect(() => {
    if (tournament?.tournamentSettings) {
      setSettings(tournament.tournamentSettings);
      setError('');
    }
  }, [tournament]);

  // Load board context when tournament changes
  useEffect(() => {
    if (tournament?.tournamentId && tournament?.tournamentSettings?.status === 'pending') {
      loadBoardContext();
    }
  }, [tournament]);

  // Update boardCount when selectedBoards changes
  useEffect(() => {
    if (selectedBoards.length > 0) {
      handleSettingsChange('boardCount', selectedBoards.length);
    }
  }, [selectedBoards]);

  const loadBoardContext = async () => {
    try {
      setBoardsLoading(true);
      const response = await fetch(`/api/tournaments/${tournament.tournamentId}/boards`);
      if (response.ok) {
        const data = await response.json();
        setAvailableBoards(data.availableBoards);
        setSelectedBoards(data.selectedBoards);
      }
    } catch (error) {
      console.error('Error loading board context:', error);
    } finally {
      setBoardsLoading(false);
    }
  };

  const handleSettingsChange = (field: keyof TournamentSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate board selection
    if (!isTournamentStarted && selectedBoards.length === 0) {
      setError('Legalább egy táblát ki kell választani');
      return;
    }
    
    setLoading(true);
    setError('');
    setSubscriptionError(null);

    try {
      const response = await fetch(`/api/tournaments/${tournament.tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          settings,
          selectedBoards
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.subscriptionError) {
          setSubscriptionError({
            currentCount: errorData.currentCount,
            maxAllowed: errorData.maxAllowed,
            planName: errorData.planName
          });
          setError(errorData.error);
        } else {
          throw new Error(errorData.error || 'Hiba történt a torna frissítése során');
        }
        return;
      }

      onTournamentUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Hiba történt a torna frissítése során');
    } finally {
      setLoading(false);
    }
  };

  const handleBoardToggle = (boardNumber: number) => {
    const newSelectedBoards = selectedBoards.includes(boardNumber) 
      ? selectedBoards.filter(b => b !== boardNumber)
      : [...selectedBoards, boardNumber];
    
    setSelectedBoards(newSelectedBoards);
    
    // Automatically update board count when boards are selected/deselected
    handleSettingsChange('boardCount', newSelectedBoards.length);
  };

  const isTournamentStarted = tournament?.tournamentSettings?.status !== 'pending';

  if (!isOpen) return null;

  return (
    <dialog open={isOpen} className="modal">
      <div className="modal-box glass-card p-4 sm:p-8 bg-[hsl(var(--background)/0.3)] border-[hsl(var(--border)/0.5)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-xl max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent">
            Torna szerkesztése
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium">{error}</p>
                {subscriptionError && (
                  <div className="mt-2 text-sm">
                    <p>Jelenlegi csomag: <span className="font-semibold">{subscriptionError.planName}</span></p>
                    <p>Havi versenyek: {subscriptionError.currentCount} / {subscriptionError.maxAllowed === -1 ? 'Korlátlan' : subscriptionError.maxAllowed}</p>
                  </div>
                )}
              </div>
              {subscriptionError && (
                <a 
                  href="/#pricing" 
                  className="btn btn-primary btn-sm ml-3 flex items-center gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    onClose();
                    router.push('/#pricing');
                  }}
                >
                  <IconExternalLink className="w-4 h-4" />
                  Csomagok
                </a>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Alapadatok</h3>
            
            <div>
              <label className="block text-sm font-medium mb-1">Torna neve *</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => handleSettingsChange('name', e.target.value)}
                className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                placeholder="Pl.: Tavaszi Bajnokság 2024"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Leírás</label>
              <textarea
                value={settings.description || ''}
                onChange={(e) => handleSettingsChange('description', e.target.value)}
                className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20 min-h-[80px]"
                placeholder="Részletes leírás a tornáról..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Helyszín</label>
              <input
                type="text"
                value={settings.location || ''}
                onChange={(e) => handleSettingsChange('location', e.target.value)}
                className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                placeholder="Pl.: Budapest, Sport Klub"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Kezdés dátuma *</label>
              <input
                type="datetime-local"
                value={new Date(settings.startDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', 'T')}
                onChange={(e) => handleSettingsChange('startDate', new Date(e.target.value))}
                className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nevezési határidő</label>
              <input
                type="datetime-local"
                value={settings.registrationDeadline ? new Date(settings.registrationDeadline).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', 'T') : ''}
                onChange={(e) => handleSettingsChange('registrationDeadline', e.target.value ? new Date(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
              />
            </div>
          </div>

          {/* Tournament Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Verseny beállítások</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Formátum *</label>
                <select
                  value={settings.format}
                  onChange={(e) => handleSettingsChange('format', e.target.value)}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  disabled={isTournamentStarted}
                  required
                >
                  <option value="group">Csoportkör</option>
                  <option value="knockout">Kieséses</option>
                  <option value="group_knockout">Csoportkör + Kieséses</option>
                </select>
                {isTournamentStarted && (
                  <p className="text-xs text-warning mt-1">Nem módosítható a verseny indítása után</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Típus</label>
                <select
                  value={settings.type}
                  onChange={(e) => handleSettingsChange('type', e.target.value)}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                >
                  <option value="amateur">Amatőr</option>
                  <option value="open">Open</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max. létszám *</label>
                <input
                  type="number"
                  value={settings.maxPlayers}
                  onChange={(e) => handleSettingsChange('maxPlayers', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  min="2"
                  disabled={isTournamentStarted}
                  required
                />
                {isTournamentStarted && (
                  <p className="text-xs text-warning mt-1">Nem módosítható a verseny indítása után</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kezdő pontszám *</label>
                <input
                  type="number"
                  value={settings.startingScore}
                  onChange={(e) => handleSettingsChange('startingScore', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  min="1"
                  disabled={isTournamentStarted}
                  required
                />
                {isTournamentStarted && (
                  <p className="text-xs text-warning mt-1">Nem módosítható a verseny indítása után</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Táblák száma</label>
                <div className="w-full px-3 py-2 bg-base-200 rounded-lg border border-base-300 text-base-content/70">
                  {selectedBoards.length} tábla kiválasztva
                </div>
                <p className="text-xs text-base-content/60 mt-1">
                  Automatikusan frissül a kiválasztott táblák alapján
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nevezési díj (Ft)</label>
                <input
                  type="number"
                  value={settings.entryFee}
                  onChange={(e) => handleSettingsChange('entryFee', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Jelszó</label>
              <input
                type="text"
                value={settings.tournamentPassword}
                onChange={(e) => handleSettingsChange('tournamentPassword', e.target.value)}
                className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                placeholder="Opcionális jelszó a versenyhez"
              />
            </div>

            {settings.format === 'group_knockout' && (
              <div>
                <label className="block text-sm font-medium mb-1">Kieséses módszer</label>
                <select
                  value={settings.knockoutMethod || 'automatic'}
                  onChange={(e) => handleSettingsChange('knockoutMethod', e.target.value)}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                >
                  <option value="automatic">Automatikus</option>
                  <option value="manual">Manuális</option>
                </select>
              </div>
            )}
          </div>

          {/* Board Selection - Only show if tournament hasn't started */}
          {!isTournamentStarted && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Tábla kiválasztás</h3>
              
              {boardsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <span className="loading loading-spinner loading-md"></span>
                  <span className="ml-2">Táblák betöltése...</span>
                </div>
              ) : availableBoards.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Válaszd ki, mely táblákat szeretnéd használni a tornán
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableBoards.map((board) => (
                      <label
                        key={board.boardNumber}
                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedBoards.includes(board.boardNumber)
                            ? 'border-primary bg-primary/10'
                            : 'border-base-300 bg-base-100 hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBoards.includes(board.boardNumber)}
                          onChange={() => handleBoardToggle(board.boardNumber)}
                          className="checkbox checkbox-primary mr-3"
                        />
                        <div className="flex items-center">
                          <IconTarget className="w-4 h-4 mr-2 text-primary" />
                          <div>
                            <div className="font-medium">{board.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Tábla #{board.boardNumber}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedBoards.length === 0 && (
                    <p className="text-sm text-warning">
                      Legalább egy táblát ki kell választani
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nincsenek elérhető táblák a klubban
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-base-300">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline order-2 sm:order-1"
              disabled={loading}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn btn-primary order-1 sm:order-2"
              disabled={loading || (selectedBoards.length === 0 && !isTournamentStarted)}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Mentés...
                </>
              ) : (
                <>
                  <IconEdit className="w-4 h-4" />
                  Mentés
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
