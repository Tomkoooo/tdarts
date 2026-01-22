"use client"

import React, { useEffect, useState } from "react"
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
import { Button } from "@/components/ui/Button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/Badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  IconArrowLeft,
  IconArrowRight,
  IconClock,
  IconLoader2,
  IconTarget,
  IconTargetArrow,
  IconTrendingDown,
  IconTrophy,
  IconSparkles,
  IconAlertTriangle,
  IconChartLine,
  IconLock,
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
  const [activeTab, setActiveTab] = useState<"legs" | "stats">("legs")

  const { isEnabled: isDetailedStatsEnabled, isLoading: isFeatureFlagLoading } = useFeatureFlag("detailedStatistics", clubId)

  useEffect(() => {
    setMatch(initialMatch)
  }, [initialMatch])

  useEffect(() => {
    if (!match?._id || !isOpen) return
    void fetchMatchData()
    void fetchClubId()
  }, [match?._id, isOpen])

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

  useEffect(() => {
    if (isOpen && match) {
      void fetchLegs()
    }
  }, [isOpen, match])

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setShowDetailedStats(false)
      setLegs([])
      setActiveTab("legs")
      onClose()
    }
  }

  const playerOneName = match?.player1?.playerId?.name || "Player 1"
  const playerTwoName = match?.player2?.playerId?.name || "Player 2"
  const playerOneId = match?.player1?.playerId?._id
  const playerTwoId = match?.player2?.playerId?._id

  // Determine winning player based on leg wins
  const getWinningPlayer = () => {
    if (legs.length === 0) return null
    const player1Wins = legs.filter(leg => leg.winnerId?._id === playerOneId).length
    const player2Wins = legs.filter(leg => leg.winnerId?._id === playerTwoId).length
    if (player1Wins > player2Wins) return playerOneId
    if (player2Wins > player1Wins) return playerTwoId
    return null // Tie
  }

  const winningPlayerId = getWinningPlayer()
  const isPlayer1Winner = winningPlayerId === playerOneId
  const isPlayer2Winner = winningPlayerId === playerTwoId

  const calculatePlayerArrows = (throws: Throw[], storedTotalDarts?: number, isWinner?: boolean, winnerArrowCount?: number) => {
    // Use stored totalDarts if available (new matches)
    if (storedTotalDarts !== undefined && storedTotalDarts !== null) {
      return storedTotalDarts
    }
    
    // Fallback calculation for older matches
    if (!throws.length) return 0
    if (isWinner && typeof winnerArrowCount === "number") {
      return (throws.length - 1) * 3 + winnerArrowCount
    }
    return throws.length * 3
  }

  const calculateRunningAverages = (throws: Throw[]) => {
    let total = 0
    return throws.map((entry, idx) => {
      total += entry.score
      return Number(((total / (idx + 1)) || 0).toFixed(2))
    })
  }

  const calculateLegStats = (throws: Throw[]) => {
    if (throws.length === 0) return { average: 0, highestThrow: 0, oneEighties: 0 }
    const totalScore = throws.reduce((sum, t) => sum + t.score, 0)
    const average = throws.length > 0 ? Math.round((totalScore / throws.length) * 100) / 100 : 0
    const highestThrow = Math.max(...throws.map(t => t.score))
    const oneEighties = throws.filter(t => t.score === 180).length
    return { average, highestThrow, oneEighties }
  }

  const formatThrow = (throwData: Throw, isWinner: boolean) => {
    if (throwData.isCheckout && isWinner) {
      return "bg-success/20 text-success"
    } else if (throwData.score === 180) {
      return "bg-warning/20 text-warning"
    } else if (throwData.score === 0) {
      return "bg-destructive/20 text-destructive"
    } else if (throwData.score >= 140) {
      return "bg-info/20 text-info"
    } else if (throwData.score >= 100) {
      return "bg-primary/20 text-primary"
    } else {
      return "bg-muted text-muted-foreground"
    }
  }

  if (!match) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle className="text-2xl font-bold">
            <span className={cn(isPlayer1Winner ? "text-primary" : "text-foreground")}>{playerOneName}</span>
            <span className="mx-2 text-muted-foreground">vs</span>
            <span className={cn(isPlayer2Winner ? "text-primary" : "text-foreground")}>{playerTwoName}</span>
          </DialogTitle>
          <DialogDescription>Legek részletei és statisztikák</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {onBackToMatches && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToMatches}
                className="gap-2"
              >
                <IconArrowLeft className="h-4 w-4" />
                Vissza
              </Button>
            )}
            {!isFeatureFlagLoading && (
              <Button
                variant={showDetailedStats ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (isDetailedStatsEnabled) {
                    setShowDetailedStats((prev) => !prev)
                  } else {
                    // Optionally show a toast or just rely on the badge/icon
                  }
                }}
                className={cn("gap-2", !isDetailedStatsEnabled && "opacity-50 cursor-not-allowed")}
                disabled={!isDetailedStatsEnabled}
              >
                {isDetailedStatsEnabled ? (
                  <IconSparkles className="h-4 w-4" />
                ) : (
                  <IconLock className="h-4 w-4 text-primary/40" />
                )}
                {showDetailedStats ? "Grafikonok elrejtése" : "Részletes grafikonok"}
              </Button>
            )}
          </div>

          {!isFeatureFlagLoading && !isDetailedStatsEnabled && (
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary/60 border-primary/20 gap-1.5 px-3 py-1">
              <IconLock size={12} />
              Pro funkció
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center flex-shrink-0">
            <IconLoader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="px-6 pb-4 flex-shrink-0">
            <Alert variant="destructive">
              <IconAlertTriangle className="h-5 w-5" />
              <AlertTitle>Hiba történt</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : legs.length === 0 ? (
          <div className="px-6 pb-4 flex-shrink-0">
            <Card className="border-0">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Ehhez a meccshez még nem érkeztek részletes statisztikák.
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-scroll px-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "legs" | "stats")} className="flex flex-col h-full">
              <TabsList className="mb-4 flex-shrink-0">
                <TabsTrigger value="legs" className="gap-2">
                  <IconTarget className="h-4 w-4" />
                  Legek
                </TabsTrigger>
                <TabsTrigger 
                  value="stats" 
                  disabled={!isDetailedStatsEnabled}
                  className={cn("gap-2", !isDetailedStatsEnabled && "opacity-50")}
                >
                  {isDetailedStatsEnabled ? (
                    <IconChartLine className="h-4 w-4" />
                  ) : (
                    <IconLock className="h-4 w-4" />
                  )}
                  Statisztikák
                </TabsTrigger>
              </TabsList>

              <TabsContent value="legs" className="mt-0 flex-1 min-h-0 overflow-y-scroll">
                <div className="space-y-4 pb-4">
                  {legs.map((leg, legIndex) => {
                    const isPlayer1Winner = leg.winnerId?._id === match.player1?.playerId?._id
                    const isPlayer2Winner = leg.winnerId?._id === match.player2?.playerId?._id
                    const loserRemaining = leg.loserRemainingScore ?? 0

                    const player1LegStats = showDetailedStats ? calculateLegStats(leg.player1Throws) : null
                    const player2LegStats = showDetailedStats ? calculateLegStats(leg.player2Throws) : null
                    const player1RunningAverages = showDetailedStats ? calculateRunningAverages(leg.player1Throws) : []
                    const player2RunningAverages = showDetailedStats ? calculateRunningAverages(leg.player2Throws) : []

                    return (
                      <Card key={`${leg.createdAt}-${legIndex}`} className="overflow-hidden border-0">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <span className="text-base font-bold text-primary">{legIndex + 1}</span>
                              </div>
                              <div>
                                <CardTitle className="text-base">{legIndex + 1}. Leg</CardTitle>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <IconTrophy className="h-3 w-3 text-warning" />
                                    <span>{leg.winnerId?.name}</span>
                                  </div>
                                  {leg.winnerArrowCount && (
                                    <div className="flex items-center gap-1">
                                      <IconTarget className="h-3 w-3 text-primary" />
                                      <span>{leg.winnerArrowCount} nyíl</span>
                                    </div>
                                  )}
                                  {loserRemaining > 0 && (
                                    <div className="flex items-center gap-1">
                                      <IconTrendingDown className="h-3 w-3 text-destructive" />
                                      <span>Maradt: {loserRemaining} pont</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {leg.checkoutScore && (
                              <Badge variant="success" className="gap-1">
                                <IconTargetArrow className="h-3 w-3" />
                                {leg.checkoutScore}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          {/* Player 1 */}
                          <div className={cn(
                            "rounded-lg p-4",
                            isPlayer1Winner ? "bg-success/10" : "bg-card"
                          )}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="text-xs">P1</Badge>
                                <span className="font-semibold text-primary">{playerOneName}</span>
                                {isPlayer1Winner && <IconTrophy className="h-4 w-4 text-warning" />}
                                <span className="text-xs text-muted-foreground">
                                  {calculatePlayerArrows(
                                    leg.player1Throws,
                                    (leg as any).player1TotalDarts,
                                    isPlayer1Winner,
                                    leg.winnerArrowCount
                                  )} nyíl
                                </span>
                              </div>
                              {showDetailedStats && player1LegStats && (
                                <div className="flex gap-2 text-xs">
                                  <span className="text-muted-foreground">Átlag: <strong>{player1LegStats.average}</strong></span>
                                  <span className="text-muted-foreground">Max: <strong>{player1LegStats.highestThrow}</strong></span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {leg.player1Throws.map((throwData, throwIndex) => (
                                <React.Fragment key={throwIndex}>
                                  <div className="flex items-center gap-1">
                                    <span className={cn(
                                      "inline-flex min-w-[40px] items-center justify-center rounded px-2 py-1 text-xs font-medium",
                                      formatThrow(throwData, isPlayer1Winner)
                                    )}>
                                      {throwData.score}
                                    </span>
                                    {showDetailedStats && player1RunningAverages[throwIndex] !== undefined && (
                                      <span className="text-[10px] text-muted-foreground">
                                        ({player1RunningAverages[throwIndex].toFixed(1)})
                                      </span>
                                    )}
                                  </div>
                                  {throwIndex < leg.player1Throws.length - 1 && (
                                    <IconArrowRight className="h-3 w-3 text-muted-foreground/50" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>

                          {/* Player 2 */}
                          <div className={cn(
                            "rounded-lg p-4",
                            isPlayer2Winner ? "bg-success/10" : "bg-card"
                          )}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="destructive" className="text-xs">P2</Badge>
                                <span className="font-semibold text-destructive">{playerTwoName}</span>
                                {isPlayer2Winner && <IconTrophy className="h-4 w-4 text-warning" />}
                                <span className="text-xs text-muted-foreground">
                                  {calculatePlayerArrows(
                                    leg.player2Throws,
                                    (leg as any).player2TotalDarts,
                                    isPlayer2Winner,
                                    leg.winnerArrowCount
                                  )} nyíl
                                </span>
                              </div>
                              {showDetailedStats && player2LegStats && (
                                <div className="flex gap-2 text-xs">
                                  <span className="text-muted-foreground">Átlag: <strong>{player2LegStats.average}</strong></span>
                                  <span className="text-muted-foreground">Max: <strong>{player2LegStats.highestThrow}</strong></span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {leg.player2Throws.map((throwData, throwIndex) => (
                                <React.Fragment key={throwIndex}>
                                  <div className="flex items-center gap-1">
                                    <span className={cn(
                                      "inline-flex min-w-[40px] items-center justify-center rounded px-2 py-1 text-xs font-medium",
                                      formatThrow(throwData, isPlayer2Winner)
                                    )}>
                                      {throwData.score}
                                    </span>
                                    {showDetailedStats && player2RunningAverages[throwIndex] !== undefined && (
                                      <span className="text-[10px] text-muted-foreground">
                                        ({player2RunningAverages[throwIndex].toFixed(1)})
                                      </span>
                                    )}
                                  </div>
                                  {throwIndex < leg.player2Throws.length - 1 && (
                                    <IconArrowRight className="h-3 w-3 text-muted-foreground/50" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <IconClock className="h-4 w-4" />
                            <span>
                              {new Date(leg.createdAt).toLocaleString("hu-HU", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </TabsContent>

              {isDetailedStatsEnabled && (
                <TabsContent value="stats" className="mt-0 flex-1 min-h-0 overflow-y-scroll">
                  <div className="pb-4">
                    <MatchStatisticsCharts
                      legs={legs.map((leg, index) => ({ ...leg, legNumber: index + 1 }))}
                      player1Name={playerOneName}
                      player2Name={playerTwoName}
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}

        <DialogFooter className="px-6 pb-6 pt-4 flex-shrink-0">
          <Button onClick={onClose}>Bezárás</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default LegsViewModal
