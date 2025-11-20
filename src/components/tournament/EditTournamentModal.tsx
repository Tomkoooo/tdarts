import React, { useState, useEffect } from 'react';
import { TournamentSettings } from '@/interface/tournament.interface';
import { IconX, IconTarget, IconExternalLink } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

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
  const [boards, setBoards] = useState<Array<{ 
    boardNumber: number; 
    name: string; 
    isActive: boolean; 
    status: string;
    currentMatch?: string;
    nextMatch?: string;
  }>>(tournament.boards || []);
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
      setBoards(tournament.boards || []);
      setError('');
    }
  }, [tournament]);

  // Update boardCount when boards changes
  useEffect(() => {
    if (boards.length > 0) {
      handleSettingsChange('boardCount', boards.length);
    }
  }, [boards]);

  const handleSettingsChange = (field: keyof TournamentSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleAddBoard = () => {
    const newBoardNumber = boards.length > 0 ? Math.max(...boards.map(b => b.boardNumber)) + 1 : 1;
    setBoards(prev => [...prev, { boardNumber: newBoardNumber, name: `Tábla ${newBoardNumber}`, isActive: true, status: 'idle' }]);
  };

  const handleRemoveBoard = (index: number) => {
    if (boards.length > 1) {
      setBoards(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleBoardChange = (index: number, field: 'name', value: string) => {
    setBoards(prev => prev.map((board, i) => 
      i === index ? { ...board, [field]: value } : board
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate board selection
    if (!isTournamentStarted && boards.length === 0) {
      setError('Legalább egy táblát létre kell hozni');
      return;
    }
    
    setLoading(true);
    setError('');
    setSubscriptionError(null);

    try {
      // Convert empty strings to 0 for number fields
      const cleanedSettings = {
        ...settings,
        maxPlayers: typeof settings.maxPlayers === 'string' && settings.maxPlayers === '' ? 0 : settings.maxPlayers,
        startingScore: typeof settings.startingScore === 'string' && settings.startingScore === '' ? 0 : settings.startingScore,
        entryFee: typeof settings.entryFee === 'string' && settings.entryFee === '' ? 0 : settings.entryFee,
      };

      const response = await fetch(`/api/tournaments/${tournament.tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          settings: cleanedSettings,
          boards: boards.map((b, idx) => ({
            boardNumber: idx + 1,
            name: b.name,
            isActive: b.isActive,
            status: b.status || 'idle',
            currentMatch: b.currentMatch,
            nextMatch: b.nextMatch
          }))
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


  const isTournamentStarted = tournament?.tournamentSettings?.status !== 'pending';

  if (!isOpen) return null;

  return (
    <dialog open={isOpen} className="modal">
      <div className="modal-box glass-card p-4 sm:p-8 bg-[hsl(var(--background)/0.3)] rounded-xl max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/45">
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
                <Link
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
                </Link>
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
                  value={settings.maxPlayers ?? ''}
                  onChange={(e) => handleSettingsChange('maxPlayers', e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  min="0"
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
                  value={settings.startingScore ?? ''}
                  onChange={(e) => handleSettingsChange('startingScore', e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  min="0"
                  disabled={isTournamentStarted}
                  required
                />
                {isTournamentStarted && (
                  <p className="text-xs text-warning mt-1">Nem módosítható a verseny indítása után</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Táblák száma</label>
                <div className="w-full px-3 py-2 bg-base-200 rounded-lg border  text-base-content/70">
                  {boards.length} tábla
                </div>
                <p className="text-xs text-base-content/60 mt-1">
                  Automatikusan frissül a táblák alapján
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nevezési díj (Ft)</label>
                <input
                  type="number"
                  value={settings.entryFee ?? ''}
                  onChange={(e) => handleSettingsChange('entryFee', e.target.value === '' ? '' : parseInt(e.target.value))}
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

          {/* Board Management - Only show if tournament hasn't started */}
          {!isTournamentStarted && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">Tábla kezelés</h3>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Kezeld a tornához tartozó táblákat
                </p>
                {boards.map((board, index) => (
                  <div key={index} className="flex gap-2 items-center p-3 bg-base-100 rounded-lg">
                    <div className="flex items-center gap-2">
                      <IconTarget className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">#{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={board.name}
                        onChange={(e) => handleBoardChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-base-200 rounded-lg outline-none focus:ring-2 ring-primary/20"
                        placeholder={`Tábla ${index + 1}`}
                      />
                    </div>
                    {boards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBoard(index)}
                        className="btn btn-ghost btn-sm btn-circle text-error"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddBoard}
                  className="btn btn-outline btn-sm w-full"
                >
                  + Új tábla hozzáadása
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col justify-end gap-3 pt-4 sm:flex-row">
            <Button
              type="submit"
              disabled={loading || (boards.length === 0 && !isTournamentStarted)}
              className="order-1 sm:order-2"
            >
              Mentés
            </Button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
