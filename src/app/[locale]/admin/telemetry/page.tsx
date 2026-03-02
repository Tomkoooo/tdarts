"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { useTranslations, useFormatter } from "next-intl"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { IconCheck, IconDownload, IconRefresh, IconTrash } from "@tabler/icons-react"
import { usePathname, useRouter } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor: string
    borderColor: string
  }[]
}

interface TopApiRoute {
  routeKey: string
  method: string
  count: number
  errorCount: number
  errorRate: number
  avgDurationMs: number
  maxDurationMs: number
  requestTrafficKb: number
  responseTrafficKb: number
  totalTrafficKb: number
}

interface RegisteredApiRoute {
  routeKey: string
  method: string
  totalCalls: number
  totalErrors: number
  totalTrafficKb: number
  avgLatencyMs: number
  lastSeen: string
}

interface ApiErrorEvent {
  _id: string
  occurredAt: string
  routeKey: string
  method: string
  status: number
  requestId?: string
  durationMs: number
  requestBytes: number
  responseBytes: number
  requestHeaders?: Record<string, string>
  responseHeaders?: Record<string, string>
  requestQuery?: Record<string, string | string[]>
  requestBody?: string
  responseBody?: string
  contentType?: string
  errorMessage?: string
  source: "http_status" | "exception"
  requestBodyTruncated?: boolean
  responseBodyTruncated?: boolean
}

type TelemetryRange = "24h" | "7d" | "30d" | "90d" | "custom"
type TelemetryGranularity = "minute" | "hour" | "day"

interface PayloadSummary {
  totalRequestBytes: number
  totalResponseBytes: number
  totalMovedBytes: number
  totalRequests: number
  avgRequestPackageBytes: number
  avgResponsePackageBytes: number
  avgTotalPackageBytes: number
}

