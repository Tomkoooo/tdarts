'use client';
import { useTranslations } from "next-intl";

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
              onChange={(e) => setFormData((prev) => ({ ...prev, pointSystemType: e.target.value as 'platform' | 'remiz_christmas' | 'ontour'}))}
              className="w-full rounded-md bg-background px-3 py-2 text-sm outline-none shadow-sm shadow-black/10 focus-visible:ring-2 focus-visible:ring-primary/20"
            >
              <option value="platform">{t("platform_pontszámítás")}</option>
              <option value="remiz_christmas">{t("remiz_christmas_series")}</option>
              <option value="ontour">{t("dartsbarlang_ontour_pontszámítás")}</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {formData.pointSystemType === 'remiz_christmas' 
                ? 'Fix pontrendszer: 20 pont részvétel, csoport pontok a csoport mérete és győzelmek alapján, helyezési pontok a végső helyezés alapján.'
                : formData.pointSystemType === 'ontour' 
                ? 'Fix pontrendszer: 1. 45pont 2. 32pont 3. 24pont 4. 20pont 8. 16pont 16. 10pont 32. 4pont 48. 2 pont' 
                :'Geometrikus progresszió alapú pontszámítás a csoportkör és egyenes kiesés eredményei alapján.'}
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

            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  label: t("csoportkorbol_kiesok_pontjai_x3re"),
                  field: 'groupDropoutPoints',
                  min: 0,
                  max: 100,
                  helper: 'Fix pontszám a csoportkörben kiesőknek.',
                },
                {
                  label: t("egyenes_kieses_alappont_kkrk"),
                  field: 'knockoutBasePoints',
                  min: 1,
                  max: 100,
                  helper: 'Az első kieső kör pontszáma.',
                },
                {
                  label: t("szorzo_tenyezo_fyk4"),
                  field: 'knockoutMultiplier',
                  min: 1.1,
                  max: 3.0,
                  step: 0.1,
                  helper: 'Minden további kör pontszáma ezzel szorozódik.',
                },
                {
                  label: t("gyoztes_bonusz_pzwy"),
                  field: 'winnerBonus',
                  min: 0,
                  max: 100,
                  helper: 'Extra pontok a bajnoknak.',
                },
                {
                  label: t("max_kiesos_korok_j57q"),
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
                <h5 className="font-medium text-foreground">{t("pontszámítás_előnézet")}</h5>
                <p>{t("csoportkör_kiesés")}<span className="font-mono">{formData.pointsConfig?.groupDropoutPoints || 0} {t("pont")}</span></p>
                <p>{t("kör_kiesés")}<span className="font-mono">{formData.pointsConfig?.knockoutBasePoints || 0} {t("pont")}</span></p>
                <p>{t("kör_kiesés_1")}<span className="font-mono">{Math.round((formData.pointsConfig?.knockoutBasePoints || 0) * (formData.pointsConfig?.knockoutMultiplier || 1.5))} {t("pont")}</span></p>
                <p>
                  {t("döntő_kiesés")}{' '}
                  <span className="font-mono">
                    {Math.round(
                      (formData.pointsConfig?.knockoutBasePoints || 0) *
                        Math.pow(formData.pointsConfig?.knockoutMultiplier || 1.5, (formData.pointsConfig?.maxKnockoutRounds || 5) - 1),
                    )}{' '}
                    {t("pont")}</span>
                </p>
                <p>
                  {t("győztes")}{' '}
                  <span className="font-mono">
                    {Math.round(
                      (formData.pointsConfig?.knockoutBasePoints || 0) *
                        Math.pow(formData.pointsConfig?.knockoutMultiplier || 1.5, (formData.pointsConfig?.maxKnockoutRounds || 5) - 1),
                    ) + (formData.pointsConfig?.winnerBonus || 0)}{' '}
                    {t("pont")}</span>
                </p>
              </CardContent>
            </Card>
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
