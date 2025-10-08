import React, { useState, useEffect } from 'react';
import { IconChevronRight, IconExternalLink } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { TournamentSettings } from '@/interface/tournament.interface';
import Link from 'next/link';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardCount: number;
  clubId: string;
  userRole: 'admin' | 'moderator' | 'member' | 'none';
  onTournamentCreated: () => void;
}

type Step = 'details' | 'boards' | 'settings';

interface BoardInput {
  boardNumber: number;
  name: string;
}

const defaultSettings: TournamentSettings = {
  status: 'pending',
  boardCount: 1,
  location: '',
  name: '',
  description: '',
  startDate: new Date(),
  entryFee: 0,
  maxPlayers: 16,
  format: 'group',
  startingScore: 501,
  tournamentPassword: '',
  type: 'amateur',
  registrationDeadline: new Date(),
};

export default function CreateTournamentModal({
  isOpen,
  onClose,
  clubId,
  onTournamentCreated
}: CreateTournamentModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [settings, setSettings] = useState<TournamentSettings>(defaultSettings);
  const [boards, setBoards] = useState<BoardInput[]>([{ boardNumber: 1, name: 'Tábla 1' }]);
  const [availableLeagues, setAvailableLeagues] = useState<any[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [subscriptionError, setSubscriptionError] = useState<{
    currentCount: number;
    maxAllowed: number;
    planName: string;
  } | null>(null);
  const router = useRouter();

  // Fetch leagues when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableLeagues();
    }
  }, [isOpen, clubId]);

  const fetchAvailableLeagues = async () => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues`);
      if (response.ok) {
        const data = await response.json();
        setAvailableLeagues(data.leagues || []);
      }
    } catch (err) {
      console.error('Error fetching leagues:', err);
    }
  };

  const handleSettingsChange = (field: keyof TournamentSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleAddBoard = () => {
    const newBoardNumber = boards.length > 0 ? Math.max(...boards.map(b => b.boardNumber)) + 1 : 1;
    setBoards(prev => [...prev, { boardNumber: newBoardNumber, name: `Tábla ${newBoardNumber}` }]);
    setError('');
  };

  const handleRemoveBoard = (index: number) => {
    if (boards.length > 1) {
      setBoards(prev => prev.filter((_, i) => i !== index));
    }
    setError('');
  };

  const handleBoardChange = (index: number, field: keyof BoardInput, value: string | number) => {
    setBoards(prev => prev.map((board, i) => 
      i === index ? { ...board, [field]: value } : board
    ));
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setSubscriptionError(null);
    
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
    if (boards.length === 0) {
      setError('Legalább egy táblát létre kell hozni');
      setCurrentStep('boards');
      return;
    }
    if (!settings.tournamentPassword) {
      setError('A torna jelszó kötelező');
      setCurrentStep('settings');
      return;
    }
    if (!settings.maxPlayers || settings.maxPlayers < 4) {
      setError('A maximális létszám legalább 4 fő kell legyen');
      setCurrentStep('settings');
      return;
    }
    try {
      const payload = {
        name: settings.name,
        description: settings.description,
        startDate: settings.startDate,
        entryFee: settings.entryFee,
        maxPlayers: settings.maxPlayers,
        format: settings.format,
        startingScore: settings.startingScore,
        tournamentPassword: settings.tournamentPassword,
        boardCount: boards.length,
        boards: boards.map((b, idx) => ({
          boardNumber: idx + 1,
          name: b.name || `Tábla ${idx + 1}`,
          status: 'idle',
          isActive: true
        })),
        location: settings.location,
        type: settings.type,
        registrationDeadline: settings.registrationDeadline,
        leagueId: selectedLeagueId || undefined
      };
      const response = await fetch(`/api/clubs/${clubId}/createTournament`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
          throw new Error(errorData.error || 'Hiba történt a torna létrehozása során');
        }
        return;
      }
      
      const data = await response.json();
      onTournamentCreated();
      onClose();
      if (data.tournamentId || data.code) {
        router.push(`/tournaments/${data.tournamentId || data.code}`);
      }
    } catch (err: any) {
      setError(err.message || 'Hiba történt a torna létrehozása során');
      console.error('Create tournament error:', err);
    }
  };

  const steps = [
    { id: 'details', label: 'Alapadatok' },
    { id: 'boards', label: 'Táblák kiválasztása' },
    { id: 'settings', label: 'Beállítások' },
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
                  value={new Date(settings.startDate).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', 'T')}
                  onChange={e => handleSettingsChange('startDate', new Date(e.target.value))}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nevezési díj (Ft)</label>
                <input
                  type="number"
                  value={settings.entryFee}
                  onChange={e => handleSettingsChange('entryFee', parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  placeholder="Pl.: 2000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Helyszín</label>
                <input
                  type="text"
                  value={settings.location}
                  onChange={(e) => handleSettingsChange('location', e.target.value)}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  placeholder="Pl.: Budapest, Sport Klub"
                />
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
                <label className="block text-sm font-medium mb-1">Nevezési határidő</label>
                <input
                  type="datetime-local"
                  value={new Date(settings.registrationDeadline).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', 'T')}
                  onChange={(e) => handleSettingsChange('registrationDeadline', new Date(e.target.value))}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                />
              </div>

            </div>
          )}
          {currentStep === 'boards' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Táblák létrehozása</label>
                <p className="text-sm text-base-content/60 mb-4">
                  Létrehozott táblák: {boards.length} db
                </p>
                <div className="space-y-3">
                  {boards.map((board, index) => (
                    <div key={index} className="flex gap-2 items-center p-3 bg-base-100 rounded-lg">
                      <div className="flex-1">
                        <label className="block text-xs text-base-content/60 mb-1">Tábla neve</label>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Maximális létszám</label>
                  <input
                    type="number"
                    value={settings.maxPlayers}
                    onChange={e => {if (Number(e.target.value) < 4) {
                      setError('A maximális létszám legalább 4 fő kell legyen');
                      } else {
                        handleSettingsChange('maxPlayers', Number(e.target.value))
                      }
                    }}
                    className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                    placeholder="Maximális játékosok száma"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Torna jelszó (kötelező)</label>
                <input
                  type="text"
                  value={settings.tournamentPassword}
                  onChange={(e) => handleSettingsChange('tournamentPassword', e.target.value)}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                  placeholder="Jelszó a táblákhoz való csatlakozáshoz"
                />
              </div>
              
              {/* League Selection */}
              <div>
                <label className="block text-sm font-medium mb-1">Liga hozzárendelés (opcionális)</label>
                <select
                  value={selectedLeagueId}
                  onChange={(e) => setSelectedLeagueId(e.target.value)}
                  className="w-full px-3 py-2 bg-base-100 rounded-lg outline-none focus:ring-2 ring-primary/20"
                >
                  <option value="">Nincs liga hozzárendelés</option>
                  {availableLeagues.filter(league => league.isActive).map((league) => (
                    <option key={league._id} value={league._id}>
                      {league.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-base-content/60 mt-1">
                  Ha kiválasztasz egy ligát, a verseny eredményei automatikusan hozzáadódnak a liga ranglistához
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
          {currentStep !== 'settings' ? (
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