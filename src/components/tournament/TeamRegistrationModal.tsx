"use client"

import React, { useState } from "react"
import { toast } from "react-hot-toast"
import { IconUsers, IconX, IconUser } from "@tabler/icons-react"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"
import { FormField } from "@/components/ui/form-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import PlayerSearch from "@/components/club/PlayerSearch"

interface TeamRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  tournamentCode: string
  tournamentName: string
  clubId: string
  onSuccess: () => void
  isModeratorMode?: boolean // If true, select both members instead of auto-including current user
}

export default function TeamRegistrationModal({
  isOpen,
  onClose,
  tournamentCode,
  tournamentName,
  clubId,
  onSuccess,
  isModeratorMode = false,
}: TeamRegistrationModalProps) {
  const [teamName, setTeamName] = useState("")
  const [member1, setMember1] = useState<any>(null)
  const [member2, setMember2] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    setError("")
    
    if (!teamName) {
      setError("Kérjük, add meg a csapat nevét")
      return
    }
    
    if (isModeratorMode) {
      if (!member1 || !member2) {
        setError("Kérjük, válaszd ki mindkét csapattagot")
        return
      }
    } else {
      if (!member1) {
        setError("Kérjük, válassz társat")
        return
      }
    }

    setIsSubmitting(true)

    try {
      const members = isModeratorMode 
        ? [
            { userRef: member1.userRef, name: member1.name },
            { userRef: member2.userRef, name: member2.name },
          ]
        : [
            { userRef: member1.userRef, name: member1.name },
          ]

      const response = await fetch(`/api/tournaments/${tournamentCode}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName,
          members,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Hiba történt a csapat regisztráció során")
      }

      if (data.message === 'waiting_for_partner') {
        toast.success("Meghívó elküldve a társadnak! A csapat a várólistára került az elfogadásig.", { 
          duration: 5000,
          icon: '📩'
        })
      } else {
        toast.success("Csapat sikeresen létrehozva!")
      }
      
      onSuccess()
      onClose()
      
      // Reset form
      setTeamName("")
      setMember1(null)
      setMember2(null)
    } catch (err: any) {
      setError(err.message || "Hiba történt a csapat regisztráció során")
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setTeamName("")
      setMember1(null)
      setMember2(null)
      setError("")
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <IconUsers className="h-6 w-6 text-primary" />
            Páros nevezés - {tournamentName}
          </DialogTitle>
          <DialogDescription>
            {isModeratorMode 
              ? 'Add meg a csapat nevét és válaszd ki mindkét csapattagot'
              : 'Add meg a csapat nevét és válaszd ki a társadat'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <FormField
            label="Csapat név"
            placeholder="pl.: A Nyerők"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            icon={<IconUsers className="h-5 w-5" />}
            required
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isModeratorMode ? '1. csapattag' : 'Társ kiválasztása'}
            </label>
            {member1 ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-3">
                  <IconUser className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{member1.name}</p>
                    {member1.userRef && (
                      <p className="text-xs text-muted-foreground">Regisztrált játékos</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMember1(null)}
                >
                  <IconX className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <PlayerSearch
                onPlayerSelected={setMember1}
                clubId={clubId}
                isForTournament
                showAddGuest={true}
                placeholder={isModeratorMode ? "Keress rá az 1. csapattagra vagy add meg a nevét" : "Keress rá a társadra vagy add meg a nevét"}
              />
            )}
          </div>

          {isModeratorMode && (
            <div className="space-y-2">
              <label className="text-sm font-medium">2. csapattag</label>
              {member2 ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-3">
                    <IconUser className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{member2.name}</p>
                      {member2.userRef && (
                        <p className="text-xs text-muted-foreground">Regisztrált játékos</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMember2(null)}
                  >
                    <IconX className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <PlayerSearch
                  onPlayerSelected={setMember2}
                  clubId={clubId}
                  isForTournament
                  showAddGuest={true}
                  placeholder="Keress rá a 2. csapattagra vagy add meg a nevét"
                />
              )}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Mégse
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !teamName || !member1 || (isModeratorMode && !member2)}
          >
            {isSubmitting ? "Mentés..." : "Csapat létrehozása"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
