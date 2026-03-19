"use client"

import * as React from "react"
import {
  IconArrowDown,
  IconBrush,
  IconChevronDown,
  IconDoorExit,
  IconLayoutGrid,
  IconNews,
  IconPhoto,
  IconSettings,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"
import ClubGeneralSettings from "./ClubGeneralSettings"
import ClubBrandingSettings from "./ClubBrandingSettings"
import ClubNewsSettings from "./ClubNewsSettings"
import ClubGallerySettings from "./ClubGallerySettings"
import PlayerSearch from "./PlayerSearch"
import MemberList from "./MemberList"
import QRCodeModal from "./QRCodeModal"
import { Club } from "@/interface/club.interface"
import { Button } from "@/components/ui/Button"
import { getMapSettingsTranslations } from "@/data/translations/map-settings"
import ClubGlassSectionCard from "./ClubGlassSectionCard"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface ClubSettingsSectionProps {
  club: Club
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  userId?: string
  onCreateTournament: () => void
  onPlayerSelected: (player: any) => Promise<void>
  onLeaveClub: () => Promise<void>
  onDeactivateClub: () => Promise<void>
  onClubUpdated: () => void | Promise<void>
  membersLoading?: boolean
}

export function ClubSettingsSection({
  club,
  userRole,
  userId,
  onPlayerSelected,
  onLeaveClub,
  onDeactivateClub,
  onClubUpdated,
  membersLoading = false,
}: ClubSettingsSectionProps) {
  const t = getMapSettingsTranslations(typeof navigator !== "undefined" ? navigator.language : "hu")
  const [activeSection, setActiveSection] = React.useState("general")
  const [mobileExpanded, setMobileExpanded] = React.useState<string[]>(["general"])
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

  const sectionNav: Array<{ id: string; label: string; description: string; icon: React.ReactNode }> = [
    { id: "general", label: t.mapSectionGeneral, description: "Klubadatok, cím és elérhetőség", icon: <IconLayoutGrid size={16} /> },
    { id: "branding", label: t.mapSectionBranding, description: "Megjelenés és arculat", icon: <IconBrush size={16} /> },
    { id: "news", label: t.mapSectionNews, description: "Hírek és publikált tartalmak", icon: <IconNews size={16} /> },
    { id: "gallery", label: t.mapSectionGallery, description: "Képek és galéria menedzsment", icon: <IconPhoto size={16} /> },
    { id: "members", label: t.mapSectionMembers, description: "Tagok, szerepkörök és jogosultság", icon: <IconUsers size={16} /> },
    { id: "danger", label: t.mapSectionDanger, description: "Visszafordíthatatlan műveletek", icon: <IconTrash size={16} /> },
  ]

  const toggleMobileSection = (id: string) => {
    setMobileExpanded((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <div className="rounded-3xl border border-border/50 bg-linear-to-br from-card/95 via-card/80 to-card/55 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-6">
        <div className="flex items-start gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary/25 via-primary/20 to-accent/15 shadow-lg shadow-primary/25">
            <IconSettings size={24} className="text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Klub Beállítások</h2>
            <p className="text-sm text-muted-foreground md:text-base">
              Új, mobil-first kezelőfelület card alapú információs architektúrával.
            </p>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="sticky top-24 z-20 rounded-2xl border border-border/50 bg-card/80 p-3 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <IconArrowDown size={16} />
            {t.mapSectionsLabel}
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {sectionNav.map((section) => {
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    isActive
                      ? "border-primary/50 bg-primary/15 shadow-glow-primary"
                      : "border-border/40 bg-background/40 hover:border-primary/30 hover:bg-primary/8"
                  )}
                >
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                    {section.icon}
                    {section.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{section.description}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="hidden space-y-6 md:block">
        {activeSection === "general" && (
          <ClubGlassSectionCard
            id="general"
            title="Alapadatok"
            description="A klub nyilvános adatainak szerkesztése"
            icon={<IconLayoutGrid size={20} className="text-primary" />}
          >
            <ClubGeneralSettings
              club={club}
              onClubUpdated={async () => {
                if (onClubUpdated) await onClubUpdated()
              }}
              userId={userId}
            />
          </ClubGlassSectionCard>
        )}

        {activeSection === "branding" && (
          <ClubGlassSectionCard
            id="branding"
            title="Megjelenés"
            description="Színek, logó, borítókép és SEO"
            icon={<IconBrush size={20} className="text-primary" />}
          >
            <ClubBrandingSettings
              club={club}
              onClubUpdated={() => {
                if (onClubUpdated) onClubUpdated()
              }}
            />
          </ClubGlassSectionCard>
        )}

        {activeSection === "news" && (
          <ClubGlassSectionCard
            id="news"
            title="Hírek és tartalom"
            description="Kiemelt kommunikáció a klub oldalán"
            icon={<IconNews size={20} className="text-primary" />}
          >
            <ClubNewsSettings club={club} />
          </ClubGlassSectionCard>
        )}

        {activeSection === "gallery" && (
          <ClubGlassSectionCard
            id="gallery"
            title="Képgaléria"
            description="Képek kezelése és sorrendje"
            icon={<IconPhoto size={20} className="text-primary" />}
          >
            <ClubGallerySettings club={club} />
          </ClubGlassSectionCard>
        )}

        {activeSection === "members" && (
          <ClubGlassSectionCard
            id="members"
            title="Tagok kezelése"
            description="Játékosok felvétele és jogosultságok"
            icon={<IconUsers size={20} className="text-primary" />}
          >
            <div className="space-y-4">
              <PlayerSearch
                onPlayerSelected={onPlayerSelected}
                placeholder="Játékos keresése vagy hozzáadása..."
                userRole={userRole}
              />
              {membersLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
              ) : (
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
              )}
            </div>
          </ClubGlassSectionCard>
        )}

        {activeSection === "danger" && (
          <ClubGlassSectionCard
            id="danger"
            title="Veszélyes műveletek"
            description="Csak akkor használd, ha biztos vagy benne"
            icon={<IconTrash size={20} className="text-destructive" />}
            className="border-destructive/30"
          >
            <div className="flex flex-col gap-3 sm:flex-row">
              {userRole === "admin" && (
                <Button variant="destructive" className="flex-1 gap-2" onClick={onDeactivateClub}>
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
          </ClubGlassSectionCard>
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {sectionNav.map((section) => {
          const isExpanded = mobileExpanded.includes(section.id)
          return (
            <div
              key={section.id}
              className="overflow-hidden rounded-2xl border border-border/50 bg-card/75 shadow-[0_10px_25px_rgba(0,0,0,0.25)] backdrop-blur-xl"
            >
              <button
                onClick={() => toggleMobileSection(section.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <div>
                  <div className="flex items-center gap-2 text-base font-semibold">
                    {section.icon}
                    {section.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{section.description}</div>
                </div>
                <IconChevronDown className={cn("size-4 transition-transform", isExpanded ? "rotate-180" : "rotate-0")} />
              </button>
              {isExpanded && (
                <div className="border-t border-border/45 p-4">
                  {section.id === "general" && (
                    <ClubGeneralSettings
                      club={club}
                      onClubUpdated={async () => {
                        if (onClubUpdated) await onClubUpdated()
                      }}
                      userId={userId}
                    />
                  )}
                  {section.id === "branding" && (
                    <ClubBrandingSettings
                      club={club}
                      onClubUpdated={() => {
                        if (onClubUpdated) onClubUpdated()
                      }}
                    />
                  )}
                  {section.id === "news" && <ClubNewsSettings club={club} />}
                  {section.id === "gallery" && <ClubGallerySettings club={club} />}
                  {section.id === "members" && (
                    <div className="space-y-4">
                      <PlayerSearch
                        onPlayerSelected={onPlayerSelected}
                        placeholder="Játékos keresése vagy hozzáadása..."
                        userRole={userRole}
                      />
                      {membersLoading ? (
                        <div className="space-y-3">
                          <Skeleton className="h-20 rounded-xl" />
                          <Skeleton className="h-20 rounded-xl" />
                        </div>
                      ) : (
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
                      )}
                    </div>
                  )}
                  {section.id === "danger" && (
                    <div className="flex flex-col gap-3">
                      {userRole === "admin" && (
                        <Button variant="destructive" className="gap-2" onClick={onDeactivateClub}>
                          <IconTrash size={16} />
                          Klub deaktiválása
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={onLeaveClub}
                      >
                        <IconDoorExit size={16} />
                        Kilépés a klubból
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
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
