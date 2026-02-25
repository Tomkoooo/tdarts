import { useTranslations } from "next-intl";

"use client"

import { useState, useEffect, useMemo } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import {
  IconPlus,
  IconCheck,
  IconSortDescending,
  IconArrowRight,
  IconTag,
  IconLayoutKanban,
  IconAlertTriangle,
  IconInfoCircle,
  IconClock,
  IconTrash
} from "@tabler/icons-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/Button"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { SmartInput } from "@/components/admin/SmartInput"

// --- Types ---
interface TodoItem {
  _id: string
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "critical"
  status: "pending" | "in-progress" | "completed" | "cancelled"
  category: "bug" | "feature" | "improvement" | "maintenance" | "other"
  dueDate?: string
  tags: string[]
  createdAt: string
  score?: number // Calculated urgency score
}

// --- Components ---

// SmartInput is now imported from @/components/admin/SmartInput

const TodoItemCard = ({ todo, onToggle, onDelete }: { todo: TodoItem; onToggle: (id: string) => void; onDelete: (id: string) => void }) => {
  const isCompleted = todo.status === "completed"
  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !isCompleted

  const priorityColors = {
    critical: "bg-destructive/10 text-destructive border-destructive/20",
    high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    medium: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
  }

  const categoryIcons = {
    bug: IconAlertTriangle,
    feature: IconPlus,
    improvement: IconArrowRight,
    maintenance: IconInfoCircle,
    other: IconTag
  }

  const CatIcon = categoryIcons[todo.category] || IconTag

  return (
    <div className={cn(
      "group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-200",
      isCompleted ? "bg-muted/30 border-transparent opacity-60" : "bg-card border-border hover:border-primary/20 hover:shadow-md"
    )}>
      <button
        onClick={() => onToggle(todo._id)}
        className={cn(
          "mt-1 flex-shrink-0 size-6 rounded-lg border-2 flex items-center justify-center transition-colors",
          isCompleted ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary text-transparent"
        )}
      >
        <IconCheck className="size-3.5 stroke-[3]" />
      </button>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("font-medium text-base leading-tight", isCompleted && "line-through text-muted-foreground")}>
            {todo.title}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {todo.dueDate && (
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-md flex items-center gap-1",
                isOverdue ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-muted text-muted-foreground"
              )}>
                <IconClock className="size-3" />
                {format(new Date(todo.dueDate), "MMM d.")}
              </span>
            )}
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border", priorityColors[todo.priority])}>
              {todo.priority}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 hover:text-foreground transition-colors">
            <CatIcon className="size-3" />
            {todo.category}
          </span>
          {todo.tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              {todo.tags.map(tag => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bottom-2 h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => onDelete(todo._id)}
      >
        <IconTrash className="size-4" />
      </Button>
    </div>
  )
}

