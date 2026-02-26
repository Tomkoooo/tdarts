"use client"

import { useState, useEffect, useCallback } from "react"
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
  IconBug,
  IconBulb,
  IconSettingsCode,
  IconCheck,
  IconEdit,
  IconTrash,
  IconArrowLeft,
  IconArrowRight,
  IconRefresh,
  IconListCheck
} from "@tabler/icons-react"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import AdminTicketDetail from "@/components/admin/AdminTicketDetail"
import { useTranslations } from "next-intl"

interface FeedbackHistory {
  action: string
  user: any
  date: string
  details: string
}

interface Feedback {
  _id: string
  category: "bug" | "feature" | "improvement" | "other"
  title: string
  description: string
  email: string
  priority: "low" | "medium" | "high" | "critical"
  status: "pending" | "in-progress" | "resolved" | "rejected" | "closed"
  createdAt: string
  user?: { name: string; username: string }
  history?: FeedbackHistory[]
  isReadByAdmin: boolean
}

export default function FeedbackTable() {
  const t = useTranslations("Admin.feedback")
  const [data, setData] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  
  // Edit state
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null)

  const limit = 10

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params: any = {
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
      }

      const response = await axios.get("/api/admin/feedback", { params })
      if (response.data.success) {
        setData(response.data.feedback)
        setTotal(response.data.total)
        setTotalPages(response.data.totalPages)
      }
    } catch {
      console.error("Error fetching feedback")
      toast.error(t("toasts.fetch_error"))
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, priorityFilter, categoryFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])
  const handleDetailUpdate = useCallback(() => {
    fetchData()
  }, [fetchData])

  
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, priorityFilter, categoryFilter])

  const deleteFeedback = async (id: string) => {
    if (!confirm(t("actions.confirm_delete"))) return
    try {
      await axios.delete(`/api/admin/feedback/${id}`)
      toast.success(t("toasts.delete_success"))
      fetchData()
    } catch {
      toast.error(t("toasts.delete_error"))
    }
  }

  const openEditModal = (feedback: Feedback) => {
      setEditingFeedback(feedback)
  }
  
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
      "in-progress": "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20",
      resolved: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
      rejected: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20",
      closed: "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20",
    }
    return <Badge className={styles[status] || ""}>{t(`statuses.${status}` as any)}</Badge>
  }

  const getPriorityIcon = (priority: string) => {
    const colors: Record<string, string> = {
      low: "text-slate-400",
      medium: "text-blue-400",
      high: "text-amber-500",
      critical: "text-rose-500",
    }
    return <span className={`capitalize font-medium ${colors[priority]}`}>{t(`priorities.${priority}` as any)}</span>
  }
  
  const getCategoryIcon = (category: string) => {
      switch(category) {
          case 'bug': return <IconBug className="size-4 text-rose-500" />;
          case 'feature': return <IconBulb className="size-4 text-amber-500" />;
          case 'improvement': return <IconSettingsCode className="size-4 text-blue-500" />;
          default: return <IconCheck className="size-4 text-slate-500" />;
      }
  }
  
  const createTodoFromFeedback = async (feedback: Feedback) => {
      try {
          await axios.post('/api/admin/todos', {
              title: `[Feedback] ${feedback.title}`,
              description: feedback.description,
              priority: feedback.priority === 'critical' ? 'high' : 'medium',
              category: 'other', 
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +1 week
          });
          toast.success(t("toasts.todo_success"));
      } catch(e: any) {
          console.error(e)
          toast.error(e.response?.data?.error || t("toasts.todo_error"));
      }
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
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
             <SelectTrigger className="w-[130px]">
              <SelectValue placeholder={t("filters.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all_categories")}</SelectItem>
              <SelectItem value="bug">{t("categories.bug")}</SelectItem>
              <SelectItem value="feature">{t("categories.feature")}</SelectItem>
              <SelectItem value="improvement">{t("categories.improvement")}</SelectItem>
            </SelectContent>
          </Select>
           <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder={t("filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all_statuses")}</SelectItem>
              <SelectItem value="pending">{t("statuses.pending")}</SelectItem>
              <SelectItem value="in-progress">{t("statuses.in-progress")}</SelectItem>
              <SelectItem value="resolved">{t("statuses.resolved")}</SelectItem>
            </SelectContent>
          </Select>
           <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder={t("filters.priority")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all_priorities")}</SelectItem>
              <SelectItem value="low">{t("priorities.low")}</SelectItem>
              <SelectItem value="medium">{t("priorities.medium")}</SelectItem>
              <SelectItem value="high">{t("priorities.high")}</SelectItem>
              <SelectItem value="critical">{t("priorities.critical")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchData()}>
              <IconRefresh className="size-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">{t("table.category")}</TableHead>
              <TableHead>{t("table.title_sender")}</TableHead>
              <TableHead>{t("table.priority")}</TableHead>
              <TableHead>{t("table.status")}</TableHead>
              <TableHead>{t("table.date")}</TableHead>
              <TableHead className="text-right">{t("table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                  {t("table.loading")}
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t("table.no_results")}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                      <div className="p-2 rounded-md bg-muted/50 w-fit">
                        {getCategoryIcon(item.category)}
                      </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {!item.isReadByAdmin && (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                            <span className="px-1.5 py-0.5 text-[10px] bg-accent/20 text-accent rounded-full font-medium">{t("table.new_badge")}</span>
                          </div>
                        )}
                        <span className="font-medium truncate max-w-[200px] sm:max-w-[300px]" title={item.title}>{item.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{item.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getPriorityIcon(item.priority)}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(item.createdAt), "yyyy. MM. dd.", { locale: hu })}
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
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item._id)}>
                          {t("actions.copy_id")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => createTodoFromFeedback(item)}>
                             <IconListCheck className="mr-2 h-4 w-4" />
                             {t("actions.create_todo")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditModal(item)}>
                             <IconEdit className="mr-2 h-4 w-4" />
                             {t("actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteFeedback(item._id)} className="text-destructive">
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
            <IconArrowLeft className="h-4 w-4" />
            {t("pagination.prev")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            {t("pagination.next")}
            <IconArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
      
      {/* Admin Ticket Detail Modal */}
      {editingFeedback && (
        <AdminTicketDetail
          ticket={editingFeedback as any}
          onBack={() => setEditingFeedback(null)}
          onUpdate={handleDetailUpdate}
        />
      )}
    </div>
  )
}
