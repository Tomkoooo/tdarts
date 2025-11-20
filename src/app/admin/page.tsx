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
  IconChartBar,
  IconArrowRight,
  IconSpeakerphone,
  IconCheck,
  IconBug,
  IconServer,
} from "@tabler/icons-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userChartData, setUserChartData] = useState<ChartData | null>(null)
  const [clubChartData, setClubChartData] = useState<ChartData | null>(null)
  const [tournamentChartData, setTournamentChartData] = useState<ChartData | null>(null)
  const [errorChartData, setErrorChartData] = useState<ChartData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchDashboardData = async () => {
    try {
      setIsRefreshing(true)
      const [statsResponse, userChartResponse, clubChartResponse, tournamentChartResponse, errorChartResponse] = await Promise.all([
        axios.get("/api/admin/stats"),
        axios.get("/api/admin/charts/users"),
        axios.get("/api/admin/charts/clubs"),
        axios.get("/api/admin/charts/tournaments"),
        axios.get("/api/admin/charts/errors"),
      ])

      setStats(statsResponse.data)

      const extractChartData = (response: any): ChartData | null => {
        if (response.data && response.data.success && response.data.data) {
          return response.data.data
        }
        if (response.data && response.data.labels && response.data.datasets) {
          return response.data
        }
        return null
      }

      setUserChartData(extractChartData(userChartResponse))
      setClubChartData(extractChartData(clubChartResponse))
      setTournamentChartData(extractChartData(tournamentChartResponse))
      setErrorChartData(extractChartData(errorChartResponse))

      setLastUpdate(new Date())
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error)
      toast.error(error.response?.data?.error || "Hiba történt az adatok betöltése során")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <p className="text-sm text-muted-foreground">Admin adatok betöltése…</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="size-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <IconAlertTriangle className="size-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Hiba történt</h2>
            <p className="text-muted-foreground">Nem sikerült betölteni a dashboard adatokat.</p>
          </div>
          <Button onClick={fetchDashboardData} className="gap-2">
            <IconRefresh className="size-5" />
            Újrapróbálás
          </Button>
        </div>
      </div>
    )
  }

  const HeroStatCard = ({
    title,
    value,
    change,
    icon: Icon,
    color = "primary",
    monthlyValue,
    monthlyLabel,
  }: {
    title: string
    value: number
    change: number
    icon: any
    color?: "primary" | "success" | "warning" | "error" | "info"
    monthlyValue?: number
    monthlyLabel?: string
  }) => {
    const iconColorClasses = {
      primary: "text-primary",
      success: "text-success",
      warning: "text-warning",
      error: "text-destructive",
      info: "text-info",
    }

    return (
      <Card elevation="elevated" className="relative overflow-hidden backdrop-blur-xl bg-card/30">
        <CardContent className="relative z-10 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={cn("p-3 rounded-xl backdrop-blur-md bg-card/40")}>
              <Icon className={cn("size-7", iconColorClasses[color])} />
            </div>
            <div className="flex items-center gap-2">
              {change >= 0 ? (
                <IconTrendingUp className="size-5 text-success" />
              ) : (
                <IconTrendingDown className="size-5 text-destructive" />
              )}
              <span className={cn("text-sm font-bold", change >= 0 ? "text-success" : "text-destructive")}>
                {change >= 0 ? "+" : ""}
                {change}%
              </span>
            </div>
          </div>

          <h3 className="text-sm font-medium text-muted-foreground mb-2">{title}</h3>

          <p className="text-4xl font-bold text-foreground mb-4 tabular-nums">{value.toLocaleString()}</p>

          {monthlyValue !== undefined && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-muted-foreground">{monthlyLabel}</span>
              <span className={cn("text-sm font-bold", iconColorClasses[color])}>+{monthlyValue}</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const ModernChartCard = ({
    title,
    data,
    color = "primary",
    type = "area",
  }: {
    title: string
    data: ChartData | null
    color?: "primary" | "success" | "warning" | "error" | "info"
    type?: "area" | "bar"
  }) => {
    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="backdrop-blur-xl bg-card/40 rounded-lg p-3 shadow-xl">
            <p className="text-sm font-medium text-foreground mb-1">{label}</p>
            <p className="text-lg font-bold text-primary">{payload[0].value}</p>
          </div>
        )
      }
      return null
    }

    const chartData =
      data && data.datasets && data.datasets[0] && data.datasets[0].data
        ? data.labels.map((label, index) => ({
            month: label,
            count: data.datasets[0].data[index] || 0,
          }))
        : []

    const getChartColors = () => {
      switch (color) {
        case "error":
          return { stroke: "#ef4444", gradient: "rgba(239, 68, 68, 0.3)", fill: "rgba(239, 68, 68, 0.1)" }
        case "warning":
          return { stroke: "#f59e0b", gradient: "rgba(245, 158, 11, 0.3)", fill: "rgba(245, 158, 11, 0.1)" }
        case "success":
          return { stroke: "#10b981", gradient: "rgba(16, 185, 129, 0.3)", fill: "rgba(16, 185, 129, 0.1)" }
        case "info":
          return { stroke: "#3b82f6", gradient: "rgba(59, 130, 246, 0.3)", fill: "rgba(59, 130, 246, 0.1)" }
        default:
          return { stroke: "hsl(var(--primary))", gradient: "rgba(59, 130, 246, 0.3)", fill: "rgba(59, 130, 246, 0.1)" }
      }
    }

    const chartColors = getChartColors()

    return (
      <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconChartBar className="size-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {type === "area" ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColors.gradient} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={chartColors.fill} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" vertical={false} />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "rgba(156, 163, 175, 0.8)" }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "rgba(156, 163, 175, 0.8)" }}
                    />

                    <Tooltip content={<CustomTooltip />} />

                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={chartColors.stroke}
                      strokeWidth={3}
                      fill={`url(#gradient-${title})`}
                      dot={{ fill: chartColors.stroke, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: chartColors.stroke, strokeWidth: 2 }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" vertical={false} />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "rgba(156, 163, 175, 0.8)" }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "rgba(156, 163, 175, 0.8)" }}
                    />

                    <Tooltip content={<CustomTooltip />} />

                    <Bar dataKey="count" fill={chartColors.stroke} radius={[8, 8, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <IconChartBar className="size-8 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground text-sm">Nincs megjeleníthető adat</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const QuickActionCard = ({
    title,
    description,
    icon: Icon,
    href,
  }: {
    title: string
    description: string
    icon: any
    href: string
  }) => {
    return (
      <Link href={href} className="group">
        <Card
          elevation="elevated"
          className="relative overflow-hidden backdrop-blur-xl bg-card/30 transition-all duration-300 hover:scale-[1.02]"
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg backdrop-blur-md bg-card/40 group-hover:scale-110 transition-transform duration-300">
                <Icon className="size-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground mb-1 truncate">{title}</h4>
                <p className="text-sm text-muted-foreground truncate">{description}</p>
              </div>
              <IconArrowRight className="size-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <Card
        elevation="elevated"
        className="relative overflow-hidden backdrop-blur-xl bg-card/30 p-8"
      >
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <IconActivity className="size-10" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Admin Dashboard</h1>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">Rendszer áttekintés és statisztikák</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <IconRefresh className="size-4" />
                <span className="font-medium">Utolsó frissítés:</span>
              </div>
              <div className="font-mono text-foreground">{lastUpdate.toLocaleString("hu-HU")}</div>
            </div>
            <Button onClick={fetchDashboardData} disabled={isRefreshing} variant="outline" className="gap-2 min-w-[140px]">
              <IconRefresh className={cn("size-5", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Frissítés…" : "Frissítés"}
          </Button>
          </div>
        </div>
      </Card>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <HeroStatCard
          title="Felhasználók"
          value={stats.totalUsers}
          change={stats.userGrowth}
          icon={IconUsers}
          color="primary"
          monthlyValue={stats.newUsersThisMonth}
          monthlyLabel="Új ebben a hónapban"
        />
        <HeroStatCard
          title="Klubok"
          value={stats.totalClubs}
          change={stats.clubGrowth}
          icon={IconBuilding}
          color="info"
          monthlyValue={stats.newClubsThisMonth}
          monthlyLabel="Új ebben a hónapban"
        />
        <HeroStatCard
          title="Versenyek"
          value={stats.totalTournaments}
          change={stats.tournamentGrowth}
          icon={IconTrophy}
          color="success"
          monthlyValue={stats.newTournamentsThisMonth}
          monthlyLabel="Új ebben a hónapban"
        />
        <HeroStatCard
          title="Hibák"
          value={stats.totalErrors}
          change={stats.errorGrowth}
          icon={IconAlertTriangle}
          color="error"
          monthlyValue={stats.errorsThisMonth}
          monthlyLabel="Új ebben a hónapban"
        />
        <HeroStatCard
          title="Visszajelzések"
          value={stats.totalFeedback}
          change={stats.feedbackGrowth}
          icon={IconBug}
          color="warning"
          monthlyValue={stats.feedbackThisMonth}
          monthlyLabel="Új ebben a hónapban"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernChartCard title="Felhasználó Regisztrációk" data={userChartData} color="warning" type="area" />
        <ModernChartCard title="Klub Létrehozások" data={clubChartData} color="info" type="area" />
        <ModernChartCard title="Verseny Indítások" data={tournamentChartData} color="success" type="bar" />
        <ModernChartCard title="Hibák Időbeli Alakulása" data={errorChartData} color="error" type="area" />
              </div>

      {/* Quick Actions Section */}
      <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <IconActivity className="size-7 text-primary" />
            Gyors Műveletek
          </CardTitle>
            </CardHeader>
            <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <QuickActionCard
              title="Announcement Kezelő"
              description="Rendszerüzenetek kezelése"
              icon={IconSpeakerphone}
              href="/admin/announcements"
            />
            <QuickActionCard
              title="Todo Kezelő"
              description="Feladatok és észrevételek"
              icon={IconCheck}
              href="/admin/todos"
            />
            <QuickActionCard
              title="Hibabejelentések"
              description="Felhasználói visszajelzések"
              icon={IconBug}
              href="/admin/feedback"
            />
            <QuickActionCard
              title="Felhasználók"
              description="Felhasználók kezelése"
              icon={IconUsers}
              href="/admin/users"
            />
            <QuickActionCard
              title="Klubok"
              description="Klubok áttekintése"
              icon={IconBuilding}
              href="/admin/clubs"
            />
            <QuickActionCard
              title="Versenyek"
              description="Versenyek kezelése"
              icon={IconTrophy}
              href="/admin/tournaments"
            />
            <QuickActionCard
              title="Hibák"
              description="Rendszerhibák áttekintése"
              icon={IconAlertTriangle}
              href="/admin/errors"
            />
            <QuickActionCard
              title="Beállítások"
              description="Rendszer konfiguráció"
              icon={IconServer}
              href="/admin/settings"
            />
          </div>
            </CardContent>
          </Card>
    </div>
  )
}
