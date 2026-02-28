"use client"
import { useTranslations } from "next-intl";

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import {
  IconSearch,
  IconUsers,
  IconBuilding,
  IconTrophy,
  IconMedal,
  IconMessageCircle,
  IconAlertTriangle,
  IconSpeakerphone,
  IconCheck,
  IconSettings,
  IconLayoutDashboard,
  IconCornerDownLeft,
  IconActivity,
} from "@tabler/icons-react"

interface CommandItem {
  id: string
  title: string
  description?: string
  icon: typeof IconUsers
  href: string
  category: "navigation" | "actions" | "recent"
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const t = useTranslations("Admin.components");
    const navigationCommands = useMemo(() => ([
      {
        id: "nav-dashboard",
        title: t("dashboard_ft8p"),
        description: "Overview and stats",
        icon: IconLayoutDashboard,
        href: "/admin",
        category: "navigation",
      },
      {
        id: "nav-users",
        title: t("users_1cu3"),
        description: "Manage users",
        icon: IconUsers,
        href: "/admin/users",
        category: "navigation",
      },
      {
        id: "nav-clubs",
        title: t("clubs_12tn"),
        description: "Manage clubs",
        icon: IconBuilding,
        href: "/admin/clubs",
        category: "navigation",
      },
      {
        id: "nav-tournaments",
        title: t("tournaments_e65c"),
        description: "Manage tournaments",
        icon: IconTrophy,
        href: "/admin/tournaments",
        category: "navigation",
      },
      {
        id: "nav-leagues",
        title: t("leagues_sd4t"),
        description: "Manage leagues",
        icon: IconMedal,
        href: "/admin/leagues",
        category: "navigation",
      },
      {
        id: "nav-feedback",
        title: t("feedback_23iz"),
        description: "User feedback",
        icon: IconMessageCircle,
        href: "/admin/feedback",
        category: "navigation",
      },
      {
        id: "nav-errors",
        title: t("errors_ygvm"),
        description: "System errors",
        icon: IconAlertTriangle,
        href: "/admin/errors",
        category: "navigation",
      },
      {
        id: "nav-announcements",
        title: t("announcements_mk89"),
        description: "Manage announcements",
        icon: IconSpeakerphone,
        href: "/admin/announcements",
        category: "navigation",
      },
      {
        id: "nav-todos",
        title: t("todos_1c7q"),
        description: "Task management",
        icon: IconCheck,
        href: "/admin/todos",
        category: "navigation",
      },
      {
        id: "nav-settings",
        title: t("settings_osmo"),
        description: "System settings",
        icon: IconSettings,
        href: "/admin/settings",
        category: "navigation",
      },
      {
        id: "nav-telemetry",
        title: t("telemetry_fm2a"),
        description: "API telemetry analytics",
        icon: IconActivity,
        href: "/admin/telemetry",
        category: "navigation",
      },
    ]), [t]) as CommandItem[];
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState(0)
  const router = useRouter()

  const filteredCommands = navigationCommands.filter((cmd) =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = useCallback(
    (item: CommandItem) => {
      router.push(item.href)
      onClose()
      setSearch("")
      setSelected(0)
    },
    [router, onClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelected((prev) => (prev + 1) % filteredCommands.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelected((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === "Enter" && filteredCommands[selected]) {
        e.preventDefault()
        handleSelect(filteredCommands[selected])
      }
    },
    [filteredCommands, selected, handleSelect]
  )

  // Reset selection when search changes
  useEffect(() => {
    setSelected(0)
  }, [search])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
          <DialogTitle className="sr-only">{t("command_palette")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("search_for_pages")}</DialogDescription>
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={t("type_to_search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-20 h-12 text-base border-none focus-visible:ring-0 bg-muted/30"
              autoFocus
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                <IconCornerDownLeft className="h-3 w-3" />
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">{t("no_results_found")}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((item, index) => {
                const Icon = item.icon
                const isSelected = index === selected

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-left",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-md",
                        isSelected ? "bg-primary-foreground/20" : "bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.title}</div>
                      {item.description && (
                        <div
                          className={cn(
                            "text-xs truncate",
                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-3 bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">↑</Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">↓</Badge>
                <span>{t("navigate")}</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">↵</Badge>
                <span>{t("select")}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{t("esc")}</Badge>
              <span>{t("close")}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Hook to use command palette
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return { isOpen, setIsOpen }
}
