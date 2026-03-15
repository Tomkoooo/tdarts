"use client"

import { useUserContext } from "@/hooks/useUser"
import { ProfilePictureUpload } from "./ProfilePictureUpload"
import { useTranslations } from "next-intl"
import { IconMapPin, IconShield, IconShieldCheck, IconCalendar, IconMail } from "@tabler/icons-react"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"

export function ProfileHeader() {
  const { user, setUser } = useUserContext()
  const t = useTranslations("Profile.header")

  const handleUploadSuccess = (url: string) => {
    if (user) {
      setUser({ ...user, profilePicture: url })
    }
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, var(--color-primary) 0%, transparent 50%), radial-gradient(circle at 80% 20%, var(--color-accent) 0%, transparent 40%)",
        }}
        aria-hidden
      />

      <div className="relative px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="relative">
              <ProfilePictureUpload
                currentPicture={user?.profilePicture}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Name + verification badge */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
                {user?.name || t("title")}
              </h1>
              {user?.isVerified ? (
                <Badge
                  className="flex items-center gap-1 bg-success/15 text-success border-success/30 text-xs font-semibold"
                >
                  <IconShieldCheck className="w-3.5 h-3.5" aria-hidden />
                  Verified
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 text-warning border-warning/40 text-xs"
                >
                  <IconShield className="w-3.5 h-3.5" aria-hidden />
                  Unverified
                </Badge>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              {(user?.city || user?.country) && (
                <span className="flex items-center gap-1.5">
                  <IconMapPin className="w-4 h-4 shrink-0 text-primary" aria-hidden />
                  {[user.city, user.country].filter(Boolean).join(", ")}
                </span>
              )}
              {user?.email && (
                <span className="flex items-center gap-1.5">
                  <IconMail className="w-4 h-4 shrink-0 text-primary" aria-hidden />
                  <span className="truncate max-w-[200px]">{user.email}</span>
                </span>
              )}
              {user?.username && (
                <span className="flex items-center gap-1.5 font-mono text-xs bg-muted/60 rounded px-2 py-0.5">
                  @{user.username}
                </span>
              )}
            </div>

            {/* Subtitle */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("subtitle")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileHeader
