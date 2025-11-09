import React from "react"
import {
  IconBolt,
  IconCalendarStats,
  IconChartBar,
  IconMedal,
  IconPlayerPlay,
  IconTarget,
  IconTrophy,
  IconTrendingUp,
} from "@tabler/icons-react"

import { Player } from "@/interface/player.interface"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"

interface PlayerStatsModalProps {
  player: Player | null
  onClose: () => void
}

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ player, onClose }) => {
  if (!player) return null

  const stats = player.stats ?? {}
  const highlightCards = [
    {
      label: "Összes torna",
      value: stats.tournamentsPlayed ?? 0,
      icon: IconTrophy,
    },
    {
      label: "Legjobb helyezés",
      value: stats.bestPosition ?? "—",
      icon: IconMedal,
    },
    {
      label: "Átlagos helyezés",
      value: stats.averagePosition ? stats.averagePosition.toFixed(1) : "—",
      icon: IconChartBar,
    },
    {
      label: "Győzelmi arány",
      value:
        stats.totalMatchesWon || stats.totalMatchesLost
          ? `${Math.round(((stats.totalMatchesWon ?? 0) / ((stats.totalMatchesWon ?? 0) + (stats.totalMatchesLost ?? 0))) * 100)}%`
          : "—",
      icon: IconTrendingUp,
    },
  ]

  const detailedStats = [
    { label: "Lejátszott meccsek", value: stats.matchesPlayed ?? 0 },
    { label: "Győzelmek", value: stats.totalMatchesWon ?? 0 },
    { label: "Vereségek", value: stats.totalMatchesLost ?? 0 },
    { label: "Megnyert legek", value: stats.legsWon ?? 0 },
    { label: "180-ak", value: stats.total180s ?? 0 },
    { label: "Legmagasabb kiszálló", value: stats.highestCheckout ?? "—" },
    { label: "Átlag", value: stats.avg ? stats.avg.toFixed(1) : "—" },
  ]

  return (
    <Dialog open={Boolean(player)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden border-0 bg-card/95 p-0 shadow-2xl flex flex-col">
        <header className="relative overflow-hidden bg-gradient-to-br from-primary/90 via-primary/75 to-accent/80 p-6 text-white">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <DialogHeader className="p-0 text-left">
                <DialogTitle className="text-2xl font-semibold sm:text-3xl">{player.name}</DialogTitle>
              </DialogHeader>
              <p className="mt-1 text-sm text-white/80">
                {player.stats?.tournamentsPlayed ?? 0} torna • {player.stats?.matchesPlayed ?? 0} meccs •{" "}
                {player.stats?.avg ? `${player.stats.avg.toFixed(1)} átlag` : "nincs átlag adat"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/15 text-white backdrop-blur">
                <IconTarget className="mr-1 h-3.5 w-3.5" />
                MMR: {(player as any).mmr ?? player.stats?.mmr ?? 800}
              </Badge>
              <Button variant="secondary" size="sm" onClick={onClose} className="bg-white/15 text-white hover:bg-white/25">
                Bezárás
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto space-y-6 px-6 pb-6 pt-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Főbb mutatók</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {highlightCards.map(({ label, value, icon: Icon }) => (
                <Card key={label} className="border-0 bg-muted/30 shadow-inner">
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-2xl font-bold text-foreground">{value}</span>
                    </div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <Card className="border-0 bg-muted/20">
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-2">
                  <IconCalendarStats className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Összesített statisztikák</h4>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {detailedStats.map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg border border-border/60 bg-card/80 px-3 py-2 text-sm text-muted-foreground"
                    >
                      <p className="font-medium text-foreground">{label}</p>
                      <p className="font-semibold text-primary">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-muted/20">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-center gap-2">
                  <IconPlayerPlay className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Gyors kimutatások</h4>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <QuickFact
                    icon={IconBolt}
                    label="Átlagos checkout"
                    highlight={stats.highestCheckout ? `${stats.highestCheckout}` : "Nincs adat"}
                    helper="Legmagasabb kiszálló"
                  />
                  <QuickFact
                    icon={IconTrendingUp}
                    label="180-ak összesen"
                    highlight={stats.total180s ?? 0}
                    helper="Villámgyors szériák száma"
                  />
                  <QuickFact
                    icon={IconChartBar}
                    label="Legjobb pozíció"
                    highlight={stats.bestPosition ?? "—"}
                    helper="Legmagasabb helyezés eddig"
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          <Separator />

          <section>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconTrophy className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Torna eredmények</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {player.tournamentHistory?.length ?? 0} befejezett torna
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {player.tournamentHistory && player.tournamentHistory.length > 0 ? (
                player.tournamentHistory.map((history, index) => (
                  <Card key={`${history.tournamentName}-${index}`} className="border-0 bg-muted/30">
                    <CardContent className="flex flex-col gap-4 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{history.tournamentName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(history.date).toLocaleDateString("hu-HU")} • {history.eliminatedIn}
                          </p>
                        </div>
                        <Badge variant="outline" className="gap-1">
                          <IconMedal className="h-3.5 w-3.5" />
                          {history.position}. hely
                        </Badge>
                      </div>

                      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <StatPair label="Meccsek" value={`${history.stats.matchesWon} győzelem / ${history.stats.matchesLost} vereség`} />
                        <StatPair label="Legek" value={`${history.stats.legsWon} nyert / ${history.stats.legsLost} vesztett`} />
                        <StatPair
                          label="Átlag"
                          value={history.stats.average ? history.stats.average.toFixed(1) : "—"}
                        />
                        <StatPair
                          label="180-ak"
                          value={typeof history.stats.oneEightiesCount === "number" ? history.stats.oneEightiesCount : "—"}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                  Még nincsenek kiemelhető torna eredmények.
                </div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const QuickFact = ({
  icon: Icon,
  label,
  highlight,
  helper,
}: {
  icon: typeof IconBolt
  label: string
  highlight: string | number
  helper: string
}) => (
  <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/80 p-3">
    <div className="rounded-md bg-primary/15 p-2 text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{highlight}</p>
      <p className="text-xs text-muted-foreground/80">{helper}</p>
    </div>
  </div>
)

const StatPair = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between gap-2 rounded-md bg-card/70 px-3 py-2">
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold text-foreground">{value}</span>
  </div>
)

export default PlayerStatsModal