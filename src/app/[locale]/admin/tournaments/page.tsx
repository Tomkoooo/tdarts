import { useTranslations } from "next-intl";

"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import Link from "next/link"
import {
  IconTrophy,
  IconUsers,
  IconCalendar,
  IconExternalLink,
  IconSearch,
  IconRefresh,
  IconBuilding,
  IconClock,
  IconTarget,
  IconShield
} from "@tabler/icons-react"
import toast from "react-hot-toast"
import DailyChart from "@/components/admin/DailyChart"
import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import Pagination from "@/components/common/Pagination"

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
  verified: boolean
  league?: {
    _id: string
    name: string
    verified: boolean
  }
  isSandbox: boolean
}

interface TournamentStats {
  total: number
  active: number
  finished: number
  pending: number
  totalPlayers: number
  verified: number
  unverified: number
  sandbox: number
}

export default function AdminTournamentsPage() {
    const t = useTranslations("Auto");
  const [tournaments, setTournaments] = useState<AdminTournament[]>([])
  const [stats, setStats] = useState<TournamentStats>({ 
    total: 0, active: 0, finished: 0, pending: 0, 
    totalPlayers: 0, verified: 0, unverified: 0, sandbox: 0 
  })
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all") // all, verified, unverified
  const [sandboxFilter, setSandboxFilter] = useState<string>("all") // all, active, sandbox
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [paginationTotal, setPaginationTotal] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchTournaments(1, searchTerm, statusFilter, verifiedFilter, sandboxFilter)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, statusFilter, verifiedFilter, sandboxFilter])

  useEffect(() => {
    fetchTournaments(page, searchTerm, statusFilter, verifiedFilter, sandboxFilter)
  }, [page])

  const fetchTournaments = async (p: number, search: string, status: string, verified: string, sandbox: string) => {
    try {
      setLoading(true)
      const response = await axios.get("/api/admin/tournaments", {
        params: {
          page: p,
          limit: 10,
          search,
          status,
          verified,
          sandbox
        }
      })
      setTournaments(response.data.tournaments || [])
      setStats(response.data.stats || { total: 0, active: 0, finished: 0, pending: 0, totalPlayers: 0, verified: 0, unverified: 0, sandbox: 0 })
      setTotalPages(response.data.pagination.totalPages || 1)
      setPaginationTotal(response.data.pagination.total || 0)
      setPage(response.data.pagination.page || 1)
    } catch (error: any) {
      console.error("Error fetching tournaments:", error)
      toast.error(t("hiba_történt_az"))
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("versenyek")}</h1>
          <p className="text-muted-foreground">{t("versenyek_kezelése_statisztikák")}</p>
        </div>
        <Button 
          onClick={() => fetchTournaments(page, searchTerm, statusFilter, verifiedFilter, sandboxFilter)} 
          disabled={loading} 
          variant="outline" 
          size="sm"
          className="gap-2"
        >
          <IconRefresh className={cn("size-4", loading && "animate-spin")} />
          {t("frissítés")}</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard 
          title={t("összes")} 
          value={stats.total} 
          icon={IconTrophy} 
          className="bg-primary/5 text-primary" 
        />
        <StatsCard 
          title={t("aktív")} 
          value={stats.active} 
          icon={IconClock} 
          className="bg-info/5 text-info" 
        />
        <StatsCard 
          title={t("befejezett")} 
          value={stats.finished} 
          icon={IconTrophy} 
          className="bg-success/5 text-success" 
        />
        <StatsCard 
          title={t("függőben")} 
          value={stats.pending} 
          icon={IconClock} 
          className="bg-warning/5 text-warning" 
        />
         <StatsCard 
          title={t("játékosok")} 
          value={stats.totalPlayers} 
          icon={IconUsers} 
          className="bg-destructive/5 text-destructive" 
        />
      </div>

      {/* Daily Chart */}
      <DailyChart title={t("versenyek_napi_indítása")} apiEndpoint="/api/admin/charts/tournaments/daily" color="warning" />

      {/* Filters & Content */}
      <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b bg-muted/40 px-6 py-4">
           {/* Filters Row */}
           <div className="flex flex-col gap-4">
             <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                      placeholder={t("keresés_név_klub")} 
                      className="pl-9 bg-background/50 border-input/50 focus:bg-background transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] bg-background/50">
                             <SelectValue placeholder={t("státusz")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("összes_státusz")}</SelectItem>
                          <SelectItem value="pending">{t("függőben")}</SelectItem>
                          <SelectItem value="active">{t("aktív")}</SelectItem>
                          <SelectItem value="group-stage">{t("csoportkör")}</SelectItem>
                          <SelectItem value="knockout">{t("kieséses")}</SelectItem>
                          <SelectItem value="finished">{t("befejezett")}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                        <SelectTrigger className="w-[140px] bg-background/50">
                             <SelectValue placeholder={t("típus")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("minden_típus")}</SelectItem>
                          <SelectItem value="verified">{t("verified_oac")}</SelectItem>
                          <SelectItem value="unverified">{t("platform")}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sandboxFilter} onValueChange={setSandboxFilter}>
                         <SelectTrigger className="w-[140px] bg-background/50">
                             <SelectValue placeholder={t("mód")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("minden_mód")}</SelectItem>
                          <SelectItem value="active">{t("éles")}</SelectItem>
                          <SelectItem value="sandbox">{t("sandbox")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
             </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("verseny_név")}</TableHead>
                <TableHead>{t("klub")}</TableHead>
                <TableHead>{t("típus")}</TableHead>
                <TableHead>{t("státusz")}</TableHead>
                <TableHead className="text-center">{t("játékosok")}</TableHead>
                <TableHead>{t("dátum")}</TableHead>
                <TableHead className="text-right">{t("műveletek")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && tournaments.length === 0 ? (
                 Array.from({ length: 5 }).map((_, i) => (
                   <TableRow key={i}>
                     <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                     <TableCell><Skeleton className="size-8 ml-auto" /></TableCell>
                   </TableRow>
                 ))
              ) : tournaments.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {t("nincs_találat_a")}</TableCell>
                </TableRow>
              ) : (
                tournaments.map((tournament) => {
                  const statusConfig = getStatusConfig(tournament.status)
                  const typeConfig = getTypeConfig(tournament.tournamentType)
                  return (
                    <TableRow key={tournament._id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-foreground">{tournament.name}</span>
                          <div className="flex items-center gap-2">
                             {tournament.verified && (
                                <Badge variant="secondary" className="h-5 px-1 bg-success/15 text-success hover:bg-success/25 gap-1 text-[10px]">
                                  <IconShield className="size-3" /> {t("oac")}</Badge>
                             )}
                             {tournament.isSandbox && (
                                <Badge variant="outline" className="h-5 px-1 border-warning/50 text-warning gap-1 text-[10px]">
                                   {t("sandbox")}</Badge>
                             )}
                              {tournament.isDeleted && <Badge variant="destructive" className="h-5 px-1 text-[10px]">{t("törölve")}</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <IconBuilding className="size-3.5" />
                          <span className="text-xs">{tournament.clubId?.name || "Ismeretlen"}</span>
                        </div>
                      </TableCell>
                       <TableCell>
                         <Badge variant="outline" className="gap-1 font-normal">
                           <typeConfig.icon size={12} />
                           {typeConfig.label}
                         </Badge>
                      </TableCell>
                      <TableCell>
                         <Badge variant={statusConfig.variant} className="capitalize">
                           {statusConfig.label}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-muted/50 text-muted-foreground">
                            {tournament.playerCount}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        <div className="flex items-center gap-1">
                            <IconCalendar size={14} />
                            {new Date(tournament.startDate).toLocaleDateString("hu-HU")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                         <div className="flex justify-end">
                            <Link href={`/tournaments/${tournament.tournamentId}`} target="_blank">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                <IconExternalLink className="size-4" />
                              </Button>
                            </Link>
                         </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Footer */}
        {/* Pagination Footer */}
        <div className="border-t bg-muted/20 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground order-2 sm:order-1 text-center sm:text-left w-full sm:w-auto">
              {t("összesen")}<strong>{paginationTotal}</strong> {t("találat_oldal")}{page} / {totalPages})
            </span>
            {totalPages > 1 && (
              <div className="order-1 sm:order-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            )}
        </div>
      </Card>
      
    </div>
  )
}

function StatsCard({ title, value, icon: Icon, className }: any) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-sm bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={cn("p-3 rounded-xl", className)}>
          <Icon className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  )
}
