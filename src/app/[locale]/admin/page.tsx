"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import Link from "next/link"
import {
  IconUsers,
  IconBuilding,
  IconTrophy,
  IconAlertTriangle,
  IconActivity,
  IconRefresh,
  IconTrendingUp,
  IconTrendingDown,
  IconMessageCircle,
  IconServer,
  IconClock,
  IconCheck
} from "@tabler/icons-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"


import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import { useUserContext } from "@/hooks/useUser"
import { IconPlus, IconCommand } from "@tabler/icons-react"
import { useTranslations, useFormatter } from "next-intl"

// --- Interfaces ---
interface DashboardStats {
  totalUsers: number
  totalClubs: number
  totalTournaments: number
  totalErrors: number
  totalFeedback: number
  newUsersThisMonth: number
  newClubsThisMonth: number
  newTournamentsThisMonth: number
  errorsThisMonth: number
  feedbackThisMonth: number
  userGrowth: number
  clubGrowth: number
  tournamentGrowth: number
  errorGrowth: number
  feedbackGrowth: number
  newUsersLast24h: number
  newClubsLast24h: number
  newTournamentsLast24h: number
  errorsLast24h: number
  feedbackLast24h: number
}

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor: string
    borderColor: string
  }[]
}

interface ActivityItem {
  id: string
  type: "user" | "club" | "tournament" | "auth"
  message: string
  time: string
  highlight?: boolean
}

interface TopApiRoute {
  routeKey: string
  method: string
  count: number
  errorCount: number
  errorRate: number
  avgDurationMs: number
  maxDurationMs: number
  totalTrafficKb: number
}

type TelemetryRange = "24h" | "7d" | "30d" | "90d" | "custom"

// --- Mock Data Helpers (Replace with real API later) ---

