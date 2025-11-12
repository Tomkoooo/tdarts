"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import Link from "next/link"
import toast from "react-hot-toast"
import {
  IconBuilding,
  IconUsers,
  IconTrophy,
  IconExternalLink,
  IconSearch,
  IconRefresh,
  IconMapPin,
  IconShield,
  IconStar,
} from "@tabler/icons-react"

import DailyChart from "@/components/admin/DailyChart"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const PANEL_SHADOW = "shadow-lg shadow-black/35"

interface AdminClub {
  _id: string
  name: string
  description?: string
  location: string
  subscriptionModel?: "free" | "basic" | "pro" | "enterprise"
  members: any[]
  tournaments: any[]
  createdAt: string
  isDeleted: boolean
  memberCount: number
  tournamentCount: number
}

const subscriptionMeta: Record<
  NonNullable<AdminClub["subscriptionModel"]>,
  { label: string; icon: typeof IconBuilding; tone: string }
> = {
  free: { label: "Free", icon: IconBuilding, tone: "bg-muted/40 text-muted-foreground" },
  basic: { label: "Basic", icon: IconBuilding, tone: "bg-primary/15 text-primary" },
  pro: { label: "Pro", icon: IconShield, tone: "bg-accent/15 text-accent-foreground" },
  enterprise: { label: "Enterprise", icon: IconStar, tone: "bg-destructive/15 text-destructive" },
}

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<AdminClub[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchClubs = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/admin/clubs")
      setClubs(response.data.clubs)
    } catch {
      toast.error("Hiba történt a klubok betöltése során")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClubs()
  }, [])

  const filteredClubs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return clubs
    return clubs.filter((club) => {
      const haystack = [club.name, club.location, club.description ?? ""].map((value) =>
        value.toLowerCase(),
      )
      return haystack.some((value) => value.includes(term))
    })
  }, [clubs, searchTerm])

  const stats = useMemo(
    () => ({
      total: clubs.length,
      active: clubs.filter((club) => !club.isDeleted).length,
      deleted: clubs.filter((club) => club.isDeleted).length,
      totalMembers: clubs.reduce((total, club) => total + club.memberCount, 0),
      totalTournaments: clubs.reduce((total, club) => total + club.tournamentCount, 0),
    }),
    [clubs],
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-16 rounded-2xl bg-card/60" />
          <p className="text-sm text-muted-foreground">Klubok betöltése...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-12 pt-4">
      <Card className={cn("relative overflow-hidden bg-gradient-to-br from-primary/15 via-background to-background p-8", PANEL_SHADOW)}>
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <IconBuilding className="h-10 w-10" />
              <span className="text-sm font-semibold uppercase tracking-[0.3em] text-primary/80">
                Admin dashboard
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground lg:text-5xl">Klubkezelés</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Részletes áttekintés a klubokról, előfizetésekről, aktivitásról és növekedési trendekről.
            </p>
          </div>
          <Button
            size="lg"
            className={cn("gap-2 bg-card/90 hover:bg-card text-foreground", PANEL_SHADOW)}
            onClick={fetchClubs}
          >
            <IconRefresh className="h-4 w-4" />
            Frissítés
          </Button>
        </div>
      </Card>

      <section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Összes klub", value: stats.total, icon: IconBuilding, tone: "text-primary" },
            { label: "Aktív klubok", value: stats.active, icon: IconShield, tone: "text-emerald-400" },
            { label: "Archivált klubok", value: stats.deleted, icon: IconStar, tone: "text-amber-300" },
            { label: "Tagok száma", value: stats.totalMembers, icon: IconUsers, tone: "text-sky-300" },
            { label: "Összes verseny", value: stats.totalTournaments, icon: IconTrophy, tone: "text-rose-300" },
          ].map((stat) => (
            <Card key={stat.label} className={cn("bg-card/90 p-6 text-left", PANEL_SHADOW)}>
              <CardHeader className="p-0">
                <div className="flex items-center justify-between gap-4">
                  <div className={cn("flex size-12 items-center justify-center rounded-xl bg-background/60", stat.tone)}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-6 flex flex-col gap-2 p-0">
                <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </CardDescription>
                <CardTitle className="text-3xl font-bold text-foreground">{stat.value}</CardTitle>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card className={cn("bg-card/90 p-6", PANEL_SHADOW)}>
        <CardHeader className="p-0">
          <CardTitle className="text-xl font-semibold text-foreground">Napi klub növekedés</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Trendek és aktivitás az elmúlt időszak adatai alapján.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-6 p-0">
          <DailyChart title="Klubok napi létrehozása" apiEndpoint="/api/admin/charts/clubs/daily" color="primary" icon="" />
        </CardContent>
      </Card>

      <Card className={cn("bg-card/90 p-6", PANEL_SHADOW)}>
        <CardHeader className="p-0">
          <CardTitle className="text-lg font-semibold text-foreground">Keresés</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Szűrés név, helyszín vagy rövid leírás alapján.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-6 flex flex-col gap-4 p-0">
          <div className="relative">
            <IconSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Keresés klub neve, helyszíne vagy leírása alapján..."
              className="h-12 rounded-xl bg-muted/40 pl-11 text-sm text-foreground shadow-none focus-visible:bg-muted/60"
            />
          </div>
        </CardContent>
      </Card>

      <section>
        {filteredClubs.length === 0 ? (
          <Card className={cn("flex flex-col items-center justify-center gap-4 bg-card/80 p-12 text-center", PANEL_SHADOW)}>
            <div className="flex size-20 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
              <IconBuilding className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">Nincs találat</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {searchTerm ? "Nincs olyan klub, amely megfelelne a keresésnek." : "Még nincsenek regisztrált klubok."}
            </CardDescription>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredClubs.map((club) => {
              const model = club.subscriptionModel ?? "free"
              const meta = subscriptionMeta[model]
              return (
                <Card key={club._id} className={cn("flex h-full flex-col bg-card/90 p-6", PANEL_SHADOW)}>
                  <CardHeader className="flex flex-col gap-4 p-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-xl text-foreground">{club.name}</CardTitle>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <IconMapPin className="h-4 w-4 flex-shrink-0 text-primary/70" />
                          <span className="truncate">{club.location}</span>
                        </div>
                      </div>
                      {club.isDeleted && (
                        <Badge className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive">
                          Archivált
                        </Badge>
                      )}
                    </div>
                    {club.description && (
                      <p className="text-sm leading-relaxed text-muted-foreground">{club.description}</p>
                    )}
                  </CardHeader>

                  <CardContent className="mt-4 flex flex-col gap-4 p-0">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 text-foreground">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                          <IconUsers className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tagok</span>
                          <span className="text-base font-semibold">{club.memberCount}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 text-foreground">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-warning/15 text-warning">
                          <IconTrophy className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Versenyek
                          </span>
                          <span className="text-base font-semibold">{club.tournamentCount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/30 px-4 py-3">
                      <Badge className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", meta.tone)}>
                        <meta.icon className="h-4 w-4" />
                        {meta.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Regisztrálva: {new Date(club.createdAt).toLocaleDateString("hu-HU")}
                      </span>
                    </div>
                  </CardContent>

                  <CardFooter className="mt-auto flex items-center justify-between gap-3 p-0 pt-6">
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span>Összes tag: {club.memberCount}</span>
                      <span>Összes torna: {club.tournamentCount}</span>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className={cn("gap-2 bg-card/80 hover:bg-card text-foreground", PANEL_SHADOW)}
                    >
                      <Link href={`/clubs/${club._id}`} target="_blank" rel="noreferrer">
                        <IconExternalLink className="h-4 w-4" />
                        Megnyitás
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
