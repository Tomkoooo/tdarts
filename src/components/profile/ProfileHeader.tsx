"use client"

import * as React from "react"
import { IconUser } from "@tabler/icons-react"

export function ProfileHeader() {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full border-2 border-primary/20 mb-4">
        <IconUser className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
        Profil kezelés
      </h1>
      <p className="text-muted-foreground text-base">
        Kezeld a fiókod beállításait és preferenciáit
      </p>
    </div>
  )
}

export default ProfileHeader

