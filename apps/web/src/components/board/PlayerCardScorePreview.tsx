"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { DartVisitState } from "@/components/board/SectorScoreInput";
import type { ScoreEntryMode } from "@/lib/board/boardScoreSettings";

interface PlayerCardScorePreviewProps {
  showPreview: boolean;
  isActivePlayer: boolean;
  scoreEntryMode: ScoreEntryMode;
  dartVisitState: DartVisitState;
  totalModeInput: string;
  currentRemaining: number;
}

export const PlayerCardScorePreview: React.FC<PlayerCardScorePreviewProps> = ({
  showPreview,
  isActivePlayer,
  scoreEntryMode,
  dartVisitState,
  totalModeInput,
  currentRemaining,
}) => {
  const t = useTranslations("Board");

  if (!showPreview || !isActivePlayer) return null;

  const isDart = scoreEntryMode === "dart";
  const parsedTotal = parseInt(totalModeInput || "0", 10) || 0;
  const showDartRemaining = isDart && dartVisitState.dartCount > 0;
  const showTotalRemaining = !isDart && parsedTotal > 0;
  const remainingAfter = isDart
    ? dartVisitState.remainingAfterVisit
    : currentRemaining - parsedTotal;

  if (!showDartRemaining && !showTotalRemaining) return null;

  return (
    <div className="mb-1 sm:mb-2 text-warning font-semibold text-xs sm:text-sm md:text-base tabular-nums text-center">
      <span>
        {t("sector_input.remaining")}: {remainingAfter}
      </span>
    </div>
  );
};

export default PlayerCardScorePreview;
