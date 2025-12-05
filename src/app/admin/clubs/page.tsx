"use client"

import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import Link from "next/link"
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
  IconCalendar,
} from "@tabler/icons-react"
import toast from "react-hot-toast"
import DailyChart from "@/components/admin/DailyChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

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
  verified: boolean
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
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [apiStats, setApiStats] = useState({ total: 0, verified: 0, unverified: 0 })

  const fetchClubs = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/admin/clubs")
      setClubs(response.data.clubs || [])
      setApiStats(response.data.stats || { total: 0, verified: 0, unverified: 0 })
    } catch (error: any) {
      console.error("Error fetching clubs:", error)
      toast.error(error.response?.data?.error || "Hiba történt a klubok betöltése során")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClubs()
  }, [])

  const filteredClubs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    let filtered = clubs
    
    // Apply verified filter
    if (verifiedFilter === 'verified') {
      filtered = filtered.filter(club => club.verified === true)
    } else if (verifiedFilter === 'unverified') {
      filtered = filtered.filter(club => club.verified !== true)
    }
    
    // Apply search filter
    if (term) {
      filtered = filtered.filter((club) => {
        const haystack = [club.name, club.location, club.description ?? ""].map((value) => value.toLowerCase())
        return haystack.some((value) => value.includes(term))
      })
    }
    
    return filtered
  }, [clubs, searchTerm, verifiedFilter])

 const stats = useMemo(
    () => ({
      total: clubs.length,
      active: clubs.filter((club) => !club.isDeleted).length,
      deleted: clubs.filter((club) => club.isDeleted).length,
      totalMembers: clubs.reduce((total, club) => total + club.memberCount, 0),
      totalTournaments: clubs.reduce((total, club) => total + club.tournamentCount, 0),
      verified: apiStats.verified,
      unverified: apiStats.unverified,
    }),
    [clubs, apiStats]
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <p className="text-sm text-muted-foreground">Klubok betöltése…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <Card
        elevation="elevated"
        className="relative overflow-hidden backdrop-blur-xl bg-card/30 p-8"
      >
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-success">
              <IconBuilding className="size-10" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Klub Kezelés</h1>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">Klubok áttekintése és kezelése</p>
          </div>

          <Button onClick={fetchClubs} disabled={loading} variant="outline" className="gap-2">
            <IconRefresh className={cn("size-5", loading && "animate-spin")} />
            Frissítés
          </Button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconBuilding className="size-7 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Összes Klub</h3>
            <p className="text-4xl font-bold text-primary">{stats.total}</p>
          </CardContent>
        </Card>
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconBuilding className="size-7 text-success" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Aktív Klubok</h3>
            <p className="text-4xl font-bold text-success">{stats.active}</p>
          </CardContent>
        </Card>
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconBuilding className="size-7 text-destructive" />
                  </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Törölt</h3>
            <p className="text-4xl font-bold text-destructive">{stats.deleted}</p>
          </CardContent>
        </Card>
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-info/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconUsers className="size-7 text-info" />
                </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Tagok</h3>
            <p className="text-4xl font-bold text-info">{stats.totalMembers}</p>
              </CardContent>
            </Card>
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconTrophy className="size-7 text-warning" />
        </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Versenyek</h3>
            <p className="text-4xl font-bold text-warning">{stats.totalTournaments}</p>
        </CardContent>
      </Card>
      </div>

      {/* Daily Chart */}
      <DailyChart title="Klubok napi létrehozása" apiEndpoint="/api/admin/charts/clubs/daily" color="secondary" />

      {/* Verification Filter Tabs */}
      <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <CardTitle>Szűrés hitelesítés szerint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={verifiedFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setVerifiedFilter('all')}
              className="gap-2"
            >
              Összes ({stats.total})
            </Button>
            <Button
              variant={verifiedFilter === 'verified' ? 'default' : 'outline'}
              onClick={() => setVerifiedFilter('verified')}
              className="gap-2 bg-success/20 hover:bg-success/30 text-success"
            >
              OAC Klubok ({stats.verified})
            </Button>
            <Button
              variant={verifiedFilter === 'unverified' ? 'default' : 'outline'}
              onClick={() => setVerifiedFilter('unverified')}
              className="gap-2"
            >
              Platform Klubok ({stats.unverified})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <CardTitle className="font-semibold">Keresés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Keresés név, helyszín vagy leírás alapján..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Clubs Grid */}
        {filteredClubs.length === 0 ? (
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-12 text-center">
            <div className="size-20 backdrop-blur-md bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconBuilding className="size-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Nincsenek klubok</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Nincsenek klubok a megadott feltételekkel." : "Még nincsenek regisztrált klubok."}
            </p>
          </CardContent>
          </Card>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClubs.map((club) => {
            const subBadge = subscriptionMeta[club.subscriptionModel || "free"]
              return (
              <Card key={club._id} elevation="elevated" className="backdrop-blur-xl bg-card/30 hover:shadow-xl transition-all duration-300 group">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="mb-2 group-hover:text-primary transition-colors truncate">{club.name}</CardTitle>
                      <div className="flex items-center gap-2 text-muted-foreground mb-3">
                        <IconMapPin className="size-4 flex-shrink-0" />
                        <span className="text-sm truncate">{club.location}</span>
                      </div>
                    </div>
                    {club.isDeleted && (
                      <Badge variant="destructive" className="flex-shrink-0">Törölve</Badge>
                    )}
                  </div>
                    {club.description && (
                    <CardDescription className="line-clamp-2 leading-relaxed">{club.description}</CardDescription>
                    )}
                  </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="size-8 backdrop-blur-md bg-info/20 rounded-lg flex items-center justify-center">
                          <IconUsers className="size-4 text-info" />
                        </div>
                        <span className="font-bold">{club.memberCount}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="size-8 backdrop-blur-md bg-warning/20 rounded-lg flex items-center justify-center">
                          <IconTrophy className="size-4 text-warning" />
                        </div>
                        <span className="font-bold">{club.tournamentCount}</span>
                      </div>
                    </div>

                  <div className="flex items-center justify-between mb-4 pb-4 pt-4">
                    <Badge className={cn("gap-1 backdrop-blur-md", subBadge.tone)}>
                      <subBadge.icon size={14} />
                      {subBadge.label}
                      </Badge>
                    <Link href={`/clubs/${club._id}`} target="_blank">
                      <Button variant="default" size="sm" className="gap-2">
                        <IconExternalLink size={16} />
                        Megnyitás
                      </Button>
                      </Link>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconCalendar size={14} />
                    <span>{new Date(club.createdAt).toLocaleDateString("hu-HU")}</span>
                  </div>
                </CardContent>
                </Card>
              )
            })}
          </div>
        )}
    </div>
  )
}
