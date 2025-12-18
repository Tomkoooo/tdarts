"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/Label"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/Badge"
import {
  IconDots,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconEye,
  IconEyeOff,
  IconPlus
} from "@tabler/icons-react"
import { format } from "date-fns"
import { hu } from "date-fns/locale"

interface Announcement {
  _id: string
  title: string
  description: string
  type: "info" | "success" | "warning" | "error"
  isActive: boolean
  expiresAt: string
}

export default function AnnouncementTable() {
  const [data, setData] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")

  // Edit State
  const [editingItem, setEditingItem] = useState<Announcement | null>(null)
  const [editForm, setEditForm] = useState({
      title: "",
      description: "",
      type: "info",
      expiresAt: ""
  })

  const limit = 10

  const fetchData = async () => {
    try {
      setLoading(true)
      const params: any = {
        page,
        limit,
        search: search || undefined,
      }

      const response = await axios.get("/api/admin/announcements", { params })
      if (response.data.success) {
        setData(response.data.announcements)
        setTotal(response.data.total)
        setTotalPages(response.data.totalPages)
      }
    } catch (error) {
      console.error("Error fetching announcements:", error)
      toast.error("Nem sikerült betöltteni a híreket")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, search])

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Biztosan törölni szeretnéd?")) return
    try {
      await axios.delete(`/api/admin/announcements/${id}`)
      toast.success("Hír törölve")
      fetchData()
    } catch {
      toast.error("Hiba a törlés során")
      try {
          await axios.delete(`/api/announcements/${id}`) 
          fetchData()
      } catch {}
    }
  }

  const toggleActive = async (id: string) => {
      try {
          await axios.post(`/api/announcements/${id}/toggle`)
          toast.success("Státusz frissítve")
          fetchData()
      } catch {
          toast.error("Hiba a státusz frissítésekor")
      }
  }

  const openEditModal = (item: Announcement) => {
      setEditingItem(item)
      setEditForm({
          title: item.title,
          description: item.description,
          type: item.type,
          // Format date for datetime-local input: YYYY-MM-DDThh:mm
          expiresAt: new Date(item.expiresAt).toISOString().slice(0, 16)
      })
  }

  const handleUpdate = async () => {
      if (!editingItem) return
      try {
          await axios.patch(`/api/admin/announcements/${editingItem._id}`, {
              ...editForm,
              expiresAt: new Date(editForm.expiresAt)
          })
          toast.success("Hír frissítve")
          setEditingItem(null)
          fetchData()
    } catch {
      toast.error("Hiba a frissítés során")
    }
  }

  const getTypeBadge = (type: string) => {
      const styles: Record<string, string> = {
          info: 'bg-blue-500/10 text-blue-500',
          success: 'bg-emerald-500/10 text-emerald-500',
          warning: 'bg-amber-500/10 text-amber-500',
          error: 'bg-rose-500/10 text-rose-500',
      }
      return <Badge className={styles[type] || ''}>{type.toUpperCase()}</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <Input
          placeholder="Keresés..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
            <Button onClick={() => window.location.href='/admin/announcements/new'}>
                <IconPlus className="mr-2 size-4" />
                Új Hír
            </Button>
            <Button variant="outline" size="icon" onClick={() => fetchData()}>
                <IconRefresh className="size-4" />
            </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cím</TableHead>
              <TableHead>Típus</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead>Lejárat</TableHead>
              <TableHead className="text-right">Műveletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Betöltés...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Nincs találat.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item._id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>{getTypeBadge(item.type)}</TableCell>
                  <TableCell>
                      {item.isActive ? (
                          <Badge className="bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30">Aktív</Badge>
                      ) : (
                          <Badge variant="outline">Inaktív</Badge>
                      )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(item.expiresAt), "yyyy. MM. dd. HH:mm", { locale: hu })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Menü</span>
                          <IconDots className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Műveletek</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => toggleActive(item._id)}>
                            {item.isActive ? <><IconEyeOff className="mr-2 size-4"/> Deaktiválás</> : <><IconEye className="mr-2 size-4"/> Aktiválás</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditModal(item)}>
                             <IconEdit className="mr-2 h-4 w-4" />
                             Szerkesztés
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteAnnouncement(item._id)} className="text-destructive">
                             <IconTrash className="mr-2 h-4 w-4" />
                             Törlés
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {total} hír összesen • {page} / {totalPages} oldal
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Előző
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Következő
          </Button>
        </div>
      </div>

            {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Hír Szerkesztése</DialogTitle>
            <DialogDescription>
              Módosítsd a hír részleteit.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Cím
              </Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Típus
              </Label>
               <Select value={editForm.type} onValueChange={(v: any) => setEditForm({...editForm, type: v})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Típus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Infó (Kék)</SelectItem>
                  <SelectItem value="success">Siker (Zöld)</SelectItem>
                  <SelectItem value="warning">Figyelem (Sárga)</SelectItem>
                  <SelectItem value="error">Hiba (Piros)</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expiresAt" className="text-right">
                Lejárat
              </Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={editForm.expiresAt}
                onChange={(e) => setEditForm({...editForm, expiresAt: e.target.value})}
                className="col-span-3"
              />
            </div>
             <div className="grid grid-cols-4 gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Leírás
              </Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                value={editForm.description}
                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>
                Mégse
            </Button>
            <Button type="submit" onClick={handleUpdate}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
