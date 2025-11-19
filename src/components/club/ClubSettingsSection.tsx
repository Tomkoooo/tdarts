"use client"

import * as React from "react"
import {
  IconSettings,
  IconEdit,
  IconPlus,
  IconUsers,
  IconTrash,
  IconDoorExit,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import PlayerSearch from "./PlayerSearch"
import MemberList from "./MemberList"
import QRCodeModal from "./QRCodeModal"
import { Club } from "@/interface/club.interface"

interface ClubSettingsSectionProps {
  club: Club
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  userId?: string
  onEditClub: () => void
  onCreateTournament: () => void
  onPlayerSelected: (player: any) => Promise<void>
  onLeaveClub: () => Promise<void>
  onDeactivateClub: () => Promise<void>
  onClubUpdated: () => void | Promise<void>
}

export function ClubSettingsSection({
  club,
  userRole,
  userId,
  onEditClub,
  onCreateTournament,
  onPlayerSelected,
  onLeaveClub,
  onDeactivateClub,
  onClubUpdated,
}: ClubSettingsSectionProps) {
  const [qrCodeModal, setQrCodeModal] = React.useState<{
    isOpen: boolean
    boardNumber: number
    boardName?: string
  }>({
    isOpen: false,
    boardNumber: 0,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 shadow-lg shadow-primary/20">
          <IconSettings size={24} className="text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">Beállítások</h2>
      </div>

      {/* Club Management */}
      <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm shadow-lg shadow-primary/10">
        <CardHeader className="shadow-sm shadow-primary/5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconEdit size={20} className="text-primary" />
            Klub adatok szerkesztése
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={onEditClub}
            >
              <IconEdit size={16} />
              Klub szerkesztése
            </Button>
            <Button
              className="flex-1 gap-2 shadow-lg shadow-primary/30"
              onClick={onCreateTournament}
            >
              <IconPlus size={16} />
              Új verseny indítása
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Member Management */}
      <Card className="bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm shadow-lg shadow-success/10">
        <CardHeader className="shadow-sm shadow-success/5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconUsers size={20} className="text-success" />
            Tagok kezelése
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <PlayerSearch
            onPlayerSelected={onPlayerSelected}
            placeholder="Játékos keresése vagy hozzáadása..."
            userRole={userRole}
          />
          <MemberList
            members={club.members as {
              _id: string
              userRef?: string
              role: 'admin' | 'moderator' | 'member'
              name: string
              username: string
            }[]}
            userRole={userRole}
            userId={userId}
            clubId={club._id}
            onClubUpdated={async () => {
              await onClubUpdated()
            }}
            showActions={true}
          />
        </CardContent>
      </Card>


      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrCodeModal.isOpen}
        onClose={() => setQrCodeModal({ isOpen: false, boardNumber: 0 })}
        clubId={club._id}
        boardNumber={qrCodeModal.boardNumber}
        boardName={qrCodeModal.boardName}
      />

      {/* Danger Zone */}
      <Card className="bg-gradient-to-br from-destructive/5 to-card/80 backdrop-blur-sm shadow-lg shadow-destructive/20">
        <CardHeader className="shadow-sm shadow-destructive/10">
          <CardTitle className="text-destructive flex items-center gap-2">
            <IconTrash size={20} />
            Veszélyes műveletek
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {userRole === 'admin' && (
              <Button
                variant="destructive"
                className="flex-1 gap-2 shadow-lg shadow-destructive/30"
                onClick={onDeactivateClub}
              >
                <IconTrash size={16} />
                Klub deaktiválása
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={onLeaveClub}
            >
              <IconDoorExit size={16} />
              Kilépés a klubból
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClubSettingsSection

