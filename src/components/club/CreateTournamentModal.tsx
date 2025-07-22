import React, { useState } from 'react';
import { IconX, IconChevronRight, IconDotsVertical } from '@tabler/icons-react';
import PlayerSearch from './PlayerSearch';
import { useRouter } from 'next/navigation';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardCount: number;
  clubId: string;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  onTournamentCreated: () => void;
}

type TournamentFormat = 'group' | 'knockout' | 'group_knockout';
type Step = 'details' | 'settings' | 'players';

interface TournamentSettings {
  name: string;
  format: TournamentFormat;
  startingScore: number;
  password?: string;
  description?: string;
  startDate?: string;
}

const defaultSettings: TournamentSettings = {
  name: '',
  format: 'group',
  startingScore: 501,
  startDate: '',
  description: '',
  password: '',
};

export default function CreateTournamentModal({
  isOpen,
  onClose,
  clubId,
  boardCount,
  userRole,
  onTournamentCreated
}: CreateTournamentModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [settings, setSettings] = useState<TournamentSettings>(defaultSettings);
  const [players, setPlayers] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const router = useRouter();

  console.log(isOpen);

  const handleSettingsChange = (field: keyof TournamentSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleAddPlayer = (player: any) => {
    if (players.some(p => p._id === player._id)) {
      setError('Ez a játékos már hozzá van adva a tornához');
      return;
    }
    setPlayers(prev => [...prev, player]);
    setError('');
  };

  const handleRemovePlayer = (playerId: string) => {
    setPlayers(prev => prev.filter(p => p._id !== playerId));
  };

  const handleSubmit = async () => {
    if (!settings.name) {
      setError('A torna neve kötelező');
      setCurrentStep('details');
      return;
    }
    if (!settings.startDate) {
      setError('A kezdés időpontja kötelező');
      setCurrentStep('details');
      return;
    }
    if (!settings.password) {
      setError('A torna jelszó kötelező');
      setCurrentStep('settings');
      return;
    }
    if (players.length < 4) {
      setError('Legalább 4 játékos szükséges a torna indításához');
      setCurrentStep('players');
      return;
    }

    try {
      // Prepare payload for backend
      const payload = {
        name: settings.name,
        boardCount,
        tournamentPassword: settings.password,
        description: settings.description,
        players: players.map(p => p._id),
        startDate: settings.startDate,
        status: 'pending',
        tournamentSettings: {
          format: settings.format,
          startingScore: settings.startingScore,
          tournamentPassword: settings.password,
          name: settings.name,
          description: settings.description,
          startDate: settings.startDate,
        },
        clubId
      };
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Hiba történt a torna létrehozása során');

      const data = await response.json();
      onTournamentCreated();
      onClose();
      if (data.code) {
        router.push(`/tournaments/${data.code}`);
      }
    } catch (err) {
      setError('Hiba történt a torna létrehozása során');
    }
  };

  const steps = [
    { id: 'details', label: 'Alapadatok' },
    { id: 'settings', label: 'Beállítások' },
    { id: 'players', label: 'Játékosok' },
  ];

  if (!isOpen) return null;

  return (
    <dialog open={isOpen} className="modal">
      <div className="modal-box glass-card p-8 bg-[hsl(var(--background)/0.3)] border-[hsl(var(--border)/0.5)] shadow-[0_8px_32px_rgba(0,0,0,0.2)] rounded-xl max-w-2xl">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] bg-clip-text text-transparent mb-4">
          Új torna létrehozása
        </h2>
        {/* Steps */}
        <div className="mb-6">
          <div className="flex justify-between">
            {steps.map((step, idx) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStep(step.id as Step)}
                  className={`flex items-center ${currentStep === step.id ? 'text-primary' : 'text-base-content/60'}`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === step.id ? 'bg-primary text-white' : 'bg-base-100'}`}>{idx + 1}</span>
                  <span className="ml-2">{step.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <IconChevronRight size={24} className="text-base-content/40" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        {/* Content */}
        <div className="p-0">
          {error && (
            <div className="mb-4 p-3 bg-error/10 text-error rounded-lg">
              {error}
            </div>
          )}
          {currentStep === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Torna neve</label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => handleSettingsChange('name', e.target.value)}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  placeholder="Pl.: Nyári Darts Bajnokság 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Leírás (opcionális)</label>
                <textarea
                  value={settings.description}
                  onChange={(e) => handleSettingsChange('description', e.target.value)}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  rows={3}
                  placeholder="Add meg a torna részleteit..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kezdés időpontja</label>
                <input
                  type="datetime-local"
                  value={settings.startDate || ''}
                  onChange={e => handleSettingsChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                />
              </div>
            </div>
          )}
          {currentStep === 'settings' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Formátum</label>
                <select
                  value={settings.format}
                  onChange={(e) => handleSettingsChange('format', e.target.value)}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                >
                  <option value="group">Csak csoportkör</option>
                  <option value="knockout">Csak egyenes kiesés</option>
                  <option value="group_knockout">Csoportkör + Egyenes kiesés</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kezdő pontszám</label>
                  <input
                    type="number"
                    value={settings.startingScore}
                    onChange={(e) => handleSettingsChange('startingScore', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Torna jelszó (kötelező)</label>
                <input
                  type="text"
                  value={settings.password}
                  onChange={(e) => handleSettingsChange('password', e.target.value)}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  placeholder="Jelszó a táblákhoz való csatlakozáshoz"
                />
              </div>
            </div>
          )}
          {currentStep === 'players' && (
            <div className="space-y-4">
              <PlayerSearch
                onPlayerSelected={handleAddPlayer}
                placeholder="Játékos hozzáadása a tornához..."
              />
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Hozzáadott játékosok ({players.length})</h3>
                <div className="grid grid-cols-2 gap-2">
                  {players.map((player) => (
                    <div
                      key={player._id}
                      className="flex items-center justify-between p-2 bg-base-100 rounded-lg"
                    >
                      <span className="flex items-center gap-2">
                        <span className="badge badge-neutral">{player.isGuest ? 'Vendég' : 'Regisztrált'}</span>
                        <span>{player.name}</span>
                      </span>
                      {/* Hamburger menu for remove */}
                      <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-xs btn-ghost px-2">
                          <IconDotsVertical size={16} />
                        </label>
                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                          <li><button className="text-error" onClick={() => handleRemovePlayer(player._id)}>Eltávolítás</button></li>
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="flex items-center mt-2 justify-end gap-2 p-4 roundend-xl background-blur-md b">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            type="button"
          >
            Mégse
          </button>
          {currentStep !== 'details' && (
            <button
              onClick={() => setCurrentStep(steps[steps.findIndex(s => s.id === currentStep) - 1].id as Step)}
              className="btn btn-outline btn-sm"
              type="button"
            >
              Vissza
            </button>
          )}
          {currentStep !== 'players' ? (
            <button
              onClick={() => setCurrentStep(steps[steps.findIndex(s => s.id === currentStep) + 1].id as Step)}
              className="btn btn-primary btn-sm"
              type="button"
            >
              Tovább
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="btn btn-primary btn-sm"
              type="button"
            >
              Torna létrehozása
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}