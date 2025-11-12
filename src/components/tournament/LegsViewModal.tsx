"use client"

import React, { useEffect, useMemo, useState } from "react"

import { useFeatureFlag } from "@/hooks/useFeatureFlag"
import MatchStatisticsCharts from "./MatchStatisticsCharts"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  IconArrowLeft,
  IconArrowRight,
  IconClock,
  IconLoader2,
  IconTarget,
  IconTargetArrow,
  IconTrendingDown,
  IconCrown,
  IconSparkles,
  IconAlertTriangle,
} from "@tabler/icons-react"

type Throw = {
  score: number
  darts: number
  isDouble: boolean
  isCheckout: boolean
}

type Leg = {
  player1Score: number
  player2Score: number
  player1Throws: Throw[]
  player2Throws: Throw[]
  winnerId: {
    _id: string
    name: string
  }
  checkoutScore?: number
  checkoutDarts?: number
  winnerArrowCount?: number
  loserRemainingScore?: number
  doubleAttempts: number
  createdAt: string
}

type Match = {
  _id: string
  player1: {
    playerId: {
      _id: string
      name: string
    }
  }
  player2: {
    playerId: {
      _id: string
      name: string
    }
  }
  legs?: Leg[]
  clubId?: string
}

interface LegsViewModalProps {
  isOpen: boolean
  onClose: () => void
  match: Match | null
  onBackToMatches?: () => void
}

const LegsViewModal: React.FC<LegsViewModalProps> = ({ isOpen, onClose, match: initialMatch, onBackToMatches }) => {
  const [match, setMatch] = useState<Match | null>(initialMatch)
  const [legs, setLegs] = useState<Leg[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showDetailedStats, setShowDetailedStats] = useState(false)
  const [clubId, setClubId] = useState<string | undefined>(undefined)

  const { isEnabled: isDetailedStatsEnabled, isLoading: isFeatureFlagLoading } = useFeatureFlag("detailedStatistics", clubId)

  useEffect(() => {
    setMatch(initialMatch)
  }, [initialMatch])

  useEffect(() => {
    if (!match?._id || !isOpen) return
    void fetchMatchData()
    void fetchClubId()
  }, [match?._id, isOpen])

  useEffect(() => {
    if (!isOpen || !match) return
    void fetchLegs()
  }, [isOpen, match])

  const fetchMatchData = async () => {
    if (!match?._id) return
    try {
      const response = await fetch(`/api/matches/${match._id}`)
      if (!response.ok) return
      const data = await response.json()
      if (data.success && data.match) {
        setMatch(data.match)
      }
    } catch (err) {
      console.error("Error fetching match data:", err)
    }
  }

  const fetchClubId = async () => {
    if (!match?._id) return
    try {
      const response = await fetch(`/api/matches/${match._id}`)
      if (!response.ok) return
      const data = await response.json()
      if (data.success && data.match?.tournamentRef) {
        const tournamentResponse = await fetch(`/api/tournaments/by-id/${data.match.tournamentRef}`)
        if (!tournamentResponse.ok) return
        const tournamentData = await tournamentResponse.json()
        if (tournamentData.success && tournamentData.tournament?.clubId) {
          setClubId(tournamentData.tournament.clubId)
        }
      }
    } catch (err) {
      console.error("Error fetching clubId:", err)
    }
  }

  const fetchLegs = async () => {
    if (!match?._id) return
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/matches/${match._id}/legs`)
      if (!response.ok) throw new Error("Nem sikerült betölteni a legek adatát")
      const data = await response.json()
      if (data.success) {
        setLegs(data.legs ?? data.match?.legs ?? [])
      } else {
        setError(data.error || "Nem sikerült betölteni a legek adatát")
      }
    } catch (err) {
      console.error("Fetch legs error", err)
      setError("Hiba történt a legek betöltésekor")
    } finally {
      setLoading(false)
    }
  }

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setShowDetailedStats(false)
      setLegs([])
      onClose()
    }
  }

  const playerOneName = match?.player1?.playerId?.name || "Player 1"
  const playerTwoName = match?.player2?.playerId?.name || "Player 2"
  const summaryLegs = useMemo(() => legs || [], [legs])

  const getLoserRemainingScore = (leg: Leg, isPlayer1Winner: boolean) => {
    if (typeof leg.loserRemainingScore === "number") return leg.loserRemainingScore
    const loserThrows = isPlayer1Winner ? leg.player2Throws : leg.player1Throws
    const loserScore = loserThrows.reduce((sum, current) => sum + current.score, 0)
    return Math.max(0, 501 - loserScore)
  }

  const calculatePlayerArrows = (throws: Throw[], isWinner: boolean, winnerArrowCount?: number) => {
    if (!throws.length) return 0
    if (isWinner && typeof winnerArrowCount === "number") {
      return (throws.length - 1) * 3 + winnerArrowCount
    }
    return throws.length * 3
  }

  const calculateTotalArrowsForLeg = (leg: Leg) => {
    const player1Arrows = calculatePlayerArrows(leg.player1Throws, leg.winnerId?._id === match?.player1?.playerId?._id, leg.winnerArrowCount)
    const player2Arrows = calculatePlayerArrows(leg.player2Throws, leg.winnerId?._id === match?.player2?.playerId?._id, leg.winnerArrowCount)
    return player1Arrows + player2Arrows
  }

  const calculateRunningAverages = (throws: Throw[]) => {
    let total = 0
    return throws.map((entry, idx) => {
      total += entry.score
      return Number(((total / (idx + 1)) || 0).toFixed(2))
    })
  }

  const renderThrowSequence = (throws: Throw[], isWinner: boolean) => {
    if (!throws.length) {
      return <span className="text-[11px] text-white/60">Nincs dobás rögzítve</span>
    }

    const running = calculateRunningAverages(throws)

    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#f9d7de]">
        {throws.map((throwData, idx) => (
          <React.Fragment key={`throw-${idx}-${throwData.score}`}>
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "inline-flex min-w-[48px] items-center justify-center rounded-lg px-2 py-1 backdrop-blur",
                  throwData.score === 180
                    ? "bg-[#f59f3a]/30 text-[#fcd7a1]"
                    : throwData.isCheckout && isWinner
                      ? "bg-[#39b778]/25 text-[#c3f0d6]"
                      : throwData.score === 0
                        ? "bg-[#ab1f3b]/35 text-[#ffd9e0]"
                        : "bg-[#57101c] text-[#f9d7de]"
                )}
                title={`${throwData.score} pont (${throwData.darts} nyíl)`}
              >
                {throwData.score}
              </span>
              {typeof running[idx] === "number" ? (
                <span className="text-[10px] font-medium text-[#f5a3b1]">({running[idx].toFixed(1)})</span>
              ) : null}
            </div>
            {idx < throws.length - 1 && <IconArrowRight className="h-3.5 w-3.5 text-[#f5a3b1]/70" />}
          </React.Fragment>
        ))}
      </div>
    )
  }

  if (!match) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-5xl border-0 bg-[#1a0409] px-0 pb-0 pt-6 shadow-[18px_20px_0px_-8px_rgba(0,0,0,0.7)]">
        <DialogHeader className="px-6">
          <DialogTitle className="flex flex-col gap-1 text-2xl font-semibold text-white">
            <span className="text-sm uppercase tracking-[0.35em] text-white/35">Részletes statisztika</span>
            <span>
              <span className={cn("text-white", summaryLegs.length > 0 && summaryLegs[0].winnerId?._id === match.player1?.playerId?._id && "text-[#39b778]")}>{playerOneName}</span>
              <span className="mx-2 text-white/40">vs</span>
              <span className={cn("text-white", summaryLegs.length > 0 && summaryLegs[0].winnerId?._id === match.player2?.playerId?._id && "text-[#39b778]")}>{playerTwoName}</span>
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Legenkénti bontás, checkout információk és dobásonkénti átlagok – minden, amivel lenyűgözheted a nézőidet és motiválhatod a játékosaidat.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] px-6">
          <div className="space-y-6 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {onBackToMatches ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#7a1f2d] bg-[#3d0c16] text-[#f9d7de] hover:bg-[#471019]"
                    onClick={onBackToMatches}
                  >
                    <IconArrowLeft className="h-4 w-4" />
                    Vissza a meccsekhez
                  </Button>
                ) : null}
                {!isFeatureFlagLoading && isDetailedStatsEnabled ? (
                  <Button
                    variant={showDetailedStats ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "gap-2 rounded-full border-[#f64c6b]/40 bg-[#57101c] text-[#f9d7de] transition",
                      showDetailedStats ? "shadow-[0_0_18px_-6px_rgba(246,76,107,0.35)]" : ""
                    )}
                    onClick={() => setShowDetailedStats((prev) => !prev)}
                  >
                    <IconSparkles className="h-4 w-4 text-[#fcd7a1]" />
                    {showDetailedStats ? "Grafikonok elrejtése" : "Részletes grafikonok"}
                  </Button>
                ) : null}
              </div>

              {!isFeatureFlagLoading && !isDetailedStatsEnabled ? (
                <Badge variant="outline" className="rounded-full border-[#f64c6b]/40 bg-[#57101c] px-3 py-1 text-[11px] text-[#f9d7de]">
                  Pro előfizetéssel érhető el a teljes statisztika
                </Badge>
              ) : null}
            </div>

            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <IconLoader2 className="h-6 w-6 animate-spin text-[oklch(75%_0.24_25)]" />
              </div>
            ) : null}

            {!loading && error ? (
              <Alert variant="destructive" className="border border-red-500/40 bg-red-500/10 text-red-200">
                <IconAlertTriangle className="h-5 w-5" />
                <AlertTitle>Hiba történt</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {!loading && !error && summaryLegs.length === 0 ? (
              <Card className="border border-white/10 bg-white/5 text-center text-sm text-white/60 backdrop-blur">
                <CardContent className="py-10">Ehhez a meccshez még nem érkeztek részletes statisztikák.</CardContent>
              </Card>
            ) : null}

            {!loading && !error && summaryLegs.length > 0 ? (
              <div className="space-y-6">
                {showDetailedStats && isDetailedStatsEnabled ? (
                  <MatchStatisticsCharts legs={summaryLegs} player1Name={playerOneName} player2Name={playerTwoName} />
                ) : null}

                {summaryLegs.map((leg, index) => {
                  const isPlayer1Winner = leg.winnerId?._id === match.player1?.playerId?._id
                  const isPlayer2Winner = leg.winnerId?._id === match.player2?.playerId?._id
                  const loserRemaining = getLoserRemainingScore(leg, isPlayer1Winner)

                  return (
                    <Card
                      key={`${leg.createdAt}-${index}`}
                      className="relative overflow-hidden border-0 bg-[#1a0409] shadow-[10px_12px_0px_-6px_rgba(20,0,0,0.45)] transition hover:shadow-[12px_15px_0px_-6px_rgba(20,0,0,0.4)]"
                    >
                      <CardHeader className="relative pb-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#57101c] text-base font-semibold text-[#f8b4c0]">
                              {index + 1}
                            </span>
                            <div className="flex flex-col gap-1">
                              <CardTitle className="text-base font-semibold text-white">
                                {leg.winnerId?.name ? `${leg.winnerId.name} nyert` : `${index + 1}. leg`}
                              </CardTitle>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#f5a3b1]">
                                {leg.checkoutScore ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#2f6c45] px-2 py-1 text-[#b9f3d2]">
                                    <IconTargetArrow className="h-3.5 w-3.5" />
                                    Checkout {leg.checkoutScore}
                                  </span>
                                ) : null}
                                {typeof leg.winnerArrowCount === "number" ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#2a3f7d] px-2 py-1 text-[#ccd9ff]">
                                    <IconTarget className="h-3.5 w-3.5" />
                                    {leg.winnerArrowCount} nyíl
                                  </span>
                                ) : null}
                                {loserRemaining > 0 ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#7a3810] px-2 py-1 text-[#ffd8a4]">
                                    <IconTrendingDown className="h-3.5 w-3.5" />
                                    Vesztes: {loserRemaining} pont
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="relative space-y-4">
                        <div className="grid gap-3 md:grid-cols-2">
                          <LegParticipantSummary
                            label="P1"
                            name={playerOneName}
                            isWinner={isPlayer1Winner}
                            throws={leg.player1Throws}
                            arrowCount={calculatePlayerArrows(leg.player1Throws, isPlayer1Winner, leg.winnerArrowCount)}
                          />
                          <LegParticipantSummary
                            label="P2"
                            name={playerTwoName}
                            isWinner={isPlayer2Winner}
                            throws={leg.player2Throws}
                            arrowCount={calculatePlayerArrows(leg.player2Throws, isPlayer2Winner, leg.winnerArrowCount)}
                          />
                        </div>

                        <Separator className="bg-[#7a1f2d]" />

                        <div className="space-y-2">
                          {renderThrowSequence(leg.player1Throws, isPlayer1Winner)}
                          {renderThrowSequence(leg.player2Throws, isPlayer2Winner)}
                        </div>

                        <div className="flex items-center justify-between rounded-2xl border border-[#611827] bg-[#471019] px-4 py-2 text-xs text-[#f9d7de]">
                          <span className="inline-flex items-center gap-2">
                            <IconClock className="h-4 w-4 text-[#fcd7a1]" />
                            {new Date(leg.createdAt).toLocaleString("hu-HU", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="inline-flex items-center gap-2 text-[#fcd7a1]">
                            <IconSparkles className="h-4 w-4" />
                            Összes nyíl: {calculateTotalArrowsForLeg(leg)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/60 px-6 py-4 backdrop-blur">
          {!isFeatureFlagLoading && !isDetailedStatsEnabled ? (
            <span className="text-xs text-white/60">
              Tipp: aktiváld a Pro előfizetést, hogy minden grafikon és dobássorozat látható legyen a játékosaidnak.
            </span>
          ) : (
            <span />
          )}
          <Button onClick={onClose} className="rounded-full bg-white/90 px-6 py-2 text-sm font-semibold text-black shadow-lg shadow-black/40 hover:bg-white">
            Bezárás
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface LegParticipantSummaryProps {
  label: string
  name: string
  isWinner: boolean
  throws: Throw[]
  arrowCount: number
}

const LegParticipantSummary: React.FC<LegParticipantSummaryProps> = ({ label, name, isWinner, throws, arrowCount }) => {
  const totalScore = throws.reduce((sum, current) => sum + current.score, 0)
  const average = throws.length ? Math.round((totalScore / throws.length) * 100) / 100 : 0
  const highest = throws.length ? Math.max(...throws.map((t) => t.score)) : 0
  const oneEighties = throws.filter((t) => t.score === 180).length

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#611827] bg-[#3d0c16] shadow-[8px_10px_0px_-6px_rgba(20,0,0,0.45)] backdrop-blur",
        isWinner ? "ring-2 ring-[#f64c6b]" : ""
      )}
    >
      <div className={cn("absolute inset-0", isWinner ? "bg-[#611827]/50" : "bg-[#471019]/40")} />
      <CardContent className="relative space-y-5 p-5 text-xs text-[#f9d7de]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#57101c] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#f9d7de]">
            {label}
          </span>
          {isWinner ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#39b778] px-3 py-1 text-[11px] font-semibold text-[#0f2f27] shadow-sm shadow-black/20">
              <IconCrown className="h-3.5 w-3.5" />
              Nyertes
            </span>
          ) : null}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-[10px] text-[#f5a3b1]">
            Nyilak száma: <span className="font-semibold text-white">{arrowCount}</span>
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
          <SummaryTile value={average.toFixed(1)} label="Átlag" tone="bg-[#57101c]" valueTone="text-[#f8b4c0]" labelTone="text-[#f5a3b1]" />
          <SummaryTile value={highest} label="Max" tone="bg-[#611827]" valueTone="text-[#fcd7a1]" labelTone="text-[#f5a3b1]" />
          <SummaryTile value={oneEighties} label="180" tone="bg-[#7a1f2d]" valueTone="text-[#fcd7a1]" labelTone="text-[#f5a3b1]" />
          <SummaryTile value={`${throws.length}`} label="Körök" tone="bg-[#471019]" valueTone="text-[#f9d7de]" labelTone="text-[#f5a3b1]" />
        </div>
      </CardContent>
    </div>
  )
}

interface SummaryTileProps {
  value: string | number
  label: string
  tone: string
  valueTone?: string
  labelTone?: string
}

const SummaryTile: React.FC<SummaryTileProps> = ({ value, label, tone, valueTone = "text-white", labelTone = "text-[#f5a3b1]" }) => {
  return (
    <div className={cn("rounded-xl px-3 py-2 shadow-inner shadow-black/35", tone)}>
      <div className={cn("text-sm font-semibold", valueTone)}>{value}</div>
      <div className={cn("text-[10px] uppercase tracking-[0.2em]", labelTone)}>{label}</div>
    </div>
  )
}

export default LegsViewModal 