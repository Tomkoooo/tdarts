"use client"

import * as React from "react"
import {
  IconSettings,
  IconEdit,
  IconPlus,
  IconUsers,
  IconTarget,
  IconTrash,
  IconDoorExit,
  IconAlertCircle,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <IconSettings className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">Beállítások</h2>
      </div>

      {/* Club Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconEdit className="w-5 h-5" />
            Klub adatok szerkesztése
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onEditClub}
            >
              <IconEdit className="w-4 h-4 mr-2" />
              Klub szerkesztése
            </Button>
            <Button
              className="flex-1"
              onClick={onCreateTournament}
            >
              <IconPlus className="w-4 h-4 mr-2" />
              Új verseny indítása
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Member Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUsers className="w-5 h-5" />
            Tagok kezelése
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

      {/* Board Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconTarget className="w-5 h-5" />
            Táblák kezelése
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-500/10 border-blue-500/20">
            <IconAlertCircle className="w-4 h-4 text-blue-500" />
            <AlertDescription className="text-blue-500/90">
              A táblák mostantól a tornáknál kerülnek létrehozásra és kezelésre. Hozz létre egy új tornát, és ott add meg a táblákat!
            </AlertDescription>
          </Alert>
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
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Veszélyes műveletek</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {userRole === 'admin' && (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={onDeactivateClub}
              >
                <IconTrash className="w-4 h-4 mr-2" />
                Klub deaktiválása
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={onLeaveClub}
            >
              <IconDoorExit className="w-4 h-4 mr-2" />
              Kilépés a klubból
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClubSettingsSection

