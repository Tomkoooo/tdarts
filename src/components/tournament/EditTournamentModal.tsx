import React, { useState, useEffect } from 'react';
import { TournamentSettings } from '@/interface/tournament.interface';
import { IconEdit, IconX } from '@tabler/icons-react';

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

  // Reset form when tournament changes
  useEffect(() => {
    if (tournament?.tournamentSettings) {
      setSettings(tournament.tournamentSettings);
      setError('');
    }
  }, [tournament]);

  const handleSettingsChange = (field: keyof TournamentSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournament.tournamentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          settings
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hiba történt a torna frissítése során');
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
      <div className="modal-box glass-card p-8 bg-[hsl(var(--background)/0.3)] border-[hsl(var(--border)/0.5)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-xl max-w-2xl">
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
            <span>{error}</span>
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
                value={new Date(settings.startDate).toISOString().slice(0, 16)}
                onChange={(e) => handleSettingsChange('startDate', new Date(e.target.value))}
                className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nevezési határidő</label>
              <input
                type="datetime-local"
                value={settings.registrationDeadline ? new Date(settings.registrationDeadline).toISOString().slice(0, 16) : ''}
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
                <input
                  type="number"
                  value={settings.boardCount}
                  onChange={(e) => handleSettingsChange('boardCount', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  min="1"
                  disabled={isTournamentStarted}
                />
                {isTournamentStarted && (
                  <p className="text-xs text-warning mt-1">Nem módosítható a verseny indítása után</p>
                )}
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

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={loading}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
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
