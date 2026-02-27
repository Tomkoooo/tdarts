"use client"
import { useTranslations } from "next-intl";


import { useEffect, useState } from "react"
import axios from "axios"
import {
  IconCrown,
  IconUser,
  IconTrash,
  IconRefresh,
  IconSearch,
  IconFilter,
  IconShield,
  IconMail,
  IconUsers,
  IconCheck,
  IconX,
  IconDotsVertical,
  IconLock,
  IconSend,
} from "@tabler/icons-react"
import toast from "react-hot-toast"
import { Card, CardContent, CardHeader } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/Label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
// import Pagination from "@/components/common/Pagination" // Replaced with custom or shadcn pagination below

interface AdminUser {
  _id: string
  name: string
  email: string
  username: string
  isAdmin: boolean
  isVerified: boolean
  createdAt: string
  lastLogin?: string
  playerProfile?: {
    _id: string
    name: string
    honors: Array<{
      title: string
      year: number
      type: "rank" | "tournament" | "special"
      description?: string
    }>
  } | null
}

interface UserStats {
  total: number
  admins: number
  verified: number
  unverified: number
}

export default function AdminUsersPage() {
    const t = useTranslations("Admin.users");
    const tCommon = useTranslations("Admin.common");
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<UserStats>({ total: 0, admins: 0, verified: 0, unverified: 0 })
  const [loading, setLoading] = useState(true)
  
  // Server-side filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [paginationTotal, setPaginationTotal] = useState(0)

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1) // Reset to page 1 on search change
      fetchUsers(1, searchTerm, roleFilter)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, roleFilter])

  // Initial Fetch & Page Change
  useEffect(() => {
    fetchUsers(page, searchTerm, roleFilter)
  }, [page]) // Only trigger on page change here, search/filter is handled above

  const fetchUsers = async (pageToFetch: number, search: string, role: string) => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/admin/users`, {
        params: {
          page: pageToFetch,
          limit: 10,
          search,
          role
        }
      })
      
      setUsers(response.data.users || [])
      setStats(response.data.stats || { total: 0, admins: 0, verified: 0, unverified: 0 })
      setTotalPages(response.data.pagination.totalPages || 1)
      setPaginationTotal(response.data.pagination.total || 0)
      setPage(response.data.pagination.page || 1)
    } catch {
      console.error("Error fetching users")
      toast.error(tCommon("hiba_történt_az"))
    } finally {
      setLoading(false)
    }
  }

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? "remove-admin" : "make-admin"
      await axios.post(`/api/admin/users/${userId}/${action}`)
      fetchUsers(page, searchTerm, roleFilter) // Refresh to ensure data consistency
      toast.success(currentStatus ? "Admin jogosultság eltávolítva" : "Admin jogosultság hozzáadva")
    } catch {
      toast.error(t("hiba_történt_a_39"))
    }
  }

  const deactivateUser = async (userId: string) => {
    if (!window.confirm("Biztosan deaktiválja ezt a felhasználót?")) return
    try {
      await axios.post(`/api/admin/users/${userId}/deactivate`)
      fetchUsers(page, searchTerm, roleFilter)
      toast.success(t("felhasználó_deaktiválva"))
    } catch {
      toast.error(t("hiba_történt_a_29"))
    }
  }

  const toggleVerifiedStatus = async (user: AdminUser) => {
    try {
      await axios.patch(`/api/admin/users/${user._id}`, { isVerified: !user.isVerified })
      fetchUsers(page, searchTerm, roleFilter)
      toast.success(!user.isVerified ? "Email megerősítve" : "Email megerősítés visszavonva")
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Hiba történt az ellenőrzés során")
    }
  }

  const setUserPassword = async (user: AdminUser) => {
    const newPassword = window.prompt(`Adj meg új jelszót a felhasználóhoz (${user.email})`)
    if (!newPassword) return
    if (newPassword.length < 8) {
      toast.error("A jelszónak legalább 8 karakteresnek kell lennie")
      return
    }

    try {
      await axios.post(`/api/admin/users/${user._id}/set-password`, { newPassword })
      toast.success("Jelszó sikeresen frissítve")
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Jelszó frissítése sikertelen")
    }
  }

  const sendResetPassword = async (user: AdminUser) => {
    if (!window.confirm(`Reset jelszó email küldése ennek a felhasználónak?\n${user.email}`)) return

    try {
      await axios.post(`/api/admin/users/${user._id}/send-reset`)
      toast.success("Reset email elküldve")
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Reset email küldése sikertelen")
    }
  }

  const editPlayerName = async (user: AdminUser) => {
    if (!user.playerProfile?._id) {
      toast.error("Ehhez a felhasználóhoz nem található játékos profil")
      return
    }

    const newName = window.prompt("Új játékos profil név", user.playerProfile.name || user.name)
    if (!newName || newName.trim().length < 2) return

    try {
      await axios.patch(`/api/admin/players/${user.playerProfile._id}`, { name: newName.trim() })
      fetchUsers(page, searchTerm, roleFilter)
      toast.success("Játékos profil név frissítve")
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Játékos név frissítése sikertelen")
    }
  }

  const editPlayerHonors = async (user: AdminUser) => {
    if (!user.playerProfile?._id) {
      toast.error("Ehhez a felhasználóhoz nem található játékos profil")
      return
    }

    const currentHonors = user.playerProfile.honors || []
    const input = window.prompt(
      "Honors szerkesztése JSON-ben (title, year, type, description?).",
      JSON.stringify(currentHonors, null, 2)
    )

    if (input === null) return

    try {
      const parsedHonors = JSON.parse(input)
      await axios.patch(`/api/admin/players/${user.playerProfile._id}`, { honors: parsedHonors })
      fetchUsers(page, searchTerm, roleFilter)
      toast.success("Játékos honors frissítve")
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Hibás JSON vagy mentési hiba")
    }
  }

  // --- Email Modal State ---
  const [emailModal, setEmailModal] = useState<{ isOpen: boolean; user: AdminUser | null }>({ isOpen: false, user: null })

  const sendEmail = async (subject: string, message: string, language: "hu" | "en") => {
    if (!emailModal.user) return
    try {
      await axios.post("/api/admin/send-email", {
        userId: emailModal.user._id,
        subject,
        message,
        language,
      })
      toast.success(t("email_sikeresen_elküldve"))
      setEmailModal({ isOpen: false, user: null })
    } catch {
      toast.error(t("hiba_történt_az_9"))
    }
  }

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("felhasználók")}</h1>
          <p className="text-muted-foreground">{t("felhasználói_fiókok_kezelése")}</p>
        </div>
        <Button onClick={() => fetchUsers(page, searchTerm, roleFilter)} variant="outline" size="sm" className="gap-2">
          <IconRefresh className={cn("size-4", loading && "animate-spin")} />
          {t("frissítés")}</Button>
      </div>

      {/* Stats Grid - Displays GLOBAL stats from DB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title={t("összes_felhasználó")} 
          value={stats.total} 
          icon={IconUsers} 
          className="bg-primary/5 text-primary" 
        />
        <StatsCard 
          title={t("adminisztrátorok")} 
          value={stats.admins} 
          icon={IconCrown} 
          className="bg-warning/5 text-warning" 
        />
        <StatsCard 
          title={t("regisztrált")} 
          value={stats.verified} 
          icon={IconCheck} 
          className="bg-success/5 text-success" 
        />
        <StatsCard 
          title={t("nem_regisztrált")} 
          value={stats.unverified} 
          icon={IconX} 
          className="bg-destructive/5 text-destructive" 
        />
      </div>

      {/* Main Content Card (Filters + Table) */}
      <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b bg-muted/40 px-6 py-4">
           <div className="flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="relative w-full md:w-96">
                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input 
                  placeholder={t("keresés_név_email")} 
                  className="pl-9 bg-background/50 border-input/50 focus:bg-background transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="flex items-center gap-2 w-full md:w-auto">
               <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
                 <SelectTrigger className="w-[180px] bg-background/50">
                    <div className="flex items-center gap-2">
                      <IconFilter className="size-4" />
                      <SelectValue placeholder={t("szűrés_szerepkörre")} />
                    </div>
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">{t("minden_felhasználó")}</SelectItem>
                   <SelectItem value="admin">{t("csak_adminok")}</SelectItem>
                   <SelectItem value="user">{t("csak_felhasználók")}</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>{t("felhasználó")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("szerepkör")}</TableHead>
                <TableHead>{t("státusz")}</TableHead>
                <TableHead>{t("csatlakozott")}</TableHead>
                <TableHead className="text-right">{t("műveletek")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && users.length === 0 ? (
                 Array.from({ length: 5 }).map((_, i) => (
                   <TableRow key={i}>
                     <TableCell><Skeleton className="size-8 rounded-full" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                     <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                   </TableRow>
                 ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {t("nincs_találat_a")}</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="size-9 rounded-full bg-linear-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xs font-bold text-primary border border-white/10">
                        {user.name.slice(0, 2).toUpperCase()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{user.name}</span>
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <Badge variant="outline" className="border-warning/50 text-warning bg-warning/10 gap-1 hover:bg-warning/20">
                          <IconCrown className="size-3" /> {t("admin")}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground gap-1">
                          <IconUser className="size-3" /> {t("felhasználó")}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isVerified ? (
                        <Badge variant="outline" className="border-success/50 text-success bg-success/10 gap-1 hover:bg-success/20">
                          <IconCheck className="size-3" /> {tCommon("aktív")}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10 gap-1 hover:bg-destructive/20">
                          <IconX className="size-3" /> {t("nem_megerősített")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(user.createdAt).toLocaleDateString("hu-HU")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <IconDotsVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t("műveletek")}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEmailModal({ isOpen: true, user })}>
                            <IconMail className="size-4 mr-2" />
                            {t("email_küldése")}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleAdminStatus(user._id, user.isAdmin)}>
                            <IconShield className="size-4 mr-2" />
                            {user.isAdmin ? "Admin jog elvétele" : "Adminná tétel"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleVerifiedStatus(user)}>
                            <IconCheck className="size-4 mr-2" />
                            {user.isVerified ? "Email megerősítés visszavonása" : "Email manuális megerősítése"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setUserPassword(user)}>
                            <IconLock className="size-4 mr-2" />
                            Jelszó közvetlen beállítása
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sendResetPassword(user)}>
                            <IconSend className="size-4 mr-2" />
                            Jelszó reset email küldése
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => editPlayerName(user)}>
                            <IconUser className="size-4 mr-2" />
                            Játékos profil név szerkesztése
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => editPlayerHonors(user)}>
                            <IconCrown className="size-4 mr-2" />
                            Játékos honors szerkesztése
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => deactivateUser(user._id)}>
                            <IconTrash className="size-4 mr-2" />
                            {t("fiók_felfüggesztése")}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                {t("előző")}</Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                {t("következő")}</Button>
            </div>
        </div>
      </Card>

      {/* Email Modal */}
      {emailModal.isOpen && emailModal.user && (
         <EmailModal 
           user={emailModal.user} 
           onClose={() => setEmailModal({ isOpen: false, user: null })} 
           onSend={sendEmail} 
         />
      )}
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

// Re-using EmailModal logic but keeping it cleaner
function EmailModal({ user, onClose, onSend }: { user: AdminUser, onClose: () => void, onSend: (s:string, m:string, l:"hu"|"en")=>void }) {
    const t = useTranslations("Admin.users");
  // Keeping simplified for brevity, assume similar logic to before but with shadcn Dialog
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [lang, setLang] = useState<"hu"|"en">("hu")
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
     setLoading(true)
     await onSend(subject, message, lang)
     setLoading(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("email_küldése_59")}{user.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
           <div className="grid gap-2">
             <Label>{t("tárgy")}</Label>
             <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t("üzenet_tárgya")} />
           </div>
           <div className="grid gap-2">
            <Label>{t("üzenet")}</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t("írja_be_az")} rows={5} />
           </div>
           <div className="grid gap-2">
             <Label>{t("nyelv")}</Label>
             <Select value={lang} onValueChange={(v:any) => setLang(v)}>
               <SelectTrigger><SelectValue /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="hu">{t("magyar")}</SelectItem>
                 <SelectItem value="en">{t("angol")}</SelectItem>
               </SelectContent>
             </Select>
           </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>{t("mégse")}</Button>
          <Button onClick={handleSend} disabled={loading || !subject || !message}>
            {loading ? "Küldés..." : "Küldés"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
