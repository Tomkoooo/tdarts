"use client"

import { useUserContext } from "@/hooks/useUser"
import { ProfilePictureUpload } from "./ProfilePictureUpload"
import { useTranslations } from "next-intl"

export function ProfileHeader() {
  const { user, setUser } = useUserContext()
  const t = useTranslations("Profile.header")

  const handleUploadSuccess = (url: string) => {
    if (user) {
      setUser({ ...user, profilePicture: url })
    }
  }

  return (
    <div className="text-center mb-8">
      <ProfilePictureUpload 
        currentPicture={user?.profilePicture} 
        onUploadSuccess={handleUploadSuccess}
      />
      <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mt-4 mb-2">
        {t("title")}
      </h1>
      <p className="text-muted-foreground text-base">
        {t("subtitle")}
      </p>
    </div>
  )
}

export default ProfileHeader
