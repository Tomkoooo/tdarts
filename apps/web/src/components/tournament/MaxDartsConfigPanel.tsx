"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IconAlertTriangle, IconCheck, IconLoader2, IconTarget } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { updateMaxDartsPerLegAction } from "@/features/tournaments/actions/manageTournament.action";
import type { Tournament } from "@/interface/tournament.interface";

interface MaxDartsConfigPanelProps {
  tournament: Tournament;
  userClubRole: "admin" | "moderator" | "member" | "none";
  onRefetch: () => void | Promise<void>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVED_DISPLAY_MS = 2000;

export default function MaxDartsConfigPanel({
  tournament,
  userClubRole,
  onRefetch,
}: MaxDartsConfigPanelProps) {
  const t = useTranslations("Tournament.max_darts_config");

  const isFinished = tournament.tournamentSettings?.status === "finished";
  const isReadOnly = isFinished || (userClubRole !== "admin" && userClubRole !== "moderator");

  const configured = tournament.tournamentSettings?.maxDartsPerLeg ?? null;
  const [localValue, setLocalValue] = useState<string>(
    configured != null ? String(configured) : ""
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(configured != null ? String(configured) : "");
  }, [configured]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const save = useCallback(
    async (value: number | null) => {
      setSaveState("saving");
      try {
        await updateMaxDartsPerLegAction({
          code: tournament.tournamentId,
          maxDartsPerLeg: value,
        });
        setSaveState("saved");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSaveState("idle"), SAVED_DISPLAY_MS);
        await onRefetch();
      } catch {
        setSaveState("error");
      }
    },
    [tournament.tournamentId, onRefetch]
  );

  const handleBlur = () => {
    if (isReadOnly) return;
    const trimmed = localValue.trim();
    if (trimmed === "") {
      if (configured !== null) void save(null);
      return;
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 1 || num > 99) {
      setLocalValue(configured != null ? String(configured) : "");
      return;
    }
    if (num !== configured) void save(num);
  };

  const handleClear = () => {
    if (isReadOnly) return;
    setLocalValue("");
    void save(null);
  };

  return (
    <Card className="border-border/60 bg-card/55 backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <IconTarget className="h-4 w-4 text-primary" />
          {t("title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        {isFinished && (
          <Alert className="mt-2 border-warning/40 bg-warning/10">
            <AlertDescription className="flex items-center gap-2 text-sm text-warning">
              <IconAlertTriangle className="h-4 w-4 shrink-0" />
              {t("finished_note")}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="max-darts-per-leg">{t("input_label")}</Label>
            <Input
              id="max-darts-per-leg"
              type="number"
              min={1}
              max={99}
              placeholder={t("placeholder")}
              value={localValue}
              disabled={isReadOnly}
              onChange={(e) => setLocalValue(e.target.value)}
              onBlur={handleBlur}
              className="w-28"
            />
          </div>
          {!isReadOnly && configured != null && (
            <Button type="button" variant="outline" size="sm" onClick={handleClear}>
              {t("clear")}
            </Button>
          )}
          {saveState === "saving" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
              {t("saving")}
            </span>
          )}
          {saveState === "saved" && (
            <span className="flex items-center gap-1 text-xs text-success">
              <IconCheck className="h-3.5 w-3.5" />
              {t("saved")}
            </span>
          )}
          {saveState === "error" && (
            <span className="text-xs text-destructive">{t("save_error")}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("help")}</p>
      </CardContent>
    </Card>
  );
}
