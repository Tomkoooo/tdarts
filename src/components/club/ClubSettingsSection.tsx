"use client"

import * as React from "react"
import {
  IconSettings,
  IconInfoCircle,
  IconPalette,
  IconNews,
  IconPhoto,
  IconUsers,
} from "@tabler/icons-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import ClubGeneralSettings from "./ClubGeneralSettings"
import ClubBrandingSettings from "./ClubBrandingSettings"
import ClubNewsSettings from "./ClubNewsSettings"
import ClubGallerySettings from "./ClubGallerySettings"
import PlayerSearch from "./PlayerSearch"
import MemberList from "./MemberList"
import QRCodeModal from "./QRCodeModal"
import { Club } from "@/interface/club.interface"
import { Button } from "@/components/ui/Button"
import { IconTrash, IconDoorExit } from "@tabler/icons-react"

interface ClubSettingsSectionProps {
  club: Club
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  userId?: string
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

  // Only admin/moderator should see most of this.
  // Assuming the parent component checks this, but extra check is fine.
  if (userRole !== 'admin' && userRole !== 'moderator') {
      return <div>Nincs jogosultságod a beállítások megtekintéséhez.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 shadow-lg shadow-primary/20">
          <IconSettings size={24} className="text-primary" />
        </div>
        <div>
           <h2 className="text-2xl md:text-3xl font-bold">Klub Beállítások</h2>
           <p className="text-muted-foreground">Kezeld a klub adatait, megjelenését és tagjait</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full space-y-6">
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="w-auto inline-flex justify-start">
               <TabsTrigger value="general" className="gap-2"><IconInfoCircle size={16}/> Adatok</TabsTrigger>
               <TabsTrigger value="branding" className="gap-2"><IconPalette size={16}/> Megjelenés</TabsTrigger>
               <TabsTrigger value="news" className="gap-2"><IconNews size={16}/> Hírek</TabsTrigger>
               <TabsTrigger value="gallery" className="gap-2"><IconPhoto size={16}/> Galéria</TabsTrigger>
               <TabsTrigger value="members" className="gap-2"><IconUsers size={16}/> Tagok</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general" className="space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Alapadatok</CardTitle>
                      <CardDescription>A klub nyilvános adatainak szerkesztése</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <ClubGeneralSettings 
                        club={club} 
                        onClubUpdated={async () => { 
                            // Propagate update if parent needs logic, usually revalidation
                            if (onClubUpdated) await onClubUpdated() 
                        }} 
                        userId={userId} 
                      />
                  </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="bg-destructive/5 border-destructive/20">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <IconTrash size={20} />
                    Veszélyes műveletek
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {userRole === 'admin' && (
                      <Button
                        variant="destructive"
                        className="flex-1 gap-2"
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
          </TabsContent>

          <TabsContent value="branding">
              <Card>
                  <CardHeader>
                      <CardTitle>Megjelenés</CardTitle>
                      <CardDescription>Színek, logó és egyéni stílusok</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <ClubBrandingSettings 
                          club={club} 
                          onClubUpdated={() => { if(onClubUpdated) onClubUpdated() }} 
                      />
                  </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="news">
              <Card>
                  <CardHeader>
                      <CardTitle>Hírek & Tartalom</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <ClubNewsSettings club={club} />
                  </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="gallery">
              <Card>
                  <CardHeader>
                      <CardTitle>Képgaléria</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <ClubGallerySettings club={club} />
                  </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tagok kezelése</CardTitle>
                  <CardDescription>Játékosok felvétele és jogosultságok</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PlayerSearch
                    onPlayerSelected={onPlayerSelected}
                    placeholder="Játékos keresése vagy hozzáadása..."
                    userRole={userRole}
                  />
                  <MemberList
                    members={club.members as any[]}
                    userRole={userRole}
                    userId={userId}
                    clubId={club._id}
                    onClubUpdated={async () => {
                      if (onClubUpdated) await onClubUpdated()
                    }}
                    showActions={true}
                  />
                </CardContent>
              </Card>
          </TabsContent>
      </Tabs>

      <QRCodeModal
        isOpen={qrCodeModal.isOpen}
        onClose={() => setQrCodeModal({ isOpen: false, boardNumber: 0 })}
        clubId={club._id}
        boardNumber={qrCodeModal.boardNumber}
        boardName={qrCodeModal.boardName}
      />
    </div>
  )
}

export default ClubSettingsSection