// --- Main SmartTodoManager Component ---
export default function SmartTodoManager() {
    const t = useTranslations("Auto");
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all") // all, active, completed
  const [sort, setSort] = useState("smart") // smart, date, priority

  const fetchTodos = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/admin/todos")
      setTodos(response.data.todos)
    } catch (error) {
      console.error("Error fetching todos", error)
      toast.error(t("nem_sikerült_betölteni_12"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [])

  const handleAddTodo = async (todoData: Partial<TodoItem>) => {
    try {
      const response = await axios.post("/api/admin/todos", {
        ...todoData,
        status: "pending",
        isPublic: true // Default to public
      })
      setTodos(prev => [response.data.todo || response.data, ...prev]) // Handle different API responses
      toast.success(t("feladat_hozzáadva"))
      fetchTodos() // Refresh to be safe
    } catch (error) {
      console.error("Error creating todo", error)
      toast.error(t("hiba_történt_a_78"))
    }
  }

  const handleToggleTodo = async (id: string) => {
    const todo = todos.find(t => t._id === id)
    if (!todo) return

    const newStatus = todo.status === "completed" ? "pending" : "completed"
    
    // Optimistic update
    setTodos(prev => prev.map(t => t._id === id ? { ...t, status: newStatus } : t))

    try {
      await axios.put(`/api/admin/todos/${id}`, { status: newStatus })
    } catch (error) {
      console.error("Error updating todo", error)
      toast.error(t("nem_sikerült_frissíteni"))
      // Revert
      setTodos(prev => prev.map(t => t._id === id ? { ...t, status: todo.status } : t))
    }
  }

  const handleDeleteTodo = async (id: string) => {
    if (!confirm("Biztosan törölni szeretnéd?")) return

    // Optimistic update
    setTodos(prev => prev.filter(t => t._id !== id))

    try {
      await axios.delete(`/api/admin/todos/${id}`)
      toast.success(t("feladat_törölve"))
    } catch (error) {
      console.error("Error deleting todo", error)
      toast.error(t("nem_sikerült_törölni"))
      fetchTodos() // Revert by fetching
    }
  }

  // --- Sorting & Filtering Logic ---
  const filteredAndSortedTodos = useMemo(() => {
    let result = [...todos]

    // Filter
    if (filter === "active") result = result.filter(t => t.status !== "completed")
    if (filter === "completed") result = result.filter(t => t.status === "completed")

    // Calculate Smart Score
    result = result.map(t => {
      let score = 0
      
      // Urgency Score
      if (t.priority === "critical") score += 100
      if (t.priority === "high") score += 50
      if (t.priority === "medium") score += 20
      
      // Date Score (closer is higher)
      if (t.dueDate) {
        const daysUntil = (new Date(t.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
        if (daysUntil < 0) score += 80 // Overdue
        else if (daysUntil < 1) score += 60 // Today
        else if (daysUntil < 3) score += 40 // Soon
        else score += Math.max(0, 30 - daysUntil)
      }

      return { ...t, score }
    })

    // Sort
    if (sort === "smart") {
      result.sort((a, b) => (b.score || 0) - (a.score || 0))
    } else if (sort === "date") {
      result.sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
    } else if (sort === "priority") {
      const pMap = { critical: 4, high: 3, medium: 2, low: 1 }
      result.sort((a, b) => pMap[b.priority] - pMap[a.priority])
    }

    return result
  }, [todos, filter, sort])

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-bold tracking-tight">{t("smart_todo")}</h2>
        <p className="text-muted-foreground">{t("írd_be_természetes")}</p>
      </div>

      <SmartInput onAdd={handleAddTodo} />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-10 bg-background/80 backdrop-blur-md p-2 rounded-xl border border-border/40">
        <div className="flex bg-muted/50 p-1 rounded-lg">
          <button
            onClick={() => setFilter("all")}
            className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-all", filter === "all" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            {t("összes")}</button>
          <button
            onClick={() => setFilter("active")}
            className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-all", filter === "active" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            {t("aktív")}</button>
          <button
            onClick={() => setFilter("completed")}
            className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-all", filter === "completed" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
          >
            {t("kész")}</button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px] h-9">
             <div className="flex items-center gap-2">
                <IconSortDescending className="size-4" />
                <span>{sort === "smart" ? "Okos rendezés" : sort === "date" ? "Határidő szerint" : "Prioritás szerint"}</span>
             </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smart">{t("okos_rendezés_urgency")}</SelectItem>
              <SelectItem value="date">{t("határidő_szerint")}</SelectItem>
              <SelectItem value="priority">{t("prioritás_szerint")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("betöltés")}</div>
        ) : filteredAndSortedTodos.length > 0 ? (
          <div className="grid gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredAndSortedTodos.map((todo) => (
              <TodoItemCard
                key={todo._id}
                todo={todo}
                onToggle={handleToggleTodo}
                onDelete={handleDeleteTodo}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10">
            <IconLayoutKanban className="size-12 mx-auto text-muted-foreground/30 mb-3" />
            <h3 className="font-semibold text-lg">{t("nincs_megjeleníthető_feladat")}</h3>
            <p className="text-muted-foreground text-sm">{t("adj_hozzá_egy")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
