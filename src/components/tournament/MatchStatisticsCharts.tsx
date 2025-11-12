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
  IconArrowRight,
  IconArrowUp,
  IconChartLine,
  IconInfoCircle,
  IconSparkles,
  IconTarget,
  IconTargetArrow,
  IconTrendingDown,
} from "@tabler/icons-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Tooltip as UiTooltip,
  TooltipContent as UiTooltipContent,
  TooltipProvider as UiTooltipProvider,
  TooltipTrigger as UiTooltipTrigger,
} from "@/components/ui/tooltip"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

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
        color: "rgba(255,255,255,0.75)",
        font: { size: 11 },
        boxWidth: 10,
        boxHeight: 10,
      },
    },
    title: { display: false },
    tooltip: {
      backgroundColor: "rgba(12,12,15,0.92)",
      borderColor: "rgba(255,255,255,0.08)",
      borderWidth: 1,
      titleFont: { size: 12, weight: "600" },
      bodyFont: { size: 11 },
      padding: 10,
    },
  },
  scales: {
    x: {
      ticks: { color: "rgba(255,255,255,0.55)", font: { size: 10 } },
      grid: { color: "rgba(255,255,255,0.08)" },
    },
    y: {
      ticks: { color: "rgba(255,255,255,0.55)", font: { size: 10 } },
      grid: { color: "rgba(255,255,255,0.08)" },
    },
  },
  elements: {
    point: {
      radius: 3,
      hoverRadius: 5,
    },
    line: {
      borderWidth: 2,
      tension: 0.3,
    },
  },
}

