"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  IconCheck,
  IconLock,
  IconAlertTriangle,
  IconLoader2,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateLegsConfigAction } from "@/features/tournaments/actions/manageTournament.action";
import { getConfigurableKnockoutRounds } from "@/features/tournaments/lib/knockoutLegsConfig";
import type { Tournament } from "@/interface/tournament.interface";

interface LegsConfigPanelProps {
  tournament: Tournament;
  userClubRole: "admin" | "moderator" | "member" | "none";
  onRefetch: () => void | Promise<void>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const LEG_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const SAVED_DISPLAY_MS = 2000;
const SAVE_DEBOUNCE_MS = 400;

function buildSectionPayload(
  section: "groups" | "knockout",
  values: Record<string, number | undefined>
): { groups?: Record<string, number>; knockout?: Record<string, number> } | null {
  const filtered = Object.fromEntries(
    Object.entries(values).filter(([, v]) => v !== undefined)
  ) as Record<string, number>;
  if (Object.keys(filtered).length === 0) return null;
  return section === "groups" ? { groups: filtered } : { knockout: filtered };
}

function useSaveState() {
  const [state, setState] = useState<SaveState>("idle");
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback((result: "saved" | "error") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState(result);
    if (result === "saved") {
      timerRef.current = setTimeout(() => setState("idle"), SAVED_DISPLAY_MS);
    }
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { state, setState, trigger };
}

const selectClass =
  "h-9 rounded-lg border border-border bg-muted/20 px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50";

export default function LegsConfigPanel({
  tournament,
  userClubRole,
  onRefetch,
}: LegsConfigPanelProps) {
  const t = useTranslations("Tournament.legs_config");

  const isFinished = tournament.tournamentSettings?.status === "finished";
  const isReadOnly = isFinished || (userClubRole !== "admin" && userClubRole !== "moderator");
  const format = tournament.tournamentSettings?.format || "group_knockout";
  const includesGroups = format !== "knockout";
  const includesKnockout = format !== "group";

  const hasGroups = (tournament.groups?.length ?? 0) > 0;
  const hasKnockout = (tournament.knockout?.length ?? 0) > 0;

  const existingLegsConfig = tournament.tournamentSettings?.legsConfig;

  const [localGroups, setLocalGroups] = useState<Record<string, number | undefined>>({});
  const [localKnockout, setLocalKnockout] = useState<Record<string, number | undefined>>({});
  const [bulkGroups, setBulkGroups] = useState<string>("");
  const [bulkKnockout, setBulkKnockout] = useState<string>("");
  const groupSave = useSaveState();
  const knockoutSave = useSaveState();
  const localGroupsRef = useRef(localGroups);
  const localKnockoutRef = useRef(localKnockout);
  const groupSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const knockoutSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const configurableKnockoutRounds = useMemo(
    () => getConfigurableKnockoutRounds(tournament),
    [tournament.knockout, tournament.tournamentSettings?.status]
  );

  useEffect(() => {
    localGroupsRef.current = localGroups;
  }, [localGroups]);

  useEffect(() => {
    localKnockoutRef.current = localKnockout;
  }, [localKnockout]);

  useEffect(() => {
    return () => {
      if (groupSaveTimerRef.current) clearTimeout(groupSaveTimerRef.current);
      if (knockoutSaveTimerRef.current) clearTimeout(knockoutSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const g: Record<string, number | undefined> = {};
    tournament.boards?.forEach((b) => {
      const key = String(b.boardNumber);
      const existing = (existingLegsConfig?.groups as Record<string, number> | undefined)?.[key];
      g[key] = existing ?? undefined;
    });
    setLocalGroups(g);

    const k: Record<string, number | undefined> = {};
    tournament.knockout?.forEach((r) => {
      const key = String(r.round);
      const existing = (existingLegsConfig?.knockout as Record<string, number> | undefined)?.[key];
      k[key] = existing ?? undefined;
    });
    setLocalKnockout(k);
  }, [tournament.boards, tournament.knockout, tournament.tournamentSettings?.legsConfig]);

  const persistSection = useCallback(
    async (
      section: "groups" | "knockout",
      values: Record<string, number | undefined>,
      saveState: ReturnType<typeof useSaveState>
    ) => {
      const payload = buildSectionPayload(section, values);
      if (!payload) return;
      saveState.setState("saving");
      try {
        await updateLegsConfigAction({
          code: tournament.tournamentId,
          legsConfig: payload,
        });
        saveState.trigger("saved");
        await onRefetch();
      } catch {
        saveState.trigger("error");
      }
    },
    [tournament.tournamentId, onRefetch]
  );

  const scheduleSaveGroups = useCallback(
    (next: Record<string, number | undefined>) => {
      if (groupSaveTimerRef.current) clearTimeout(groupSaveTimerRef.current);
      groupSaveTimerRef.current = setTimeout(() => {
        void persistSection("groups", next, groupSave);
      }, SAVE_DEBOUNCE_MS);
    },
    [persistSection, groupSave]
  );

  const scheduleSaveKnockout = useCallback(
    (next: Record<string, number | undefined>) => {
      if (knockoutSaveTimerRef.current) clearTimeout(knockoutSaveTimerRef.current);
      knockoutSaveTimerRef.current = setTimeout(() => {
        void persistSection("knockout", next, knockoutSave);
      }, SAVE_DEBOUNCE_MS);
    },
    [persistSection, knockoutSave]
  );

  const handleGroupChange = (boardKey: string, value: string) => {
    const next = { ...localGroups, [boardKey]: value === "" ? undefined : Number(value) };
    setLocalGroups(next);
    scheduleSaveGroups(next);
  };

  const handleKnockoutChange = (roundKey: string, value: string) => {
    const next = { ...localKnockout, [roundKey]: value === "" ? undefined : Number(value) };
    setLocalKnockout(next);
    scheduleSaveKnockout(next);
  };

  const applyBulkGroups = () => {
    if (!bulkGroups) return;
    const val = Number(bulkGroups);
    const next: Record<string, number | undefined> = {};
    tournament.boards?.forEach((b) => { next[String(b.boardNumber)] = val; });
    setLocalGroups(next);
    setBulkGroups("");
    scheduleSaveGroups(next);
  };

  const applyBulkKnockout = () => {
    if (!bulkKnockout) return;
    const val = Number(bulkKnockout);
    const next: Record<string, number | undefined> = {};
    configurableKnockoutRounds.forEach((r) => {
      next[String(r.round)] = val;
    });
    setLocalKnockout(next);
    setBulkKnockout("");
    scheduleSaveKnockout(next);
  };

  if (!includesGroups && !includesKnockout) return null;

  return (
    <Card className="border-border/60 bg-card/55 backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <IconLock className="h-4 w-4 text-primary" />
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

      <CardContent className="space-y-6">
        {/* Group Stage section */}
        {includesGroups && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">{t("group_section")}</h4>
              <SaveIndicator state={groupSave.state} savedLabel={t("saved")} errorLabel={t("save_error")} />
            </div>

            {!hasGroups ? (
              <p className="text-sm text-muted-foreground italic">{t("groups_not_generated")}</p>
            ) : (
              <>
                {/* Bulk row */}
                {!isReadOnly && (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
                    <span className="text-sm text-muted-foreground shrink-0">{t("bulk_set_label")}</span>
                    <select
                      value={bulkGroups}
                      onChange={(e) => setBulkGroups(e.target.value)}
                      className={cn(selectClass, "flex-1")}
                    >
                      <option value="" />
                      {LEG_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={applyBulkGroups}
                      disabled={!bulkGroups || groupSave.state === "saving"}
                    >
                      {t("bulk_apply")}
                    </Button>
                  </div>
                )}

                {/* Per-board rows */}
                <div className="space-y-2">
                  {[...(tournament.boards ?? [])]
                    .sort((a, b) => a.boardNumber - b.boardNumber)
                    .map((board) => {
                      const key = String(board.boardNumber);
                      const groupForBoard = tournament.groups?.find((g) => g.board === board.boardNumber);
                      const matchCount = groupForBoard?.matches?.length ?? 0;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 text-sm text-foreground">
                            {board.name || `#${board.boardNumber}`}
                            {matchCount > 0 && (
                              <span className="ml-1 text-xs text-muted-foreground">({matchCount})</span>
                            )}
                          </span>
                          <select
                            value={localGroups[key] ?? ""}
                            onChange={(e) => handleGroupChange(key, e.target.value)}
                            disabled={isReadOnly || groupSave.state === "saving"}
                            className={selectClass}
                          >
                            <option value="">{t("not_set")}</option>
                            {LEG_OPTIONS.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Knockout section */}
        {includesKnockout && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">{t("knockout_section")}</h4>
              <SaveIndicator state={knockoutSave.state} savedLabel={t("saved")} errorLabel={t("save_error")} />
            </div>

            {existingLegsConfig && !existingLegsConfig.knockout && hasGroups && (
              <Alert className="border-warning/40 bg-warning/10">
                <AlertDescription className="flex items-start gap-2 text-xs text-warning">
                  <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {t("knockout_cleared_notice")}
                </AlertDescription>
              </Alert>
            )}

            {!hasKnockout ? (
              <p className="text-sm text-muted-foreground italic">{t("knockout_not_generated")}</p>
            ) : (
              <>
                {/* Bulk row */}
                {!isReadOnly && (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-2">
                    <span className="text-sm text-muted-foreground shrink-0">{t("bulk_set_label")}</span>
                    <select
                      value={bulkKnockout}
                      onChange={(e) => setBulkKnockout(e.target.value)}
                      className={cn(selectClass, "flex-1")}
                    >
                      <option value="" />
                      {LEG_OPTIONS.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={applyBulkKnockout}
                      disabled={!bulkKnockout || knockoutSave.state === "saving"}
                    >
                      {t("bulk_apply")}
                    </Button>
                  </div>
                )}

                {/* Per-round rows */}
                <div className="space-y-2">
                  {configurableKnockoutRounds.map((ko, index) => {
                      const key = String(ko.round);
                      return (
                        <div key={`round-${ko.round}-${index}`} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 text-sm text-foreground">
                            #{ko.round}
                          </span>
                          <select
                            value={localKnockout[key] ?? ""}
                            onChange={(e) => handleKnockoutChange(key, e.target.value)}
                            disabled={isReadOnly || knockoutSave.state === "saving"}
                            className={selectClass}
                          >
                            <option value="">{t("not_set")}</option>
                            {LEG_OPTIONS.map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SaveIndicator({
  state,
  savedLabel,
  errorLabel,
}: {
  state: SaveState;
  savedLabel: string;
  errorLabel: string;
}) {
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-success">
        <IconCheck className="h-3.5 w-3.5" />
        {savedLabel}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-destructive">
      <IconAlertTriangle className="h-3.5 w-3.5" />
      {errorLabel}
    </span>
  );
}