export default function AdminTelemetryPage() {
  const t = useTranslations("Admin.telemetry")
  const format = useFormatter()
  const router = useRouter()
  const pathname = usePathname()

  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [apiRequestsChartData, setApiRequestsChartData] = useState<ChartData | null>(null)
  const [apiLatencyChartData, setApiLatencyChartData] = useState<ChartData | null>(null)
  const [apiPayloadChartData, setApiPayloadChartData] = useState<ChartData | null>(null)
  const [apiThroughputChartData, setApiThroughputChartData] = useState<ChartData | null>(null)
  const [payloadSummary, setPayloadSummary] = useState<PayloadSummary | null>(null)
  const [topApiRoutes, setTopApiRoutes] = useState<TopApiRoute[]>([])
  const [telemetryRange, setTelemetryRange] = useState<TelemetryRange>("24h")
  const [telemetryGranularity, setTelemetryGranularity] = useState<TelemetryGranularity>("minute")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [selectedRouteKey, setSelectedRouteKey] = useState("")
  const [selectedMethod, setSelectedMethod] = useState("ALL")
  const [telemetryTimezone, setTelemetryTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC")
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [errorEvents, setErrorEvents] = useState<ApiErrorEvent[]>([])
  const [errorEventsSummary, setErrorEventsSummary] = useState<{ total: number; count4xx: number; count5xx: number } | null>(null)
  const [errorStatusFilter, setErrorStatusFilter] = useState<"all" | "4xx" | "5xx">("all")
  const [errorEventsPage, setErrorEventsPage] = useState(1)
  const [errorEventsTotalPages, setErrorEventsTotalPages] = useState(1)
  const [errorEventsLimit] = useState(20)
  const [isMarkingFixed, setIsMarkingFixed] = useState(false)
  const [selectedErrorIds, setSelectedErrorIds] = useState<string[]>([])
  const [isDeletingErrors, setIsDeletingErrors] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [registeredRoutes, setRegisteredRoutes] = useState<RegisteredApiRoute[]>([])
  const [routeCatalogSearch, setRouteCatalogSearch] = useState("")
  const [onlyErrorApis, setOnlyErrorApis] = useState(false)
  const [minCallsFilter, setMinCallsFilter] = useState("")
  const [minTrafficKbFilter, setMinTrafficKbFilter] = useState("")
  const [minLatencyMsFilter, setMinLatencyMsFilter] = useState("")
  const [routeSortBy, setRouteSortBy] = useState<"route" | "calls" | "errors" | "traffic" | "latency" | "lastSeen">("route")
  const [routeSortDir, setRouteSortDir] = useState<"asc" | "desc">("asc")
  const [topSortBy, setTopSortBy] = useState<"calls" | "errors" | "traffic" | "latency">("calls")
  const [topSortDir, setTopSortDir] = useState<"asc" | "desc">("desc")

  const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
    if (bytes < 1024) return `${Math.round(bytes)} B`
    if (bytes < 1024 * 1024) return `${Math.round((bytes / 1024) * 100) / 100} KB`
    if (bytes < 1024 * 1024 * 1024) return `${Math.round((bytes / (1024 * 1024)) * 100) / 100} MB`
    return `${Math.round((bytes / (1024 * 1024 * 1024)) * 100) / 100} GB`
  }

  const formatJson = (value: unknown) => {
    try {
      return JSON.stringify(value ?? {}, null, 2)
    } catch {
      return String(value)
    }
  }

  const isGranularity = (value: string | null): value is TelemetryGranularity =>
    value === "minute" || value === "hour" || value === "day"

  const extractChartData = (response: any): ChartData | null => {
    if (response.data && response.data.success && response.data.data) return response.data.data
    if (response.data && response.data.labels && response.data.datasets) return response.data
    return null
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get("granularity")
    const fromStorage = localStorage.getItem("admin.telemetry.granularity")
    const initial = isGranularity(fromUrl) ? fromUrl : isGranularity(fromStorage) ? fromStorage : "minute"
    setTelemetryGranularity(initial)
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    localStorage.setItem("admin.telemetry.granularity", telemetryGranularity)
    const params = new URLSearchParams(window.location.search)
    if (params.get("granularity") !== telemetryGranularity) {
      params.set("granularity", telemetryGranularity)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [isHydrated, pathname, router, telemetryGranularity])

  const fetchTelemetry = async () => {
    try {
      setIsRefreshing(true)
      const telemetryParams = new URLSearchParams({
        range: telemetryRange,
        tz: telemetryTimezone,
        granularity: telemetryGranularity,
      })
      if (selectedMethod !== "ALL") {
        telemetryParams.set("method", selectedMethod)
      }
      if (selectedRouteKey) {
        telemetryParams.set("routeKey", selectedRouteKey)
      }

      if (telemetryRange === "custom" && customStart && customEnd) {
        telemetryParams.set("start", new Date(customStart).toISOString())
        telemetryParams.set("end", new Date(customEnd).toISOString())
      }

      const topRoutesParams = new URLSearchParams({
        range: telemetryRange,
        granularity: telemetryGranularity,
        sortBy: topSortBy,
        sortDir: topSortDir,
      })
      if (telemetryRange === "custom" && customStart && customEnd) {
        topRoutesParams.set("start", new Date(customStart).toISOString())
        topRoutesParams.set("end", new Date(customEnd).toISOString())
      }
      if (selectedMethod !== "ALL") {
        topRoutesParams.set("method", selectedMethod)
      }
      if (onlyErrorApis) {
        topRoutesParams.set("hasErrors", "true")
      }

      const errorEventsParams = new URLSearchParams({
        range: telemetryRange,
        tz: telemetryTimezone,
        page: String(errorEventsPage),
        limit: String(errorEventsLimit),
      })
      if (telemetryRange === "custom" && customStart && customEnd) {
        errorEventsParams.set("start", new Date(customStart).toISOString())
        errorEventsParams.set("end", new Date(customEnd).toISOString())
      }
      if (selectedMethod !== "ALL") {
        errorEventsParams.set("method", selectedMethod)
      }
      if (selectedRouteKey) {
        errorEventsParams.set("routeKey", selectedRouteKey)
      }
      if (errorStatusFilter !== "all") {
        errorEventsParams.set("statusClass", errorStatusFilter)
      }

      const routesParams = new URLSearchParams({
        method: selectedMethod,
        limit: "1000",
        range: telemetryRange,
        sortBy: routeSortBy,
        sortDir: routeSortDir,
      })
      if (telemetryRange === "custom" && customStart && customEnd) {
        routesParams.set("start", new Date(customStart).toISOString())
        routesParams.set("end", new Date(customEnd).toISOString())
      }
      if (routeCatalogSearch.trim()) {
        routesParams.set("search", routeCatalogSearch.trim())
      }
      if (onlyErrorApis) {
        routesParams.set("hasErrors", "true")
      }
      if (minCallsFilter.trim()) {
        routesParams.set("minCalls", minCallsFilter.trim())
      }
      if (minTrafficKbFilter.trim()) {
        routesParams.set("minTrafficKb", minTrafficKbFilter.trim())
      }
      if (minLatencyMsFilter.trim()) {
        routesParams.set("minAvgLatencyMs", minLatencyMsFilter.trim())
      }

      const [
        apiRequestsResponse,
        apiLatencyResponse,
        apiPayloadResponse,
        topApiRoutesResponse,
        errorEventsResponse,
        routesResponse,
      ] = await Promise.all([
        axios.get(`/api/admin/charts/api-traffic/requests?${telemetryParams.toString()}`),
        axios.get(`/api/admin/charts/api-traffic/latency?${telemetryParams.toString()}`),
        axios.get(`/api/admin/charts/api-traffic/payload?${telemetryParams.toString()}`),
        axios.get(`/api/admin/charts/api-traffic/top-routes?${topRoutesParams.toString()}&limit=20`),
        axios.get(`/api/admin/charts/api-traffic/error-events?${errorEventsParams.toString()}`),
        axios.get(`/api/admin/charts/api-traffic/routes?${routesParams.toString()}`),
      ])

      setApiRequestsChartData(extractChartData(apiRequestsResponse))
      setApiLatencyChartData(extractChartData(apiLatencyResponse))
      const payloadChart = extractChartData(apiPayloadResponse)
      setApiPayloadChartData(payloadChart)
      setApiThroughputChartData(apiPayloadResponse.data?.throughput || null)
      setPayloadSummary(apiPayloadResponse.data?.summary || null)
      setTopApiRoutes(topApiRoutesResponse.data?.data || [])
      setErrorEvents(errorEventsResponse.data?.data || [])
      setErrorEventsSummary(errorEventsResponse.data?.summary || null)
      setErrorEventsTotalPages(errorEventsResponse.data?.pagination?.totalPages || 1)
      setRegisteredRoutes(routesResponse.data?.data || [])
      setLastUpdate(new Date())
    } catch (error: any) {
      console.error("Error fetching telemetry data:", error)
      toast.error(error.response?.data?.error || t("error_loading"))
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const markSelectedErrorsFixed = async () => {
    if (!selectedRouteKey) {
      toast.error(t("error_calls.mark_fixed_need_route"))
      return
    }
    try {
      setIsMarkingFixed(true)
      await axios.post("/api/admin/charts/api-traffic/error-resets", {
        routeKey: selectedRouteKey,
        method: selectedMethod,
      })
      toast.success(t("error_calls.mark_fixed_success"))
      setErrorEventsPage(1)
      await fetchTelemetry()
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("error_calls.mark_fixed_error"))
    } finally {
      setIsMarkingFixed(false)
    }
  }

  const deleteSelectedErrors = async () => {
    if (selectedErrorIds.length === 0) {
      toast.error(t("error_calls.delete_selected_need_selection"))
      return
    }
    if (!window.confirm(t("error_calls.delete_selected_confirm", { count: selectedErrorIds.length }))) {
      return
    }
    try {
      setIsDeletingErrors(true)
      const response = await axios.delete("/api/admin/charts/api-traffic/error-events", {
        data: { ids: selectedErrorIds },
      })
      toast.success(t("error_calls.delete_success", { count: response.data?.deletedCount || 0 }))
      setSelectedErrorIds([])
      await fetchTelemetry()
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("error_calls.delete_error"))
    } finally {
      setIsDeletingErrors(false)
    }
  }

  const deleteAllErrorsOnSelectedRoute = async () => {
    if (!selectedRouteKey) {
      toast.error(t("error_calls.delete_route_need_selection"))
      return
    }
    if (
      !window.confirm(
        t("error_calls.delete_route_confirm", {
          route: selectedRouteKey,
          method: selectedMethod,
        })
      )
    ) {
      return
    }
    try {
      setIsDeletingErrors(true)
      const response = await axios.delete("/api/admin/charts/api-traffic/error-events", {
        data: {
          routeKey: selectedRouteKey,
          method: selectedMethod,
        },
      })
      toast.success(t("error_calls.delete_success", { count: response.data?.deletedCount || 0 }))
      setSelectedErrorIds([])
      await fetchTelemetry()
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("error_calls.delete_error"))
    } finally {
      setIsDeletingErrors(false)
    }
  }

  const exportTelemetryJson = async () => {
    try {
      setIsExporting(true)
      const response = await axios.get("/api/admin/charts/api-traffic/export", {
        responseType: "blob",
      })

      const contentDisposition = response.headers?.["content-disposition"] as string | undefined
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || `api-telemetry-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`

      const blob = new Blob([response.data], { type: "application/json;charset=utf-8" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success(t("export.success"))
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("export.error"))
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    if (selectedErrorIds.length === 0) return
    const visibleIds = new Set(errorEvents.map((e) => e._id))
    setSelectedErrorIds((prev) => prev.filter((id) => visibleIds.has(id)))
  }, [errorEvents, selectedErrorIds.length])

  useEffect(() => {
    if (!isHydrated) return
    if (telemetryRange === "custom") return
    fetchTelemetry()
  }, [
    isHydrated,
    telemetryRange,
    telemetryTimezone,
    selectedRouteKey,
    selectedMethod,
    telemetryGranularity,
    errorStatusFilter,
    errorEventsPage,
    routeCatalogSearch,
    onlyErrorApis,
    minCallsFilter,
    minTrafficKbFilter,
    minLatencyMsFilter,
    routeSortBy,
    routeSortDir,
    topSortBy,
    topSortDir,
  ])

  const availableRouteOptions = Array.from(new Set(registeredRoutes.map((row) => row.routeKey))).sort((a, b) =>
    a.localeCompare(b)
  )

  const SimpleChart = ({ title, data, color }: { title: string; data: ChartData | null; color: string }) => {
    const chartData = data && data.datasets
      ? data.labels.map((label: string, index: number) => {
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
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                  itemStyle={{ color }}
                />
                {data?.datasets?.map((dataset, datasetIndex) => (
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

  const telemetryRangeOptions: Array<{ value: TelemetryRange; label: string }> = [
    { value: "24h", label: t("ranges.24h") },
    { value: "7d", label: t("ranges.7d") },
    { value: "30d", label: t("ranges.30d") },
    { value: "90d", label: t("ranges.90d") },
    { value: "custom", label: t("ranges.custom") },
  ]

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

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50">
          <span className="text-xs text-muted-foreground px-2 py-1 font-mono hidden sm:inline-block">
            {format.dateTime(lastUpdate, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <Button size="sm" variant="outline" onClick={exportTelemetryJson} disabled={isExporting} className="h-8 px-2">
            <IconDownload className={cn("size-4 mr-1", isExporting && "animate-pulse")} />
            {t("export.button")}
          </Button>
          <Button size="sm" variant="ghost" onClick={fetchTelemetry} disabled={isRefreshing} className="h-8 w-8 p-0">
            <IconRefresh className={cn("size-4", isRefreshing && "animate-spin")} />
            <span className="sr-only">{t("refresh")}</span>
          </Button>
        </div>
      </div>

      <Card className="backdrop-blur-sm bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("filters.title")}</CardTitle>
          <CardDescription>{t("filters.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            aria-label={t("filters.range")}
            value={telemetryRange}
            onChange={(e) => setTelemetryRange(e.target.value as TelemetryRange)}
            className="border border-border bg-background rounded px-3 py-2 text-sm"
          >
            {telemetryRangeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            aria-label={t("filters.timezone")}
            value={telemetryTimezone}
            onChange={(e) => setTelemetryTimezone(e.target.value)}
            className="border border-border bg-background rounded px-3 py-2 text-sm"
          >
            <option value="UTC">UTC</option>
            <option value="Europe/Budapest">Europe/Budapest</option>
            <option value="Europe/Berlin">Europe/Berlin</option>
            <option value="America/New_York">America/New_York</option>
          </select>
          <select
            aria-label={t("filters.method")}
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="border border-border bg-background rounded px-3 py-2 text-sm"
          >
            <option value="ALL">{t("filters.all_methods")}</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
          <select
            aria-label={t("filters.granularity")}
            value={telemetryGranularity}
            onChange={(e) => setTelemetryGranularity(e.target.value as TelemetryGranularity)}
            className="border border-border bg-background rounded px-3 py-2 text-sm"
          >
            <option value="minute">{t("filters.granularity_minute")}</option>
            <option value="hour">{t("filters.granularity_hour")}</option>
            <option value="day">{t("filters.granularity_day")}</option>
          </select>
          <select
            aria-label={t("filters.route")}
            value={selectedRouteKey}
            onChange={(e) => setSelectedRouteKey(e.target.value)}
            className="border border-border bg-background rounded px-3 py-2 text-sm"
          >
            <option value="">{t("filters.all_routes")}</option>
            {availableRouteOptions.map((routeValue) => {
              return (
                <option key={routeValue} value={routeValue}>
                  {routeValue}
                </option>
              )
            })}
          </select>
          <Button type="button" variant="outline" onClick={() => setSelectedRouteKey("")} disabled={!selectedRouteKey} className="w-full md:w-auto">
            {t("filters.clear_route")}
          </Button>
        </CardContent>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0">
          <input
            aria-label={t("filters.custom_start")}
            type="datetime-local"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            disabled={telemetryRange !== "custom"}
            className="border border-border bg-background rounded px-3 py-2 text-sm disabled:opacity-50"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label={t("filters.custom_end")}
              type="datetime-local"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              disabled={telemetryRange !== "custom"}
              className="border border-border bg-background rounded px-3 py-2 text-sm disabled:opacity-50 flex-1"
            />
            <Button
              type="button"
              disabled={telemetryRange !== "custom" || !customStart || !customEnd || isRefreshing}
              onClick={fetchTelemetry}
              className="w-full sm:w-auto"
            >
              {t("filters.apply")}
            </Button>
          </div>
        </CardContent>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-0">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyErrorApis}
              onChange={(e) => setOnlyErrorApis(e.target.checked)}
            />
            {t("filters.only_error_apis")}
          </label>
          <input
            aria-label={t("filters.min_calls")}
            value={minCallsFilter}
            onChange={(e) => setMinCallsFilter(e.target.value)}
            placeholder={t("filters.min_calls")}
            className="border border-border bg-background rounded px-3 py-2 text-sm"
          />
          <input
            aria-label={t("filters.min_traffic_kb")}
            value={minTrafficKbFilter}
            onChange={(e) => setMinTrafficKbFilter(e.target.value)}
            placeholder={t("filters.min_traffic_kb")}
            className="border border-border bg-background rounded px-3 py-2 text-sm"
          />
          <input
            aria-label={t("filters.min_latency_ms")}
            value={minLatencyMsFilter}
            onChange={(e) => setMinLatencyMsFilter(e.target.value)}
            placeholder={t("filters.min_latency_ms")}
            className="border border-border bg-background rounded px-3 py-2 text-sm"
          />
          <select
            aria-label={t("filters.route_sort")}
            value={`${routeSortBy}:${routeSortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split(":")
              setRouteSortBy(field as "route" | "calls" | "errors" | "traffic" | "latency" | "lastSeen")
              setRouteSortDir(dir as "asc" | "desc")
            }}
            className="border border-border bg-background rounded px-3 py-2 text-sm"
          >
            <option value="route:asc">{t("filters.sort_route_asc")}</option>
            <option value="calls:desc">{t("filters.sort_calls_desc")}</option>
            <option value="errors:desc">{t("filters.sort_errors_desc")}</option>
            <option value="traffic:desc">{t("filters.sort_traffic_desc")}</option>
            <option value="latency:desc">{t("filters.sort_latency_desc")}</option>
            <option value="lastSeen:desc">{t("filters.sort_last_seen_desc")}</option>
          </select>
          <select
            aria-label={t("filters.top_sort")}
            value={`${topSortBy}:${topSortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split(":")
              setTopSortBy(field as "calls" | "errors" | "traffic" | "latency")
              setTopSortDir(dir as "asc" | "desc")
            }}
            className="border border-border bg-background rounded px-3 py-2 text-sm"
          >
            <option value="calls:desc">{t("filters.sort_calls_desc")}</option>
            <option value="errors:desc">{t("filters.sort_errors_desc")}</option>
            <option value="traffic:desc">{t("filters.sort_traffic_desc")}</option>
            <option value="latency:desc">{t("filters.sort_latency_desc")}</option>
          </select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="backdrop-blur-sm bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("metrics.incoming_total_kb")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBytes(payloadSummary?.totalRequestBytes || 0)}</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("metrics.outgoing_total_kb")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBytes(payloadSummary?.totalResponseBytes || 0)}</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("metrics.total_moved")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBytes(payloadSummary?.totalMovedBytes || 0)}</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("metrics.avg_package_size")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBytes(payloadSummary?.avgTotalPackageBytes || 0)}</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("metrics.avg_incoming_package")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBytes(payloadSummary?.avgRequestPackageBytes || 0)}</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-sm bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("metrics.avg_outgoing_package")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatBytes(payloadSummary?.avgResponsePackageBytes || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <SimpleChart title={t("charts.requests")} data={apiRequestsChartData} color="#6366f1" />
        <SimpleChart title={t("charts.latency")} data={apiLatencyChartData} color="#f97316" />
        <SimpleChart title={t("charts.payload")} data={apiPayloadChartData} color="#10b981" />
        <SimpleChart title={t("charts.throughput")} data={apiThroughputChartData} color="#8b5cf6" />
      </div>

      <Card className="backdrop-blur-sm bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("top_routes.title")}</CardTitle>
          <CardDescription>{t("top_routes.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topApiRoutes.length > 0 ? (
              topApiRoutes.map((row, idx) => (
                <button
                  type="button"
                  key={`${row.method}-${row.routeKey}-${idx}`}
                  className="w-full text-left rounded-lg border border-border/50 p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                  onClick={() => {
                    setSelectedRouteKey(row.routeKey)
                    setSelectedMethod(row.method)
                    setErrorEventsPage(1)
                  }}
                >
                  <div className="flex flex-col items-start justify-between gap-2 mb-1 sm:flex-row sm:items-center">
                    <code className="text-xs break-all">
                      {row.method} {row.routeKey}
                    </code>
                    <Badge variant={row.errorRate > 0 ? "destructive" : "secondary"}>
                      {row.errorRate}% {t("top_routes.error_rate")}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                    <span>
                      {row.count} {t("top_routes.calls")}
                    </span>
                    <span>
                      {t("top_routes.avg")} {row.avgDurationMs}ms
                    </span>
                    <span>
                      {t("top_routes.max")} {row.maxDurationMs}ms
                    </span>
                    <span>{t("top_routes.incoming")} {row.requestTrafficKb} KB</span>
                    <span>{t("top_routes.outgoing")} {row.responseTrafficKb} KB</span>
                    <span>{t("top_routes.total")} {row.totalTrafficKb} KB</span>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">{t("top_routes.empty")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">{t("error_calls.title")}</CardTitle>
              <CardDescription>{t("error_calls.description")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t("error_calls.total", { count: errorEventsSummary?.total || 0 })}</Badge>
              <Badge variant="outline">4xx: {errorEventsSummary?.count4xx || 0}</Badge>
              <Badge variant="destructive">5xx: {errorEventsSummary?.count5xx || 0}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <select
              aria-label={t("error_calls.status_filter")}
              value={errorStatusFilter}
              onChange={(e) => {
                setErrorStatusFilter(e.target.value as "all" | "4xx" | "5xx")
                setErrorEventsPage(1)
              }}
              className="border border-border bg-background rounded px-3 py-2 text-sm"
            >
              <option value="all">{t("error_calls.status_all")}</option>
              <option value="4xx">4xx</option>
              <option value="5xx">5xx</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedRouteKey("")
                setSelectedMethod("ALL")
                setErrorStatusFilter("all")
                setErrorEventsPage(1)
              }}
            >
              {t("error_calls.clear_filters")}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!selectedRouteKey || isMarkingFixed}
              onClick={markSelectedErrorsFixed}
            >
              <IconCheck className="size-4 mr-1" />
              {t("error_calls.mark_fixed")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedErrorIds.length === 0 || isDeletingErrors}
              onClick={deleteSelectedErrors}
            >
              <IconTrash className="size-4 mr-1" />
              {t("error_calls.delete_selected")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!selectedRouteKey || isDeletingErrors}
              onClick={deleteAllErrorsOnSelectedRoute}
            >
              <IconTrash className="size-4 mr-1" />
              {t("error_calls.delete_route")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={errorEvents.length === 0}
              onClick={() => {
                const allPageIds = errorEvents.map((e) => e._id)
                const allSelected = allPageIds.every((id) => selectedErrorIds.includes(id))
                if (allSelected) {
                  setSelectedErrorIds((prev) => prev.filter((id) => !allPageIds.includes(id)))
                } else {
                  setSelectedErrorIds((prev) => Array.from(new Set([...prev, ...allPageIds])))
                }
              }}
            >
              {t("error_calls.select_page")}
            </Button>
            </div>
            <span className="block text-xs text-muted-foreground">
              {t("error_calls.mark_fixed_hint")}
            </span>
          </div>

          {errorEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("error_calls.empty")}</p>
          ) : (
            <div className="space-y-2">
              {errorEvents.map((event) => (
                <details key={event._id} className="rounded-lg border border-border/50 p-3 bg-muted/20">
                  <summary className="cursor-pointer list-none flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        aria-label={t("error_calls.select_error")}
                        type="checkbox"
                        checked={selectedErrorIds.includes(event._id)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setSelectedErrorIds((prev) =>
                            checked ? Array.from(new Set([...prev, event._id])) : prev.filter((id) => id !== event._id)
                          )
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Badge variant={event.status >= 500 ? "destructive" : "secondary"}>
                        {event.status}
                      </Badge>
                      <code className="text-xs break-all">
                        {event.method} {event.routeKey}
                      </code>
                      <span className="text-xs text-muted-foreground">
                        {format.dateTime(new Date(event.occurredAt), {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>{t("error_calls.duration")}: {Math.round(event.durationMs)}ms</span>
                      <span>{t("error_calls.request_bytes")}: {formatBytes(event.requestBytes)}</span>
                      <span>{t("error_calls.response_bytes")}: {formatBytes(event.responseBytes)}</span>
                    </div>
                  </summary>
                  <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">{t("error_calls.request")}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              formatJson({
                                query: event.requestQuery,
                                headers: event.requestHeaders,
                                body: event.requestBody,
                                requestId: event.requestId,
                              })
                            )
                          }
                        >
                          {t("error_calls.copy")}
                        </Button>
                      </div>
                      <pre className="text-[11px] max-h-64 overflow-auto rounded bg-background border border-border p-2">
{formatJson({
  query: event.requestQuery,
  headers: event.requestHeaders,
  body: event.requestBody,
  requestId: event.requestId,
  truncated: event.requestBodyTruncated || false,
})}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">{t("error_calls.response")}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              formatJson({
                                headers: event.responseHeaders,
                                body: event.responseBody,
                                errorMessage: event.errorMessage,
                                source: event.source,
                              })
                            )
                          }
                        >
                          {t("error_calls.copy")}
                        </Button>
                      </div>
                      <pre className="text-[11px] max-h-64 overflow-auto rounded bg-background border border-border p-2">
{formatJson({
  headers: event.responseHeaders,
  body: event.responseBody,
  errorMessage: event.errorMessage,
  source: event.source,
  truncated: event.responseBodyTruncated || false,
})}
                      </pre>
                    </div>
                  </div>
                </details>
              ))}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={errorEventsPage <= 1}
                  onClick={() => setErrorEventsPage((p) => Math.max(1, p - 1))}
                >
                  {t("error_calls.prev")}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t("error_calls.page", { page: errorEventsPage, totalPages: errorEventsTotalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={errorEventsPage >= errorEventsTotalPages}
                  onClick={() => setErrorEventsPage((p) => Math.min(errorEventsTotalPages, p + 1))}
                >
                  {t("error_calls.next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("all_routes.title")}</CardTitle>
          <CardDescription>{t("all_routes.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            value={routeCatalogSearch}
            onChange={(e) => setRouteCatalogSearch(e.target.value)}
            placeholder={t("all_routes.search_placeholder")}
            className="w-full border border-border bg-background rounded px-3 py-2 text-sm"
          />
          {registeredRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("all_routes.empty")}</p>
          ) : (
            <div className="max-h-80 overflow-auto rounded border border-border/40 divide-y divide-border/40">
              {registeredRoutes.map((row) => (
                <div key={`${row.method}-${row.routeKey}`} className="p-2 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <code className="text-xs break-all">
                      {row.method} {row.routeKey}
                    </code>
                    <div className="text-[11px] text-muted-foreground">
                      {t("all_routes.calls")}: {row.totalCalls} | {t("all_routes.errors")}: {row.totalErrors} |{" "}
                      {t("all_routes.traffic")}: {Math.round(row.totalTrafficKb * 100) / 100} KB |{" "}
                      {t("all_routes.latency")}: {Math.round(row.avgLatencyMs * 100) / 100}ms
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRouteKey(row.routeKey)
                      setSelectedMethod(row.method)
                      setErrorEventsPage(1)
                    }}
                  >
                    {t("all_routes.select")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
