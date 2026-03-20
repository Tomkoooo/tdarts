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
  IconDeviceAnalytics,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"

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

const MatchStatisticsCharts: React.FC<MatchStatisticsChartsProps> = ({ legs, player1Name, player2Name }) => {
  const tTour = useTranslations("Tournament")
  const t = (key: string, values?: any) => tTour(`match_stats.${key}`, values)
  const [activeTab, setActiveTab] = useState<"overview" | "legs">("overview")
  const [expandedLegs, setExpandedLegs] = useState<Set<number>>(new Set())

  const chartOptions: ChartOptions<"line"> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 12,
          padding: 8,
          font: { family: "Inter", size: 11, weight: "bold" },
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: "rgba(20, 15, 18, 0.9)",
        borderColor: "rgba(255, 180, 166, 0.2)", // primary/20
        borderWidth: 1,
        titleFont: { family: "Space Grotesk", size: 12, weight: "bold" },
        bodyFont: { family: "Inter", size: 11 },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: t("charts.avg_axis") || "Average",
          font: { family: "Space Grotesk", size: 10, weight: "bold" },
          color: "rgba(255, 255, 255, 0.5)",
        },
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { font: { family: "Inter", size: 10 }, color: "rgba(255, 255, 255, 0.5)" },
        border: { dash: [4, 4] },
      },
      x: {
        title: {
          display: true,
          text: t("charts.leg_axis") || "Legs",
          font: { family: "Space Grotesk", size: 10, weight: "bold" },
          color: "rgba(255, 255, 255, 0.5)",
        },
        grid: { display: false },
        ticks: { font: { family: "Inter", size: 10 }, color: "rgba(255, 255, 255, 0.5)" },
      },
    },
    elements: {
      point: { radius: 0, hitRadius: 10, hoverRadius: 6 },
      line: { borderWidth: 3, tension: 0.4 },
    },
  }), [t])

  const calculateLegAverages = (throws: Throw[], totalDarts?: number) => {
    if (throws.length === 0) return 0
    const totalScore = throws.reduce((sum, t) => sum + t.score, 0)
    if (totalDarts !== undefined && totalDarts !== null && totalDarts > 0) {
      return Math.round(((totalScore / totalDarts) * 3) * 100) / 100
    }
    const calculatedDarts = throws.reduce((sum, t) => sum + (t.darts || 3), 0)
    return calculatedDarts > 0 ? Math.round(((totalScore / calculatedDarts) * 3) * 100) / 100 : 0
  }

  const calculateFirstNineAverage = (throws: Throw[]) => {
    if (throws.length === 0) return 0
    const firstNine = throws.slice(0, 3)
    const score = firstNine.reduce((sum, t) => sum + t.score, 0)
    const darts = firstNine.reduce((sum, t) => sum + (t.darts || 3), 0)
    return darts > 0 ? Math.round(((score / darts) * 3) * 100) / 100 : 0
  }

  const calculateCumulativeAverages = () => {
    const p1C: number[] = []
    const p2C: number[] = []
    let p1Sum = 0, p1Darts = 0, p2Sum = 0, p2Darts = 0

    legs.forEach((leg) => {
      p1Sum += leg.player1Throws.reduce((sum, t) => sum + t.score, 0)
      p1Darts += ((leg as any).player1TotalDarts !== undefined && (leg as any).player1TotalDarts !== null)
        ? (leg as any).player1TotalDarts
        : leg.player1Throws.reduce((sum, t) => sum + (t.darts || 3), 0)
      p1C.push(p1Darts > 0 ? Math.round(((p1Sum / p1Darts) * 3) * 100) / 100 : 0)

      p2Sum += leg.player2Throws.reduce((sum, t) => sum + t.score, 0)
      p2Darts += ((leg as any).player2TotalDarts !== undefined && (leg as any).player2TotalDarts !== null)
        ? (leg as any).player2TotalDarts
        : leg.player2Throws.reduce((sum, t) => sum + (t.darts || 3), 0)
      p2C.push(p2Darts > 0 ? Math.round(((p2Sum / p2Darts) * 3) * 100) / 100 : 0)
    })
    return { p1C, p2C }
  }

  const legAverages = useMemo(() => legs.map((leg) => ({
    legNumber: leg.legNumber,
    player1Average: calculateLegAverages(leg.player1Throws, (leg as any).player1TotalDarts),
    player2Average: calculateLegAverages(leg.player2Throws, (leg as any).player2TotalDarts),
  })), [legs])

  const { p1C, p2C } = useMemo(() => calculateCumulativeAverages(), [legs])

  const cumulativeData = useMemo(() => ({
    labels: legs.map((_, index) => t("legs.leg_title", { number: index + 1 }) || `Leg ${index + 1}`),
    datasets: [
      {
        label: player1Name,
        data: p1C,
        borderColor: "#ffb4a6", // primary
        backgroundColor: "rgba(255, 180, 166, 0.2)",
        tension: 0.4,
        fill: true,
      },
      {
        label: player2Name,
        data: p2C,
        borderColor: "#a78a85", // outline
        backgroundColor: "rgba(167, 138, 133, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  }), [p1C, p2C, legs, player1Name, player2Name, t])

  const toggleLeg = (legIndex: number) => {
    setExpandedLegs((prev) => {
      const clone = new Set(prev)
      if (clone.has(legIndex)) clone.delete(legIndex)
      else clone.add(legIndex)
      return clone
    })
  }

  const createThrowRows = (leg: Leg, startingScore: number) => {
    let p1Remaining = startingScore
    let p2Remaining = startingScore
    const visits = Math.max(leg.player1Throws.length, leg.player2Throws.length)

    return Array.from({ length: visits }, (_, throwIndex) => {
      const p1Throw = leg.player1Throws[throwIndex]
      const p2Throw = leg.player2Throws[throwIndex]
      const p1Before = p1Throw ? p1Remaining : null
      const p2Before = p2Throw ? p2Remaining : null

      if (p1Throw) p1Remaining = Math.max(0, p1Remaining - Number(p1Throw.score || 0))
      if (p2Throw) p2Remaining = Math.max(0, p2Remaining - Number(p2Throw.score || 0))

      return {
        throwIndex,
        p1Throw,
        p2Throw,
        p1Before,
        p2Before,
        arrowCount: (throwIndex + 1) * 3,
      }
    })
  }

  // Derived Stats for Comparison Table
  const {
    p1Avg,
    p2Avg,
    p1BestLeg,
    p2BestLeg,
    p1F9,
    p2F9,
    p1_180s,
    p2_180s,
    p1_140s,
    p2_140s,
    p1_100s,
    p2_100s,
    p1HighestOut,
    p2HighestOut,
  } = useMemo(() => {
    const nextP1Avg = p1C[p1C.length - 1] ?? 0
    const nextP2Avg = p2C[p2C.length - 1] ?? 0
    const nextP1BestLeg = legAverages.length ? Math.max(...legAverages.map((leg) => leg.player1Average)) : 0
    const nextP2BestLeg = legAverages.length ? Math.max(...legAverages.map((leg) => leg.player2Average)) : 0
    const nextP1F9 = legs.length > 0 ? Math.round((legs.reduce((sum, leg) => sum + calculateFirstNineAverage(leg.player1Throws), 0) / legs.length) * 100) / 100 : 0
    const nextP2F9 = legs.length > 0 ? Math.round((legs.reduce((sum, leg) => sum + calculateFirstNineAverage(leg.player2Throws), 0) / legs.length) * 100) / 100 : 0
    const nextP1_180s = legs.reduce((count, leg) => count + leg.player1Throws.filter((t) => t.score === 180).length, 0)
    const nextP2_180s = legs.reduce((count, leg) => count + leg.player2Throws.filter((t) => t.score === 180).length, 0)
    const nextP1_140s = legs.reduce((count, leg) => count + leg.player1Throws.filter((t) => t.score >= 140 && t.score < 180).length, 0)
    const nextP2_140s = legs.reduce((count, leg) => count + leg.player2Throws.filter((t) => t.score >= 140 && t.score < 180).length, 0)
    const nextP1_100s = legs.reduce((count, leg) => count + leg.player1Throws.filter((t) => t.score >= 100 && t.score < 140).length, 0)
    const nextP2_100s = legs.reduce((count, leg) => count + leg.player2Throws.filter((t) => t.score >= 100 && t.score < 140).length, 0)

    let nextP1HighestOut = 0
    let nextP2HighestOut = 0
    legs.forEach((leg) => {
      if (leg.winnerId?.name === player1Name && leg.checkoutScore && leg.checkoutScore > nextP1HighestOut) nextP1HighestOut = leg.checkoutScore
      if (leg.winnerId?.name === player2Name && leg.checkoutScore && leg.checkoutScore > nextP2HighestOut) nextP2HighestOut = leg.checkoutScore
    })

    return {
      p1Avg: nextP1Avg,
      p2Avg: nextP2Avg,
      p1BestLeg: nextP1BestLeg,
      p2BestLeg: nextP2BestLeg,
      p1F9: nextP1F9,
      p2F9: nextP2F9,
      p1_180s: nextP1_180s,
      p2_180s: nextP2_180s,
      p1_140s: nextP1_140s,
      p2_140s: nextP2_140s,
      p1_100s: nextP1_100s,
      p2_100s: nextP2_100s,
      p1HighestOut: nextP1HighestOut,
      p2HighestOut: nextP2HighestOut,
    }
  }, [calculateFirstNineAverage, legAverages, legs, p1C, p2C, player1Name, player2Name])

  const ComparisonRow = ({ label, left, right, highlight, bg }: any) => (
    <div className={cn("grid grid-cols-3 items-center py-4 px-4 rounded-lg transition-colors hover:bg-muted/50", bg && "bg-muted/20")}>
      <div className="text-left font-label text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={cn("text-center text-xl sm:text-2xl font-headline font-bold truncate", highlight === 'left' ? "text-primary shadow-glow-primary-sm" : "text-foreground")}>{left}</div>
      <div className={cn("text-right text-xl sm:text-2xl font-headline font-bold truncate", highlight === 'right' ? "text-primary shadow-glow-primary-sm" : "text-foreground")}>{right}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "overview" | "legs")} className="flex flex-col h-full">
        <TabsList className="mb-6 inline-flex w-full justify-start overflow-x-auto bg-muted/30 p-1 border border-border/50">
          <TabsTrigger value="overview" className="shrink-0 gap-2 text-[10px] sm:text-xs uppercase tracking-wider font-bold rounded-md px-3 sm:px-6">
            <IconChartLine className="h-4 w-4" />
            {t("tabs.overview") || "Overview"}
          </TabsTrigger>
          <TabsTrigger value="legs" className="shrink-0 gap-2 text-[10px] sm:text-xs uppercase tracking-wider font-bold rounded-md px-3 sm:px-6">
            <IconTarget className="h-4 w-4" />
            {t("tabs.legs") || "Leg Details"}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-0 space-y-8 min-h-0">
          
          {/* Comparison Table */}
          <div className="bg-card rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-black border border-border">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-8 relative z-10 gap-4">
              <div>
                <h3 className="font-headline text-2xl font-bold uppercase tracking-tight text-foreground">{t("overview.comp_title") || "Összesített Mutatók"}</h3>
                <p className="text-muted-foreground text-xs uppercase tracking-widest mt-2">{t("overview.comp_subtitle") || "Detailed statistical breakdown"}</p>
              </div>
              <div className="hidden sm:flex items-center gap-4 bg-muted/40 px-4 py-2 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground truncate max-w-[100px]">{player1Name}</span>
                </div>
                <div className="w-px h-4 bg-border"></div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground truncate max-w-[100px]">{player2Name}</span>
                </div>
              </div>
            </div>
            
            <div className="mb-2 grid grid-cols-3 rounded-lg border border-border/40 bg-muted/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>{t("overview.metric") || "Metric"}</span>
              <span className="text-center truncate">{player1Name}</span>
              <span className="text-right truncate">{player2Name}</span>
            </div>
            <div className="space-y-1 relative z-10">
              <ComparisonRow label={t("overview.table_avg") || "Avg Score"} left={p1Avg.toFixed(2)} right={p2Avg.toFixed(2)} highlight={p1Avg > p2Avg ? 'left' : p2Avg > p1Avg ? 'right' : 'none'} />
              <ComparisonRow label={t("overview.table_first9") || "First 9 Avg"} left={p1F9.toFixed(2)} right={p2F9.toFixed(2)} highlight={p1F9 > p2F9 ? 'left' : p2F9 > p1F9 ? 'right' : 'none'} bg />
              <ComparisonRow label={t("overview.table_180s") || "180s Thrown"} left={p1_180s} right={p2_180s} highlight={p1_180s > p2_180s ? 'left' : p2_180s > p1_180s ? 'right' : 'none'} />
              <ComparisonRow label={t("overview.table_140s") || "140+ Thrown"} left={p1_140s} right={p2_140s} highlight={p1_140s > p2_140s ? 'left' : p2_140s > p1_140s ? 'right' : 'none'} bg />
              <ComparisonRow label={t("overview.table_100s") || "100+ Thrown"} left={p1_100s} right={p2_100s} highlight={p1_100s > p2_100s ? 'left' : p2_100s > p1_100s ? 'right' : 'none'} />
              <ComparisonRow label={t("overview.table_highout") || "Highest Out"} left={p1HighestOut} right={p2HighestOut} highlight={p1HighestOut > p2HighestOut ? 'left' : p2HighestOut > p1HighestOut ? 'right' : 'none'} bg />
              <ComparisonRow label={t("overview.table_bestleg") || "Best Leg Avg"} left={p1BestLeg.toFixed(2)} right={p2BestLeg.toFixed(2)} highlight={p1BestLeg > p2BestLeg ? 'left' : p2BestLeg > p1BestLeg ? 'right' : 'none'} />
            </div>
          </div>

          {/* Cumulative averages chart */}
          <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between mb-8 gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 font-headline uppercase tracking-wider text-lg">
                  <IconTrendingDown className="h-5 w-5 text-primary" />
                  {t("overview.cum_title") || "Match Flow"}
                </CardTitle>
                <CardDescription className="mt-2 text-xs uppercase tracking-widest font-bold text-muted-foreground">
                  {t("overview.cum_desc") || "Cumulative Running Average"}
                </CardDescription>
              </div>
            </div>
            <div className="h-72 w-full">
              <Line options={chartOptions} data={cumulativeData} />
            </div>
          </div>

        </TabsContent>

        {/* LEGS TAB */}
        <TabsContent value="legs" className="mt-0 space-y-4 min-h-0">
          {legs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border/50 rounded-xl bg-card">
              <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest">{t("legs.no_data") || "No leg data available"}</p>
            </div>
          ) : (
            legs.map((leg, legIndex) => {
              if (leg.player1Throws.length === 0 && leg.player2Throws.length === 0) return null

              const isExpanded = expandedLegs.has(legIndex)
              const player1LegAvg = calculateLegAverages(leg.player1Throws, (leg as any).player1TotalDarts)
              const player2LegAvg = calculateLegAverages(leg.player2Throws, (leg as any).player2TotalDarts)
              const p1Won = leg.winnerId?.name === player1Name
              const p2Won = leg.winnerId?.name === player2Name

              return (
                <div key={legIndex} className="bg-card rounded-xl overflow-hidden border border-border shadow-sm group">
                  <div 
                    className="p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleLeg(legIndex)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center font-headline font-black text-xl italic shrink-0",
                        "bg-muted text-muted-foreground"
                      )}>
                        {legIndex + 1}
                      </div>

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-1">{t("legs.leg_avgs") || "Leg Averages"}</div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-lg font-headline font-bold", p1Won ? "text-primary" : "text-foreground")}>{player1LegAvg.toFixed(1)}</span>
                            {p1Won && <span className="text-xs">🎯</span>}
                          </div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">vs</span>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-lg font-headline font-bold", p2Won ? "text-primary" : "text-foreground")}>{player2LegAvg.toFixed(1)}</span>
                            {p2Won && <span className="text-xs">🎯</span>}
                          </div>
                        </div>

                        {leg.winnerId?._id && (
                          <div className="mt-2 text-[10px] text-muted-foreground flex flex-wrap items-center gap-3">
                            {leg.winnerArrowCount && (
                              <div className="flex items-center gap-1 font-bold">
                                <IconTarget className="h-3 w-3 text-primary" />
                                <span>{leg.winnerArrowCount} Darts</span>
                              </div>
                            )}
                            {leg.loserRemainingScore !== undefined && leg.loserRemainingScore > 0 && (
                              <div className="flex items-center gap-1 font-bold">
                                <IconTrendingDown className="h-3 w-3 text-muted-foreground" />
                                <span>{leg.loserRemainingScore} Left</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                      {isExpanded ? <IconArrowUp className="h-5 w-5" /> : <IconArrowDown className="h-5 w-5" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-6 sm:px-6 pt-0 border-t border-border/50 bg-muted/10">
                      <div className="mt-6 flex items-center gap-2 mb-4">
                        <IconTargetArrow className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest text-foreground">{t("legs.throw_avgs") || "Throw by Throw"}</span>
                      </div>
                      <div className="rounded-xl border border-border/40 bg-card p-2.5 sm:p-3 overflow-hidden">
                        <div className="grid grid-cols-[minmax(0,3rem)_minmax(0,3rem)_auto_minmax(0,3rem)_minmax(0,3rem)] items-center gap-1 border-b border-border/40 pb-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span className="min-w-0 text-left truncate">{player1Name}</span>
                          <span className="text-center">S</span>
                          <span className="text-center">D</span>
                          <span className="text-center">S</span>
                          <span className="min-w-0 text-right truncate">{player2Name}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {createThrowRows(leg, 501).map(({ throwIndex, p1Throw, p2Throw, p1Before, p2Before, arrowCount }) => {
                            return (
                              <div
                                key={`${legIndex}-visit-${throwIndex}`}
                                className="grid grid-cols-[minmax(0,3rem)_minmax(0,3rem)_auto_minmax(0,3rem)_minmax(0,3rem)] items-center gap-1 rounded-md border border-border/30 bg-muted/10 px-1 py-1"
                              >
                                <div className="rounded px-1 py-0.5 text-center font-headline text-[11px] sm:text-xs font-bold text-muted-foreground bg-background/40">
                                  {p1Before ?? "—"}
                                </div>
                                <div className="rounded px-1 py-0.5 text-center font-headline text-[11px] sm:text-xs font-bold text-foreground bg-muted/30">
                                  {p1Throw ? p1Throw.score : "—"}
                                </div>
                                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                                  {arrowCount}
                                </div>
                                <div className="rounded px-1 py-0.5 text-center font-headline text-[11px] sm:text-xs font-bold text-foreground bg-muted/30">
                                  {p2Throw ? p2Throw.score : "—"}
                                </div>
                                <div className="rounded px-1 py-0.5 text-center font-headline text-[11px] sm:text-xs font-bold text-muted-foreground bg-background/40">
                                  {p2Before ?? "—"}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MatchStatisticsCharts