export default function AdminDashboardPage() {
  const { user } = useUserContext()
  const t = useTranslations("Admin.dashboard")
  const format = useFormatter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userChartData, setUserChartData] = useState<ChartData | null>(null)
  const [tournamentChartData, setTournamentChartData] = useState<ChartData | null>(null)
  const [apiRequestsChartData, setApiRequestsChartData] = useState<ChartData | null>(null)
  const [apiLatencyChartData, setApiLatencyChartData] = useState<ChartData | null>(null)
  const [apiPayloadChartData, setApiPayloadChartData] = useState<ChartData | null>(null)
  const [topApiRoutes, setTopApiRoutes] = useState<TopApiRoute[]>([])
  const [telemetryRange, setTelemetryRange] = useState<TelemetryRange>("24h")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [telemetryTimezone, setTelemetryTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [alerts, setAlerts] = useState<{ errors24h: number; pendingFeedback: number } | null>(null)

  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true)
      const telemetryParams = new URLSearchParams({
        range: telemetryRange,
        tz: telemetryTimezone,
      })
      if (telemetryRange === "custom" && customStart && customEnd) {
        telemetryParams.set("start", new Date(customStart).toISOString())
        telemetryParams.set("end", new Date(customEnd).toISOString())
      }

      const [
        statsResponse, 
        userChartResponse, 
        tournamentChartResponse,
        apiRequestsResponse,
        apiLatencyResponse,
        apiPayloadResponse,
        topApiRoutesResponse,
        activitiesResponse,
        alertsResponse
      ] = await Promise.all([
        axios.get("/api/admin/stats"),
        axios.get("/api/admin/charts/users"),
        axios.get("/api/admin/charts/tournaments"),
        axios.get(`/api/admin/charts/api-traffic/requests?${telemetryParams.toString()}`),
        axios.get(`/api/admin/charts/api-traffic/latency?${telemetryParams.toString()}`),
        axios.get(`/api/admin/charts/api-traffic/payload?${telemetryParams.toString()}`),
        axios.get(`/api/admin/charts/api-traffic/top-routes?${telemetryParams.toString()}&limit=8`),
        axios.get("/api/admin/activities"),
        axios.get("/api/admin/alerts")
      ])

      setStats(statsResponse.data)
      setActivities(activitiesResponse.data.data)
      setAlerts(alertsResponse.data.data)

      const extractChartData = (response: any): ChartData | null => {
        if (response.data && response.data.success && response.data.data) return response.data.data
        if (response.data && response.data.labels && response.data.datasets) return response.data
        return null
      }

      setUserChartData(extractChartData(userChartResponse))
      setTournamentChartData(extractChartData(tournamentChartResponse))
      setApiRequestsChartData(extractChartData(apiRequestsResponse))
      setApiLatencyChartData(extractChartData(apiLatencyResponse))
      setApiPayloadChartData(extractChartData(apiPayloadResponse))
      setTopApiRoutes(topApiRoutesResponse.data?.data || [])
      setLastUpdate(new Date())
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error)
      toast.error(error.response?.data?.error || t("error_loading"))
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (telemetryRange === "custom") return
    fetchDashboardData()
  }, [telemetryRange, telemetryTimezone])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">{t("loading")}</p>
        </div>
      </div>
    )
  }

  if (!stats) return null 

  // --- Sub-components ---

  const MiniStatCard = ({ title, value, change, icon: Icon, colorClass, count24h }: any) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow backdrop-blur-sm bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold font-mono tabular-nums">{format.number(value)}</h3>
              <span className={cn("text-xs font-medium flex items-center", change >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {change >= 0 ? <IconTrendingUp className="size-3 mr-0.5" /> : <IconTrendingDown className="size-3 mr-0.5" />}
                {change}%
              </span>
            </div>
            {count24h !== undefined && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <IconClock className="size-3" />
                <span>{t("stats.last_24h", { count: count24h })}</span>
              </div>
            )}
          </div>
          <div className={cn("p-2 rounded-lg opacity-80", colorClass)}>
            <Icon className="size-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const ActivityFeed = () => (
    <Card className="h-full flex flex-col backdrop-blur-sm bg-card/50">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <IconActivity className="size-4 text-primary" />
          {t("activities.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto min-h-[300px] max-h-[400px]">
        {activities.length > 0 ? (
          <div className="divide-y divide-border/50">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start gap-3 text-sm group">
                <div className={cn("mt-1.5 size-2 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-card transition-all group-hover:scale-110", 
                  activity.type === 'user' || activity.type === 'auth' ? 'bg-blue-500 ring-blue-500/20' : 
                  activity.type === 'tournament' ? 'bg-amber-500 ring-amber-500/20' : 
                  activity.type === 'club' ? 'bg-violet-500 ring-violet-500/20' : 'bg-slate-500 ring-slate-500/20'
                )} />
                <div className="flex-1 space-y-1">
                  <p className="font-medium leading-snug">{activity.message}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <IconClock className="size-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm flex-col gap-2">
            <IconActivity className="size-8 opacity-20" />
            <p>{t("activities.no_data")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const CriticalAlerts = () => (
    <Card className="h-full border-l-4 border-l-rose-500 backdrop-blur-sm bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-rose-500">
          <IconAlertTriangle className="size-4" />
          {t("alerts.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-md">
              <IconServer className="size-5 text-rose-500" />
            </div>
            <div>
              <p className="font-semibold text-rose-600 dark:text-rose-400 text-sm">{t("alerts.errors")}</p>
              <p className="text-xs text-rose-600/70 dark:text-rose-400/70">{t("alerts.errors_desc")}</p>
            </div>
          </div>
          <Badge variant="destructive" className="text-lg font-mono ml-4">{alerts?.errors24h || 0}</Badge>
        </div>
        
        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-md">
              <IconMessageCircle className="size-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-amber-600 dark:text-amber-400 text-sm">{t("alerts.feedback")}</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">{t("alerts.feedback_desc")}</p>
            </div>
          </div>
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-lg font-mono ml-4">{alerts?.pendingFeedback || 0}</Badge>
        </div>
      </CardContent>
    </Card>
  )

  const SimpleChart = ({ title, data, color }: any) => {
    const chartData = data && data.datasets
      ? data.labels.map((label: any, index: any) => {
          const point: Record<string, any> = { name: label }
          data.datasets.forEach((dataset: any, datasetIndex: number) => {
            point[`d${datasetIndex}`] = dataset.data[index] ?? 0
          })
          return point
        })
      : []

    const safeGradientId = title.replace(/[^a-zA-Z0-9_-]/g, "_")

    return (
      <Card className="backdrop-blur-sm bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${safeGradientId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: color }}
                />
                {data?.datasets?.map((dataset: any, datasetIndex: number) => (
                  <Area
                    key={`${title}-${dataset.label}-${datasetIndex}`}
                    type="monotone"
                    dataKey={`d${datasetIndex}`}
                    stroke={dataset.borderColor || color}
                    strokeWidth={datasetIndex === 0 ? 2 : 1.5}
                    strokeDasharray={datasetIndex === 0 ? undefined : "5 5"}
                    fillOpacity={datasetIndex === 0 ? 1 : 0}
                    fill={datasetIndex === 0 ? `url(#gradient-${safeGradientId})` : "transparent"}
                    name={dataset.label}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  const ApiTopRoutesCard = () => (
    <Card className="backdrop-blur-sm bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Top API route-ok ({telemetryRange === "custom" ? "egyedi intervallum" : telemetryRange})</CardTitle>
        <CardDescription>Leggyakoribb és legnehezebb útvonalak</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {topApiRoutes.length > 0 ? (
            topApiRoutes.map((row, idx) => (
              <div key={`${row.method}-${row.routeKey}-${idx}`} className="rounded-lg border border-border/50 p-3 bg-muted/20">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <code className="text-xs">{row.method} {row.routeKey}</code>
                  <Badge variant={row.errorRate > 0 ? "destructive" : "secondary"}>{row.errorRate}% err</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                  <span>{row.count} hívás</span>
                  <span>avg {row.avgDurationMs}ms</span>
                  <span>max {row.maxDurationMs}ms</span>
                  <span>{row.totalTrafficKb} KB</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nincs még API telemetry adat.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )

  // --- Sub-components (Chart wrappers) ---

  const telemetryRangeOptions: Array<{ value: TelemetryRange; label: string }> = [
    { value: "24h", label: "Utolsó 24 óra" },
    { value: "7d", label: "Utolsó 7 nap" },
    { value: "30d", label: "Utolsó 30 nap" },
    { value: "90d", label: "Utolsó 90 nap" },
    { value: "custom", label: "Egyedi intervallum" },
  ]

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 sticky top-0 z-10 bg-background/80 backdrop-blur-xl py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-border/40 mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            {t("title", { name: user?.name?.split(" ")[0] || user?.username || "Admin" })}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {t("system_stable")}
            <span className="hidden sm:inline-block opacity-50">|</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-muted/50 px-2 py-0.5 rounded border border-border/50">
              <IconCommand className="size-3" /> K
              <span className="opacity-70">{t("search_hint")}</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs bg-muted/50 px-2 py-0.5 rounded border border-border/50">
              <IconCommand className="size-3" /> J
              <span className="opacity-70">{t("menu_hint")}</span>
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full xl:w-auto">
           {/* Quick Action Buttons */}
           <div className="flex items-center gap-2 flex-1 xl:flex-none">
             <Button size="sm" className="hidden sm:flex" variant="outline" asChild>
                <Link href="/admin/announcements">
                  <IconMessageCircle className="size-4 mr-2" />
                  {t("quick_access.new_post")}
                </Link>
             </Button>
             <Button size="sm" className="w-full sm:w-auto" asChild>
                <Link href="/admin/tournaments">
                  <IconPlus className="size-4 mr-2" />
                  {t("quick_access.create_tournament")}
                </Link>
             </Button>
           </div>

          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50 shrink-0">
            <span className="text-xs text-muted-foreground px-2 py-1 font-mono hidden sm:inline-block">
              {format.dateTime(lastUpdate, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <Button size="sm" variant="ghost" onClick={fetchDashboardData} disabled={isRefreshing} className="h-8 w-8 p-0">
              <IconRefresh className={cn("size-4", isRefreshing && "animate-spin")} />
              <span className="sr-only">{t("refresh")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStatCard 
          title={t("stats.users")} 
          value={stats?.totalUsers || 0} 
          change={stats?.userGrowth || 0} 
          count24h={stats?.newUsersLast24h}
          icon={IconUsers}
          colorClass="bg-blue-500"
        />
        <MiniStatCard 
          title={t("stats.clubs")} 
          value={stats?.totalClubs || 0} 
          change={stats?.clubGrowth || 0} 
          count24h={stats?.newClubsLast24h}
          icon={IconBuilding}
          colorClass="bg-violet-500"
        />
        <MiniStatCard 
          title={t("stats.tournaments")} 
          value={stats?.totalTournaments || 0} 
          change={stats?.tournamentGrowth || 0} 
          count24h={stats?.newTournamentsLast24h}
          icon={IconTrophy}
          colorClass="bg-amber-500"
        />
        <MiniStatCard 
          title={t("stats.errors")} 
          value={stats?.totalErrors || 0} 
          change={stats?.errorGrowth || 0} 
          count24h={stats?.errorsLast24h}
          icon={IconAlertTriangle}
          colorClass="bg-rose-500"
        />
      </div>

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column: Activity Feed & Alerts */}
        <div className="space-y-6 xl:col-span-1">
          <div className="h-auto">
            <CriticalAlerts />
          </div>
          <div className="h-auto">
            <ActivityFeed />
          </div>
        </div>

        {/* Right Column: Key Charts */}
        <div className="space-y-6 xl:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SimpleChart title={t("charts.users")} data={userChartData} color="#3b82f6" />
            <SimpleChart title={t("charts.tournaments")} data={tournamentChartData} color="#f59e0b" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SimpleChart title="API hívások" data={apiRequestsChartData} color="#6366f1" />
            <SimpleChart title="API átlag késleltetés (ms)" data={apiLatencyChartData} color="#f97316" />
            <SimpleChart title="API payload (KB)" data={apiPayloadChartData} color="#10b981" />
          </div>

          <Card className="backdrop-blur-sm bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">API telemetry szűrők</CardTitle>
              <CardDescription>Időtartomány + időzóna beállítások, valamint egyedi intervallum elemzés</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                value={telemetryRange}
                onChange={(e) => setTelemetryRange(e.target.value as TelemetryRange)}
                className="border border-border bg-background rounded px-3 py-2 text-sm"
              >
                {telemetryRangeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={telemetryTimezone}
                onChange={(e) => setTelemetryTimezone(e.target.value)}
                className="border border-border bg-background rounded px-3 py-2 text-sm"
              >
                <option value="UTC">UTC</option>
                <option value="Europe/Budapest">Europe/Budapest</option>
                <option value="Europe/Berlin">Europe/Berlin</option>
                <option value="America/New_York">America/New_York</option>
              </select>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                disabled={telemetryRange !== "custom"}
                className="border border-border bg-background rounded px-3 py-2 text-sm disabled:opacity-50"
              />
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  disabled={telemetryRange !== "custom"}
                  className="border border-border bg-background rounded px-3 py-2 text-sm disabled:opacity-50 flex-1"
                />
                <Button
                  type="button"
                  disabled={telemetryRange !== "custom" || !customStart || !customEnd || isRefreshing}
                  onClick={() => fetchDashboardData()}
                >
                  Alkalmaz
                </Button>
              </div>
            </CardContent>
          </Card>

          <ApiTopRoutesCard />
          
          <Card className="backdrop-blur-sm bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t("quick_access.title")}</CardTitle>
              <CardDescription>{t("quick_access.desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <Link href="/admin/users" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 hover:bg-muted hover:scale-105 transition-all text-center gap-2 border border-transparent hover:border-primary/20">
                  <div className="p-2 rounded-full bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                     <IconUsers className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">{t("quick_access.users")}</span>
                </Link>
                <Link href="/admin/tournaments" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 hover:bg-muted hover:scale-105 transition-all text-center gap-2 border border-transparent hover:border-primary/20">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                     <IconTrophy className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">{t("quick_access.tournaments")}</span>
                </Link>
                <Link href="/admin/clubs" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 hover:bg-muted hover:scale-105 transition-all text-center gap-2 border border-transparent hover:border-primary/20">
                  <div className="p-2 rounded-full bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                     <IconBuilding className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">{t("quick_access.clubs")}</span>
                </Link>
                <Link href="/admin/todos" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 hover:bg-muted hover:scale-105 transition-all text-center gap-2 border border-transparent hover:border-primary/20">
                   <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                     <IconCheck className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">{t("quick_access.todos")}</span>
                </Link>
                <Link href="/admin/announcements" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 hover:bg-muted hover:scale-105 transition-all text-center gap-2 border border-transparent hover:border-primary/20">
                   <div className="p-2 rounded-full bg-pink-500/10 text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                     <IconMessageCircle className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">{t("quick_access.news")}</span>
                </Link>
                <Link href="/admin/settings" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-muted/30 hover:bg-muted hover:scale-105 transition-all text-center gap-2 border border-transparent hover:border-primary/20">
                   <div className="p-2 rounded-full bg-slate-500/10 text-slate-500 group-hover:bg-slate-500 group-hover:text-white transition-colors">
                     <IconServer className="size-5" />
                  </div>
                  <span className="text-xs font-semibold">{t("quick_access.settings")}</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
