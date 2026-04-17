"use client"

import React, { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import { IconMail, IconSend, IconEye, IconEyeOff } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

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
import { sendTournamentPlayerNotificationAction } from "@/features/tournaments/actions/manageTournament.action"
import { buildTournamentNotificationEmailHtml } from "@/lib/tournament-notification-email"

export type NotificationSendResultRow = {
  playerId: string
  playerName: string
  status: "sent" | "failed" | "skipped"
  reason?: string
  sentAt?: string | null
}

type NotificationSendSummary = {
  sentCount: number
  failedCount: number
  sendAttemptCount: number
  selectedPlayerCount: number
  uniqueSelectedPlayerCount: number
  playersFoundCount: number
  skippedPlayerNotFoundCount: number
  skippedNoUserCount: number
  skippedNoEmailCount: number
  skippedDuplicateEmailCount: number
  uniqueEmailCount: number
}

interface PlayerNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  mode: "single" | "selected"
  player?: {
    _id: string
    playerReference: {
      _id: string
      name: string
      userRef?: string
    }
  } | null
  playerIds?: string[]
  targetCount?: number
  tournamentCode: string
  tournamentName: string
  /** Called after a successful send so the parent can refresh delivery summaries */
  onDeliveriesUpdated?: () => void
}

const PANEL_SHADOW = "shadow-lg shadow-black/35"

