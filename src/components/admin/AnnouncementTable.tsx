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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  localized?: {
    hu?: { title?: string; description?: string; buttonText?: string }
    en?: { title?: string; description?: string; buttonText?: string }
    de?: { title?: string; description?: string; buttonText?: string }
  }
  localeVisibilityMode?: "strict" | "fallback_en"
  type: "info" | "success" | "warning" | "error"
  isActive: boolean
  expiresAt: string
  showButton: boolean
  buttonText?: string
  buttonAction?: string
  duration: number
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
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [editForm, setEditForm] = useState({
      title: "",
      description: "",
      titleEn: "",
      descriptionEn: "",
      titleDe: "",
      descriptionDe: "",
      type: "info" as Announcement["type"],
      expiresAt: "",
      showButton: false,
      buttonText: "",
      buttonTextEn: "",
      buttonTextDe: "",
      buttonAction: "",
      duration: 10000,
      localeVisibilityMode: "strict" as "strict" | "fallback_en",
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

  const openCreateModal = () => {
      setEditingItem(null)
      setEditForm({
          title: "",
          description: "",
          titleEn: "",
          descriptionEn: "",
          titleDe: "",
          descriptionDe: "",
          type: "info",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // +1 week default
          showButton: false,
          buttonText: "Részletek",
          buttonTextEn: "Details",
          buttonTextDe: "Details",
          buttonAction: "",
          duration: 10000,
          localeVisibilityMode: "strict",
      })
      setShowModal(true)
  }

  const openEditModal = (item: Announcement) => {
      setEditingItem(item)
      setEditForm({
          title: item.title,
          description: item.description,
          titleEn: item.localized?.en?.title || "",
          descriptionEn: item.localized?.en?.description || "",
          titleDe: item.localized?.de?.title || "",
          descriptionDe: item.localized?.de?.description || "",
          type: item.type,
          // Format date for datetime-local input: YYYY-MM-DDThh:mm
          expiresAt: new Date(item.expiresAt).toISOString().slice(0, 16),
          showButton: item.showButton || false,
          buttonText: item.localized?.hu?.buttonText || item.buttonText || "",
          buttonTextEn: item.localized?.en?.buttonText || "",
          buttonTextDe: item.localized?.de?.buttonText || "",
          buttonAction: item.buttonAction || "",
          duration: item.duration || 10000,
          localeVisibilityMode: item.localeVisibilityMode || "strict",
      })
      setShowModal(true)
  }

  const handleUpdate = async () => {
      try {
          setIsSaving(true)
          const payload = {
              ...editForm,
              localized: {
                hu: {
                  title: editForm.title,
                  description: editForm.description,
                  buttonText: editForm.buttonText || undefined,
                },
                en: {
                  title: editForm.titleEn || undefined,
                  description: editForm.descriptionEn || undefined,
                  buttonText: editForm.buttonTextEn || undefined,
                },
                de: {
                  title: editForm.titleDe || undefined,
                  description: editForm.descriptionDe || undefined,
                  buttonText: editForm.buttonTextDe || undefined,
                },
              },
              localeVisibilityMode: editForm.localeVisibilityMode,
              expiresAt: new Date(editForm.expiresAt)
          }

          if (editingItem) {
              await axios.patch(`/api/admin/announcements/${editingItem._id}`, payload)
              toast.success("Hír frissítve")
          } else {
              await axios.post(`/api/admin/announcements`, payload)
              toast.success("Hír létrehozva")
          }
          
          setShowModal(false)
          setEditingItem(null)
          fetchData()
    } catch (err: any) {
      console.error("Error saving announcement:", err)
      toast.error(err.response?.data?.error || "Hiba a mentés során")
    } finally {
      setIsSaving(false)
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
           <Button onClick={openCreateModal}>
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
      {/* Edit/Create Dialog */}
      <Dialog open={showModal} onOpenChange={(open) => !open && setShowModal(false)}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{editingItem ? "Hír Szerkesztése" : "Új Hír Létrehozása"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Módosítsd a hír részleteit." : "Add meg az új hír adatait."}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="grid gap-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="title">Cím (HU)</Label>
                <Input
                  id="title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  placeholder="Hír címe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleEn">Title (EN)</Label>
                <Input
                  id="titleEn"
                  value={editForm.titleEn}
                  onChange={(e) => setEditForm({...editForm, titleEn: e.target.value})}
                  placeholder="Announcement title in English"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleDe">Titel (DE)</Label>
                <Input
                  id="titleDe"
                  value={editForm.titleDe}
                  onChange={(e) => setEditForm({...editForm, titleDe: e.target.value})}
                  placeholder="Titel auf Deutsch"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Típus</Label>
                  <Select value={editForm.type} onValueChange={(v: any) => setEditForm({...editForm, type: v})}>
                    <SelectTrigger id="type">
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
                
                <div className="space-y-2">
                  <Label htmlFor="duration">Időtartam (ms)</Label>
                  <Input
                    id="duration"
                    type="number"
                    step="1000"
                    min="3000"
                    max="60000"
                    value={editForm.duration}
                    onChange={(e) => setEditForm({...editForm, duration: parseInt(e.target.value) || 10000})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Lejárat</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={editForm.expiresAt}
                  onChange={(e) => setEditForm({...editForm, expiresAt: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Leírás (HU)</Label>
                <textarea
                  id="description"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  placeholder="Hír szövege..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">Description (EN)</Label>
                <textarea
                  id="descriptionEn"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editForm.descriptionEn}
                  onChange={(e) => setEditForm({...editForm, descriptionEn: e.target.value})}
                  placeholder="Announcement body in English..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionDe">Beschreibung (DE)</Label>
                <textarea
                  id="descriptionDe"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editForm.descriptionDe}
                  onChange={(e) => setEditForm({...editForm, descriptionDe: e.target.value})}
                  placeholder="Beschreibung auf Deutsch..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="localeVisibilityMode">Locale visibility</Label>
                <Select
                  value={editForm.localeVisibilityMode}
                  onValueChange={(v: any) => setEditForm({...editForm, localeVisibilityMode: v})}
                >
                  <SelectTrigger id="localeVisibilityMode">
                    <SelectValue placeholder="Locale visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">Strict locale only</SelectItem>
                    <SelectItem value="fallback_en">Fallback to English if locale missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-2 border-t mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="showButton" 
                    checked={editForm.showButton} 
                    onCheckedChange={(checked) => setEditForm({...editForm, showButton: checked === true})}
                  />
                  <Label htmlFor="showButton" className="cursor-pointer">Gomb megjelenítése</Label>
                </div>

                {editForm.showButton && (
                  <div className="grid gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label htmlFor="buttonText">Gomb felirata (HU)</Label>
                      <Input
                        id="buttonText"
                        value={editForm.buttonText}
                        onChange={(e) => setEditForm({...editForm, buttonText: e.target.value})}
                        placeholder="Pl: Részletek"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buttonTextEn">Button text (EN)</Label>
                      <Input
                        id="buttonTextEn"
                        value={editForm.buttonTextEn}
                        onChange={(e) => setEditForm({...editForm, buttonTextEn: e.target.value})}
                        placeholder="Details"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buttonTextDe">Button text (DE)</Label>
                      <Input
                        id="buttonTextDe"
                        value={editForm.buttonTextDe}
                        onChange={(e) => setEditForm({...editForm, buttonTextDe: e.target.value})}
                        placeholder="Details"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buttonAction">Gomb link (URL)</Label>
                      <Input
                        id="buttonAction"
                        value={editForm.buttonAction}
                        onChange={(e) => setEditForm({...editForm, buttonAction: e.target.value})}
                        placeholder="Pl: /results vagy https://..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={isSaving}>
                Mégse
            </Button>
            <Button type="submit" onClick={handleUpdate} disabled={isSaving}>
                {isSaving ? "Mentés..." : (editingItem ? "Mentés" : "Létrehozás")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
