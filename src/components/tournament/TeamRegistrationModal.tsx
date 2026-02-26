"use client"

import React, { useState } from "react"
import { toast } from "react-hot-toast"
import { IconUsers, IconX, IconUser } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

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
  isModeratorMode,
}: TeamRegistrationModalProps) {
  const tTour = useTranslations("Tournament")
  const t = (key: string, values?: any) => tTour(`team_registration.${key}`, values)
  const [teamName, setTeamName] = useState("")
  const [member1, setMember1] = useState<any>(null)
  const [member2, setMember2] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    setError("")
    
    if (!teamName) {
      setError(t("error_name"))
      return
    }
    
    if (isModeratorMode) {
      if (!member1 || !member2) {
        setError(t("error_both_members"))
        return
      }
    } else {
      if (!member1) {
        setError(t("error_partner"))
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
        throw new Error(data.error || t("error_generic"))
      }

      if (data.message === 'waiting_for_partner') {
        toast.success(t("success_invitation"), { 
          duration: 5000,
          icon: '📩'
        })
      } else {
        toast.success(t("success"))
      }
      
      onSuccess()
      onClose()
      
      // Reset form
      setTeamName("")
      setMember1(null)
      setMember2(null)
    } catch (err: any) {
      setError(err.message || t("error_generic"))
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
            {t("title", { name: tournamentName })}
          </DialogTitle>
          <DialogDescription>
            {isModeratorMode 
              ? t("desc_moderator")
              : t("desc_player")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <FormField
            label={t("team_name")}
            placeholder={t("team_name_placeholder")}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            icon={<IconUsers className="h-5 w-5" />}
            required
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isModeratorMode ? t("member_1_label") : t("partner_label")}
            </label>
            {member1 ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-3">
                  <IconUser className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{member1.name}</p>
                    {member1.userRef && (
                      <p className="text-xs text-muted-foreground">{t("registered_player")}</p>
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
                placeholder={isModeratorMode ? t("search_member_1") : t("search_partner")}
              />
            )}
          </div>

          {isModeratorMode && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("member_2_label")}</label>
              {member2 ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-center gap-3">
                    <IconUser className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{member2.name}</p>
                      {member2.userRef && (
                        <p className="text-xs text-muted-foreground">{t("registered_player")}</p>
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
                  placeholder={t("search_member_2")}
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
            {t("cancel")}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !teamName || !member1 || (isModeratorMode && !member2)}
          >
            {isSubmitting ? t("saving") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
