"use client"

import { useUserContext } from "@/hooks/useUser"
import { ProfilePictureUpload } from "./ProfilePictureUpload"

export function ProfileHeader() {
  const { user, setUser } = useUserContext()

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
        Profil kezelés
      </h1>
      <p className="text-muted-foreground text-base">
        Kezeld a fiókod beállításait és preferenciáit
      </p>
    </div>
  )
}

export default ProfileHeader

