"use client";

import { useTranslations } from "next-intl";
import { IconDownload, IconPlayerPlay, IconShare } from "@tabler/icons-react";
import React, { RefObject, useMemo } from "react";
import type { LocalMatchFinishSnapshot } from "@/components/match/matchRecapTypes";
import { localSnapshotToRecapModel } from "@/components/match/matchRecapMappers";
import MatchRecapSheet from "@/components/match/MatchRecapSheet";
import { Button } from "@/components/ui/Button";

export type { LocalMatchFinishSnapshot };

type LocalMatchFinishPanelProps = {
  snapshot: LocalMatchFinishSnapshot;
  exportRef: RefObject<HTMLDivElement | null>;
  exportBusy: boolean;
  onDownloadPng: () => void;
  onSharePng: () => void;
  onBack: () => void;
  onRematch?: () => void;
};

const LocalMatchFinishPanel: React.FC<LocalMatchFinishPanelProps> = ({
  snapshot,
  exportRef,
  exportBusy,
  onDownloadPng,
  onSharePng,
  onBack,
  onRematch,
}) => {
  const t = useTranslations("Board");
  const model = useMemo(() => {
    const p1n = t("játékos_71");
    const p2n = t("játékos_23");
    return localSnapshotToRecapModel(
      snapshot,
      {
        brandLine: `tDarts · ${t("helyi_meccs")}`,
        titleLine: `${t("győztes")}${snapshot.winner === 1 ? p1n : p2n}`,
        scoreLine: `${snapshot.player1.legsWon} - ${snapshot.player2.legsWon}`,
      },
      p1n,
      p2n,
    );
  }, [snapshot, t]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-headline text-xl font-bold tracking-tight sm:text-2xl">
              {t("meccs_statisztikák")}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">{t("local.finish_subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onRematch ? (
              <Button onClick={onRematch} className="gap-2" disabled={exportBusy} size="sm">
                <IconPlayerPlay size={18} />
                {t("rematch")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={exportBusy}
              size="sm"
              onClick={onDownloadPng}
            >
              <IconDownload size={18} />
              {t("local.export_png")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={exportBusy}
              size="sm"
              onClick={onSharePng}
            >
              <IconShare size={18} />
              {t("local.share")}
            </Button>
            <Button onClick={onBack} variant="outline" disabled={exportBusy} size="sm">
              {t("vissza")}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 pb-24">
        <MatchRecapSheet exportRef={exportRef} model={model} />
      </div>
    </div>
  );
};

export default LocalMatchFinishPanel;