export default function PlayerNotificationModal({
  isOpen,
  onClose,
  mode,
  player,
  playerIds,
  targetCount = 0,
  tournamentCode,
  tournamentName,
  onDeliveriesUpdated,
}: PlayerNotificationModalProps) {
  const tTour = useTranslations("Tournament")
  const t = (key: string, values?: Record<string, string | number | Date>) =>
    tTour(`notification_modal.${key}`, values)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [language, setLanguage] = useState<"hu" | "en">("hu")
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [phase, setPhase] = useState<"compose" | "results">("compose")
  const [lastSummary, setLastSummary] = useState<NotificationSendSummary | null>(null)
  const [lastResults, setLastResults] = useState<NotificationSendResultRow[]>([])

  const resetFormState = () => {
    setSubject("")
    setMessage("")
    setShowPreview(false)
    setPhase("compose")
    setLastSummary(null)
    setLastResults([])
  }

  useEffect(() => {
    if (isOpen) {
      resetFormState()
    }
  }, [isOpen])

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetFormState()
      onClose()
    }
  }

  const translateReason = (reason?: string) => {
    if (!reason) return "—"
    const key = `notification_modal.reason_${reason}`
    if (tTour.has(key)) {
      return tTour(key)
    }
    return reason
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast.error(t("error_empty"))
      return
    }

    try {
      setIsLoading(true)
      const response = await sendTournamentPlayerNotificationAction({
        code: tournamentCode,
        mode,
        playerId: mode === "single" ? player?.playerReference?._id : undefined,
        playerIds: mode === "selected" ? playerIds : undefined,
        subject: subject.trim(),
        message: message.trim(),
        language,
        tournamentName,
      })

      if ((response as { success?: boolean })?.success) {
        const result = response as NotificationSendSummary & {
          results?: NotificationSendResultRow[]
        }
        const skippedTotal =
          (result.skippedPlayerNotFoundCount ?? 0) +
          (result.skippedNoUserCount ?? 0) +
          (result.skippedNoEmailCount ?? 0) +
          (result.skippedDuplicateEmailCount ?? 0)

        setLastSummary({
          sentCount: result.sentCount ?? 0,
          failedCount: result.failedCount ?? 0,
          sendAttemptCount: result.sendAttemptCount ?? 0,
          selectedPlayerCount: result.selectedPlayerCount ?? 0,
          uniqueSelectedPlayerCount: result.uniqueSelectedPlayerCount ?? 0,
          playersFoundCount: result.playersFoundCount ?? 0,
          skippedPlayerNotFoundCount: result.skippedPlayerNotFoundCount ?? 0,
          skippedNoUserCount: result.skippedNoUserCount ?? 0,
          skippedNoEmailCount: result.skippedNoEmailCount ?? 0,
          skippedDuplicateEmailCount: result.skippedDuplicateEmailCount ?? 0,
          uniqueEmailCount: result.uniqueEmailCount ?? 0,
        })
        setLastResults(Array.isArray(result.results) ? result.results : [])
        setPhase("results")

        toast.success(
          t("success_toast", {
            sent: result.sentCount ?? 0,
            attempts: result.sendAttemptCount ?? 0,
            skipped: skippedTotal,
            failed: result.failedCount ?? 0,
          })
        )
        onDeliveriesUpdated?.()
      } else {
        showErrorToast(t("error_failed"), {
          context: t("title"),
          errorName: t("error_failed"),
        })
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      console.error("Notification error", err)
      showErrorToast(t("error_generic"), {
        error: err?.response?.data?.error,
        context: t("title"),
        errorName: t("error_failed"),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const previewHtml = buildTournamentNotificationEmailHtml({
    subject: subject || t("subject_placeholder"),
    message: message || t("no_message"),
    tournamentName,
    language,
  })

  const statusBadgeClass = (status: string) => {
    if (status === "sent") return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
    if (status === "failed") return "bg-destructive/15 text-destructive border-destructive/30"
    return "bg-muted text-muted-foreground border-border/50"
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className={`max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-card/95 p-0 text-foreground ${PANEL_SHADOW}`}>
        <DialogHeader className="space-y-3 bg-card/90 px-6 py-5 shrink-0 shadow-sm shadow-primary/5">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <IconMail className="h-5 w-5 text-primary" />
            {phase === "results"
              ? t("results_title")
              : mode === "single"
                ? t("title_single")
                : t("title_selected")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {phase === "results"
              ? t("results_subtitle")
              : mode === "single"
                ? t("desc_single")
                : t("desc_selected", { count: targetCount })}
          </DialogDescription>
        </DialogHeader>

        {phase === "compose" ? (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="grid gap-6 px-6 py-6 overflow-y-auto flex-1">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="subject">
                  {t("subject")}
                </label>
                <Input
                  id="subject"
                  placeholder={t("subject_placeholder")}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  disabled={isLoading}
                  className="h-11 rounded-xl bg-muted/40 text-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="message">
                  {t("message")}
                </label>
                <Textarea
                  id="message"
                  placeholder={t("message_placeholder")}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={isLoading}
                  className="min-h-[160px] rounded-xl bg-muted/40 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">{t("language")}:</span>
                <div className="flex gap-2">
                  <Badge
                    onClick={() => setLanguage("hu")}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs ${language === "hu" ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"}`}
                  >
                    {t("hu")}
                  </Badge>
                  <Badge
                    onClick={() => setLanguage("en")}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs ${language === "en" ? "bg-accent text-accent-foreground" : "bg-muted/40 text-muted-foreground"}`}
                  >
                    {t("en")}
                  </Badge>
                </div>
              </div>

              <Separator className="opacity-30" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{t("preview")}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview((prev) => !prev)}
                    className="gap-2"
                  >
                    {showPreview ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                    {showPreview ? t("hide_preview") : t("show_preview")}
                  </Button>
                </div>
                {showPreview && (
                  <iframe
                    title={t("preview")}
                    srcDoc={previewHtml}
                    className="h-80 w-full rounded-xl border border-border/40 bg-white"
                  />
                )}
              </div>
            </div>

            <DialogFooter className="shrink-0 flex flex-col items-stretch gap-3 px-6 py-4 sm:flex-row sm:justify-end shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
              <Button type="submit" disabled={isLoading} variant="success" className="gap-2">
                <IconSend className="h-4 w-4" />
                {t("send")}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {lastSummary ? (
              <div className="shrink-0 px-6 pt-2 pb-4 space-y-2 text-xs text-muted-foreground border-b border-border/40">
                <p className="font-semibold text-foreground text-sm">{t("metrics_title")}</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  <span>{t("metric_selected_rows", { count: lastSummary.selectedPlayerCount })}</span>
                  <span>{t("metric_unique_players", { count: lastSummary.uniqueSelectedPlayerCount })}</span>
                  <span>{t("metric_players_found", { count: lastSummary.playersFoundCount })}</span>
                  <span>{t("metric_not_found", { count: lastSummary.skippedPlayerNotFoundCount })}</span>
                  <span>{t("metric_no_user", { count: lastSummary.skippedNoUserCount })}</span>
                  <span>{t("metric_no_contact", { count: lastSummary.skippedNoEmailCount })}</span>
                  <span>{t("metric_dup_recipient", { count: lastSummary.skippedDuplicateEmailCount })}</span>
                  <span>{t("metric_unique_recipients", { count: lastSummary.uniqueEmailCount })}</span>
                  <span>{t("metric_attempts", { count: lastSummary.sendAttemptCount })}</span>
                  <span>{t("metric_sent", { count: lastSummary.sentCount })}</span>
                  <span>{t("metric_failed", { count: lastSummary.failedCount })}</span>
                </div>
              </div>
            ) : null}

            <div className="flex-1 min-h-48 min-w-0 overflow-y-auto overflow-x-auto px-6 py-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-1 bg-card/95 backdrop-blur-sm border-b border-border/50">
                  <tr className="text-muted-foreground uppercase tracking-wider">
                    <th className="py-2 pr-2 font-semibold">{t("results_col_player")}</th>
                    <th className="py-2 pr-2 font-semibold">{t("results_col_status")}</th>
                    <th className="py-2 pr-2 font-semibold hidden sm:table-cell">{t("results_col_reason")}</th>
                    <th className="py-2 font-semibold hidden md:table-cell">{t("results_col_time")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {lastResults.map((row) => (
                    <tr key={`${row.playerId}-${row.sentAt || row.status}`}>
                      <td className="py-2 pr-2 align-top font-medium text-foreground">
                        {row.playerName || row.playerId}
                      </td>
                      <td className="py-2 pr-2 align-top">
                        <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(row.status)}`}>
                          {t(`status_${row.status}`)}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2 align-top hidden sm:table-cell text-muted-foreground">
                        {translateReason(row.reason)}
                      </td>
                      <td className="py-2 align-top hidden md:table-cell text-muted-foreground whitespace-nowrap">
                        {row.sentAt ? new Date(row.sentAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter className="shrink-0 px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleDialogOpenChange(false)}
              >
                {t("results_done")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
