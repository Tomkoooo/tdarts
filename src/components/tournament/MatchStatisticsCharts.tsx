"use client"

import React, { useMemo, useState } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js"
import { Line } from "react-chartjs-2"
import {
  IconArrowDown,
  IconArrowUp,
  IconChartLine,
  IconTarget,
  IconTargetArrow,
  IconTrendingDown,
} from "@tabler/icons-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

type Throw = {
  score: number
  darts: number
  isDouble: boolean
  isCheckout: boolean
}

type Leg = {
  legNumber: number
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

interface MatchStatisticsChartsProps {
  legs: Leg[]
  player1Name: string
  player2Name: string
}

const chartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
      labels: {
        boxWidth: 12,
        padding: 8,
        font: {
          size: 11,
        },
        color: "rgba(255, 255, 255, 0.7)",
      },
    },
    title: {
      display: false,
    },
    tooltip: {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      borderColor: "rgba(255, 255, 255, 0.1)",
      borderWidth: 1,
      titleFont: {
        size: 12,
      },
      bodyFont: {
        size: 11,
      },
      padding: 8,
    },
  },
  scales: {
    y: {
      beginAtZero: false,
      title: {
        display: true,
        text: "Átlag",
        font: {
          size: 11,
        },
        color: "rgba(255, 255, 255, 0.7)",
      },
      grid: {
        color: "rgba(255, 255, 255, 0.1)",
      },
      ticks: {
        font: {
          size: 10,
        },
        color: "rgba(255, 255, 255, 0.6)",
      },
    },
    x: {
      title: {
        display: true,
        text: "Leg",
        font: {
          size: 11,
        },
        color: "rgba(255, 255, 255, 0.7)",
      },
      grid: {
        color: "rgba(255, 255, 255, 0.1)",
      },
      ticks: {
        font: {
          size: 10,
        },
        color: "rgba(255, 255, 255, 0.6)",
        maxRotation: 45,
        minRotation: 0,
      },
    },
  },
  elements: {
    point: {
      radius: 3,
      hoverRadius: 5,
    },
    line: {
      borderWidth: 2,
      tension: 0.1,
    },
  },
}

const MatchStatisticsCharts: React.FC<MatchStatisticsChartsProps> = ({ legs, player1Name, player2Name }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "legs">("overview")
  const [expandedLegs, setExpandedLegs] = useState<Set<number>>(new Set())

  // Calculate 3-dart average for each leg - uses totalDarts if available
  const calculateLegAverages = (throws: Throw[], totalDarts?: number) => {
    if (throws.length === 0) return 0
    const totalScore = throws.reduce((sum, t) => sum + t.score, 0)
    
    // Use stored totalDarts if available (new matches)
    if (totalDarts !== undefined && totalDarts !== null && totalDarts > 0) {
      return Math.round(((totalScore / totalDarts) * 3) * 100) / 100
    }
    
    // Fallback for older matches: sum up darts from each throw
    const calculatedDarts = throws.reduce((sum, t) => sum + (t.darts || 3), 0)
    return calculatedDarts > 0 ? Math.round(((totalScore / calculatedDarts) * 3) * 100) / 100 : 0
  }

  // Calculate throw-by-throw 3-dart averages within each leg
  const calculateThrowByThrowAverages = (throws: Throw[]) => {
    const averages: number[] = []
    let totalScore = 0

    throws.forEach((throwData, index) => {
      totalScore += throwData.score
      const average = (index + 1) > 0 ? Math.round((totalScore / (index + 1)) * 100) / 100 : 0
      averages.push(average)
    })

    return averages
  }

  // Calculate cumulative 3-dart averages across the match
  const calculateCumulativeAverages = () => {
    const player1Cumulative: number[] = []
    const player2Cumulative: number[] = []

    let player1TotalScore = 0
    let player1TotalDarts = 0
    let player2TotalScore = 0
    let player2TotalDarts = 0

    legs.forEach((leg) => {
      // Player 1 - use stored totalDarts if available
      const p1LegTotalScore = leg.player1Throws.reduce((sum, t) => sum + t.score, 0)
      player1TotalScore += p1LegTotalScore
      
      if ((leg as any).player1TotalDarts !== undefined && (leg as any).player1TotalDarts !== null) {
        // New match with totalDarts field
        player1TotalDarts += (leg as any).player1TotalDarts
      } else {
        // Fallback for older matches
        player1TotalDarts += leg.player1Throws.reduce((sum, t) => sum + (t.darts || 3), 0)
      }
      
      const player1Avg = player1TotalDarts > 0 
        ? Math.round(((player1TotalScore / player1TotalDarts) * 3) * 100) / 100 
        : 0
      player1Cumulative.push(player1Avg)

      // Player 2 - use stored totalDarts if available
      const p2LegTotalScore = leg.player2Throws.reduce((sum, t) => sum + t.score, 0)
      player2TotalScore += p2LegTotalScore
      
      if ((leg as any).player2TotalDarts !== undefined && (leg as any).player2TotalDarts !== null) {
        // New match with totalDarts field
        player2TotalDarts += (leg as any).player2TotalDarts
      } else {
        // Fallback for older matches
        player2TotalDarts += leg.player2Throws.reduce((sum, t) => sum + (t.darts || 3), 0)
      }
      
      const player2Avg = player2TotalDarts > 0 
        ? Math.round(((player2TotalScore / player2TotalDarts) * 3) * 100) / 100 
        : 0
      player2Cumulative.push(player2Avg)
    })

    return { player1Cumulative, player2Cumulative }
  }

  const legAverages = useMemo(
    () =>
      legs.map((leg) => {
        return {
          legNumber: leg.legNumber,
          player1Average: calculateLegAverages(leg.player1Throws, (leg as any).player1TotalDarts),
          player2Average: calculateLegAverages(leg.player2Throws, (leg as any).player2TotalDarts),
        }
      }),
    [legs]
  )

  const { player1Cumulative, player2Cumulative } = useMemo(() => calculateCumulativeAverages(), [legs])

  // Leg-by-leg averages chart data
  const legByLegData = useMemo(
    () => ({
      labels: legAverages.map((_, index) => `${index + 1}. Leg`),
      datasets: [
        {
          label: player1Name,
          data: legAverages.map((leg) => leg.player1Average),
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          tension: 0.1,
          fill: false,
        },
        {
          label: player2Name,
          data: legAverages.map((leg) => leg.player2Average),
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgba(239, 68, 68, 0.2)",
          tension: 0.1,
          fill: false,
        },
      ],
    }),
    [legAverages, player1Name, player2Name]
  )

  // Cumulative averages chart data
  const cumulativeData = useMemo(
    () => ({
      labels: legs.map((_, index) => `${index + 1}. Leg`),
      datasets: [
        {
          label: `${player1Name} (futó átlag)`,
          data: player1Cumulative,
          borderColor: "rgb(139, 92, 246)",
          backgroundColor: "rgba(139, 92, 246, 0.2)",
          tension: 0.1,
          fill: false,
        },
        {
          label: `${player2Name} (futó átlag)`,
          data: player2Cumulative,
          borderColor: "rgb(236, 72, 153)",
          backgroundColor: "rgba(236, 72, 153, 0.2)",
          tension: 0.1,
          fill: false,
        },
      ],
    }),
    [player1Cumulative, player2Cumulative, legs, player1Name, player2Name]
  )

  // Create throw-by-throw data for a leg
  const createThrowByThrowData = (legIndex: number) => {
    const leg = legs[legIndex]
    if (!leg) return null

    const player1ThrowAverages = calculateThrowByThrowAverages(leg.player1Throws)
    const player2ThrowAverages = calculateThrowByThrowAverages(leg.player2Throws)

    const throwLabels = Array.from(
      { length: Math.max(player1ThrowAverages.length, player2ThrowAverages.length) },
      (_, i) => `${i + 1}. dobás`
    )

    return {
      labels: throwLabels,
      datasets: [
        {
          label: player1Name,
          data: player1ThrowAverages,
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          tension: 0.1,
          fill: false,
        },
        {
          label: player2Name,
          data: player2ThrowAverages,
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgba(239, 68, 68, 0.2)",
          tension: 0.1,
          fill: false,
        },
      ],
    }
  }

  const toggleLeg = (legIndex: number) => {
    setExpandedLegs((prev) => {
      const clone = new Set(prev)
      if (clone.has(legIndex)) {
        clone.delete(legIndex)
      } else {
        clone.add(legIndex)
      }
      return clone
    })
  }

  const latestPlayer1Average = player1Cumulative[player1Cumulative.length - 1] ?? 0
  const latestPlayer2Average = player2Cumulative[player2Cumulative.length - 1] ?? 0
  const bestLegPlayer1 = legAverages.length ? Math.max(...legAverages.map((leg) => leg.player1Average)) : 0
  const bestLegPlayer2 = legAverages.length ? Math.max(...legAverages.map((leg) => leg.player2Average)) : 0

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "overview" | "legs")} className="flex flex-col h-full">
        <TabsList className="mb-4 flex-shrink-0">
          <TabsTrigger value="overview" className="gap-2">
            <IconChartLine className="h-4 w-4" />
            Összesítő
          </TabsTrigger>
          <TabsTrigger value="legs" className="gap-2">
            <IconTarget className="h-4 w-4" />
            Leg részletek
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 flex-1 min-h-0 overflow-y-scroll">
          <div className="space-y-4 pb-4">
          {/* Statistics summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-primary truncate" title={player1Name}>
                    {player1Name}
                  </CardTitle>
                  <Badge variant="default" className="text-xs">P1</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">Végső átlag</div>
                    <div className="text-2xl font-bold text-primary">
                      {latestPlayer1Average.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">Max leg átlag</div>
                    <div className="text-2xl font-bold text-info">
                      {bestLegPlayer1.toFixed(1)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-0">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-destructive truncate" title={player2Name}>
                    {player2Name}
                  </CardTitle>
                  <Badge variant="destructive" className="text-xs">P2</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">Végső átlag</div>
                    <div className="text-2xl font-bold text-destructive">
                      {latestPlayer2Average.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">Max leg átlag</div>
                    <div className="text-2xl font-bold text-info">
                      {bestLegPlayer2.toFixed(1)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Leg-by-leg averages chart */}
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconChartLine className="h-5 w-5 text-primary" />
                Teljesítmény alakulása
              </CardTitle>
              <CardDescription>
                Legenkénti átlagok összehasonlítása leg-ről leg-re
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-64">
                <Line options={chartOptions} data={legByLegData} />
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold">📊 Legenkénti átlagok:</span> Az egyes legekben elért 3 nyilas átlagok összehasonlítása leg-ről leg-re.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Cumulative averages chart */}
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconTrendingDown className="h-5 w-5 text-info" />
                Futó meccsátlag alakulása
              </CardTitle>
              <CardDescription>
                A meccs előrehaladtával hogyan változott a játékosok összesített 3-nyilas átlaga
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-64">
                <Line options={chartOptions} data={cumulativeData} />
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold">💡 Futó átlag:</span> Az összes dobás átlaga a meccs elejétől az adott legig.
                </p>
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="legs" className="mt-0 flex-1 min-h-0 overflow-y-scroll">
          <div className="space-y-3 pb-4">
          {legs.map((leg, legIndex) => {
            const throwData = createThrowByThrowData(legIndex)
            if (!throwData || (leg.player1Throws.length === 0 && leg.player2Throws.length === 0)) return null

            const isExpanded = expandedLegs.has(legIndex)
            const player1LegAvg = calculateLegAverages(leg.player1Throws, (leg as any).player1TotalDarts)
            const player2LegAvg = calculateLegAverages(leg.player2Throws, (leg as any).player2TotalDarts)

            return (
              <Card key={legIndex} className="overflow-hidden border-0">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                        <span className="text-base font-bold text-primary">{legIndex + 1}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Leg átlagok</div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-primary">{player1LegAvg.toFixed(1)}</span>
                            {leg.winnerId?._id && leg.winnerId.name === player1Name && (
                              <span className="text-xs">🏆</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">vs</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-destructive">{player2LegAvg.toFixed(1)}</span>
                            {leg.winnerId?._id && leg.winnerId.name === player2Name && (
                              <span className="text-xs">🏆</span>
                            )}
                          </div>
                        </div>

                        {leg.winnerId?._id && (
                          <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-2">
                            {leg.winnerArrowCount && (
                              <div className="flex items-center gap-1">
                                <IconTarget className="h-3 w-3" />
                                <span>{leg.winnerArrowCount} nyíl</span>
                              </div>
                            )}
                            {leg.loserRemainingScore !== undefined && leg.loserRemainingScore > 0 && (
                              <div className="flex items-center gap-1">
                                <IconTrendingDown className="h-3 w-3" />
                                <span>{leg.loserRemainingScore} pont</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => toggleLeg(legIndex)}
                    >
                      {isExpanded ? (
                        <>
                          <IconArrowUp className="h-4 w-4" />
                          Összecsuk
                        </>
                      ) : (
                        <>
                          <IconArrowDown className="h-4 w-4" />
                          Részletek
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <IconTargetArrow className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">Dobásonkénti átlagok</span>
                        </div>
                  </div>
                      <div className="h-64">
                        <Line
                          options={{
                            ...chartOptions,
                            scales: {
                              ...chartOptions.scales,
                              x: {
                                ...chartOptions.scales?.x,
                                title: {
                                  display: true,
                                  text: "Dobás",
                                  font: {
                                    size: 10,
                                  },
                                  color: "rgba(255, 255, 255, 0.7)",
                                },
                              },
                            },
                          }}
                          data={throwData}
                        />
                      </div>
                      <div className="mt-3 rounded-lg bg-info/10 p-3">
                        <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                          <p>
                            💡 <span className="font-semibold">Tipp:</span> A grafikon mutatja, hogyan változott a játékosok teljesítménye a leg során.
                          </p>
                          {leg.winnerId?._id && (
                            <div className="flex items-center gap-4 pt-1">
                              {leg.winnerArrowCount && (
                                <div className="flex items-center gap-1">
                                  <IconTarget className="h-3 w-3" />
                                  <span className="font-medium">
                                    {leg.winnerId.name} kiszállt: {leg.winnerArrowCount} nyíl
                                  </span>
                                </div>
                              )}
                              {leg.loserRemainingScore !== undefined && leg.loserRemainingScore > 0 && (
                                <div className="flex items-center gap-1">
                                  <IconTrendingDown className="h-3 w-3" />
                                  <span className="font-medium">Maradt: {leg.loserRemainingScore} pont</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                </CardContent>
                )}
              </Card>
            )
          })}

          {legs.filter((leg) => leg.player1Throws.length > 0 || leg.player2Throws.length > 0).length === 0 && (
            <Card className="border-0">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Még nincsenek részletes leg adatok.
              </CardContent>
            </Card>
          )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MatchStatisticsCharts
