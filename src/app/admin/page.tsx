"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import {
  IconUsers,
  IconBuilding,
  IconTrophy,
  IconAlertTriangle,
  IconActivity,
  IconRefresh,
} from "@tabler/icons-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const PANEL_SHADOW = "shadow-lg shadow-black/35"

interface DashboardSummary {
  totalUsers: number
  totalClubs: number
  totalTournaments: number
  totalErrors: number
}

const FALLBACK_SUMMARY: DashboardSummary = {
  totalUsers: 0,
  totalClubs: 0,
  totalTournaments: 0,
  totalErrors: 0,
}

const summaryMeta = [
  { label: "Felhasználók", icon: IconUsers, tone: "text-primary", key: "totalUsers" as const },
  { label: "Klubok", icon: IconBuilding, tone: "text-emerald-300", key: "totalClubs" as const },
  { label: "Versenyek", icon: IconTrophy, tone: "text-amber-300", key: "totalTournaments" as const },
  { label: "Hibák", icon: IconAlertTriangle, tone: "text-destructive", key: "totalErrors" as const },
]

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(FALLBACK_SUMMARY)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchSummary = async () => {
    try {
      setIsRefreshing(true)
      const response = await axios.get("/api/admin/stats/summary")
      const payload: DashboardSummary = response.data?.data ?? response.data ?? FALLBACK_SUMMARY
      setSummary({
        totalUsers: payload.totalUsers ?? 0,
        totalClubs: payload.totalClubs ?? 0,
        totalTournaments: payload.totalTournaments ?? 0,
        totalErrors: payload.totalErrors ?? 0,
      })
    } catch (error) {
      console.error("Failed to load admin stats", error)
      setSummary(FALLBACK_SUMMARY)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-16 rounded-2xl bg-card/70" />
          <p className="text-sm text-muted-foreground">Admin adatok betöltése…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12 pt-4">
      <Card elevation="elevated" className={`relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background p-8 ${PANEL_SHADOW}`}>
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <IconActivity className="h-10 w-10" />
              <span className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/70">
                Rendszeráttekintés
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Admin Dashboard</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Gyors áttekintés a felhasználói aktivitásról, klubokról, versenyekről és kritikus rendszerhibákról.
            </p>
          </div>
          <Button
            onClick={fetchSummary}
            disabled={isRefreshing}
            variant="ghost"
            className="gap-2"
          >
            {isRefreshing ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/40 border-t-transparent" />
                Frissítés…
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm">
                <IconRefresh className="h-4 w-4" />
                Frissítés
              </span>
            )}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {summaryMeta.map((item) => (
          <Card key={item.key} elevation="base" className={`${PANEL_SHADOW} bg-card/50`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-3">
                <item.icon className={`h-6 w-6 ${item.tone}`} />
                <h3 className="text-lg font-semibold text-foreground">{item.label}</h3>
              </div>
              <span className="text-2xl font-bold text-primary">{summary[item.key]}</span>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {item.label} száma a rendszerben.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}