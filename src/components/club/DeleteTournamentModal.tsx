"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Textarea } from "@/components/ui/textarea"
import { IconX } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

interface DeleteTournamentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (emailData?: { subject: string; message: string }) => void
  tournamentName: string
  hasPlayers: boolean
  playersWithEmailCount: number
}

export default function DeleteTournamentModal({
  isOpen,
  onClose,
  onConfirm,
  tournamentName,
  hasPlayers,
  playersWithEmailCount,
}: DeleteTournamentModalProps) {
  const t = useTranslations('Club.delete_tournament_modal')
  const [subject, setSubject] = React.useState(t('default_subject'))
  const [message, setMessage] = React.useState(t('default_message'))
  const [skipNotification, setSkipNotification] = React.useState(false)

  React.useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
      
      // Reset defaults when opening
      setSubject(t('default_subject'))
      setMessage(t('default_message'))
      setSkipNotification(false)
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen, t])

  const handleConfirm = () => {
    if (hasPlayers && playersWithEmailCount > 0 && !skipNotification) {
      onConfirm({ subject, message })
    } else {
      onConfirm()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none">
        <div 
          className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl p-6 pointer-events-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1 opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
          >
            <IconX className="h-4 w-4" />
          </button>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{t('title')}</h2>
              <div className="text-sm text-muted-foreground mt-2">
                <p>{t('confirm_question', { name: tournamentName })}</p>
                {hasPlayers && playersWithEmailCount > 0 && (
                  <span className="block mt-2">
                    {t('notification_info', { count: playersWithEmailCount })}
                  </span>
                )}
                {hasPlayers && playersWithEmailCount === 0 && (
                  <span className="block mt-2 text-muted-foreground">
                    {t('no_email_notification')}
                  </span>
                )}
                {!hasPlayers && (
                  <span className="block mt-2 text-muted-foreground">
                    {t('no_players_notification')}
                  </span>
                )}
              </div>
            </div>

            {hasPlayers && playersWithEmailCount > 0 && (
              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="skip-notification"
                  checked={skipNotification}
                  onChange={(e) => setSkipNotification(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="skip-notification" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t('skip_notification_label')}
                </Label>
              </div>
            )}

            {hasPlayers && playersWithEmailCount > 0 && !skipNotification && (
              <div className="space-y-4 py-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="email-subject">{t('email_subject_label')}</Label>
                  <Input
                    id="email-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('default_subject')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-message">{t('email_message_label')}</Label>
                  <Textarea
                    id="email-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('default_message')}
                    rows={5}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                {t('cancel')}
              </Button>
              <Button variant="destructive" onClick={handleConfirm} className="w-full sm:w-auto">
                {t('delete')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
