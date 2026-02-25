import { useTranslations } from "next-intl";
import React from "react"
import { Player } from "@/interface/player.interface"
import { IconChevronRight, IconMedal, IconMedal2, IconAward, IconTrophy } from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface PlayerCardProps {
  player: Player
  onClick: () => void
  rank?: number
  showGlobalRank?: boolean
}

const topRankStyles: Record<
  number,
  {
    icon: typeof IconMedal
    gradient: string
  }
> = {
  1: { icon: IconMedal, gradient: "from-amber-400 via-amber-500 to-amber-600 text-amber-950" },
  2: { icon: IconMedal2, gradient: "from-slate-200 via-slate-300 to-slate-400 text-slate-800" },
  3: { icon: IconAward, gradient: "from-orange-300 via-orange-400 to-orange-500 text-orange-900" },
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, onClick, rank, showGlobalRank = false }) => {
    const t = useTranslations("Auto");
  const mmr = (player as any).mmr ?? player.stats?.mmr ?? 800

  const mmrTier =
    (player as any).mmrTier ??
    (() => {
      if (mmr >= 1600) return { name: "Elit", color: "text-[#ff8fa3]" }
      if (mmr >= 1400) return { name: "Mester", color: "text-[#fcd34d]" }
      if (mmr >= 1200) return { name: "Haladó", color: "text-blue-300" }
      if (mmr >= 1000) return { name: "Középhaladó", color: "text-emerald-300" }
      if (mmr >= 800) return { name: "Kezdő+", color: "text-primary" }
      return { name: "Kezdő", color: "text-muted-foreground" }
    })()

  const globalRank = (player as any).globalRank
  const hasRankBadge = typeof rank === "number" && rank > 0
  const rankStyle = hasRankBadge && topRankStyles[rank]

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      className="group relative h-full cursor-pointer bg-card/90 shadow-md shadow-black/30 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <CardContent className="flex h-full flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {hasRankBadge && (
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-sm font-semibold text-foreground transition-transform duration-200 group-hover:scale-105",
                  rankStyle && `bg-gradient-to-br ${rankStyle.gradient}`,
                )}
              >
                {rankStyle ? <rankStyle.icon className="h-6 w-6" /> : <span>#{rank}</span>}
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-foreground md:text-lg" title={player.name}>
                    {player.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {player.stats?.tournamentsPlayed || 0} {t("torna")}{player.stats?.matchesPlayed || 0} {t("meccs")}</p>
                </div>
                <IconChevronRight className="h-4 w-4 text-muted-foreground/60" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {showGlobalRank && globalRank && (
                  <Badge variant="secondary" className="gap-1">
                    <IconTrophy className="h-3.5 w-3.5" />
                    #{globalRank}
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1 text-xs font-semibold uppercase tracking-wide">
                  <span className={cn("text-sm", mmrTier.color)}>{mmrTier.name}</span>
                  <span className="font-mono text-muted-foreground">• {mmr}</span>
                  {player.tournamentHistory && player.tournamentHistory.length > 0 && player.tournamentHistory[player.tournamentHistory.length - 1].mmrChange !== undefined && (
                    <span className={cn(
                      "ml-1 font-mono text-[10px]",
                      player.tournamentHistory[player.tournamentHistory.length - 1].mmrChange! >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {player.tournamentHistory[player.tournamentHistory.length - 1].mmrChange! >= 0 ? "+" : ""}
                      {player.tournamentHistory[player.tournamentHistory.length - 1].mmrChange}
                    </span>
                  )}
                </Badge>
                {/* Honors / Titles */}
                {player.honors?.map((honor, i) => (
                  <Badge 
                    key={`${honor.title}-${honor.year}-${i}`} 
                    variant="secondary" 
                    className={cn(
                      "gap-1 text-[10px] font-bold uppercase tracking-wider",
                      honor.type === 'rank' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : 
                      honor.type === 'tournament' ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" : 
                      "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    )}
                    title={honor.description}
                  >
                    {honor.type === 'rank' && <IconMedal className="h-3 w-3" />}
                    {honor.type === 'tournament' && <IconTrophy className="h-3 w-3" />}
                    {honor.title}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator className="opacity-10" />

        <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
          <Stat label={t("átlag_19")} value={player.stats?.avg?.toFixed(1) ?? "—"} />
          <Stat label="180-ak" value={player.stats?.total180s ?? 0} />
          <Stat label={t("legjobb_helyezés")} value={player.stats?.bestPosition ?? "—"} />
          <Stat label={t("max_kiszálló")} value={player.stats?.highestCheckout ?? "—"} />
        </div>
      </CardContent>
    </Card>
  )
}

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/25 px-3 py-2">
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="font-semibold text-foreground">{value}</span>
  </div>
)

export default PlayerCard