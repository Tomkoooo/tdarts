import { useTranslations } from "next-intl";

"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { IconSparkles, IconCalendar } from "@tabler/icons-react"
import { format, addDays, isValid } from "date-fns"
import { hu } from "date-fns/locale"

// --- Types ---
export interface TodoItemData {
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "critical"
  status: "pending" | "in-progress" | "completed" | "cancelled"
  category: "bug" | "feature" | "improvement" | "maintenance" | "other"
  dueDate?: string
  tags: string[]
}

export interface SmartTodoInputProps {
  onAdd: (todo: Partial<TodoItemData>) => void
  placeholder?: string
  autoFocus?: boolean
}

// --- Smart Parsing Logic ---
export const parseSmartInput = (input: string): Partial<TodoItemData> => {
  let text = input
  const result: Partial<TodoItemData> = {
    title: "",
    priority: "medium",
    tags: [],
    category: "other"
  }

  // 1. Detect Urgency (!, !!, !!!, or keywords)
  if (text.includes("!!!") || /\b(azonnal|sürgős|urgent|critical)\b/i.test(text)) {
    result.priority = "critical"
    text = text.replace("!!!", "").replace(/\b(azonnal|sürgős|urgent|critical)\b/i, "")
  } else if (text.includes("!!") || /\b(fontos|high)\b/i.test(text)) {
    result.priority = "high"
    text = text.replace("!!", "").replace(/\b(fontos|high)\b/i, "")
  } else if (text.includes("!")) {
    result.priority = "medium"
    text = text.replace("!", "")
  }

  // 2. Detect Category (#bug, #feature, etc.)
  const categoryMatch = text.match(/#(bug|feature|improvement|maintenance|other|hiba|fejlesztés)/i)
  if (categoryMatch) {
    const cat = categoryMatch[1].toLowerCase()
    if (cat === "hiba") result.category = "bug"
    else if (cat === "fejlesztés") result.category = "improvement"
    else result.category = cat as any
    text = text.replace(categoryMatch[0], "")
  }

  // 3. Detect Tags ([tagname])
  const tagMatches = text.matchAll(/\[(.*?)\]/g)
  for (const match of tagMatches) {
    result.tags?.push(match[1])
    text = text.replace(match[0], "")
  }

  // 4. Detect Date (12.21, 2024.12.21, ma, holnap)
  const today = new Date()
  if (/\b(ma|today)\b/i.test(text)) {
    result.dueDate = today.toISOString()
    text = text.replace(/\b(ma|today)\b/i, "")
  } else if (/\b(holnap|tomorrow)\b/i.test(text)) {
    result.dueDate = addDays(today, 1).toISOString()
    text = text.replace(/\b(holnap|tomorrow)\b/i, "")
  } else {
    // Try to match MM.DD or YYYY.MM.DD
    const dateMatch = text.match(/\b(\d{4}\.)?(\d{1,2})\.(\d{1,2})\b/)
    if (dateMatch) {
      const year = dateMatch[1] ? parseInt(dateMatch[1]) : today.getFullYear()
      const month = parseInt(dateMatch[2]) - 1
      const day = parseInt(dateMatch[3])
      const date = new Date(year, month, day)
      if (isValid(date)) {
        if (!dateMatch[1] && date < today) {
          date.setFullYear(year + 1)
        }
        result.dueDate = date.toISOString()
        text = text.replace(dateMatch[0], "")
      }
    }
  }

  // 5. Cleanup Title
  result.title = text.replace(/\s+/g, " ").trim()
  return result
}

export const SmartInput = ({ onAdd, placeholder, autoFocus }: SmartTodoInputProps) => {
    const t = useTranslations("Auto");
  const [input, setInput] = useState("")
  const [preview, setPreview] = useState<Partial<TodoItemData> | null>(null)
  
  useEffect(() => {
    if (input.trim()) {
      setPreview(parseSmartInput(input))
    } else {
      setPreview(null)
    }
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && preview && preview.title) {
      onAdd(preview)
      setInput("")
      setPreview(null)
    }
  }

  return (
    <div className="relative group w-full">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
        <IconSparkles className="size-5" />
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Írj egy feladatot... (pl. 'Szerver hiba javítása !!! #bug ma')"}
        className="pl-12 h-14 text-lg bg-card/60 backdrop-blur-sm border-2 border-primary/10 focus-visible:border-primary/30 rounded-2xl shadow-sm transition-all w-full"
        autoFocus={autoFocus}
      />
      {preview && input.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-popover/95 backdrop-blur-md rounded-xl border border-border shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <Badge variant={preview.priority === 'critical' ? 'destructive' : preview.priority === 'high' ? 'warning' : 'outline'}>
              {preview.priority?.toUpperCase()}
            </Badge>
            {preview.category && <Badge variant="secondary">#{preview.category}</Badge>}
            {preview.dueDate && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <IconCalendar className="size-3" />
                {format(new Date(preview.dueDate), "MMM d.", { locale: hu })}
              </span>
            )}
            <span className="font-medium text-foreground">{preview.title}</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>{t("nyomj")}<kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono">{t("enter")}</kbd> {t("a_hozzáadáshoz")}</span>
            {preview.tags && preview.tags.length > 0 && <span>{t("tags")}{preview.tags.join(", ")}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
