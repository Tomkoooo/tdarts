"use client"

import * as React from "react"
import Link from "next/link"
import { IconLogout, IconUsers, IconShieldLock } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { useTranslations } from "next-intl"

interface ProfileActionsSectionProps {
  isLoading: boolean
  isAdmin: boolean
  onLogout: () => Promise<void>
}

export function ProfileActionsSection({
  isLoading,
  isAdmin,
  onLogout,
}: ProfileActionsSectionProps) {
  const t = useTranslations("Profile.actions")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="destructive"
          className="w-full"
          onClick={onLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              {t("logging_out")}
            </>
          ) : (
            <>
              <IconLogout className="w-4 h-4 mr-2" />
              {t("logout")}
            </>
          )}
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/myclub" className="w-full">
            <Button variant="outline" className="w-full">
              <IconUsers className="w-4 h-4 mr-2" />
              {t("my_club")}
            </Button>
          </Link>

          {isAdmin && (
            <Link href="/admin" className="w-full">
              <Button variant="outline" className="w-full">
                <IconShieldLock className="w-4 h-4 mr-2" />
                {t("admin")}
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ProfileActionsSection

