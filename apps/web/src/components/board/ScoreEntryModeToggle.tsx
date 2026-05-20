"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { IconCalculator, IconTarget } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  getStoredScoreEntryMode,
  setStoredScoreEntryMode,
  type ScoreEntryMode,
} from "@/lib/board/boardScoreSettings";

export type { ScoreEntryMode };
export { getStoredScoreEntryMode, setStoredScoreEntryMode };

interface ScoreEntryModeToggleProps {
  mode: ScoreEntryMode;
  onChange: (mode: ScoreEntryMode) => void;
  className?: string;
}

export const ScoreEntryModeToggle: React.FC<ScoreEntryModeToggleProps> = ({
  mode,
  onChange,
  className,
}) => {
  const t = useTranslations("Board");

  const btnClass = (active: boolean) =>
    cn(
      "flex items-center justify-center rounded-lg border p-2 transition-colors",
      active
        ? "bg-primary text-primary-content border-primary"
        : "bg-base-300 text-base-content border-border hover:bg-base-100"
    );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        title={t("score_mode_total")}
        aria-label={t("score_mode_total")}
        className={btnClass(mode === "total")}
        onClick={() => {
          onChange("total");
          setStoredScoreEntryMode("total");
        }}
      >
        <IconCalculator className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
      <button
        type="button"
        title={t("score_mode_dart")}
        aria-label={t("score_mode_dart")}
        className={btnClass(mode === "dart")}
        onClick={() => {
          onChange("dart");
          setStoredScoreEntryMode("dart");
        }}
      >
        <IconTarget className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
    </div>
  );
};

export default ScoreEntryModeToggle;
