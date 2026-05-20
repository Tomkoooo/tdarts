"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  dartPoints,
  canUseTripleOnSector,
  DART_NUMBER_SECTORS,
  DART_BULL_SECTORS,
  DART_MISS_SECTOR,
  type DartMultiplier,
} from "@/lib/darts/sectorScore";

interface VisitDart {
  sector: number;
  multiplier: DartMultiplier;
  points: number;
}

export interface DartVisitState {
  visitTotal: number;
  remainingAfterVisit: number;
  dartCount: number;
}

export interface SectorScoreInputProps {
  remainingScore: number;
  onVisitComplete: (visitTotal: number) => void;
  onVisitStateChange?: (state: DartVisitState) => void;
  disabled?: boolean;
}

function sectorButtonLabel(
  sector: number,
  displayLabel: string,
  multiplier: DartMultiplier
): { main: string; sub: string | null } {
  if (multiplier === 1) {
    return { main: displayLabel, sub: null };
  }
  const prefix = multiplier === 2 ? "D" : "T";
  const pts = dartPoints(sector, multiplier);
  if (pts <= 0) {
    return { main: displayLabel, sub: null };
  }
  return { main: `${prefix}${displayLabel}`, sub: `(${pts})` };
}

function formatDartChip(dart: VisitDart): string {
  if (dart.sector === DART_MISS_SECTOR.value) return "Miss";
  const prefix = dart.multiplier === 1 ? "S" : dart.multiplier === 2 ? "D" : "T";
  const label = dart.sector === 50 ? "Bull" : String(dart.sector);
  return `${prefix}${label}`;
}

