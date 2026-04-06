import React, { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AppModal } from '@/components/modal/AppModal'
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import PlayerSearch from './PlayerSearch'
import { useTranslations } from 'next-intl'
import { addMemberAction } from '@/features/clubs/actions/addMember.action'

interface AddPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  clubId: string
  userId?: string
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  onPlayerAdded: () => void
}

export default function AddPlayerModal({
  isOpen,
  onClose,
  clubId,
  onPlayerAdded,
}: AddPlayerModalProps) {
  const t = useTranslations('Club.settings.add_player_modal')
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handlePlayerSelected = (player: any) => {
    setSelectedPlayer(player)
  }

  const handleAdd = async () => {
    if (!selectedPlayer) return
    setLoading(true)
    try {
      await addMemberAction({ clubId, userId: selectedPlayer._id })
      onPlayerAdded()
      onClose()
    } catch (error) {
      console.error(t('error_adding'), error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppModal open={isOpen} onOpenChange={(open) => !open && onClose()} size="lg">
        <div className="px-6 py-6 space-y-4">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <PlayerSearch
            onPlayerSelected={handlePlayerSelected}
            placeholder={t('search_placeholder')}
            className="w-full"
            clubId={clubId}
            isForTournament={false}
          />

          {selectedPlayer && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
              <div>
                <div className="font-medium text-foreground">{selectedPlayer.name}</div>
                {selectedPlayer.username && (
                  <div className="text-xs text-muted-foreground">@{selectedPlayer.username}</div>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {selectedPlayer.isGuest ? t('badge_guest') : t('badge_registered')}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!selectedPlayer || loading}
            className="w-full sm:w-auto"
          >
            {loading ? t('adding') : t('add')}
          </Button>
        </DialogFooter>
        </div>
    </AppModal>
  )
}