'use client';
import React, { useState, useEffect } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { CreateLeagueRequest, DEFAULT_LEAGUE_POINTS_CONFIG } from '@/interface/league.interface';
import { showErrorToast, showSuccessToast } from '@/lib/toastUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from "@/components/ui/Input";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from "@/components/ui/Card";

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
  onLeagueCreated,
}: CreateLeagueModalProps) {
  const [formData, setFormData] = useState<CreateLeagueRequest>({
    name: '',
    description: '',
    pointsConfig: { ...DEFAULT_LEAGUE_POINTS_CONFIG },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      pointsConfig: { ...DEFAULT_LEAGUE_POINTS_CONFIG },
    });
    setError('');
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Convert empty strings to 0 in pointsConfig
    const cleanedPointsConfig = Object.entries(formData.pointsConfig || {}).reduce((acc, [key, val]) => {
      acc[key] = val === '' ? 0 : val;
      return acc;
    }, {} as any);

    const dataToSubmit = {
      ...formData,
      pointsConfig: cleanedPointsConfig,
    };

    try {
      const response = await fetch(`/api/clubs/${clubId}/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (response.ok) {
        onLeagueCreated();
        onClose();
        showSuccessToast('Liga sikeresen létrehozva!');
        resetForm();
      } else {
        const errorData = await response.json();
        const message = errorData.error || 'Failed to create league';
        setError(message);
        showErrorToast(message, {
          context: 'Liga létrehozása',
          error: message,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ismeretlen hiba';
      setError('Error creating league');
      showErrorToast('Hiba a liga létrehozása során', {
        context: 'Liga létrehozása',
        error: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePointsConfig = (field: string, value: number | boolean | string) => {
    setFormData((prev) => ({
      ...prev,
      pointsConfig: {
        ...prev.pointsConfig!,
        [field]: value,
      },
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-card/98 to-card/95 backdrop-blur-xl shadow-2xl shadow-primary/20">
        <DialogHeader className="space-y-2 flex-shrink-0 bg-gradient-to-r from-primary/10 to-transparent px-4 md:px-6 py-3 md:py-4 shadow-sm shadow-primary/10">
          <DialogTitle className="text-xl md:text-2xl">Új liga létrehozása</DialogTitle>
          <DialogDescription className="text-sm">
            Adj meg minden szükséges információt, és alakítsd ki a pontszámítási rendszert a klub ligájához.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 px-1">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="league-name">Liga neve *</Label>
              <Input
                id="league-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="pl. Tavaszi Bajnokság 2024"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="league-description">Leírás</Label>
              <Textarea
                id="league-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Liga részletes leírása..."
                maxLength={500}
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold">Pontszámítás beállításai</h4>
              <span className="text-info" title="Ezek a beállítások határozzák meg a pontszámítás logikáját.">
                <IconInfoCircle size={18} />
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  label: 'Csoportkörből kiesők pontjai',
                  field: 'groupDropoutPoints',
                  min: 0,
                  max: 100,
                  helper: 'Fix pontszám a csoportkörben kiesőknek.',
                },
                {
                  label: 'Egyenes kiesés alappont',
                  field: 'knockoutBasePoints',
                  min: 1,
                  max: 100,
                  helper: 'Az első kieső kör pontszáma.',
                },
                {
                  label: 'Szorzó tényező',
                  field: 'knockoutMultiplier',
                  min: 1.1,
                  max: 3.0,
                  step: 0.1,
                  helper: 'Minden további kör pontszáma ezzel szorozódik.',
                },
                {
                  label: 'Győztes bónusz',
                  field: 'winnerBonus',
                  min: 0,
                  max: 100,
                  helper: 'Extra pontok a bajnoknak.',
                },
                {
                  label: 'Max. kiesős körök',
                  field: 'maxKnockoutRounds',
                  min: 1,
                  max: 10,
                  helper: 'Maximális egyenes kiesős körök száma.',
                },
              ].map((config) => (
                <div key={config.field} className="space-y-2">
                  <Label className="text-sm font-medium">{config.label}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={config.max}
                    step={config.step ?? 1}
                    value={(formData.pointsConfig as any)?.[config.field] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updatePointsConfig(
                        config.field,
                        val === '' ? '' : (config.step ? parseFloat(val) : parseInt(val))
                      );
                    }}
                  />
                  <p className="text-xs text-muted-foreground">{config.helper}</p>
                </div>
              ))}
            </div>

            <Card className="bg-gradient-to-br from-primary/5 to-transparent shadow-md shadow-primary/10">
              <CardContent className="pt-6 space-y-2 text-sm text-muted-foreground">
                <h5 className="font-medium text-foreground">Pontszámítás előnézet</h5>
                <p>Csoportkör kiesés: <span className="font-mono">{formData.pointsConfig?.groupDropoutPoints || 0} pont</span></p>
                <p>1. kör kiesés: <span className="font-mono">{formData.pointsConfig?.knockoutBasePoints || 0} pont</span></p>
                <p>2. kör kiesés: <span className="font-mono">{Math.round((formData.pointsConfig?.knockoutBasePoints || 0) * (formData.pointsConfig?.knockoutMultiplier || 1.5))} pont</span></p>
                <p>
                  Döntő kiesés:{' '}
                  <span className="font-mono">
                    {Math.round(
                      (formData.pointsConfig?.knockoutBasePoints || 0) *
                        Math.pow(formData.pointsConfig?.knockoutMultiplier || 1.5, (formData.pointsConfig?.maxKnockoutRounds || 5) - 1),
                    )}{' '}
                    pont
                  </span>
                </p>
                <p>
                  Győztes:{' '}
                  <span className="font-mono">
                    {Math.round(
                      (formData.pointsConfig?.knockoutBasePoints || 0) *
                        Math.pow(formData.pointsConfig?.knockoutMultiplier || 1.5, (formData.pointsConfig?.maxKnockoutRounds || 5) - 1),
                    ) + (formData.pointsConfig?.winnerBonus || 0)}{' '}
                    pont
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 flex-shrink-0 mt-4 bg-gradient-to-r from-transparent to-primary/5 px-4 md:px-6 py-3 md:py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="w-full sm:w-auto md:size-default" disabled={loading}>
              Mégse
            </Button>
            <Button type="submit" size="sm" className="w-full sm:w-auto md:size-default shadow-lg shadow-primary/30" disabled={loading || !formData.name.trim()}>
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                  Létrehozás...
                </>
              ) : (
                'Liga létrehozása'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
