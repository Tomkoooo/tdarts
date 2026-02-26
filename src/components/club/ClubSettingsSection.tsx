"use client"

import * as React from "react"
import {
  IconSettings,
  IconArrowDown,
} from "@tabler/icons-react"
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
import { getMapSettingsTranslations } from "@/data/translations/map-settings"

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
  const t = getMapSettingsTranslations(typeof navigator !== "undefined" ? navigator.language : "hu")
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

  const sectionNav = [
    { id: 'general', label: t.mapSectionGeneral },
    { id: 'branding', label: t.mapSectionBranding },
    { id: 'news', label: t.mapSectionNews },
    { id: 'gallery', label: t.mapSectionGallery },
    { id: 'members', label: t.mapSectionMembers },
    { id: 'danger', label: t.mapSectionDanger },
  ]

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center size-12 rounded-2xl bg-linear-to-br from-primary/20 to-accent/10 shadow-lg shadow-primary/20">
          <IconSettings size={24} className="text-primary" />
        </div>
        <div>
           <h2 className="text-2xl md:text-3xl font-bold">Klub Beállítások</h2>
           <p className="text-muted-foreground">Kezeld a klub adatait, megjelenését és tagjait</p>
        </div>
      </div>

      <div className="sticky top-20 md:top-[8rem] z-20 rounded-xl border border-border/50 bg-card/95 p-3 backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <IconArrowDown size={16} />
          {t.mapSectionsLabel}
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionNav.map((section) => (
            <Button key={section.id} variant="outline" size="sm" onClick={() => scrollToSection(section.id)}>
              {section.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
          <Card id="general">
              <CardHeader>
                  <CardTitle>Alapadatok</CardTitle>
                  <CardDescription>A klub nyilvános adatainak szerkesztése</CardDescription>
              </CardHeader>
              <CardContent>
                  <ClubGeneralSettings 
                    club={club} 
                    onClubUpdated={async () => { 
                        if (onClubUpdated) await onClubUpdated() 
                    }} 
                    userId={userId} 
                  />
              </CardContent>
          </Card>

          <Card id="branding">
              <CardHeader>
                  <CardTitle>Megjelenés</CardTitle>
                  <CardDescription>Színek, logó, borítókép és SEO</CardDescription>
              </CardHeader>
              <CardContent>
                  <ClubBrandingSettings 
                      club={club} 
                      onClubUpdated={() => { if(onClubUpdated) onClubUpdated() }} 
                  />
              </CardContent>
          </Card>

          <Card id="news">
              <CardHeader>
                  <CardTitle>Hírek & Tartalom</CardTitle>
              </CardHeader>
              <CardContent>
                  <ClubNewsSettings club={club} />
              </CardContent>
          </Card>

          <Card id="gallery">
              <CardHeader>
                  <CardTitle>Képgaléria</CardTitle>
              </CardHeader>
              <CardContent>
                  <ClubGallerySettings club={club} />
              </CardContent>
          </Card>

          <Card id="members">
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

          <Card id="danger" className="bg-destructive/5 border-destructive/20">
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
      </div>

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
