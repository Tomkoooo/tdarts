"use client"

import * as React from "react"
import axios from "axios"
import { IconUser, IconMail, IconCircleCheck, IconCircleX, IconBrandGoogle, IconLock } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Badge } from "@/components/ui/Badge"
import { getCountryLabel } from "@/lib/countries"

interface CurrentInfoSectionProps {
  user: {
    email: string
    name: string
    username: string
    isVerified: boolean
    country?: string | null
  }
}

export function CurrentInfoSection({ user }: CurrentInfoSectionProps) {
  const [providerStatus, setProviderStatus] = React.useState<{
    googleLinked: boolean
    hasPassword: boolean
  } | null>(null)

  React.useEffect(() => {
    const loadProviderStatus = async () => {
      try {
        const response = await axios.get("/api/profile/auth-providers")
        if (response.data?.success) {
          setProviderStatus({
            googleLinked: !!response.data.data.googleLinked,
            hasPassword: !!response.data.data.hasPassword,
          })
        }
      } catch (error) {
        console.error("Failed to load auth provider status:", error)
      }
    }

    loadProviderStatus()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconUser className="w-5 h-5" />
          Jelenlegi információk
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {providerStatus && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <IconLock className="w-4 h-4" />
              Bejelentkezési módok
            </Label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={providerStatus.googleLinked ? "default" : "secondary"}
                className={providerStatus.googleLinked ? "bg-success/10 text-success border-success/20" : ""}
              >
                <IconBrandGoogle className="w-3 h-3 mr-1" />
                {providerStatus.googleLinked ? "Google kapcsolva" : "Google nincs kapcsolva"}
              </Badge>
              <Badge
                variant={providerStatus.hasPassword ? "default" : "secondary"}
                className={providerStatus.hasPassword ? "bg-success/10 text-success border-success/20" : ""}
              >
                <IconLock className="w-3 h-3 mr-1" />
                {providerStatus.hasPassword ? "Jelszó beállítva" : "Jelszó nincs beállítva"}
              </Badge>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="current-email" className="flex items-center gap-2">
              <IconMail className="w-4 h-4" />
              Email cím
            </Label>
            <div className="relative">
              <Input
                id="current-email"
                value={user.email}
                readOnly
                className="pr-28"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {user.isVerified ? (
                  <Badge variant="default" className="bg-success/10 text-success border-success/20">
                    <IconCircleCheck className="w-3 h-3 mr-1" />
                    Ellenőrzött
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="bg-destructive/10">
                    <IconCircleX className="w-3 h-3 mr-1" />
                    Nem ellenőrzött
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-name" className="flex items-center gap-2">
              <IconUser className="w-4 h-4" />
              Teljes név
            </Label>
            <Input
              id="current-name"
              value={user.name}
              readOnly
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="current-username" className="flex items-center gap-2">
              <IconUser className="w-4 h-4" />
              Felhasználónév
            </Label>
            <Input
              id="current-username"
              value={user.username}
              readOnly
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="current-country" className="flex items-center gap-2">
              <IconUser className="w-4 h-4" />
              Ország
            </Label>
            <Input
              id="current-country"
              value={getCountryLabel(user.country, "hu") || "Nincs megadva"}
              readOnly
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CurrentInfoSection

