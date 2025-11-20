"use client"

import { useState } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import { IconMail, IconSend, IconEye, IconEyeOff } from "@tabler/icons-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/Badge"
import { Separator } from "@/components/ui/separator"
import { showErrorToast } from "@/lib/toastUtils"

interface PlayerNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  player: {
    _id: string
    playerReference: {
      _id: string
      name: string
      userRef?: string
    }
  }
  tournamentName: string
}

const PANEL_SHADOW = "shadow-lg shadow-black/35"

export default function PlayerNotificationModal({ isOpen, onClose, player, tournamentName }: PlayerNotificationModalProps) {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [language, setLanguage] = useState<"hu" | "en">("hu")
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast.error("Kérjük, töltsd ki a tárgyat és az üzenetet is!")
      return
    }

    try {
      setIsLoading(true)
      const response = await axios.post("/api/tournaments/notify-player", {
        playerId: player.playerReference._id,
        subject: subject.trim(),
        message: message.trim(),
        language,
        tournamentName,
      })

      if (response.data?.success) {
        toast.success("Értesítés elküldve")
        setSubject("")
        setMessage("")
        onClose()
      } else {
        showErrorToast("Nem sikerült elküldeni az értesítést", {
          context: "Játékos értesítés",
          errorName: "Értesítés küldése sikertelen",
        })
      }
    } catch (error: unknown) {
      const err = error as any
      console.error("Notification error", err)
      showErrorToast("Hiba történt az értesítés küldése közben", {
        error: err?.response?.data?.error,
        context: "Játékos értesítés",
        errorName: "Értesítés küldése sikertelen",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const previewHtml = `
    <h3 style="margin:0 0 8px;font-weight:600;font-size:16px;">${subject || "Értesítés a tornáról"}</h3>
    <p style="margin:0 0 12px;font-size:14px;line-height:20px;">${message || "Nincs megadva üzenet."}</p>
    <p style="margin:0;font-size:12px;color:#6b7280;">tDarts • ${tournamentName}</p>
  `

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className={`max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 p-0 text-foreground ${PANEL_SHADOW}`}>
        <DialogHeader className="space-y-3 bg-card/90 px-6 py-5 flex-shrink-0 shadow-sm shadow-primary/5">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <IconMail className="h-5 w-5 text-primary" />
            Értesítés küldése játékosnak
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            A játékos e-mail értesítést kap a megadott tartalommal. Választható nyelv: magyar vagy angol.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="grid gap-6 px-6 py-6 overflow-y-auto flex-1">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="subject">
              Tárgy
            </label>
            <Input
              id="subject"
              placeholder="Pl. Fontos információ a tornáról"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={isLoading}
              className="h-11 rounded-xl bg-muted/40 text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground" htmlFor="message">
              Üzenet
            </label>
            <Textarea
              id="message"
              placeholder="Írd le az üzenetet, amit a játékosnak küldenél…"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={isLoading}
              className="min-h-[160px] rounded-xl bg-muted/40 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Nyelv:</span>
            <div className="flex gap-2">
              <Badge
                onClick={() => setLanguage("hu")}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs ${language === "hu" ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"}`}
              >
                Magyar
              </Badge>
              <Badge
                onClick={() => setLanguage("en")}
                className={`cursor-pointer rounded-full px-3 py-1 text-xs ${language === "en" ? "bg-accent text-accent-foreground" : "bg-muted/40 text-muted-foreground"}`}
              >
                English
              </Badge>
            </div>
          </div>

          <Separator className="opacity-30" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Előnézet</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview((prev) => !prev)}
                className="gap-2"
              >
                {showPreview ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                {showPreview ? "Előnézet elrejtése" : "Előnézet megjelenítése"}
              </Button>
            </div>
            {showPreview && (
              <div
                className="rounded-xl border border-border/40 bg-muted/20 p-4 text-sm text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
          </div>

          <DialogFooter className="flex-shrink-0 flex flex-col items-stretch gap-3 px-6 py-4 sm:flex-row sm:justify-end shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
            <Button type="submit" disabled={isLoading} className="gap-2">
              <IconSend className="h-4 w-4" />
              Értesítés küldése
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
