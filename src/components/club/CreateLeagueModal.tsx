'use client';
import React, { useState } from 'react';
import { IconX, IconInfoCircle } from '@tabler/icons-react';
import { CreateLeagueRequest, DEFAULT_LEAGUE_POINTS_CONFIG } from '@/interface/league.interface';
import { showErrorToast, showSuccessToast } from '@/lib/toastUtils';

interface CreateLeagueModalProps {
  clubId: string;
  isOpen: boolean;
  onClose: () => void;
  onLeagueCreated: () => void;
}

export default function CreateLeagueModal({ 
  clubId, 
  isOpen, 
  onClose, 
  onLeagueCreated 
}: CreateLeagueModalProps) {
  const [formData, setFormData] = useState<CreateLeagueRequest>({
    name: '',
    description: '',
    pointsConfig: { ...DEFAULT_LEAGUE_POINTS_CONFIG },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onLeagueCreated();
        handleClose();
        showSuccessToast('Liga sikeresen létrehozva!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create league');
        showErrorToast(errorData.error || 'Hiba a liga létrehozása során', {
          context: 'Liga létrehozása',
          error: errorData.error
        });
      }
    } catch (err) {
      setError('Error creating league');
      showErrorToast('Hiba a liga létrehozása során', {
        context: 'Liga létrehozása',
        error: err instanceof Error ? err.message : 'Ismeretlen hiba'
      });
      console.error('Error creating league:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      pointsConfig: { ...DEFAULT_LEAGUE_POINTS_CONFIG },
    });
    setError('');
    setLoading(false);
    onClose();
  };

  const updatePointsConfig = (field: string, value: number | boolean) => {
    setFormData(prev => ({
      ...prev,
      pointsConfig: {
        ...prev.pointsConfig!,
        [field]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <dialog open={isOpen} className="modal">
      <div className="modal-box max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Új Liga Létrehozása</h3>
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-square"
            disabled={loading}
          >
            <IconX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Alapinformációk</h4>
            
            <div>
              <label className="block text-sm font-medium mb-2">Liga neve *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input input-bordered w-full"
                placeholder="pl. Tavaszi Bajnokság 2024"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Leírás</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="textarea textarea-bordered w-full"
                rows={3}
                placeholder="Liga részletes leírása..."
                maxLength={500}
              />
            </div>
          </div>

          {/* Points Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold">Pontszámítás Beállítások</h4>
              <div className="tooltip" data-tip="Ezek a beállítások határozzák meg, hogy a játékosok hány pontot kapnak a versenyeken elért helyezéseik alapján.">
                <IconInfoCircle size={20} className="text-info" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Csoportkörből kiesők pontjai
                </label>
                <input
                  type="number"
                  value={formData.pointsConfig?.groupDropoutPoints || 0}
                  onChange={(e) => updatePointsConfig('groupDropoutPoints', parseInt(e.target.value) || 0)}
                  className="input input-bordered w-full"
                  min="0"
                  max="100"
                />
                <div className="text-xs text-base-content/60 mt-1">
                  Fix pontszám azoknak, akik a csoportkörben esnek ki
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Egyenes kiesés alappont
                </label>
                <input
                  type="number"
                  value={formData.pointsConfig?.knockoutBasePoints || 0}
                  onChange={(e) => updatePointsConfig('knockoutBasePoints', parseInt(e.target.value) || 0)}
                  className="input input-bordered w-full"
                  min="1"
                  max="100"
                />
                <div className="text-xs text-base-content/60 mt-1">
                  Az első kieső kör pontszáma
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Szorzó tényező
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.pointsConfig?.knockoutMultiplier || 1.5}
                  onChange={(e) => updatePointsConfig('knockoutMultiplier', parseFloat(e.target.value) || 1.5)}
                  className="input input-bordered w-full"
                  min="1.1"
                  max="3.0"
                />
                <div className="text-xs text-base-content/60 mt-1">
                  Minden további kör pontszáma szorozva ezzel
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Győztes bónusz
                </label>
                <input
                  type="number"
                  value={formData.pointsConfig?.winnerBonus || 0}
                  onChange={(e) => updatePointsConfig('winnerBonus', parseInt(e.target.value) || 0)}
                  className="input input-bordered w-full"
                  min="0"
                  max="100"
                />
                <div className="text-xs text-base-content/60 mt-1">
                  Extra pontok a győztesnek
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Max egyenes kiesős körök
                </label>
                <input
                  type="number"
                  value={formData.pointsConfig?.maxKnockoutRounds || 5}
                  onChange={(e) => updatePointsConfig('maxKnockoutRounds', parseInt(e.target.value) || 5)}
                  className="input input-bordered w-full"
                  min="1"
                  max="10"
                />
                <div className="text-xs text-base-content/60 mt-1">
                  Maximális egyenes kiesős körök száma
                </div>
              </div>
            </div>

            {/* Points Preview */}
            <div className="bg-base-200 p-4 rounded-lg">
              <h5 className="font-medium mb-2">Pontszámítás Előnézet:</h5>
              <div className="text-sm space-y-1">
                <div>Csoportkör kiesés: <span className="font-mono">{formData.pointsConfig?.groupDropoutPoints || 0} pont</span></div>
                <div>1. kör kiesés: <span className="font-mono">{formData.pointsConfig?.knockoutBasePoints || 0} pont</span></div>
                <div>2. kör kiesés: <span className="font-mono">{Math.round((formData.pointsConfig?.knockoutBasePoints || 0) * (formData.pointsConfig?.knockoutMultiplier || 1.5))} pont</span></div>
                <div>Döntő kiesés: <span className="font-mono">{Math.round((formData.pointsConfig?.knockoutBasePoints || 0) * Math.pow(formData.pointsConfig?.knockoutMultiplier || 1.5, (formData.pointsConfig?.maxKnockoutRounds || 5) - 1))} pont</span></div>
                <div>Győztes: <span className="font-mono">{Math.round((formData.pointsConfig?.knockoutBasePoints || 0) * Math.pow(formData.pointsConfig?.knockoutMultiplier || 1.5, (formData.pointsConfig?.maxKnockoutRounds || 5) - 1)) + (formData.pointsConfig?.winnerBonus || 0)} pont</span></div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-ghost"
              disabled={loading}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !formData.name.trim()}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Létrehozás...
                </>
              ) : (
                'Liga Létrehozása'
              )}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
}
