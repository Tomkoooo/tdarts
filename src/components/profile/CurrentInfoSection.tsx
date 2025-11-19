"use client"

import * as React from "react"
import { IconUser, IconMail, IconCircleCheck, IconCircleX } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Badge } from "@/components/ui/Badge"

interface CurrentInfoSectionProps {
  user: {
    email: string
    name: string
    username: string
    isVerified: boolean
  }
}

export function CurrentInfoSection({ user }: CurrentInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconUser className="w-5 h-5" />
          Jelenlegi információk
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
        </div>
      </CardContent>
    </Card>
  )
}

export default CurrentInfoSection