const MatchStatisticsCharts: React.FC<MatchStatisticsChartsProps> = ({ legs, player1Name, player2Name }) => {
  const [activeTab, setActiveTab] = useState<"overview" | "legs">("overview")
  const [expandedLegs, setExpandedLegs] = useState<Set<number>>(new Set())

  const legAverages = useMemo(
    () =>
      legs.map((leg) => ({
        player1Average: calculateLegAverage(leg.player1Throws),
        player2Average: calculateLegAverage(leg.player2Throws),
      })),
    [legs]
  )

  const cumulative = useMemo(() => calculateCumulativeAverages(legs), [legs])

  const overviewChartData = useMemo(
    () => ({
      labels: legs.map((_, index) => `${index + 1}. leg`),
      datasets: [
        {
          label: player1Name,
          data: legAverages.map((leg) => leg.player1Average),
          borderColor: "rgb(245,99,99)",
          backgroundColor: "rgba(245,99,99,0.25)",
          fill: "origin",
        },
        {
          label: player2Name,
          data: legAverages.map((leg) => leg.player2Average),
          borderColor: "rgb(93,160,255)",
          backgroundColor: "rgba(93,160,255,0.25)",
          fill: "origin",
        },
      ],
    }),
    [legAverages, legs, player1Name, player2Name]
  )

  const cumulativeChartData = useMemo(
    () => ({
      labels: legs.map((_, index) => `${index + 1}. leg`),
      datasets: [
        {
          label: `${player1Name} (futó átlag)`,
          data: cumulative.player1,
          borderColor: "rgb(247,147,30)",
          backgroundColor: "rgba(247,147,30,0.2)",
          fill: false,
        },
        {
          label: `${player2Name} (futó átlag)`,
          data: cumulative.player2,
          borderColor: "rgb(112,255,195)",
          backgroundColor: "rgba(112,255,195,0.2)",
          fill: false,
        },
      ],
    }),
    [cumulative, legs, player1Name, player2Name]
  )

  const latestPlayer1Average = cumulative.player1.at(-1) ?? 0
  const latestPlayer2Average = cumulative.player2.at(-1) ?? 0
  const bestLegPlayer1 = legAverages.length ? Math.max(...legAverages.map((leg) => leg.player1Average)) : 0
  const bestLegPlayer2 = legAverages.length ? Math.max(...legAverages.map((leg) => leg.player2Average)) : 0

  const player1Trend = legAverages.length
    ? legAverages[legAverages.length - 1].player1Average - (legAverages[legAverages.length - 2]?.player1Average ?? 0)
    : 0
  const player2Trend = legAverages.length
    ? legAverages[legAverages.length - 1].player2Average - (legAverages[legAverages.length - 2]?.player2Average ?? 0)
    : 0

  const toggleLeg = (index: number) => {
    setExpandedLegs((prev) => {
      const clone = new Set(prev)
      if (clone.has(index)) {
        clone.delete(index)
      } else {
        clone.add(index)
      }
      return clone
    })
  }

  return (
    <UiTooltipProvider>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "overview" | "legs")} className="space-y-4">
        <TabsList className="flex w-full items-center justify-start gap-2 overflow-x-auto rounded-full bg-muted/15 p-1 backdrop-blur">
          <TabsTrigger value="overview" className="flex items-center gap-2 rounded-full px-5 py-1.5 text-sm font-semibold">
            <IconChartLine className="h-4 w-4" />
            Összesítő
          </TabsTrigger>
          <TabsTrigger value="legs" className="flex items-center gap-2 rounded-full px-5 py-1.5 text-sm font-semibold">
            <IconTarget className="h-4 w-4" />
            Legek
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <PlayerSummaryCard
              label={player1Name}
              role="P1"
              average={latestPlayer1Average}
              bestLeg={bestLegPlayer1}
              trend={player1Trend}
              surfaceClass="bg-[#3d0c16] border border-[#611827] shadow-[8px_10px_0px_-6px_rgba(15,0,0,0.5)]"
              metricBgClass="bg-[#57101c]"
            />
            <PlayerSummaryCard
              label={player2Name}
              role="P2"
              average={latestPlayer2Average}
              bestLeg={bestLegPlayer2}
              trend={player2Trend}
              surfaceClass="bg-[#3d0c16] border border-[#611827] shadow-[8px_10px_0px_-6px_rgba(15,0,0,0.5)]"
              metricBgClass="bg-[#57101c]"
            />
          </div>

          <Card className="border-0 bg-card/90 shadow-[8px_9px_0px_-4px_rgba(0,0,0,0.45)]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <IconSparkles className="h-5 w-5 text-[oklch(76%_0.18_25)]" />
                Legenkénti átlagok
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Hasonlítsd össze a játékosok teljesítményét minden legben.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-64 w-full rounded-2xl border border-white/5 bg-gradient-to-br from-white/4 to-transparent p-4">
                <Line options={chartOptions} data={overviewChartData} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <IconInfoCircle className="h-4 w-4" />
                A színezett területek a stabil, magas átlagokat mutatják — ha egy játékos görbéje felfelé ível, az erős formát jelent.
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/90 shadow-[8px_9px_0px_-4px_rgba(0,0,0,0.45)]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <IconTrendingDown className="h-5 w-5 text-[oklch(70%_0.12_250)]" />
                Futó meccsátlag alakulása
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                A meccs előrehaladtával hogyan változott a játékosok összesített 3-nyilas átlaga.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-64 w-full rounded-2xl border border-white/5 bg-gradient-to-br from-white/4 to-transparent p-4">
                <Line options={chartOptions} data={cumulativeChartData} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <IconInfoCircle className="h-4 w-4" />
                Az 50 feletti átlag folyamatos tartása kiemelkedő teljesítményt jelent — figyeld, hol indult el a trend meredekebben.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legs" className="space-y-4">
          {legs.length === 0 ? (
            <Card className="border border-dashed border-white/10 bg-card/80 text-center shadow-inner shadow-black/20">
              <CardContent className="py-12 text-sm text-muted-foreground">Még nincs rögzített statisztika ehhez a meccshez.</CardContent>
            </Card>
          ) : null}

          {legs.map((leg, index) => {
            const isExpanded = expandedLegs.has(index)
            const player1Stats = calculateLegStats(leg.player1Throws)
            const player2Stats = calculateLegStats(leg.player2Throws)
            const player1Running = calculateThrowAverages(leg.player1Throws)
            const player2Running = calculateThrowAverages(leg.player2Throws)

            return (
              <Card
                key={`${leg.createdAt}-${index}`}
                className="overflow-hidden border-0 bg-card/92 shadow-[10px_11px_0px_-5px_rgba(0,0,0,0.45)] transition hover:shadow-[12px_14px_0px_-5px_rgba(0,0,0,0.45)]"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[oklch(70%_0.17_23)] via-[oklch(64%_0.2_40)] to-[oklch(72%_0.09_300)]" />
                <CardHeader className="pb-3 pt-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent text-base font-semibold text-primary backdrop-blur">
                          {index + 1}
                        </span>
                        <div className="flex flex-col gap-1">
                          <CardTitle className="text-base font-semibold text-foreground">
                            {leg.winnerId?.name ? `${leg.winnerId.name} nyert` : `${index + 1}. leg`}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                            {leg.checkoutScore ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-200">
                                <IconTargetArrow className="h-3.5 w-3.5" />
                                Checkout {leg.checkoutScore}
                              </span>
                            ) : null}
                            {typeof leg.winnerArrowCount === "number" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 text-sky-200">
                                <IconTarget className="h-3.5 w-3.5" />
                                {leg.winnerArrowCount} nyíl
                              </span>
                            ) : null}
                            {typeof leg.loserRemainingScore === "number" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-amber-200">
                                <IconTrendingDown className="h-3.5 w-3.5" />
                                Vesztes: {leg.loserRemainingScore} pont
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 rounded-full border border-white/10 px-4 py-1 text-xs font-semibold"
                      onClick={() => toggleLeg(index)}
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

                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <LegSummaryCard
                      name={player1Name}
                      average={player1Stats.average}
                      highest={player1Stats.highest}
                      oneEighties={player1Stats.oneEighties}
                      variant="primary"
                    />
                    <LegSummaryCard
                      name={player2Name}
                      average={player2Stats.average}
                      highest={player2Stats.highest}
                      oneEighties={player2Stats.oneEighties}
                      variant="secondary"
                    />
                  </div>

                  {isExpanded ? (
                    <div className="space-y-4 rounded-2xl border border-white/5 bg-black/10 p-4 backdrop-blur">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <ThrowsTimeline
                          title={`${player1Name} dobásai`}
                          throws={leg.player1Throws}
                          runningAverages={player1Running}
                          gradient="from-[oklch(58%_0.2_23)/0.18] to-transparent"
                        />
                        <ThrowsTimeline
                          title={`${player2Name} dobásai`}
                          throws={leg.player2Throws}
                          runningAverages={leg.player2Throws.length ? player2Running : []}
                          gradient="from-[oklch(56%_0.19_305)/0.2] to-transparent"
                        />
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>
    </UiTooltipProvider>
  )
}

interface PlayerSummaryCardProps {
  label: string
  role: string
  average: number
  bestLeg: number
  trend: number
  surfaceClass: string
  metricBgClass: string
}

const PlayerSummaryCard: React.FC<PlayerSummaryCardProps> = ({ label, role, average, bestLeg, trend, surfaceClass, metricBgClass }) => {
  const trendPositive = trend >= 0
  const trendMagnitude = Math.abs(trend)
  const trendIcon = trendPositive ? IconArrowUp : IconArrowDown

  const stability = (() => {
    if (trendMagnitude < 1) {
      return { label: "Stabil forma", tone: "text-[#fcd7a1]" }
    }
    if (trendPositive) {
      return { label: "Erősödő forma", tone: "text-[#39b778]" }
    }
    return { label: "Gyengülő forma", tone: "text-[#f59f3a]" }
  })()

  return (
    <div className={cn("relative overflow-hidden rounded-3xl text-white", surfaceClass)}>
      <div className="relative flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#57101c] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f9d7de]">
              <span>{role}</span>
              <span className="inline-flex h-1.5 w-1.5 items-center justify-center rounded-full bg-[#f64c6b]" />
              <span className="tracking-tight text-white">{label}</span>
            </div>
            <p className={cn("text-sm font-medium", stability.tone)}>{stability.label}</p>
          </div>
          <Badge variant="outline" className="rounded-full border-[#f64c6b]/40 bg-[#611827] px-3 py-1 text-[11px] text-[#f8b4c0]">
            Átlag
          </Badge>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#f5a3b1]">Futó meccsátlag</p>
            <p className="text-3xl font-black text-white">{average.toFixed(1)}</p>
          </div>
          <UiTooltip>
            <UiTooltipTrigger asChild>
              <div className="flex items-center gap-2 rounded-full bg-[#611827] px-3 py-1.5 text-xs text-[#f9d7de]">
                {React.createElement(trendIcon, { className: cn("h-4 w-4", trendPositive ? "text-[#39b778]" : "text-[#f59f3a]") })}
                <span>{trendMagnitude.toFixed(1)} pont</span>
              </div>
            </UiTooltipTrigger>
            <UiTooltipContent side="top">Az utolsó leg átlagának eltérése az előző leghez képest.</UiTooltipContent>
          </UiTooltip>
        </div>

        <Separator className="bg-[#7a1f30]" />

        <div className="grid grid-cols-2 gap-3 text-xs font-medium">
          <div className={cn("relative overflow-hidden rounded-2xl px-3 py-3 shadow-inner shadow-black/40", metricBgClass)}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#f5a3b1]">Leg legjobb átlag</p>
            <p className="mt-1 text-lg font-semibold text-white">{bestLeg.toFixed(1)}</p>
          </div>
          <div className={cn("relative overflow-hidden rounded-2xl px-3 py-3 shadow-inner shadow-black/40", metricBgClass)}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#f5a3b1]">Stabilitás</p>
            <div className="mt-1 flex items-center gap-1 text-sm text-[#f8b4c0]">
              <IconSparkles className="h-4 w-4 text-[#f59f3a]" />
              <span className={stability.tone}>{stability.label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface LegSummaryCardProps {
  name: string
  average: number
  highest: number
  oneEighties: number
  variant: "primary" | "secondary"
}

const LegSummaryCard: React.FC<LegSummaryCardProps> = ({ name, average, highest, oneEighties, variant }) => {
  const palette =
    variant === "primary"
      ? {
          baseBg: "bg-[#3d0c16] border border-[#611827]",
          accent: "text-[#f8b4c0]",
        }
      : {
          baseBg: "bg-[#440d1a] border border-[#611827]",
          accent: "text-[#fbd1d9]",
        }

  return (
    <div className={cn("relative overflow-hidden rounded-2xl shadow-[8px_10px_0px_-6px_rgba(15,0,0,0.45)] backdrop-blur", palette.baseBg)}>
      <CardContent className="relative space-y-3 p-4 text-white">
        <div className="flex items-center justify-between">
          <span className={cn("text-sm font-semibold", palette.accent)}>{name}</span>
          <Badge variant="outline" className="rounded-full border-[#f64c6b]/30 bg-[#57101c] px-2 py-0.5 text-[10px] uppercase text-[#f8b4c0]">
            Leg stat
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <SummaryBubble label="Átlag" value={average.toFixed(1)} tone="bg-[#57101c]" valueTone="text-[#f9d7de]" labelTone="text-[#f5a3b1]" />
          <SummaryBubble label="Max dobás" value={highest} tone="bg-[#611827]" valueTone="text-[#fbd1d9]" labelTone="text-[#f5a3b1]" />
          <SummaryBubble label="180-ak" value={oneEighties} tone="bg-[#7a1f2d]" valueTone="text-[#fcd7a1]" labelTone="text-[#f5a3b1]" />
        </div>
      </CardContent>
    </div>
  )
}

interface ThrowsTimelineProps {
  title: string
  throws: Throw[]
  runningAverages: number[]
  gradient: string
}

const ThrowsTimeline: React.FC<ThrowsTimelineProps> = ({ title, throws, runningAverages, gradient }) => {
  if (!throws.length) {
    return (
      <Card className="border border-dashed border-white/10 bg-card/70">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">Nem érkezett dobás adat ennél a legnél.</CardContent>
      </Card>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/95 shadow-inner shadow-black/30">
      <div className={cn("absolute inset-0 opacity-90", `bg-gradient-to-br ${gradient}`)} />
      <div className="relative p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{title}</p>
            <p className="text-[11px] text-white/50">Dobásonkénti 3-nyilas átlag</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-white">
          {throws.map((throwData, idx) => {
            const runningAverage = runningAverages[idx]
            return (
              <React.Fragment key={`${title}-throw-${idx}`}>
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "inline-flex min-w-[48px] items-center justify-center rounded-lg px-2 py-1 backdrop-blur",
                      throwData.score === 180
                        ? "bg-[#f59f3a]/30 text-[#fcd7a1]"
                        : throwData.isCheckout
                          ? "bg-[#39b778]/25 text-[#c3f0d6]"
                          : throwData.score === 0
                            ? "bg-[#ab1f3b]/35 text-[#ffd9e0]"
                            : "bg-[#57101c] text-[#f9d7de]"
                    )}
                    title={`${throwData.score} pont (${throwData.darts} nyíl)`}
                  >
                    {throwData.score}
                  </span>
                  {typeof runningAverage === "number" ? (
                    <span className="text-[10px] font-medium text-white/65">({runningAverage.toFixed(1)})</span>
                  ) : null}
                </div>
                {idx < throws.length - 1 && <IconArrowRight className="h-3.5 w-3.5 text-white/45" />}
              </React.Fragment>
            )
          })}
        </div>

        <Separator className="my-3 bg-white/10" />

        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-white">
          {runningAverages.map((avg, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-[#29101b]/80 px-2 py-1 backdrop-blur">
              <IconSparkles className="h-3 w-3 text-amber-200" />
              {avg.toFixed(1)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

interface SummaryBubbleProps {
  label: string
  value: string | number
  tone: string
  valueTone?: string
  labelTone?: string
}

const SummaryBubble: React.FC<SummaryBubbleProps> = ({ label, value, tone, valueTone = "text-white", labelTone = "text-[#f5a3b1]" }) => {
  return (
    <div className={cn("rounded-xl px-3 py-3 shadow-inner shadow-black/30", tone)}>
      <p className={cn("text-sm font-semibold", valueTone)}>{value}</p>
      <p className={cn("text-[11px] uppercase tracking-[0.2em]", labelTone)}>{label}</p>
    </div>
  )
}

const calculateLegAverage = (throws: Throw[]) => {
  if (!throws.length) return 0
  const totalScore = throws.reduce((sum, item) => sum + item.score, 0)
  return Math.round((totalScore / throws.length) * 100) / 100
}

const calculateThrowAverages = (throws: Throw[]) => {
  let running = 0
  return throws.map((item, index) => {
    running += item.score
    return Math.round((running / (index + 1)) * 100) / 100
  })
}

const calculateLegStats = (throws: Throw[]) => {
  if (!throws.length) return { average: 0, highest: 0, oneEighties: 0 }
  const average = calculateLegAverage(throws)
  const highest = Math.max(...throws.map((t) => t.score))
  const oneEighties = throws.filter((t) => t.score === 180).length
  return { average, highest, oneEighties }
}

const calculateCumulativeAverages = (legs: Leg[]) => {
  let player1Score = 0
  let player1Throws = 0
  let player2Score = 0
  let player2Throws = 0

  const player1 = legs.map((leg) => {
    leg.player1Throws.forEach((throwData) => {
      player1Score += throwData.score
      player1Throws += 1
    })
    return player1Throws > 0 ? Math.round((player1Score / player1Throws) * 100) / 100 : 0
  })

  const player2 = legs.map((leg) => {
    leg.player2Throws.forEach((throwData) => {
      player2Score += throwData.score
      player2Throws += 1
    })
    return player2Throws > 0 ? Math.round((player2Score / player2Throws) * 100) / 100 : 0
  })

  return { player1, player2 }
}

export default MatchStatisticsCharts
