"use client"
import { useEffect, useState } from "react"
import axios from "axios"
import { IconAlertTriangle, IconRefresh, IconBug, IconClock } from "@tabler/icons-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

const PANEL_SHADOW = "shadow-lg shadow-black/35"

type Severity = "critical" | "warning" | "info" | "debug"

interface ErrorLog {
  id: string
  message: string
  severity: Severity
  category: string
  timestamp: string
}

interface ErrorOverview {
  total: number
  bySeverity: Record<Severity, number>
  recent: ErrorLog[]
}

const FALLBACK_DATA: ErrorOverview = {
  total: 0,
  bySeverity: {
    critical: 0,
    warning: 0,
    info: 0,
    debug: 0,
  },
  recent: [],
}

const severityMeta: Record<Severity, { label: string; badge: "destructive" | "default" | "secondary"; tone: string }> = {
  critical: { label: "Kritikus", badge: "destructive", tone: "text-destructive" },
  warning: { label: "Figyelmeztetés", badge: "secondary", tone: "text-amber-400" },
  info: { label: "Információ", badge: "default", tone: "text-sky-300" },
  debug: { label: "Debug", badge: "default", tone: "text-muted-foreground" },
}

export default function AdminErrorsPage() {
  const [overview, setOverview] = useState<ErrorOverview>(FALLBACK_DATA)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchOverview = async () => {
    try {
      setIsRefreshing(true)
      const response = await axios.get("/api/admin/errors/overview")
      const payload: ErrorOverview = response.data?.data ?? response.data ?? FALLBACK_DATA
      setOverview({
        total: payload.total ?? 0,
        bySeverity: { ...FALLBACK_DATA.bySeverity, ...(payload.bySeverity ?? {}) },
        recent: Array.isArray(payload.recent) ? payload.recent.slice(0, 10) : [],
      })
    } catch (error) {
      console.error("Failed to load admin error overview", error)
      setOverview(FALLBACK_DATA)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-16 rounded-2xl bg-card/70" />
          <p className="text-sm text-muted-foreground">Hibanapló betöltése…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 pt-4">
      <Card className={`relative overflow-hidden bg-gradient-to-br from-destructive/25 via-background to-background p-8 ${PANEL_SHADOW}`}>
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-destructive/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-destructive">
              <IconAlertTriangle className="h-10 w-10" />
              <span className="text-sm font-semibold uppercase tracking-[0.3em] text-destructive/70">
                Riasztásközpont
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Hibanapló</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Valós idejű áttekintés a kritikus eseményekről, API hibákról és felhasználói problémákról. A szűrés és a
              részletes log megtekintés hamarosan érkezik.
            </p>
          </div>
          <Button
            onClick={fetchOverview}
            disabled={isRefreshing}
            className={`gap-2 bg-card/85 text-foreground hover:bg-card ${PANEL_SHADOW}`}
          >
            <IconRefresh className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Frissítés
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className={`bg-card/90 p-6 ${PANEL_SHADOW}`}>
          <CardHeader className="p-0">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Összes hiba
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-6 flex items-end justify-between gap-6 p-0">
            <CardTitle className="text-4xl font-bold text-foreground">{overview.total}</CardTitle>
            <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <IconBug className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {(Object.keys(severityMeta) as Severity[]).map((severity) => (
          <Card key={severity} className={`bg-card/90 p-6 ${PANEL_SHADOW}`}>
            <CardHeader className="p-0">
              <div className="flex items-center justify-between gap-3">
                <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {severityMeta[severity].label}
                </CardDescription>
                <Badge variant={severityMeta[severity].badge} className="rounded-full px-2 py-0 text-[10px]">
                  {severityMeta[severity].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="mt-6 p-0">
              <p className={`text-3xl font-bold ${severityMeta[severity].tone}`}>
                {overview.bySeverity[severity] ?? 0}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Az elmúlt 24 órában rögzített események</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className={`bg-card/90 ${PANEL_SHADOW}`}>
        <CardHeader>
          <CardTitle className="text-lg">Legutóbbi események</CardTitle>
          <CardDescription>Az utolsó 10 naplóbejegyzés rövid összefoglalója.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {overview.recent.length === 0 ? (
            <div className="flex items-center justify-center px-6 py-12 text-sm text-muted-foreground">
              Még nincs elérhető naplóbejegyzés.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border/60">
              {overview.recent.map((log) => {
                const meta = severityMeta[log.severity]
                return (
                  <div
                    key={log.id}
                    className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={meta.badge} className="rounded-full px-2 py-0 text-[10px]">
                          {meta.label}
                        </Badge>
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {log.category}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{log.message}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <IconClock className="h-4 w-4" />
                      <span>{new Date(log.timestamp).toLocaleString("hu-HU")}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={`bg-muted/40 p-6 ${PANEL_SHADOW}`}>
        <CardHeader className="p-0">
          <CardTitle className="text-base">Fejlesztés alatt álló modul</CardTitle>
          <CardDescription>
            A teljes szűrőrendszer, CSV export és részletes hibakövetés hamarosan bekerül ebbe a nézetbe.
          </CardDescription>
        </CardHeader>
        <Separator className="my-4 opacity-40" />
        <CardContent className="p-0 text-sm text-muted-foreground">
          Addig is minden kritikus eseményről értesítést küldünk az admin e-mail címére, illetve megtalálod őket az
          alkalmazás log szolgáltatásában.
        </CardContent>
      </Card>
    </div>
  )
}
