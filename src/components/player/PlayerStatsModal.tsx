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
  IconChevronDown,
  IconLoader2,
} from "@tabler/icons-react"
import axios from "axios"
import toast from "react-hot-toast"

import { Player } from "@/interface/player.interface"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/Card"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface PlayerStatsModalProps {
  player: Player | null
  onClose: () => void
}

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ player, onClose }) => {
  const [playerStats, setPlayerStats] = React.useState<Player | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [expandedTournament, setExpandedTournament] = React.useState<number | null>(null)

  React.useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!player?._id) return
      
      setIsLoading(true)
      try {
        const response = await axios.get(`/api/players/${player._id}/stats`)
        setPlayerStats(response.data)
        if (response.data.tournamentHistory && response.data.tournamentHistory.length > 0) {
          setExpandedTournament(0)
        }
      } catch (error: any) {
        console.error('Failed to fetch player stats:', error)
        toast.error('Nem sikerült betölteni a játékos statisztikáit')
        // Fallback to the player object passed as prop
        setPlayerStats(player)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPlayerStats()
  }, [player])

  if (!player) return null

  const displayPlayer = playerStats || player
  const stats = displayPlayer.stats ?? {}
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
    { label: "Megnyert legek", value: stats.totalLegsWon ?? stats.legsWon ?? 0 },
    { label: "180-ak", value: stats.oneEightiesCount ?? stats.total180s ?? 0 },
    { label: "Legmagasabb kiszálló", value: stats.highestCheckout ?? "—" },
    { label: "Átlag", value: stats.avg ? stats.avg.toFixed(1) : "—" },
  ]

  return (
    <Dialog open={Boolean(player)} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent
        className="flex h-[90vh] max-w-4xl flex-col overflow-hidden bg-gradient-to-br from-card/98 to-card/95 backdrop-blur-xl p-0 shadow-2xl shadow-primary/20"
      >
        <header className="flex flex-col gap-4 bg-gradient-to-r from-primary/10 to-transparent px-4 md:px-6 py-4 md:py-5 sm:flex-row sm:items-end sm:justify-between shadow-sm shadow-primary/10">
          <div className="space-y-1">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-2xl font-semibold text-foreground sm:text-3xl">{displayPlayer.name}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {displayPlayer.stats?.tournamentsPlayed ?? 0} torna • {displayPlayer.stats?.matchesPlayed ?? 0} meccs • {" "}
              {displayPlayer.stats?.avg ? `${displayPlayer.stats.avg.toFixed(1)} átlag` : "nincs átlag adat"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="rounded-full border-none bg-primary/10 px-3 py-1 text-xs text-primary">
              <IconTarget size={14} className="mr-1" />
              MMR: {(displayPlayer as any).mmr ?? displayPlayer.stats?.mmr ?? 800}
            </Badge>
            <div className="w-12">

            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <IconLoader2 size={40} className="animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Statisztikák betöltése...</p>
            </div>
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto space-y-6 px-4 md:px-6 pb-6 pt-6">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Főbb mutatók</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {highlightCards.map(({ label, value, icon: Icon }) => (
                <Card
                  key={label}
                  className="bg-gradient-to-br from-muted/25 to-muted/10 shadow-md shadow-black/20"
                >
                  <CardContent className="flex flex-col gap-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="rounded-full bg-primary/15 p-2 text-primary">
                        <Icon size={16} />
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
            <Card className="bg-muted/20 shadow-md shadow-black/20">
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-2">
                  <IconCalendarStats size={16} className="text-primary" />
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Összesített statisztikák</h4>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {detailedStats.map(({ label, value }) => (
                    <div
                      key={label}
                      className="rounded-lg bg-card/75 px-3 py-2 text-sm text-muted-foreground"
                    >
                      <p className="font-medium text-foreground">{label}</p>
                      <p className="font-semibold text-primary">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 shadow-md shadow-black/20">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-center gap-2">
                  <IconPlayerPlay size={16} className="text-primary" />
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
                    highlight={stats.oneEightiesCount ?? stats.total180s ?? 0}
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

          <Separator className="opacity-30" />

          <section>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconTrophy size={16} className="text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Torna eredmények</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {displayPlayer.tournamentHistory?.length ?? 0} befejezett torna
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {displayPlayer.tournamentHistory && displayPlayer.tournamentHistory.length > 0 ? (
                displayPlayer.tournamentHistory.map((history, index) => {
                  const isOpen = expandedTournament === index
                  return (
                    <Card
                      key={`${history.tournamentName}-${index}`}
                      className="bg-muted/25 shadow-md shadow-black/20"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedTournament(isOpen ? null : index)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{history.tournamentName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(history.date).toLocaleDateString("hu-HU")} • {history.eliminatedIn}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="gap-1 rounded-full border-none bg-primary/15 px-3 py-0 text-primary">
                            <IconMedal className="h-3.5 w-3.5" />
                            {history.position}. hely
                          </Badge>
                          <IconChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen ? "rotate-180" : "")} />
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4">
                          <div className="my-3 h-px bg-white/10" />
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
                            <div className="sm:col-span-2 flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                              <span className="text-xs font-medium text-muted-foreground">Torna megnyitása</span>
                              {history.tournamentId ? (
                                <Button asChild size="sm" variant="outline">
                                  <Link href={`/tournaments/${history.tournamentId}`}>Részletek</Link>
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground/70">Nem elérhető</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })
              ) : (
                <div className="rounded-xl bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  Még nincsenek kiemelhető torna eredmények.
                </div>
              )}
            </div>
          </section>
        </div>
        )}
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
  <div className="flex items-start gap-3 rounded-lg bg-gradient-to-br from-primary/15 via-primary/10 to-accent/10 p-3 shadow-sm shadow-black/15">
    <div className="rounded-md bg-primary/20 p-2 text-primary">
      <Icon size={16} />
    </div>
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{highlight}</p>
      <p className="text-xs text-muted-foreground/80">{helper}</p>
    </div>
  </div>
)

const StatPair = ({ label, value }: { label: string; value: string | number }) => (
  <div className="flex items-center justify-between gap-2 rounded-md bg-card/75 px-3 py-2">
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold text-foreground">{value}</span>
  </div>
)

export default PlayerStatsModal