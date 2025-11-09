import React, { useState } from 'react'
import axios from 'axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import PlayerSearch from './PlayerSearch'

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
  userId,
  onPlayerAdded,
}: AddPlayerModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handlePlayerSelected = (player: any) => {
    setSelectedPlayer(player)
  }

  const handleAdd = async () => {
    if (!selectedPlayer) return
    setLoading(true)
    try {
      await axios.post(`/api/clubs/${clubId}/addMember`, {
        userId: selectedPlayer._id,
        requesterId: userId,
        isGuest: selectedPlayer.isGuest,
        name: selectedPlayer.name,
      })
      onPlayerAdded()
      onClose()
    } catch (error) {
      console.error('Hiba a játékos hozzáadása során:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Játékos hozzáadása</DialogTitle>
          <DialogDescription>
            Keress rá egy regisztrált játékosra vagy adj hozzá egy vendéget a klubodhoz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <PlayerSearch
            onPlayerSelected={handlePlayerSelected}
            placeholder="Keress játékost név vagy felhasználónév alapján..."
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
                {selectedPlayer.isGuest ? 'Vendég' : 'Regisztrált'}
              </Badge>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            Mégse
          </Button>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!selectedPlayer || loading}
            className="w-full sm:w-auto"
          >
            {loading ? 'Hozzáadás...' : 'Hozzáadás'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}