"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import { useFeatureFlag } from "@/hooks/useFeatureFlag"
import { getMatchByIdClientAction, getMatchLegsClientAction } from "@/features/tournaments/actions/tournamentRoster.action"
import MatchStatisticsCharts from "./MatchStatisticsCharts"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import {
  IconArrowLeft,
  IconCircleCheck,
  IconDownload,
  IconLoader2,
  IconTarget,
  IconSparkles,
  IconAlertTriangle,
  IconLock,
  IconShare,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { SmartAvatar } from "@/components/ui/smart-avatar"
import MatchRecapSheet from "@/components/match/MatchRecapSheet"
import {
  tournamentLegsToRecapModel,
  type TournamentLegForRecap,
} from "@/components/match/matchRecapMappers"

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
  player1TotalDarts?: number
  player2TotalDarts?: number
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
  const t = useTranslations("Tournament.legs_modal")
  const tLegs = useTranslations("Tournament.legs")
  const [match, setMatch] = useState<Match | null>(initialMatch)
  const [legs, setLegs] = useState<Leg[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showDetailedStats, setShowDetailedStats] = useState(false)
  const [clubId, setClubId] = useState<string | undefined>(undefined)
  const [exportBusy, setExportBusy] = useState(false)
  const recapExportRef = useRef<HTMLDivElement>(null)

  const { isEnabled: isDetailedStatsEnabled, isLoading: isFeatureFlagLoading } = useFeatureFlag("detailedStatistics", clubId)

  useEffect(() => {
    setMatch(initialMatch)
  }, [initialMatch])

  useEffect(() => {
    if (!match?._id || !isOpen) return
    void fetchMatchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?._id, isOpen])

  const fetchMatchData = async () => {
    if (!match?._id) return
    try {
      const data = await getMatchByIdClientAction({ matchId: match._id })
      if (data && typeof data === 'object' && 'success' in data && data.success && 'match' in data) {
        const nextMatch = (data as any).match
        setMatch(nextMatch)
        const nextClubId =
          nextMatch?.clubId ||
          nextMatch?.tournamentRef?.clubId?._id ||
          nextMatch?.tournamentRef?.clubId
        if (nextClubId) {
          setClubId(String(nextClubId))
        }
      }
    } catch (err) {
      console.error("Error fetching match data:", err)
    }
  }

  const fetchLegs = async () => {
    if (!match?._id) return
    setLoading(true)
    setError("")
    try {
      const data = await getMatchLegsClientAction({ matchId: match._id })
      if (data && typeof data === 'object' && 'success' in data && data.success) {
        const result = data as any
        setLegs(result.legs ?? result.match?.legs ?? [])
        const nextClubId =
          result?.match?.clubId ||
          result?.match?.tournamentRef?.clubId?._id ||
          result?.match?.tournamentRef?.clubId
        if (nextClubId) {
          setClubId(String(nextClubId))
        }
      } else {
        setError(t('error_loading'))
      }
    } catch (err) {
      console.error("Fetch legs error", err)
      setError(t('error_generic'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && match) {
      void fetchLegs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, match])

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setShowDetailedStats(false)
      setLegs([])
      onClose()
    }
  }

  const playerOneName = match?.player1?.playerId?.name || "Player A"
  const playerTwoName = match?.player2?.playerId?.name || "Player B"
  const playerOneId = match?.player1?.playerId?._id
  const playerTwoId = match?.player2?.playerId?._id

  const player1Wins = legs.filter(leg => leg.winnerId?._id === playerOneId).length
  const player2Wins = legs.filter(leg => leg.winnerId?._id === playerTwoId).length

  const calculatePlayerArrows = (throws: Throw[], storedTotalDarts?: number, isWinner?: boolean, winnerArrowCount?: number) => {
    if (storedTotalDarts !== undefined && storedTotalDarts !== null) return storedTotalDarts
    if (!throws.length) return 0
    if (isWinner && typeof winnerArrowCount === "number") {
      return (throws.length - 1) * 3 + winnerArrowCount
    }
    return throws.length * 3
  }

  const calculateLoserRemainingForLeg = (leg: Leg, isPlayer1Winner: boolean, isPlayer2Winner: boolean) => {
    if (typeof leg.loserRemainingScore === "number" && leg.loserRemainingScore >= 0) {
      return leg.loserRemainingScore
    }
    const p1 = Number(leg.player1Score || 0)
    const p2 = Number(leg.player2Score || 0)
    if (isPlayer1Winner) return Math.max(0, p1 - p2)
    if (isPlayer2Winner) return Math.max(0, p2 - p1)
    return 0
  }

  const createThrowRows = (leg: Leg, startingScore: number) => {
    let p1Remaining = startingScore
    let p2Remaining = startingScore
    const visits = Math.max(leg.player1Throws.length, leg.player2Throws.length)

    return Array.from({ length: visits }, (_, throwIndex) => {
      const p1Throw = leg.player1Throws[throwIndex]
      const p2Throw = leg.player2Throws[throwIndex]
      let p1After: number | null = null
      let p2After: number | null = null

      if (p1Throw) {
        p1Remaining = Math.max(0, p1Remaining - Number(p1Throw.score || 0))
        p1After = p1Remaining
      }
      if (p2Throw) {
        p2Remaining = Math.max(0, p2Remaining - Number(p2Throw.score || 0))
        p2After = p2Remaining
      }

      return {
        throwIndex,
        p1Throw,
        p2Throw,
        p1After,
        p2After,
        arrowCount: (throwIndex + 1) * 3,
      }
    })
  }

  // Calculate Match Pulse Stats over all fetched legs
  const getMatchPulseStats = () => {
    let p1ThrowsTotal = 0
    let p1ScoreTotal = 0
    let p1180s = 0
    let p1140s = 0
    let p1100s = 0

    let p2ThrowsTotal = 0
    let p2ScoreTotal = 0
    let p2180s = 0
    let p2140s = 0
    let p2100s = 0

    let totalMatchDarts = 0

    legs.forEach(leg => {
      leg.player1Throws.forEach(t => {
        p1ThrowsTotal++
        p1ScoreTotal += t.score
        if (t.score === 180) p1180s++
        if (t.score >= 140 && t.score < 180) p1140s++
        if (t.score >= 100 && t.score < 140) p1100s++
      })
      leg.player2Throws.forEach(t => {
        p2ThrowsTotal++
        p2ScoreTotal += t.score
        if (t.score === 180) p2180s++
        if (t.score >= 140 && t.score < 180) p2140s++
        if (t.score >= 100 && t.score < 140) p2100s++
      })
      totalMatchDarts += calculatePlayerArrows(leg.player1Throws, leg.player1TotalDarts, leg.winnerId?._id === playerOneId, leg.winnerArrowCount)
      totalMatchDarts += calculatePlayerArrows(leg.player2Throws, leg.player2TotalDarts, leg.winnerId?._id === playerTwoId, leg.winnerArrowCount)
    })

    const avgA = p1ThrowsTotal > 0 ? p1ScoreTotal / p1ThrowsTotal : 0
    const avgB = p2ThrowsTotal > 0 ? p2ScoreTotal / p2ThrowsTotal : 0

    return {
      avgA: avgA.toFixed(2),
      avgB: avgB.toFixed(2),
      p1180s,
      p1140s,
      p1100s,
      p2180s,
      p2140s,
      p2100s,
    }
  }

  const matchStats = getMatchPulseStats()

  const legStartScore = Number(
    (match as any)?.startingScore ?? (match as any)?.tournamentSettings?.startingScore ?? 501,
  )

  const recapModel = useMemo(() => {
    if (!legs.length) return null
    return tournamentLegsToRecapModel(
      legs as unknown as TournamentLegForRecap[],
      {
        brandLine: "tDarts",
        titleLine: `${playerOneName} vs ${playerTwoName}`,
        scoreLine: `${player1Wins} - ${player2Wins}`,
      },
      playerOneName,
      playerTwoName,
      playerOneId,
      playerTwoId,
      legStartScore,
    )
  }, [
    legs,
    playerOneName,
    playerTwoName,
    playerOneId,
    playerTwoId,
    player1Wins,
    player2Wins,
    legStartScore,
  ])

  const captureRecapPngBlob = useCallback(async (): Promise<Blob | null> => {
    if (!recapExportRef.current) return null
    const { toBlob } = await import("html-to-image")
    return toBlob(recapExportRef.current, { pixelRatio: 2, cacheBust: true })
  }, [])

  const handleDownloadRecapPng = useCallback(async () => {
    setExportBusy(true)
    try {
      const blob = await captureRecapPngBlob()
      if (!blob) throw new Error("no blob")
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tdarts-match-${match?._id ?? Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t("export_error"))
    } finally {
      setExportBusy(false)
    }
  }, [captureRecapPngBlob, match?._id, t])

  const handleShareRecapPng = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      toast.error(t("share_unsupported"))
      return
    }
    setExportBusy(true)
    try {
      const blob = await captureRecapPngBlob()
      if (!blob) throw new Error("no blob")
      const file = new File([blob], "tdarts-match.png", { type: "image/png" })
      if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
        toast.error(t("share_unsupported"))
        return
      }
      await navigator.share({ files: [file], title: "tDarts" })
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : ""
      if (name === "AbortError") return
      toast.error(t("export_error"))
    } finally {
      setExportBusy(false)
    }
  }, [captureRecapPngBlob, t])

  if (!match) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-[1040px] max-h-[95vh] w-[94vw] p-0 flex flex-col overflow-hidden bg-background border-border font-body text-foreground shadow-glow-primary">
          <DialogTitle className="sr-only">{t('title') || 'Match Analysis'}</DialogTitle>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-8 py-8 relative custom-scrollbar">
          {/* Ambient Glows */}
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>

          {/* Header Section */}
          <header className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0 xl:pr-6">
              <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 uppercase">{t('title') || 'Match Analysis'}</h1>
              <p className="text-muted-foreground font-medium tracking-wide uppercase text-xs">
                {t("leg_by_leg_detail") || "Leg-by-leg detail"}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:gap-4 xl:w-auto xl:max-w-[min(100%,36rem)] xl:shrink-0">
              {onBackToMatches && (
                <Button variant="outline" onClick={onBackToMatches} className="bg-card text-foreground font-label border-border hover:bg-muted/60 transition-all shadow-sm">
                  <IconArrowLeft className="h-4 w-4 mr-2" />
                  {t('back')}
                </Button>
              )}
              {!isFeatureFlagLoading && (
                <Button 
                  variant={showDetailedStats ? "default" : "secondary"}
                  onClick={() => isDetailedStatsEnabled && setShowDetailedStats(!showDetailedStats)}
                  className={cn("font-label transition-all shadow-sm", !isDetailedStatsEnabled && "opacity-50 cursor-not-allowed", showDetailedStats && "bg-primary text-primary-foreground hover:bg-primary/90")}
                  disabled={!isDetailedStatsEnabled}
                >
                  {isDetailedStatsEnabled ? <IconSparkles className="h-4 w-4 mr-2" /> : <IconLock className="h-4 w-4 mr-2 opacity-50" />}
                  {showDetailedStats ? (t('hide_charts') || 'Hide Charts') : (t('show_charts') || 'Részletes grafikonok')}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                className="font-label gap-2 shadow-sm"
                disabled={exportBusy || loading || !!error || !recapModel}
                onClick={() => void handleDownloadRecapPng()}
              >
                <IconDownload className="h-4 w-4" />
                {tLegs("export_image")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="font-label gap-2 shadow-sm"
                disabled={exportBusy || loading || !!error || !recapModel}
                onClick={() => void handleShareRecapPng()}
              >
                <IconShare className="h-4 w-4" />
                {tLegs("share")}
              </Button>
            </div>
          </header>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <IconLoader2 className="h-12 w-12 animate-spin text-primary" />
              <span className="text-sm font-label uppercase tracking-widest text-muted-foreground animate-pulse">{t("loading_logs") || "Loading..."}</span>
            </div>
          ) : error ? (
            <div className="max-w-xl mx-auto py-12">
              <Alert variant="destructive" className="bg-card border border-destructive/20">
                <IconAlertTriangle className="h-5 w-5" />
                <AlertTitle>{t('error_generic')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : legs.length === 0 ? (
            <div className="py-24 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                <IconTarget className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">{t('no_stats')}</p>
            </div>
          ) : (
            showDetailedStats ? (
              <div className="pb-4 animate-fade-in relative z-10 bg-card rounded-2xl border border-border p-4 shadow-xl">
                <MatchStatisticsCharts
                  legs={legs.map((leg, index) => ({ ...leg, legNumber: index + 1 }))}
                  player1Name={playerOneName}
                  player2Name={playerTwoName}
                />
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="w-full">
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 md:gap-3 mb-2 items-center">
                  <div className="bg-card p-4 rounded-xl flex items-center justify-between border border-border shadow-lg">
                    <div className="flex items-center gap-3">
                      <SmartAvatar
                        playerId={playerOneId || "player-1"}
                        name={playerOneName}
                        size="md"
                        className="border border-primary/20"
                      />
                      <div>
                        <p className="font-headline text-lg font-bold line-clamp-1">{playerOneName}</p>
                        <p className="text-xs text-muted-foreground font-label uppercase tracking-widest">{t("player_one") || "Player 1"}</p>
                      </div>
                    </div>
                    <div className="text-right pl-2">
                      <p className="font-headline text-2xl font-black text-primary">{player1Wins}</p>
                      <p className="text-[10px] text-muted-foreground font-label uppercase">{t("legs_won") || "Legs Won"}</p>
                    </div>
                  </div>

                  <div className="hidden md:flex flex-col items-center justify-center opacity-40 px-1">
                    <p className="font-headline text-sm font-black italic">VS</p>
                  </div>

                  <div className="bg-card p-4 rounded-xl flex items-center justify-between border border-border shadow-lg">
                    <div className="text-left pr-2">
                      <p className="font-headline text-2xl font-black text-muted-foreground/50">{player2Wins}</p>
                      <p className="text-[10px] text-muted-foreground font-label uppercase">{t("legs_won") || "Legs Won"}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="font-headline text-lg font-bold line-clamp-1">{playerTwoName}</p>
                        <p className="text-xs text-muted-foreground font-label uppercase tracking-widest text-right">{t("player_two") || "Player 2"}</p>
                      </div>
                      <SmartAvatar
                        playerId={playerTwoId || "player-2"}
                        name={playerTwoName}
                        size="md"
                      />
                    </div>
                  </div>
                  </div>
                </div>

                <div className="xl:w-fit xl:mx-auto">
                  <div className="grid grid-cols-1 xl:grid-cols-[360px_360px] xl:justify-center gap-4 items-start">
                  <div className="space-y-4">
                    {legs.map((leg, legIndex) => {
                      const isPlayer1Winner = leg.winnerId?._id === playerOneId
                      const isPlayer2Winner = leg.winnerId?._id === playerTwoId
                      const winnerName = isPlayer1Winner ? playerOneName : isPlayer2Winner ? playerTwoName : ''
                      
                      const legStartScore = Number((match as any)?.startingScore ?? (match as any)?.tournamentSettings?.startingScore ?? 501)
                      const throwRows = createThrowRows(leg, legStartScore)

                      return (
                        <section key={`${leg.createdAt}-${legIndex}`} className={cn(
                          "w-full bg-card rounded-2xl overflow-hidden shadow-sm transition-all border",
                          legIndex === legs.length - 1 ? "border-accent/40 shadow-[0_0_30px_-10px_rgba(255,68,31,0.15)] ring-1 ring-accent/10" : "border-border"
                        )}>
                          <div className={cn(
                            "px-3 py-2.5 sm:px-4 sm:py-3 flex justify-between items-center border-b border-border/50",
                            legIndex === legs.length - 1 ? "bg-accent/5" : "bg-muted/20"
                          )}>
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "px-3 py-1 rounded text-xs font-black font-headline uppercase",
                                legIndex === legs.length - 1 ? "bg-accent text-primary-foreground" : "bg-muted text-muted-foreground"
                              )}>
                                {(t("leg") || "Leg").toUpperCase()} {legIndex + 1}
                              </span>
                              {legIndex === legs.length - 1 && !winnerName && (
                                <span className="text-accent text-sm font-label font-bold hidden sm:inline-block">{t("in_progress") || "In Progress..."}</span>
                              )}
                              <span className="text-muted-foreground text-[10px] font-label hidden sm:inline-block ml-2">
                                {new Date(leg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              {winnerName ? (
                                <>
                                  <IconCircleCheck className="h-5 w-5 text-primary" />
                                  <span className="text-xs font-bold font-label text-foreground uppercase">{t("winner") || "Winner"}: {winnerName}</span>
                                  {typeof leg.winnerArrowCount === "number" ? (
                                    <span className="text-[10px] font-bold font-label text-primary uppercase tracking-wide">
                                      ({leg.winnerArrowCount}D)
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-xs font-bold font-label text-accent uppercase tracking-widest hidden sm:inline-block">{t("in_progress") || "In Progress..."}</span>
                              )}
                            </div>
                          </div>

                          <div className="p-2.5 sm:p-3">
                            <div className="mx-auto w-full rounded-lg border border-border/30 overflow-hidden">
                              <div className="grid grid-cols-[60px_48px_28px_48px_60px] items-end gap-1 border-b border-border/40 px-2 py-2 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                                <div className="min-w-0 text-center">
                                  <p className="truncate">{playerOneName}</p>
                                  <p className="font-label text-[8px] tracking-normal normal-case text-muted-foreground">
                                    {(t("arrows") || "Arrows").replace("{count}", String(calculatePlayerArrows(leg.player1Throws, leg.player1TotalDarts, isPlayer1Winner, leg.winnerArrowCount)))}
                                  </p>
                                </div>
                                <div className="text-center">S</div>
                                <div className="text-center">D</div>
                                <div className="text-center">S</div>
                                <div className="min-w-0 text-center">
                                  <p className="truncate">{playerTwoName}</p>
                                  <p className="font-label text-[8px] tracking-normal normal-case text-muted-foreground">
                                    {(t("arrows") || "Arrows").replace("{count}", String(calculatePlayerArrows(leg.player2Throws, leg.player2TotalDarts, isPlayer2Winner, leg.winnerArrowCount)))}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-1.5 p-2">
                                {throwRows.length === 0 ? (
                                  <div className="py-2 text-center text-[10px] text-muted-foreground italic tracking-wide">{t("no_throws") || "No throws recorded yet..."}</div>
                                ) : (
                                  throwRows.map(({ throwIndex, p1Throw, p2Throw, p1After, p2After, arrowCount }) => {
                                    return (
                                      <div key={`${legIndex}-throw-${throwIndex}`} className="grid grid-cols-[60px_48px_28px_48px_60px] items-center gap-1 rounded border border-border/20 bg-muted/10 px-1.5 py-1">
                                        <div className={cn(
                                          "rounded px-1 py-0.5 text-center font-headline text-[11px] font-bold bg-background/40 text-muted-foreground",
                                        )}>
                                          {p1After ?? "--"}
                                        </div>
                                        <div className={cn(
                                          "rounded px-1 py-0.5 text-center font-headline text-[11px] font-bold",
                                          p1Throw
                                            ? p1Throw.isCheckout && isPlayer1Winner
                                              ? "bg-primary/20 text-primary ring-1 ring-primary/50"
                                              : p1Throw.score >= 180
                                              ? "bg-accent/20 text-accent border border-accent/20"
                                              : p1Throw.score >= 140
                                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                              : p1Throw.score >= 120
                                              ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                                              : p1Throw.score >= 100
                                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                                              : p1Throw.score >= 60
                                              ? "bg-muted/70 text-foreground"
                                              : "bg-muted/40 text-muted-foreground"
                                            : "border border-dashed border-primary/30 bg-muted/20 text-primary"
                                        )}>
                                          {p1Throw ? p1Throw.score : "--"}
                                        </div>
                                        <div className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground text-center">
                                          {(() => {
                                            const checkoutCount = typeof leg.winnerArrowCount === "number" ? leg.winnerArrowCount : 3
                                            if (isPlayer1Winner && p1Throw?.isCheckout) return throwIndex * 3 + checkoutCount
                                            if (isPlayer2Winner && p2Throw?.isCheckout) return throwIndex * 3 + checkoutCount
                                            return arrowCount
                                          })()}
                                        </div>
                                        <div className={cn(
                                          "rounded px-1 py-0.5 text-center font-headline text-[11px] font-bold",
                                          p2Throw
                                            ? p2Throw.isCheckout && isPlayer2Winner
                                              ? "bg-primary/20 text-primary ring-1 ring-primary/50"
                                              : p2Throw.score >= 180
                                              ? "bg-accent/20 text-accent border border-accent/20"
                                              : p2Throw.score >= 140
                                              ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                              : p2Throw.score >= 120
                                              ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                                              : p2Throw.score >= 100
                                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                                              : p2Throw.score >= 60
                                              ? "bg-muted/70 text-foreground"
                                              : "bg-muted/40 text-muted-foreground"
                                            : "border border-dashed border-accent/30 bg-muted/20 text-accent"
                                        )}>
                                          {p2Throw ? p2Throw.score : "--"}
                                        </div>
                                        <div className={cn(
                                          "rounded px-1 py-0.5 text-center font-headline text-[11px] font-bold bg-background/40 text-muted-foreground",
                                        )}>
                                          {p2After ?? "--"}
                                        </div>
                                      </div>
                                    )
                                  })
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 border-t border-border/40 px-2 py-1.5 text-[9px] font-label uppercase tracking-wide text-muted-foreground">
                                <div>
                                  {t("remains") || "Remaining"}:{" "}
                                  <span className={cn("font-bold text-xs ml-1", isPlayer1Winner ? "text-primary" : "text-foreground")}>
                                    {isPlayer1Winner ? "0" : calculateLoserRemainingForLeg(leg, isPlayer1Winner, isPlayer2Winner) || leg.player1Score}
                                  </span>
                                </div>
                                <div className="text-right">
                                  {t("remains") || "Remaining"}:{" "}
                                  <span className={cn("font-bold text-xs ml-1", isPlayer2Winner ? "text-primary" : "text-foreground")}>
                                    {isPlayer2Winner ? "0" : calculateLoserRemainingForLeg(leg, isPlayer1Winner, isPlayer2Winner) || leg.player2Score}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </section>
                      )
                    })}
                  </div>
                <aside className="w-full xl:sticky xl:top-0 flex flex-col gap-4">
                  <div className="w-full bg-card/80 backdrop-blur-xl p-4 rounded-2xl border border-border shadow-glow-primary">
                    <h4 className="font-headline font-bold text-sm text-primary mb-6 tracking-tighter uppercase flex items-center gap-2">
                      {t("match_pulse") || "Match Pulse"}
                    </h4>
                    
                    <div className="space-y-6">
                      {/* P1 Stats */}
                      <div className="space-y-4">
                        <p className="text-xs font-label font-bold uppercase text-muted-foreground pb-2 border-b border-border/50 line-clamp-1">{playerOneName}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground font-label uppercase">{t("avg") || "Average"}</span>
                          <span className="text-sm font-headline font-black text-primary">{matchStats.avgA}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <div className="bg-muted/30 p-2.5 rounded-lg text-center border border-border/50">
                            <p className="text-[10px] text-muted-foreground font-label">{t("one_eighties") || "180s"}</p>
                            <p className="text-lg font-headline font-black text-foreground">{matchStats.p1180s}</p>
                          </div>
                          <div className="bg-muted/30 p-2.5 rounded-lg text-center border border-border/50">
                            <p className="text-[10px] text-muted-foreground font-label">140+</p>
                            <p className="text-lg font-headline font-black text-foreground">{matchStats.p1140s}</p>
                          </div>
                          <div className="bg-muted/30 p-2.5 rounded-lg text-center border border-border/50">
                            <p className="text-[10px] text-muted-foreground font-label">100+</p>
                            <p className="text-lg font-headline font-black text-foreground">{matchStats.p1100s}</p>
                          </div>
                        </div>
                      </div>

                      <div className="w-full h-px bg-border my-6"></div>

                      {/* P2 Stats */}
                      <div className="space-y-4">
                        <p className="text-xs font-label font-bold uppercase text-muted-foreground pb-2 border-b border-border/50 line-clamp-1">{playerTwoName}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-muted-foreground font-label uppercase">{t("avg") || "Average"}</span>
                          <span className="text-sm font-headline font-black text-primary">{matchStats.avgB}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <div className="bg-muted/30 p-2.5 rounded-lg text-center border border-border/50">
                            <p className="text-[10px] text-muted-foreground font-label">{t("one_eighties") || "180s"}</p>
                            <p className="text-lg font-headline font-black text-muted-foreground/80">{matchStats.p2180s}</p>
                          </div>
                          <div className="bg-muted/30 p-2.5 rounded-lg text-center border border-border/50">
                            <p className="text-[10px] text-muted-foreground font-label">140+</p>
                            <p className="text-lg font-headline font-black text-muted-foreground/80">{matchStats.p2140s}</p>
                          </div>
                          <div className="bg-muted/30 p-2.5 rounded-lg text-center border border-border/50">
                            <p className="text-[10px] text-muted-foreground font-label">100+</p>
                            <p className="text-lg font-headline font-black text-muted-foreground/80">{matchStats.p2100s}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
                </div>
              </div>
            )
          )}
          {recapModel ? (
            <div
              className="pointer-events-none fixed -left-[9999px] top-0 z-0 w-[min(880px,100vw)] bg-background p-2"
              aria-hidden
            >
              <MatchRecapSheet exportRef={recapExportRef} model={recapModel} />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LegsViewModal