export const SectorScoreInput: React.FC<SectorScoreInputProps> = ({
  remainingScore,
  onVisitComplete,
  onVisitStateChange,
  disabled = false,
}) => {
  const t = useTranslations("Board");
  const [multiplier, setMultiplier] = useState<DartMultiplier>(1);
  const [visitDarts, setVisitDarts] = useState<VisitDart[]>([]);

  const visitTotal = useMemo(
    () => visitDarts.reduce((sum, d) => sum + d.points, 0),
    [visitDarts]
  );

  const remainingAfterVisit = remainingScore - visitTotal;

  useEffect(() => {
    onVisitStateChange?.({
      visitTotal,
      remainingAfterVisit,
      dartCount: visitDarts.length,
    });
  }, [visitTotal, remainingAfterVisit, visitDarts.length, onVisitStateChange]);

  const submitVisit = useCallback(() => {
    onVisitComplete(visitTotal);
    setVisitDarts([]);
    setMultiplier(1);
  }, [onVisitComplete, visitTotal]);

  const appendDart = (sector: number, effectiveMultiplier: DartMultiplier) => {
    const points = dartPoints(sector, effectiveMultiplier);
    setVisitDarts((prev) => [
      ...prev,
      { sector, multiplier: effectiveMultiplier, points },
    ]);
    setMultiplier(1);
  };

  const handleSectorClick = (sector: number) => {
    if (disabled || visitDarts.length >= 3) return;

    const effectiveMultiplier =
      multiplier === 3 && !canUseTripleOnSector(sector) ? 1 : multiplier;
    appendDart(sector, effectiveMultiplier);
  };

  const handleMissClick = () => {
    if (disabled || visitDarts.length >= 3) return;
    appendDart(DART_MISS_SECTOR.value, 1);
  };

  const handleUndoDart = () => {
    setVisitDarts((prev) => prev.slice(0, -1));
  };

  const multiplierButtonProps = (m: DartMultiplier) => {
    const baseClass = "flex-1 h-9 border-2";
    if (multiplier !== m) {
      return {
        variant: "outline" as const,
        className: cn(baseClass, "border-transparent bg-base-300 hover:bg-base-100"),
      };
    }
    if (m === 1) {
      return {
        variant: "outline" as const,
        className: cn(baseClass, "border-border bg-base-100"),
      };
    }
    if (m === 2) {
      return {
        variant: "warning" as const,
        className: cn(baseClass, "border-warning ring-2 ring-warning"),
      };
    }
    return {
      variant: "default" as const,
      className: cn(baseClass, "border-primary ring-2 ring-primary"),
    };
  };

  const renderSectorButton = (label: string, value: number, className?: string) => {
    const previewPoints = dartPoints(
      value,
      multiplier === 3 && !canUseTripleOnSector(value) ? 1 : multiplier
    );
    const { main, sub } = sectorButtonLabel(value, label, multiplier);
    const inactive =
      (multiplier !== 1 && previewPoints === 0) ||
      (multiplier === 3 && !canUseTripleOnSector(value));

    return (
      <button
        key={label}
        type="button"
        disabled={disabled || visitDarts.length >= 3 || inactive}
        onClick={() => handleSectorClick(value)}
        className={cn(
          "flex flex-col items-center justify-center rounded-lg bg-base-200 hover:bg-base-300 text-base-content font-bold transition-colors disabled:opacity-40 min-h-0",
          multiplier === 2 && !inactive && previewPoints > 0 && "ring-2 ring-warning",
          multiplier === 3 && !inactive && previewPoints > 0 && "ring-2 ring-primary",
          className
        )}
      >
        <span className="text-lg sm:text-xl leading-none">{main}</span>
        {sub ? (
          <span
            className={cn(
              "text-[10px] sm:text-xs font-semibold mt-0.5 leading-none",
              multiplier === 2 ? "text-warning" : "text-primary"
            )}
          >
            {sub}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-1.5 p-1 sm:p-2">
      {visitDarts.length > 0 && (
        <div className="flex flex-wrap gap-1 shrink-0 justify-center">
          {visitDarts.map((dart, i) => (
            <span
              key={`${i}-${dart.sector}-${dart.multiplier}`}
              className="rounded bg-base-300 px-2 py-0.5 text-xs font-medium"
            >
              {formatDartChip(dart)}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 shrink-0">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => setMultiplier(1)}
          {...multiplierButtonProps(1)}
        >
          {t("sector_input.simple")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => setMultiplier(2)}
          {...multiplierButtonProps(2)}
        >
          {t("sector_input.double")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => setMultiplier(3)}
          {...multiplierButtonProps(3)}
        >
          {t("sector_input.triple")}
        </Button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-1.5">
        <div className="flex-1 min-h-0 grid grid-cols-5 sm:grid-cols-7 gap-1.5 sm:gap-2 auto-rows-fr">
          {DART_NUMBER_SECTORS.map(({ label, value }) =>
            renderSectorButton(label, value, "aspect-[4/3] sm:aspect-auto")
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 shrink-0 h-14 sm:h-16">
          {renderSectorButton(DART_BULL_SECTORS[0].label, DART_BULL_SECTORS[0].value, "h-full")}
          <button
            type="button"
            disabled={disabled || visitDarts.length >= 3}
            onClick={handleMissClick}
            className="flex flex-col items-center justify-center h-full rounded-lg bg-base-200 hover:bg-base-300 text-base-content font-bold text-lg sm:text-xl transition-colors disabled:opacity-40"
          >
            {t("sector_input.miss")}
          </button>
          {renderSectorButton(DART_BULL_SECTORS[1].label, DART_BULL_SECTORS[1].value, "h-full")}
        </div>
      </div>

      <div className="flex gap-2 shrink-0 pt-0.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 h-9"
          disabled={disabled || visitDarts.length === 0}
          onClick={handleUndoDart}
        >
          {t("sector_input.undo_dart")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="flex-1 h-9"
          disabled={disabled || visitDarts.length === 0 || visitTotal > 180}
          onClick={submitVisit}
        >
          {t("sector_input.submit_visit")}
        </Button>
      </div>
    </div>
  );
};

export default SectorScoreInput;
