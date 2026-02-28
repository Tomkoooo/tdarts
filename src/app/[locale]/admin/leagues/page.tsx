"use client"
import { useTranslations } from "next-intl";


import { useEffect, useState } from "react"
import axios from "axios"
import {
  IconCalendar,
  IconSearch,
  IconRefresh,
  IconFilter,
  IconBuilding,
  IconShield,
  IconCheck,
  IconX,
  IconAward
} from "@tabler/icons-react"
import toast from "react-hot-toast"
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
// Use common Pagination if exists, otherwise assume implementation or import
import Pagination from "@/components/common/Pagination"
import { getPointSystemDefinition } from "@/lib/leaguePointSystems"

interface League {
  _id: string;
  name: string;
  description: string;
  pointSystemType: string;
  verified: boolean;
  isActive: boolean;
  createdAt: string;
  club: {
    _id: string;
    name: string;
    verified: boolean;
  };
}

interface LeagueStats {
  total: number
  verified: number
  unverified: number
}

export default function AdminLeaguesPage() {
    const t = useTranslations("Admin.leagues");
    const tCommon = useTranslations("Admin.common");
  const [leagues, setLeagues] = useState<League[]>([])
  const [stats, setStats] = useState<LeagueStats>({ total: 0, verified: 0, unverified: 0 })
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all")
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [paginationTotal, setPaginationTotal] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchLeagues(1, searchTerm, verifiedFilter)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, verifiedFilter])

  useEffect(() => {
    fetchLeagues(page, searchTerm, verifiedFilter)
  }, [page])

  const fetchLeagues = async (p: number, search: string, verified: string) => {
    try {
      setLoading(true)
      const response = await axios.get("/api/admin/leagues", {
        params: {
          page: p,
          limit: 10,
          search,
          verified
        }
      })
      
      setLeagues(response.data.leagues || [])
      setStats(response.data.stats || { total: 0, verified: 0, unverified: 0 })
      setTotalPages(response.data.pagination.totalPages || 1)
      setPaginationTotal(response.data.pagination.total || 0)
      setPage(response.data.pagination.page || 1)
    } catch (error: any) {
      console.error("Error fetching leagues:", error)
      toast.error(t("hiba_történt_a_14"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("ligák")}</h1>
          <p className="text-muted-foreground">{t("ligák_kezelése_statisztikák")}</p>
        </div>
        <Button 
          onClick={() => fetchLeagues(page, searchTerm, verifiedFilter)} 
          disabled={loading} 
          variant="outline"
          size="sm" 
          className="gap-2"
        >
          <IconRefresh className={cn("size-4", loading && "animate-spin")} />
          {t("frissítés")}</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard 
          title={t("összes_liga")} 
          value={stats.total} 
          icon={IconAward} 
          className="bg-primary/5 text-primary" 
        />
        <StatsCard 
          title={t("hitelesített_oac")} 
          value={stats.verified} 
          icon={IconCheck} 
          className="bg-success/5 text-success" 
        />
        <StatsCard 
          title={t("platform_ligák")} 
          value={stats.unverified} 
          icon={IconX} 
          className="bg-muted/10 text-muted-foreground" 
        />
      </div>

      {/* Filters & Content */}
      <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b bg-muted/40 px-6 py-4">
           <div className="flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="relative w-full md:w-96">
                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder={t("keresés_név_vagy")} 
                  className="pl-9 bg-background/50 border-input/50 focus:bg-background transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="flex items-center gap-2 w-full md:w-auto">
               <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                 <SelectTrigger className="w-[200px] bg-background/50">
                    <div className="flex items-center gap-2">
                       <IconFilter className="size-4" />
                       <SelectValue placeholder={t("szűrés_típusra")} />
                    </div>
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">{t("minden_típus")}</SelectItem>
                   <SelectItem value="verified">{t("verified_oac")}</SelectItem>
                   <SelectItem value="unverified">{t("platform")}</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>{t("liga_neve")}</TableHead>
                <TableHead>{tCommon("klub")}</TableHead>
                <TableHead>{t("pontozási_rendszer")}</TableHead>
                <TableHead>{t("státusz")}</TableHead>
                <TableHead>{tCommon("aktív")}</TableHead>
                <TableHead>{tCommon("létrehozva")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && leagues.length === 0 ? (
                 Array.from({ length: 5 }).map((_, i) => (
                   <TableRow key={i}>
                     <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                   </TableRow>
                 ))
              ) : leagues.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {t("nincs_találat_a")}</TableCell>
                </TableRow>
              ) : (
                leagues.map((league) => (
                  <TableRow key={league._id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <span className="font-medium text-foreground">{league.name}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <IconBuilding className="size-3.5" />
                        <span className="text-xs">
                          {league.club ? (
                             <>
                               {league.club.name}
                               {league.club.verified && <span className="text-success ml-1 font-bold">•</span>}
                             </>
                          ) : "Nincs klub"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "font-normal",
                        league.pointSystemType === 'remiz_christmas' ? "border-warning/50 text-warning bg-warning/5" : "text-muted-foreground"
                      )}>
                        {getPointSystemDefinition(league.pointSystemType).label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                       {league.verified ? (
                          <Badge variant="secondary" className="gap-1 bg-success/15 text-success hover:bg-success/25">
                            <IconShield className="size-3" /> {t("oac_liga")}</Badge>
                       ) : (
                          <Badge variant="outline" className="text-muted-foreground">{t("platform_liga")}</Badge>
                       )}
                    </TableCell>
                    <TableCell>
                      {league.isActive ? (
                        <Badge variant="secondary" className="bg-success/10 text-success rounded-full size-2 p-0" title={tCommon("aktív")} />
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground rounded-full size-2 p-0" title={t("inaktív")} />
                      )}
                      <span className="ml-2 text-sm text-muted-foreground">{league.isActive ? "Aktív" : "Inaktív"}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      <div className="flex items-center gap-1">
                          <IconCalendar size={14} />
                          {new Date(league.createdAt).toLocaleDateString("hu-HU")}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination Footer */}
        <div className="border-t bg-muted/20 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {tCommon("összesen")}<strong>{paginationTotal}</strong> {tCommon("találat_oldal")}{page} / {totalPages})
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
