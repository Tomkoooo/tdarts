"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Textarea } from "@/components/ui/textarea"

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

  const handleConfirm = () => {
    if (hasPlayers && playersWithEmailCount > 0) {
      onConfirm({ subject, message })
    } else {
      onConfirm()
    }
    // Reset form
    setSubject("Torna törölve")
    setMessage("Sajnálattal értesítünk, hogy ez a torna törölve lett.")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Torna törlése</DialogTitle>
          <DialogDescription>
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
          </DialogDescription>
        </DialogHeader>

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

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Mégse
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Törlés
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

