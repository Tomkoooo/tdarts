"use client"
import { useTranslations } from "next-intl";

import * as React from "react"
import { IconUsers } from "@tabler/icons-react"
import MemberList from "./MemberList"
import { Club } from "@/interface/club.interface"
import { Skeleton } from "@/components/ui/skeleton"

interface ClubPlayersSectionProps {
  club: Club
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  userId?: string
  onClubUpdated: () => void | Promise<void>
  membersLoading?: boolean
}

export function ClubPlayersSection({
  club,
  userRole,
  userId,
  onClubUpdated,
  membersLoading = false,
}: ClubPlayersSectionProps) {
    const t = useTranslations("Club.components");
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <IconUsers className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">{t("játékosok")}</h2>
      </div>

      {membersLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
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
      )}
    </div>
  )
}

export default ClubPlayersSection

