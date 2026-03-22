"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export type TournamentOpenness = "amateur" | "open" | string | undefined;
export type TournamentParticipationMode = "individual" | "pair" | "team" | string | undefined;

type TournamentFormatBadgesProps = {
  type?: TournamentOpenness;
  participationMode?: TournamentParticipationMode;
  className?: string;
  size?: "sm" | "md";
};

export function TournamentFormatBadges({
  type,
  participationMode,
  className,
  size = "sm",
}: TournamentFormatBadgesProps) {
  const t = useTranslations("Tournament.badges");
  const compact = size === "sm";

  const openness = String(type || "").toLowerCase() === "open" ? "open" : "amateur";
  const mode = String(participationMode || "individual").toLowerCase();
  const modeKey =
    mode === "pair" ? "pair" : mode === "team" ? "team" : "individual";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Badge
        variant="outline"
        className={cn(
          compact ? "text-[10px] px-2 py-0 font-semibold" : "text-xs",
          openness === "open"
            ? "border-sky-500/70 bg-sky-500/15 text-sky-900 dark:text-sky-100"
            : "border-amber-600/50 bg-amber-500/12 text-amber-950 dark:text-amber-100",
        )}
      >
        {openness === "open" ? t("open") : t("amateur")}
      </Badge>
      <Badge
        variant="outline"
        className={cn(
          compact ? "text-[10px] px-2 py-0 font-semibold" : "text-xs",
          modeKey === "pair"
            ? "border-violet-500/70 bg-violet-500/12 text-violet-950 dark:text-violet-100"
            : modeKey === "team"
              ? "border-emerald-600/50 bg-emerald-500/12 text-emerald-950 dark:text-emerald-100"
              : "border-muted-foreground/40 bg-muted/30 text-foreground",
        )}
      >
        {modeKey === "pair" ? t("pair") : modeKey === "team" ? t("team") : t("individual")}
      </Badge>
    </div>
  );
}
