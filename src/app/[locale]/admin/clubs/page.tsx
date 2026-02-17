"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import Link from "next/link"
import {
  IconBuilding,
  IconSearch,
  IconExternalLink,
  IconRefresh,
  IconMapPin,
  IconShield,
  IconStar,
  IconFilter,
  IconTrash,
  IconCheck,
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
// Use the same pagination component as Users page if it exists, or a simple placeholder
import Pagination from "@/components/common/Pagination"

interface AdminClub {
  _id: string
  name: string
  description?: string
  location: string
  subscriptionModel?: "free" | "basic" | "pro" | "enterprise"
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

interface ClubStats {
  total: number
  active: number
  deleted: number
  verified: number
  unverified: number
}

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<AdminClub[]>([])
  const [stats, setStats] = useState<ClubStats>({ total: 0, active: 0, deleted: 0, verified: 0, unverified: 0 })
  const [loading, setLoading] = useState(true)
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("")
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [paginationTotal, setPaginationTotal] = useState(0)

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchClubs(1, searchTerm, verifiedFilter)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, verifiedFilter])

  // Page Change
  useEffect(() => {
    fetchClubs(page, searchTerm, verifiedFilter)
  }, [page])

  const fetchClubs = async (pageToFetch: number, search: string, verified: string) => {
    try {
      setLoading(true)
      const response = await axios.get("/api/admin/clubs", {
        params: {
          page: pageToFetch,
          limit: 10,
          search,
          verified
        }
      })
      
      setClubs(response.data.clubs || [])
      setStats(response.data.stats || { total: 0, active: 0, deleted: 0, verified: 0, unverified: 0 })
      setTotalPages(response.data.pagination.totalPages || 1)
      setPaginationTotal(response.data.pagination.total || 0)
      setPage(response.data.pagination.page || 1)
    } catch (error: any) {
      console.error("Error fetching clubs:", error)
      toast.error("Hiba történt az adatok betöltése során")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Klubok</h1>
          <p className="text-muted-foreground">Klubok kezelése, statisztikák és áttekintés</p>
        </div>
        <Button onClick={() => fetchClubs(page, searchTerm, verifiedFilter)} variant="outline" size="sm" className="gap-2">
          <IconRefresh className={cn("size-4", loading && "animate-spin")} />
          Frissítés
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Összes Klub" 
          value={stats.total} 
          icon={IconBuilding} 
          className="bg-primary/5 text-primary" 
        />
        <StatsCard 
          title="Aktív Klubok" 
          value={stats.active} 
          icon={IconCheck} 
          className="bg-success/5 text-success" 
        />
        <StatsCard 
          title="Hitelesített" 
          value={stats.verified} 
          icon={IconShield} 
          className="bg-info/5 text-info" 
        />
        <StatsCard 
          title="Törölt" 
          value={stats.deleted} 
          icon={IconTrash} 
          className="bg-destructive/5 text-destructive" 
        />
      </div>

      {/* Daily Chart */}
      <DailyChart title="Klubok napi létrehozása" apiEndpoint="/api/admin/charts/clubs/daily" color="secondary" />

      {/* Main Content Card */}
      <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b bg-muted/40 px-6 py-4">
           <div className="flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="relative w-full md:w-96">
                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder="Keresés név, helyszín vagy leírás alapján..." 
                  className="pl-9 bg-background/50 border-input/50 focus:bg-background transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="flex items-center gap-2 w-full md:w-auto">
               <Select value={verifiedFilter} onValueChange={(v: any) => setVerifiedFilter(v)}>
                 <SelectTrigger className="w-[200px] bg-background/50">
                    <div className="flex items-center gap-2">
                      <IconFilter className="size-4" />
                      <SelectValue placeholder="Szűrés státuszra" />
                    </div>
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Minden klub</SelectItem>
                   <SelectItem value="verified">Csak Hitelesített</SelectItem>
                   <SelectItem value="unverified">Csak Nem Hitelesített</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Klub Név</TableHead>
                <TableHead>Helyszín</TableHead>
                <TableHead>Csomag</TableHead>
                <TableHead className="text-center">Tagok</TableHead>
                <TableHead className="text-center">Versenyek</TableHead>
                <TableHead>Státusz</TableHead>
                <TableHead>Létrehozva</TableHead>
                <TableHead className="text-right">Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && clubs.length === 0 ? (
                 Array.from({ length: 5 }).map((_, i) => (
                   <TableRow key={i}>
                     <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                     <TableCell><Skeleton className="size-8 ml-auto" /></TableCell>
                   </TableRow>
                 ))
              ) : clubs.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    Nincs találat a keresési feltételek alapján.
                   </TableCell>
                </TableRow>
              ) : (
                clubs.map((club) => {
                  const subMeta = subscriptionMeta[club.subscriptionModel || "free"]
                  return (
                    <TableRow key={club._id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{club.name}</span>
                          {club.isDeleted && <span className="text-xs text-destructive font-bold">TÖRÖLVE</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <IconMapPin className="size-3.5" />
                          <span className="text-xs">{club.location || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <Badge variant="secondary" className={cn("gap-1 text-xs font-normal", subMeta.tone)}>
                           <subMeta.icon className="size-3" />
                           {subMeta.label}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-info/20 text-info bg-info/5">{club.memberCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-warning/20 text-warning bg-warning/5">{club.tournamentCount}</Badge>
                      </TableCell>
                      <TableCell>
                        {club.verified ? (
                           <Badge variant="outline" className="border-success/50 text-success bg-success/10 gap-1">
                             <IconShield className="size-3" /> Hitelesített
                           </Badge>
                        ) : (
                           <Badge variant="outline" className="border-border text-muted-foreground gap-1">
                             <IconBuilding className="size-3" /> Normál
                           </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(club.createdAt).toLocaleDateString("hu-HU")}
                      </TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" asChild>
                           <Link href={`/clubs/${club._id}`} target="_blank">
                             <IconExternalLink className="size-4 text-muted-foreground hover:text-primary transition-colors" />
                           </Link>
                         </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Footer */}
        <div className="border-t bg-muted/20 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Összesen <strong>{paginationTotal}</strong> találat (Oldal: {page} / {totalPages})
            </span>
             {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
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
