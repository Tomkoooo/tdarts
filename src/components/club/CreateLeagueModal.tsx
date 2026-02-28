'use client';
import { useTranslations } from "next-intl";

import React, { useState, useEffect } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { CreateLeagueRequest, DEFAULT_LEAGUE_POINTS_CONFIG } from '@/interface/league.interface';
import { showErrorToast, showSuccessToast } from '@/lib/toastUtils';
import { POINT_SYSTEMS, getPointSystemDefinition, PointSystemId } from '@/lib/leaguePointSystems';
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
    const t = useTranslations("Club.components");
  const [formData, setFormData] = useState<CreateLeagueRequest>({
    name: '',
    description: '',
    pointsConfig: { ...DEFAULT_LEAGUE_POINTS_CONFIG },
    pointSystemType: 'platform',
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
      pointSystemType: 'platform',
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
      // Handle string values (from empty inputs) and convert to 0
      if (typeof val === 'string' && val === '') {
        acc[key] = 0;
      } else {
        acc[key] = val;
      }
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
        showSuccessToast(t("liga_sikeresen_létrehozva"));
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
      setError(t("error_creating_league_ojvj"));
      showErrorToast(t("hiba_a_liga"), {
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

  const platformPlacements = [1, 2, 3, 4, 8, 16, 32];
  const isPlacementMode = formData.pointsConfig?.useFixedRanks !== false;
  const updatePlacementPoint = (placement: number, value: number | '') => {
    setFormData((prev) => {
      const nextFixedRanks = {
        ...(prev.pointsConfig?.fixedRankPoints || {}),
        [placement]: value === '' ? 0 : value,
      };

      return {
        ...prev,
        pointsConfig: {
          ...prev.pointsConfig!,
          useFixedRanks: true,
          fixedRankPoints: nextFixedRanks,
        },
      };
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-gradient-to-br from-card/98 to-card/95 backdrop-blur-xl shadow-2xl shadow-primary/20">
        <DialogHeader className="space-y-2 flex-shrink-0 bg-gradient-to-r from-primary/10 to-transparent px-4 md:px-6 py-3 md:py-4 shadow-sm shadow-primary/10">
          <DialogTitle className="text-xl md:text-2xl">{t("új_liga_létrehozása")}</DialogTitle>
          <DialogDescription className="text-sm">
            {t("adj_meg_minden")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 px-1">
          <div className="grid gap-4 ">
            <div className="space-y-2 w-full">
              <Label htmlFor="league-name">{t("liga_neve_62")}</Label>
              <Input
                id="league-name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t("pl_tavaszi_bajnokság")}
                required
                maxLength={100}
              />
               <Label htmlFor="league-description">{t("leírás")}</Label>
              <Textarea
                id="league-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t("liga_részletes_leírása")}
                maxLength={500}
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="point-system-type">{t("pontszámítási_rendszer")}</Label>
            <select
              id="point-system-type"
              value={formData.pointSystemType || 'platform'}
              onChange={(e) => setFormData((prev) => ({ ...prev, pointSystemType: e.target.value as PointSystemId }))}
              className="w-full rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              {POINT_SYSTEMS.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.id === 'platform'
                    ? t("platform_pontszámítás")
                    : system.id === 'remiz_christmas'
                      ? t("remiz_christmas_series")
                      : system.id === 'ontour'
                        ? t("dartsbarlang_ontour_pontszámítás")
                        : system.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {formData.pointSystemType === 'remiz_christmas' 
                ? 'Fix pontrendszer: 20 pont részvétel, csoport pontok a csoport mérete és győzelmek alapján, helyezési pontok a végső helyezés alapján.'
                : formData.pointSystemType === 'ontour' 
                ? 'Fix pontrendszer: 1. 45pont 2. 32pont 3. 24pont 4. 20pont 8. 16pont 16. 10pont 32. 4pont 48. 2 pont' 
                : formData.pointSystemType === 'platform'
                  ? 'Helyezés alapú pontozás: add meg, melyik helyezés hány pontot ér. A csoportból kiesők külön fix pontot kapnak.'
                  : getPointSystemDefinition(formData.pointSystemType).description}
            </p>
          </div>

          {formData.pointSystemType === 'platform' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold">{t("pontszámítás_beállításai")}</h4>
              <span className="text-info" title={t("ezek_a_beállítások")}>
                <IconInfoCircle size={18} />
              </span>
            </div>

            <div className="rounded-md border border-muted bg-muted/30 p-3 text-sm">
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={!isPlacementMode}
                  onChange={(e) => updatePointsConfig('useFixedRanks', !e.target.checked)}
                  className="h-4 w-4 rounded accent-primary"
                />
                Legacy geometrikus mód (átmeneti kompatibilitás)
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {isPlacementMode ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("csoportkorbol_kiesok_pontjai_x3re")}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={(formData.pointsConfig as any)?.groupDropoutPoints ?? 0}
                      onChange={(e) =>
                        updatePointsConfig(
                          'groupDropoutPoints',
                          e.target.value === '' ? '' : parseInt(e.target.value, 10)
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Fix pontszám azoknak, akik nem jutnak tovább a kieséses szakaszba.
                    </p>
                  </div>

                  {platformPlacements.map((placement) => (
                    <div key={placement} className="space-y-2">
                      <Label className="text-sm font-medium">{placement}. helyezés pontja</Label>
                      <Input
                        type="number"
                        min={0}
                        max={500}
                        value={((formData.pointsConfig?.fixedRankPoints as any)?.[placement] ?? 0) as number}
                        onChange={(e) =>
                          updatePlacementPoint(
                            placement,
                            e.target.value === '' ? '' : parseInt(e.target.value, 10)
                          )
                        }
                      />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    { key: 'groupDropoutPoints', label: t("csoportkorbol_kiesok_pontjai_x3re") },
                    { key: 'knockoutBasePoints', label: t("egyenes_kieses_alappont_kkrk") },
                    { key: 'knockoutMultiplier', label: t("szorzo_tenyezo_fyk4"), step: 0.1 },
                    { key: 'winnerBonus', label: t("gyoztes_bonusz_pzwy") },
                    { key: 'maxKnockoutRounds', label: t("max_kiesos_korok_j57q") },
                  ].map((config) => (
                    <div key={config.key} className="space-y-2">
                      <Label className="text-sm font-medium">{config.label}</Label>
                      <Input
                        type="number"
                        min={0}
                        step={config.step ?? 1}
                        value={(formData.pointsConfig as any)?.[config.key] ?? 0}
                        onChange={(e) =>
                          updatePointsConfig(
                            config.key,
                            e.target.value === '' ? '' : (config.step ? parseFloat(e.target.value) : parseInt(e.target.value, 10))
                          )
                        }
                      />
                    </div>
                  ))}
                </>
              )}
            </div>

            <Card className="bg-gradient-to-br from-primary/5 to-transparent shadow-md shadow-primary/10">
              <CardContent className="pt-6 space-y-2 text-sm text-muted-foreground">
                <h5 className="font-medium text-foreground">{t("pontszámítás_előnézet")}</h5>
                <p>
                  Csoportból kieső:{' '}
                  <span className="font-mono">{formData.pointsConfig?.groupDropoutPoints || 0} {t("pont")}</span>
                </p>
                {isPlacementMode ? (
                  <>
                    <p>
                      1. hely:{' '}
                      <span className="font-mono">{(formData.pointsConfig?.fixedRankPoints as any)?.[1] || 0} {t("pont")}</span>
                    </p>
                    <p>Ha nincs bronzmeccs, mindkét elődöntő-vesztes 4. helyezés pontot kap.</p>
                    <p className="text-warning">
                      Figyelmeztetés: a helyezés pontok a végső helyezésre mennek. A csoportból kiesőkre mindig a fenti fix kieső pont vonatkozik.
                    </p>
                  </>
                ) : (
                  <p>Legacy geometrikus mód aktív (szorzós pontszámítás).</p>
                )}
              </CardContent>
            </Card>

            <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-muted-foreground">
              A régi geometrikus (szorzós) platform mód átmenetileg támogatott meglévő ligákhoz. Új ligához a helyezés alapú beállítás ajánlott.
            </div>
          </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 flex-shrink-0 mt-4 bg-gradient-to-r from-transparent to-primary/5 px-4 md:px-6 py-3 md:py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="w-full sm:w-auto md:size-default" disabled={loading}>
              {t("mégse")}</Button>
            <Button type="submit" size="sm" className="w-full sm:w-auto md:size-default shadow-lg shadow-primary/30" disabled={loading || !formData.name.trim()}>
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                  {t("létrehozás")}</>
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
