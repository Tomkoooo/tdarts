"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import {
  IconTrophy,
  IconUsers,
  IconCalendar,
  IconExternalLink,
  IconSearch,
  IconRefresh,
  IconFilter,
  IconBuilding,
  IconClock,
  IconTarget,
} from "@tabler/icons-react"
import Link from "next/link"
import toast from "react-hot-toast"
import DailyChart from "@/components/admin/DailyChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/Label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface AdminTournament {
  _id: string
  name: string
  tournamentId: string
  description?: string
  status: "pending" | "active" | "finished" | "group-stage" | "knockout"
  tournamentType: "group" | "knockout" | "group_knockout"
  startDate: string
  endDate?: string
  playerCount: number
  clubId: {
    _id: string
    name: string
  }
  createdAt: string
  isDeleted: boolean
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<AdminTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/admin/tournaments")
      setTournaments(response.data.tournaments || [])
    } catch (error: any) {
      console.error("Error fetching tournaments:", error)
      toast.error(error.response?.data?.error || "Hiba történt a versenyek betöltése során")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTournaments()
  }, [])

  const filteredTournaments = tournaments.filter((tournament) => {
    const matchesSearch =
      tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tournament.description && tournament.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      tournament.clubId.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || tournament.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Függőben" },
      active: { variant: "default", label: "Aktív" },
      "group-stage": { variant: "default", label: "Csoportkör" },
      knockout: { variant: "outline", label: "Kieséses" },
      finished: { variant: "default", label: "Befejezett" },
    }
    return configs[status] || { variant: "outline", label: status }
  }

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { label: string; icon: any }> = {
      group: { label: "Csoportos", icon: IconUsers },
      knockout: { label: "Kieséses", icon: IconTarget },
      group_knockout: { label: "Vegyes", icon: IconTrophy },
    }
    return configs[type] || { label: type, icon: IconTrophy }
  }

  const stats = {
    total: tournaments.length,
    active: tournaments.filter((t) => t.status === "active" || t.status === "group-stage" || t.status === "knockout").length,
    finished: tournaments.filter((t) => t.status === "finished").length,
    pending: tournaments.filter((t) => t.status === "pending").length,
    totalPlayers: tournaments.reduce((total, t) => total + t.playerCount, 0),
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <p className="text-sm text-muted-foreground">Versenyek betöltése…</p>
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
            <div className="flex items-center gap-3 text-warning">
              <IconTrophy className="size-10" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Verseny Kezelés</h1>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">Versenyek áttekintése és kezelése</p>
          </div>

          <Button onClick={fetchTournaments} disabled={loading} variant="outline" className="gap-2">
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
              <IconTrophy className="size-7 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Összes</h3>
            <p className="text-4xl font-bold text-primary">{stats.total}</p>
          </CardContent>
        </Card>
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-info/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconClock className="size-7 text-info" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Aktív</h3>
            <p className="text-4xl font-bold text-info">{stats.active}</p>
          </CardContent>
        </Card>
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconTrophy className="size-7 text-success" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Befejezett</h3>
            <p className="text-4xl font-bold text-success">{stats.finished}</p>
          </CardContent>
        </Card>
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconClock className="size-7 text-warning" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Függőben</h3>
            <p className="text-4xl font-bold text-warning">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconUsers className="size-7 text-destructive" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Játékosok</h3>
            <p className="text-4xl font-bold text-destructive">{stats.totalPlayers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart */}
      <DailyChart title="Versenyek napi indítása" apiEndpoint="/api/admin/charts/tournaments/daily" color="warning" />

      {/* Filters */}
      <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconFilter className="size-5 text-primary" />
            Szűrők
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Keresés</Label>
              <div className="relative">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Keresés név, leírás vagy klub alapján..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Státusz</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes státusz</SelectItem>
                  <SelectItem value="pending">Függőben</SelectItem>
                  <SelectItem value="active">Aktív</SelectItem>
                  <SelectItem value="group-stage">Csoportkör</SelectItem>
                  <SelectItem value="knockout">Kieséses</SelectItem>
                  <SelectItem value="finished">Befejezett</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tournaments List */}
      {filteredTournaments.length === 0 ? (
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-12 text-center">
            <div className="size-20 backdrop-blur-md bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconTrophy className="size-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Nincsenek versenyek</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Nincsenek versenyek a megadott feltételekkel."
                : "Még nincsenek versenyek."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTournaments.map((tournament) => {
            const statusConfig = getStatusConfig(tournament.status)
            const typeConfig = getTypeConfig(tournament.tournamentType)
            return (
              <Card key={tournament._id} elevation="elevated" className="backdrop-blur-xl bg-card/30 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="size-12 backdrop-blur-md bg-warning/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconTrophy className="size-6 text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-foreground mb-2 break-words">{tournament.name}</h3>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                            <Badge variant="outline" className="gap-1">
                              <typeConfig.icon size={14} />
                              {typeConfig.label}
                            </Badge>
                            {tournament.isDeleted && (
                              <Badge variant="destructive">Törölve</Badge>
                            )}
                          </div>
                          {tournament.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{tournament.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <IconBuilding size={16} className="text-primary" />
                          <span className="truncate">{tournament.clubId.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <IconUsers size={16} className="text-info" />
                          <span>{tournament.playerCount} játékos</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <IconCalendar size={16} className="text-warning" />
                          <span>{new Date(tournament.startDate).toLocaleDateString("hu-HU")}</span>
                        </div>
                      </div>
                    </div>

                    <Link href={`/tournaments/${tournament.tournamentId}`} target="_blank">
                      <Button variant="default" className="gap-2 flex-shrink-0">
                        <IconExternalLink size={18} />
                        Megnyitás
                      </Button>
                    </Link>
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
