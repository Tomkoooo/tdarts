"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import {
  IconAlertTriangle,
  IconRefresh,
  IconClock,
  IconUser,
  IconBuilding,
  IconTrophy,
  IconAlertCircle,
  IconBug,
  IconDatabase,
  IconServer,
  IconApi,
  IconCode,
  IconChevronDown,
  IconChevronUp,
  IconFilter,
} from "@tabler/icons-react"
import toast from "react-hot-toast"
import DailyChart from "@/components/admin/DailyChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/Label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ErrorLog {
  _id: string
  level: string
  category: string
  message: string
  error?: string
  stack?: string
  userId?: string
  userRole?: string
  clubId?: string
  tournamentId?: string
  endpoint?: string
  method?: string
  timestamp: string
  metadata?: any
}

interface ErrorStats {
  totalErrors: number
  errorsByCategory: Record<string, number>
  errorsByLevel: Record<string, number>
  recentErrors: ErrorLog[]
}

export default function AdminErrorsPage() {
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedLevel, setSelectedLevel] = useState<string>("all")
  const [dateRange, setDateRange] = useState<number>(7)
  const [showAuthErrors, setShowAuthErrors] = useState<boolean>(false)
  const [expandedError, setExpandedError] = useState<string | null>(null)

  const fetchErrorData = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        days: dateRange.toString(),
        category: selectedCategory,
        level: selectedLevel,
        showAuthErrors: showAuthErrors.toString(),
      })

      const [statsResponse] = await Promise.all([axios.get(`/api/admin/errors/stats?${params}`)])

      setErrorStats(statsResponse.data)
    } catch (error: any) {
      console.error("Error fetching error data:", error)
      toast.error(error.response?.data?.error || "Hiba történt az adatok betöltése során")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchErrorData()
  }, [dateRange, selectedCategory, selectedLevel, showAuthErrors])

  const getCategoryConfig = (category: string) => {
    const configs: Record<string, { icon: any; color: string; label: string }> = {
      auth: { icon: IconUser, color: "backdrop-blur-md bg-warning/20 text-warning", label: "Auth" },
      club: { icon: IconBuilding, color: "backdrop-blur-md bg-info/20 text-info", label: "Club" },
      tournament: { icon: IconTrophy, color: "backdrop-blur-md bg-success/20 text-success", label: "Tournament" },
      player: { icon: IconUser, color: "backdrop-blur-md bg-primary/20 text-primary", label: "Player" },
      user: { icon: IconUser, color: "backdrop-blur-md bg-primary/20 text-primary", label: "User" },
      api: { icon: IconApi, color: "backdrop-blur-md bg-destructive/20 text-destructive", label: "API" },
      system: { icon: IconServer, color: "backdrop-blur-md bg-destructive/20 text-destructive", label: "System" },
      database: { icon: IconDatabase, color: "backdrop-blur-md bg-destructive/20 text-destructive", label: "Database" },
    }
    return configs[category] || { icon: IconBug, color: "backdrop-blur-md bg-muted/20 text-muted-foreground", label: category }
  }

  const getLevelConfig = (level: string) => {
    switch (level) {
      case "error":
        return { color: "bg-destructive text-destructive-foreground", icon: IconAlertCircle }
      case "warn":
        return { color: "bg-warning text-warning-foreground", icon: IconAlertTriangle }
      case "info":
        return { color: "bg-info text-info-foreground", icon: IconAlertCircle }
      default:
        return { color: "bg-muted text-muted-foreground", icon: IconAlertCircle }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <p className="text-sm text-muted-foreground">Hiba adatok betöltése…</p>
        </div>
      </div>
    )
  }

  if (!errorStats) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="size-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <IconAlertTriangle className="size-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Hiba történt</h2>
            <p className="text-muted-foreground">Nem sikerült betölteni a hiba adatokat.</p>
          </div>
          <Button onClick={fetchErrorData} className="gap-2">
            <IconRefresh className="size-5" />
            Újrapróbálás
          </Button>
        </div>
      </div>
    )
  }

  const filteredRecentErrors = errorStats.recentErrors

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <Card
        elevation="elevated"
        className="relative overflow-hidden backdrop-blur-xl bg-card/30 p-8"
      >
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-destructive">
              <IconAlertTriangle className="size-10" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Hiba Kezelés</h1>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">Rendszer hibák monitorozása és kezelése</p>
          </div>

          <Button onClick={fetchErrorData} disabled={loading} variant="outline" className="gap-2">
            <IconRefresh className={cn("size-5", loading && "animate-spin")} />
            Frissítés
          </Button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconAlertTriangle className="size-7 text-destructive" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Összes Hiba</h3>
            <p className="text-4xl font-bold text-destructive">{errorStats.totalErrors}</p>
          </CardContent>
        </Card>
        {Object.entries(errorStats.errorsByLevel)
          .slice(0, 3)
          .map(([level, count]) => {
            const config = getLevelConfig(level)
            return (
              <Card key={level} elevation="elevated" className="backdrop-blur-xl bg-card/30">
                <CardContent className="p-6 text-center">
                  <div className="size-14 backdrop-blur-md bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <config.icon className="size-7 text-primary" />
                  </div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 capitalize">{level}</h3>
                  <p className="text-4xl font-bold text-primary">{count}</p>
                </CardContent>
              </Card>
            )
          })}
      </div>

      {/* Daily Chart */}
      <DailyChart
        title="Hibák napi előfordulása"
        apiEndpoint={`/api/admin/errors/daily?days=${dateRange}&showAuthErrors=${showAuthErrors}`}
        color="error"
      />

      {/* Filters */}
      <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconFilter className="size-5 text-primary" />
            Szűrők
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Időszak</Label>
              <Select value={dateRange.toString()} onValueChange={(value) => setDateRange(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Utolsó 24 óra</SelectItem>
                  <SelectItem value="7">Utolsó 7 nap</SelectItem>
                  <SelectItem value="30">Utolsó 30 nap</SelectItem>
                  <SelectItem value="90">Utolsó 3 hónap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Kategória</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes kategória</SelectItem>
                  {Object.keys(errorStats.errorsByCategory).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Szint</Label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes szint</SelectItem>
                  {Object.keys(errorStats.errorsByLevel).map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Auth hibák</Label>
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="showAuthErrors"
                  checked={showAuthErrors}
                  onChange={(e) => setShowAuthErrors(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <Label htmlFor="showAuthErrors" className="cursor-pointer">
                  {showAuthErrors ? "Megjelenítés" : "Elrejtés"}
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category and Level Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconCode className="size-6 text-primary" />
              Hibák Kategóriánként
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(errorStats.errorsByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => {
                  const config = getCategoryConfig(category)
                  return (
                    <div
                      key={category}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl hover:scale-[1.02] transition-transform duration-200",
                        config.color
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg backdrop-blur-md bg-card/40">
                          <config.icon className="size-5" />
                        </div>
                        <span className="capitalize font-bold">{config.label}</span>
                      </div>
                      <span className="text-2xl font-bold">{count}</span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconAlertTriangle className="size-6 text-primary" />
              Hibák Szintenként
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(errorStats.errorsByLevel)
                .sort(([, a], [, b]) => b - a)
                .map(([level, count]) => {
                  const config = getLevelConfig(level)
                  return (
                    <div
                      key={level}
                      className="flex items-center justify-between p-4 rounded-xl backdrop-blur-md bg-muted/30 hover:bg-muted/40 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg backdrop-blur-md", config.color)}>
                          <config.icon className="size-5" />
                        </div>
                        <span className="capitalize font-bold">{level}</span>
                      </div>
                      <span className="text-2xl font-bold">{count}</span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconBug className="size-6 text-primary" />
            Legutóbbi Hibák ({filteredRecentErrors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRecentErrors.length > 0 ? (
              filteredRecentErrors.map((error) => {
                const categoryConfig = getCategoryConfig(error.category)
                const levelConfig = getLevelConfig(error.level)
                const isExpanded = expandedError === error._id

                return (
                  <Card key={error._id} elevation="base" className="overflow-hidden backdrop-blur-xl bg-card/30">
                    <CardContent className="p-5 backdrop-blur-md bg-muted/20">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn("p-2 rounded-lg flex-shrink-0", categoryConfig.color)}>
                          <categoryConfig.icon className="size-5" />
                        </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge className={levelConfig.color}>{error.level}</Badge>
                              <Badge variant="outline">{error.category}</Badge>
                              {error.method && error.endpoint && (
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                  {error.method} {error.endpoint}
                                </code>
                              )}
                            </div>
                            <p className="font-bold text-foreground break-words">{error.message}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0"
                          onClick={() => setExpandedError(isExpanded ? null : error._id)}
                        >
                          {isExpanded ? <IconChevronUp size={20} /> : <IconChevronDown size={20} />}
                        </Button>
                      </div>

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <IconClock className="size-4" />
                          <span>{new Date(error.timestamp).toLocaleString("hu-HU")}</span>
                        </div>
                        {error.userId && (
                          <div className="flex items-center gap-1">
                            <IconUser className="size-4" />
                            <span>User: {error.userId.slice(0, 8)}...</span>
                          </div>
                        )}
                        {error.clubId && (
                          <div className="flex items-center gap-1">
                            <IconBuilding className="size-4" />
                            <span>Club: {error.clubId.slice(0, 8)}...</span>
                          </div>
                        )}
                        {error.tournamentId && (
                          <div className="flex items-center gap-1">
                            <IconTrophy className="size-4" />
                            <span>Tournament: {error.tournamentId.slice(0, 8)}...</span>
                          </div>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 space-y-3">
                          {error.error && (
                            <div className="backdrop-blur-md bg-destructive/20 rounded-lg p-3">
                              <p className="text-sm font-bold text-destructive mb-1">Error Details:</p>
                              <p className="text-sm text-foreground/80 font-mono break-all">{error.error}</p>
                            </div>
                          )}
                          {error.stack && (
                            <div className="backdrop-blur-md bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                              <p className="text-sm font-bold text-foreground mb-2">Stack Trace:</p>
                              <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">
                                {error.stack}
                              </pre>
                            </div>
                          )}
                          {error.metadata && Object.keys(error.metadata).length > 0 && (
                            <div className="backdrop-blur-md bg-info/20 rounded-lg p-3">
                              <p className="text-sm font-bold text-info mb-2">Metadata:</p>
                              <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">
                                {JSON.stringify(error.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="text-center py-12">
                <div className="size-20 backdrop-blur-md bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IconAlertCircle className="size-10 text-success" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Nincsenek hibák</h3>
                <p className="text-muted-foreground">
                  {selectedCategory !== "all" || selectedLevel !== "all"
                    ? "Nincsenek hibák a megadott feltételekkel."
                    : "Nincsenek hibák a rendszerben."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
