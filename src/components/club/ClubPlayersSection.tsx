import { useTranslations } from "next-intl";

"use client"

import * as React from "react"
import { IconUsers } from "@tabler/icons-react"
import MemberList from "./MemberList"
import { Club } from "@/interface/club.interface"

interface ClubPlayersSectionProps {
  club: Club
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  userId?: string
  onClubUpdated: () => void | Promise<void>
}

export function ClubPlayersSection({
  club,
  userRole,
  userId,
  onClubUpdated,
}: ClubPlayersSectionProps) {
    const t = useTranslations("Auto");
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <IconUsers className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">{t("játékosok")}</h2>
      </div>

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
        showActions={false}
      />
    </div>
  )
}

export default ClubPlayersSection

