"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Textarea } from "@/components/ui/textarea"
import { IconX } from "@tabler/icons-react"

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
  const [subject, setSubject] = React.useState("Torna törölve")
  const [message, setMessage] = React.useState("Sajnálattal értesítünk, hogy ez a torna törölve lett.")

  React.useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen])

  const handleConfirm = () => {
    if (hasPlayers && playersWithEmailCount > 0) {
      onConfirm({ subject, message })
    } else {
      onConfirm()
    }
    setSubject("Torna törölve")
    setMessage("Sajnálattal értesítünk, hogy ez a torna törölve lett.")
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
          className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-xl p-6 pointer-events-auto"
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
              <h2 className="text-lg font-semibold">Torna törlése</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Biztosan törölni szeretnéd a <strong>{tournamentName}</strong> tornát?
                {hasPlayers && playersWithEmailCount > 0 && (
                  <span className="block mt-2">
                    {playersWithEmailCount} jelentkezőnek email címmel értesítést küldünk.
                  </span>
                )}
                {hasPlayers && playersWithEmailCount === 0 && (
                  <span className="block mt-2 text-muted-foreground">
                    Nincs jelentkező email címmel, ezért nem küldünk értesítést.
                  </span>
                )}
                {!hasPlayers && (
                  <span className="block mt-2 text-muted-foreground">
                    Nincsenek jelentkezők, ezért nem küldünk értesítést.
                  </span>
                )}
              </p>
            </div>

            {hasPlayers && playersWithEmailCount > 0 && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email-subject">Email tárgy</Label>
                  <Input
                    id="email-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Torna törölve"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-message">Email üzenet</Label>
                  <Textarea
                    id="email-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Sajnálattal értesítünk, hogy ez a torna törölve lett."
                    rows={5}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Mégse
              </Button>
              <Button variant="destructive" onClick={handleConfirm} className="w-full sm:w-auto">
                Törlés
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
