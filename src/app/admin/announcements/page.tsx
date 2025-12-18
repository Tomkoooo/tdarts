"use client"

import AnnouncementTable from "@/components/admin/AnnouncementTable"
import { IconSpeakerphone } from "@tabler/icons-react"
import { Card } from "@/components/ui/Card"

export default function AdminAnnouncementsPage() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <Card
        className="relative overflow-hidden backdrop-blur-xl bg-card/30 p-8"
      >
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3 text-primary">
            <IconSpeakerphone className="size-10" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Announcement Kezelő</h1>
        </div>
          <p className="max-w-xl text-sm text-muted-foreground">Rendszerüzenetek létrehozása és kezelése</p>
        </div>
      </Card>

      {/* Announcement Manager Component */}
      <AnnouncementTable />
    </div>
  )
}
