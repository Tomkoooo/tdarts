"use client"

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
  IconEye,
  IconEyeOff,
  IconX,
  IconCalendar,
  IconClock,
  IconUsers,
} from "@tabler/icons-react"
import toast from "react-hot-toast"
import DailyChart from "@/components/admin/DailyChart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/Label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface AdminUser {
  _id: string
  name: string
  email: string
  username: string
  isAdmin: boolean
  isVerified: boolean
  createdAt: string
  lastLogin?: string
  isDeleted?: boolean
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<"all" | "admin" | "user">("all")
  const [emailModal, setEmailModal] = useState<{
    isOpen: boolean
    user: AdminUser | null
  }>({ isOpen: false, user: null })

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/admin/users")
      setUsers(response.data.users || response.data.data?.users || [])
    } catch (error: any) {
      console.error("Error fetching users:", error)
      toast.error(error.response?.data?.error || "Hiba történt a felhasználók betöltése során")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? "remove-admin" : "make-admin"
      await axios.post(`/api/admin/users/${userId}/${action}`)

      setUsers((prev) =>
        prev.map((user) => (user._id === userId ? { ...user, isAdmin: !currentStatus } : user))
      )

      toast.success(currentStatus ? "Admin jogosultság eltávolítva" : "Admin jogosultság hozzáadva")
    } catch (error: any) {
      console.error("Error toggling admin status:", error)
      toast.error(error.response?.data?.error || "Hiba történt a művelet során")
    }
  }

  const deactivateUser = async (userId: string) => {
    if (!window.confirm("Biztosan deaktiválja ezt a felhasználót?")) return

    try {
      await axios.post(`/api/admin/users/${userId}/deactivate`)
      setUsers((prev) => prev.filter((user) => user._id !== userId))
      toast.success("Felhasználó deaktiválva")
    } catch (error: any) {
      console.error("Error deactivating user:", error)
      toast.error(error.response?.data?.error || "Hiba történt a deaktiválás során")
    }
  }

  const handleEmailClick = (user: AdminUser) => {
    setEmailModal({ isOpen: true, user })
  }

  const sendEmail = async (subject: string, message: string, language: "hu" | "en") => {
    if (!emailModal.user) return

    try {
      await axios.post("/api/admin/send-email", {
        userId: emailModal.user._id,
        subject,
        message,
        language,
      })

      toast.success("Email sikeresen elküldve!")
      setEmailModal({ isOpen: false, user: null })
    } catch (error: any) {
      console.error("Error sending email:", error)
      toast.error(error.response?.data?.error || "Hiba történt az email küldése során")
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter =
      filter === "all" || (filter === "admin" && user.isAdmin) || (filter === "user" && !user.isAdmin)

    return matchesSearch && matchesFilter
  })

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.isAdmin).length,
    verified: users.filter((u) => u.isVerified).length,
    unverified: users.filter((u) => !u.isVerified).length,
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <p className="text-sm text-muted-foreground">Felhasználók betöltése…</p>
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
            <div className="flex items-center gap-3 text-info">
              <IconUsers className="size-10" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Felhasználó Kezelés</h1>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">Felhasználói fiókok kezelése és admin jogosultságok</p>
          </div>

          <Button onClick={fetchUsers} disabled={loading} variant="outline" className="gap-2">
            <IconRefresh className={cn("size-5", loading && "animate-spin")} />
            Frissítés
          </Button>
        </div>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconUser className="size-7 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Összes Felhasználó</h3>
            <p className="text-4xl font-bold text-primary">{stats.total}</p>
          </CardContent>
        </Card>
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconCrown className="size-7 text-warning" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Adminok</h3>
            <p className="text-4xl font-bold text-warning">{stats.admins}</p>
          </CardContent>
        </Card>
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconShield className="size-7 text-success" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Regisztrált</h3>
            <p className="text-4xl font-bold text-success">{stats.verified}</p>
          </CardContent>
        </Card>
        <Card elevation="elevated" className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6 text-center">
            <div className="size-14 backdrop-blur-md bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconUser className="size-7 text-destructive" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Nem Regisztrált</h3>
            <p className="text-4xl font-bold text-destructive">{stats.unverified}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart */}
      <DailyChart
        title="Felhasználók napi regisztrációja"
        apiEndpoint="/api/admin/charts/users/daily"
        color="primary"
      />

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
                  placeholder="Keresés név, email vagy felhasználónév alapján..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Szűrés típus szerint</Label>
              <Select value={filter} onValueChange={(value) => setFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes felhasználó</SelectItem>
                  <SelectItem value="admin">Adminok</SelectItem>
                  <SelectItem value="user">Felhasználók</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card elevation="elevated" className="backdrop-blur-xl bg-card/30 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUsers className="size-6 text-primary" />
            Felhasználók ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="size-20 backdrop-blur-md bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconUsers className="size-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Nincsenek felhasználók</h3>
              <p className="text-muted-foreground">
                {searchTerm || filter !== "all"
                  ? "Nincsenek felhasználók a megadott feltételekkel."
                  : "Még nincsenek regisztrált felhasználók."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="backdrop-blur-md bg-muted/20">
                  <tr>
                    <th className="px-4 py-4 text-left font-semibold text-sm">Felhasználó</th>
                    <th className="px-4 py-4 text-left font-semibold text-sm">Email</th>
                    <th className="px-4 py-4 text-left font-semibold text-sm">Felhasználónév</th>
                    <th className="px-4 py-4 text-left font-semibold text-sm">Státusz</th>
                    <th className="px-4 py-4 text-left font-semibold text-sm">Dátumok</th>
                    <th className="px-4 py-4 text-left font-semibold text-sm">Műveletek</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user._id} className={cn("hover:backdrop-blur-md hover:bg-muted/20 transition-colors", index > 0 && "border-t border-gray-500/20")}>
                      <td className="px-4 py-6">
                        <div>
                          <div className="font-bold">{user.name}</div>
                          <div className="text-sm text-muted-foreground">ID: {user._id.slice(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <button
                          onClick={() => handleEmailClick(user)}
                          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors group"
                          title="Email küldése"
                        >
                          <IconMail className="size-4" />
                          <span className="underline decoration-dotted underline-offset-2">{user.email}</span>
                        </button>
                      </td>
                      <td className="px-4 py-6">
                        <code className="text-sm backdrop-blur-md bg-muted/30 px-2 py-1 rounded">{user.username}</code>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex flex-wrap gap-2">
                          {user.isAdmin && (
                            <Badge variant="outline" className="gap-1 backdrop-blur-md bg-warning/20 text-warning">
                              <IconCrown size={14} />
                              Admin
                            </Badge>
                          )}
                          {user.isVerified ? (
                            <Badge variant="outline" className="gap-1 backdrop-blur-md bg-success/20 text-success">
                              <IconShield size={14} />
                              Regisztrált
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 backdrop-blur-md bg-destructive/20 text-destructive">
                              <IconUser size={14} />
                              Nem regisztrált
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <IconCalendar size={14} />
                            <span>{new Date(user.createdAt).toLocaleDateString("hu-HU")}</span>
                          </div>
                          {user.lastLogin && (
                            <div className="flex items-center gap-2 text-muted-foreground/70">
                              <IconClock size={14} />
                              <span>{new Date(user.lastLogin).toLocaleDateString("hu-HU")}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => toggleAdminStatus(user._id, user.isAdmin)}
                            variant={user.isAdmin ? "outline" : "default"}
                            size="sm"
                            className="gap-2"
                            title={user.isAdmin ? "Admin jogosultság eltávolítása" : "Admin jogosultság hozzáadása"}
                          >
                            <IconCrown size={16} />
                            {user.isAdmin ? "Admin eltávolítása" : "Admin létrehozása"}
                          </Button>
                          <Button
                            onClick={() => deactivateUser(user._id)}
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            title="Felhasználó deaktiválása"
                          >
                            <IconTrash size={16} />
                            Törlés
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
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

// Email Modal Component
interface EmailModalProps {
  user: AdminUser
  onClose: () => void
  onSend: (subject: string, message: string, language: "hu" | "en") => void
}

function EmailModal({ user, onClose, onSend }: EmailModalProps) {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [language, setLanguage] = useState<"hu" | "en">("hu")
  const [showPreview, setShowPreview] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!subject.trim() || !message.trim()) return

    setLoading(true)
    await onSend(subject, message, language)
    setLoading(false)
  }

  const generateEmailPreview = () => {
    const isHungarian = language === "hu"

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #b62441 0%, #8a1b31 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
            ${isHungarian ? "tDarts - Admin Értesítés" : "tDarts - Admin Notification"}
          </h1>
        </div>
        <div style="padding: 30px;">
          ${isHungarian
            ? `
            <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Kedves ${user.name}!</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              A tDarts platform adminisztrátoraként szeretnénk értesíteni Önt a következőről:
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
              <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">${subject}</h3>
              <p style="color: #374151; margin: 0; white-space: pre-line;">${message}</p>
            </div>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              Ha bármilyen kérdése van, kérjük, lépjen kapcsolatba velünk.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Üdvözlettel,<br>
              A tDarts admin csapat
            </p>
          `
            : `
            <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Dear ${user.name}!</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              As a tDarts platform administrator, we would like to inform you about the following:
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
              <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">${subject}</h3>
              <p style="color: #374151; margin: 0; white-space: pre-line;">${message}</p>
            </div>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              If you have any questions, please contact us.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Best regards,<br>
              The tDarts admin team
            </p>
          `}
        </div>
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 tDarts. Minden jog fenntartva.
          </p>
        </div>
      </div>
    `
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconMail className="size-7 text-primary" />
            Email küldése: {user.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <IconMail size={16} />
            Email cím: <code className="font-mono bg-muted px-2 py-1 rounded">{user.email}</code>
          </p>

          {!showPreview ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Email nyelv</Label>
                  <Select value={language} onValueChange={(value) => setLanguage(value as "hu" | "en")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hu">Magyar (alapértelmezett)</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Címzett</Label>
                  <Input type="text" value={user.name} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Tárgy</Label>
                <Input
                  type="text"
                  placeholder="Email tárgya"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Üzenet</Label>
                <Textarea
                  placeholder="Írd ide az üzenetet..."
                  className="h-32"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>
                  Mégse
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setShowPreview(true)}
                  disabled={loading || !subject.trim() || !message.trim()}
                >
                  <IconEye size={18} />
                  Előnézet
                </Button>
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={loading || !subject.trim() || !message.trim()}
                >
                  {loading ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-primary/40 border-t-transparent" />
                  ) : (
                    <>
                      <IconMail size={18} />
                      Email küldése
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold">Email előnézet</h4>
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowPreview(false)}>
                  <IconEyeOff size={18} />
                  Szerkesztés
                </Button>
              </div>

              <div className="backdrop-blur-xl bg-card/30 rounded-xl overflow-hidden">
                <div className="backdrop-blur-md bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Nyelv:</span>
                      <Badge variant="outline" className="backdrop-blur-md">{language === "hu" ? "Magyar" : "English"}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Címzett:</span>
                      <span>{user.name}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 backdrop-blur-xl bg-card/30 max-h-96 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: generateEmailPreview() }} className="email-preview" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="ghost" className="flex-1 gap-2" onClick={() => setShowPreview(false)}>
                  <IconEyeOff size={18} />
                  Szerkesztés
                </Button>
                <Button onClick={() => handleSubmit()} disabled={loading} className="flex-1 gap-2">
                  {loading ? (
                    <span className="size-4 animate-spin rounded-full border-2 border-primary/40 border-t-transparent" />
                  ) : (
                    <>
                      <IconMail size={18} />
                      Email küldése
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
