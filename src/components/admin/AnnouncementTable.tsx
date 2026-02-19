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
import { useTranslations } from "next-intl"

interface Announcement {
  _id: string
  title: string
  description: string
  type: "info" | "success" | "warning" | "error"
  isActive: boolean
  expiresAt: string
  showButton: boolean
  buttonText?: string
  buttonAction?: string
  duration: number
}

export default function AnnouncementTable() {
  const t = useTranslations("Admin.announcements")
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
      type: "info" as Announcement["type"],
      expiresAt: "",
      showButton: false,
      buttonText: "",
      buttonAction: "",
      duration: 10000
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
      toast.error(t("toasts.fetch_error"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, search])

  const deleteAnnouncement = async (id: string) => {
    if (!confirm(t("actions.confirm_delete"))) return
    try {
      await axios.delete(`/api/admin/announcements/${id}`)
      toast.success(t("toasts.delete_success"))
      fetchData()
    } catch {
      toast.error(t("toasts.delete_error"))
      try {
          await axios.delete(`/api/announcements/${id}`) 
          fetchData()
      } catch {}
    }
  }

  const toggleActive = async (id: string) => {
      try {
          await axios.post(`/api/announcements/${id}/toggle`)
          toast.success(t("toasts.status_success"))
          fetchData()
      } catch {
          toast.error(t("toasts.status_error"))
      }
  }

  const openCreateModal = () => {
      setEditingItem(null)
      setEditForm({
          title: "",
          description: "",
          type: "info",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // +1 week default
          showButton: false,
          buttonText: t("dialog.form.button_text_placeholder"),
          buttonAction: "",
          duration: 10000
      })
      setShowModal(true)
  }

  const openEditModal = (item: Announcement) => {
      setEditingItem(item)
      setEditForm({
          title: item.title,
          description: item.description,
          type: item.type,
          // Format date for datetime-local input: YYYY-MM-DDThh:mm
          expiresAt: new Date(item.expiresAt).toISOString().slice(0, 16),
          showButton: item.showButton || false,
          buttonText: item.buttonText || "",
          buttonAction: item.buttonAction || "",
          duration: item.duration || 10000
      })
      setShowModal(true)
  }

  const handleUpdate = async () => {
      try {
          setIsSaving(true)
          const payload = {
              ...editForm,
              expiresAt: new Date(editForm.expiresAt)
          }

          if (editingItem) {
              await axios.patch(`/api/admin/announcements/${editingItem._id}`, payload)
              toast.success(t("toasts.update_success"))
          } else {
              await axios.post(`/api/admin/announcements`, payload)
              toast.success(t("toasts.create_success"))
          }
          
          setShowModal(false)
          setEditingItem(null)
          fetchData()
    } catch (err: any) {
      console.error("Error saving announcement:", err)
      toast.error(err.response?.data?.error || t("toasts.save_error"))
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
          placeholder={t("search_placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
           <Button onClick={openCreateModal}>
                <IconPlus className="mr-2 size-4" />
                {t("new_btn")}
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
              <TableHead>{t("table.title")}</TableHead>
              <TableHead>{t("table.type")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.expires")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t("table.loading")}
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t("table.no_results")}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item._id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>{getTypeBadge(item.type)}</TableCell>
                  <TableCell>
                      {item.isActive ? (
                          <Badge className="bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30">{t("table.active")}</Badge>
                      ) : (
                          <Badge variant="outline">{t("table.inactive")}</Badge>
                      )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(item.expiresAt), "yyyy. MM. dd. HH:mm", { locale: hu })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">{t("table.menu_sr")}</span>
                          <IconDots className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t("table.actions")}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => toggleActive(item._id)}>
                            {item.isActive ? <><IconEyeOff className="mr-2 size-4"/> {t("actions.deactivate")}</> : <><IconEye className="mr-2 size-4"/> {t("actions.activate")}</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditModal(item)}>
                             <IconEdit className="mr-2 h-4 w-4" />
                             {t("actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteAnnouncement(item._id)} className="text-destructive">
                             <IconTrash className="mr-2 h-4 w-4" />
                             {t("actions.delete")}
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
          {t("pagination.info", { total, current: page, total_pages: totalPages })}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t("pagination.prev")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t("pagination.next")}
          </Button>
        </div>
      </div>

            {/* Edit Dialog */}
      {/* Edit/Create Dialog */}
      <Dialog open={showModal} onOpenChange={(open) => !open && setShowModal(false)}>
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{editingItem ? t("dialog.edit_title") : t("dialog.create_title")}</DialogTitle>
            <DialogDescription>
              {editingItem ? t("dialog.edit_desc") : t("dialog.create_desc")}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="grid gap-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t("dialog.form.title")}</Label>
                <Input
                  id="title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  placeholder={t("dialog.form.title_placeholder")}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">{t("dialog.form.type")}</Label>
                  <Select value={editForm.type} onValueChange={(v: any) => setEditForm({...editForm, type: v})}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder={t("dialog.form.type")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">{t("dialog.form.types.info")}</SelectItem>
                      <SelectItem value="success">{t("dialog.form.types.success")}</SelectItem>
                      <SelectItem value="warning">{t("dialog.form.types.warning")}</SelectItem>
                      <SelectItem value="error">{t("dialog.form.types.error")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="duration">{t("dialog.form.duration")}</Label>
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
                <Label htmlFor="expiresAt">{t("dialog.form.expires")}</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={editForm.expiresAt}
                  onChange={(e) => setEditForm({...editForm, expiresAt: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{t("dialog.form.description")}</Label>
                <textarea
                  id="description"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  placeholder={t("dialog.form.description_placeholder")}
                />
              </div>

              <div className="space-y-4 pt-2 border-t mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="showButton" 
                    checked={editForm.showButton} 
                    onCheckedChange={(checked) => setEditForm({...editForm, showButton: checked === true})}
                  />
                  <Label htmlFor="showButton" className="cursor-pointer">{t("dialog.form.show_button")}</Label>
                </div>

                {editForm.showButton && (
                  <div className="grid gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label htmlFor="buttonText">{t("dialog.form.button_text")}</Label>
                      <Input
                        id="buttonText"
                        value={editForm.buttonText}
                        onChange={(e) => setEditForm({...editForm, buttonText: e.target.value})}
                        placeholder={t("dialog.form.button_text_placeholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="buttonAction">{t("dialog.form.button_action")}</Label>
                      <Input
                        id="buttonAction"
                        value={editForm.buttonAction}
                        onChange={(e) => setEditForm({...editForm, buttonAction: e.target.value})}
                        placeholder={t("dialog.form.button_action_placeholder")}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={isSaving}>
                {t("actions.cancel")}
            </Button>
            <Button type="submit" onClick={handleUpdate} disabled={isSaving}>
                {isSaving ? t("actions.saving") : (editingItem ? t("actions.save") : t("actions.create"))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
