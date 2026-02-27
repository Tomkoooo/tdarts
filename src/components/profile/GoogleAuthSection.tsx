"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { signIn, signOut, useSession } from "next-auth/react"
import axios from "axios"
import toast from "react-hot-toast"
import { IconBrandGoogle, IconCircleCheck, IconCircleX, IconLink, IconUnlink } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"

type ProviderStatus = {
  googleLinked: boolean
  hasPassword: boolean
  emailVerified: boolean
  canUnlinkGoogle: boolean
}

interface GoogleAuthSectionProps {
  email: string
}

export default function GoogleAuthSection({ email }: GoogleAuthSectionProps) {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [status, setStatus] = React.useState<ProviderStatus | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [password, setPassword] = React.useState("")

  const loadStatus = React.useCallback(async () => {
    try {
      const response = await axios.get("/api/profile/auth-providers")
      if (response.data?.success) {
        setStatus(response.data.data)
      }
    } catch (error) {
      console.error("Failed to load provider status:", error)
    }
  }, [])

  React.useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const linkingFromGoogleFlow = searchParams.get("linkGoogle") === "1"
  const canFinalizeLink = linkingFromGoogleFlow && !!session?.user && status && !status.googleLinked

  const startGoogleLink = async () => {
    await signIn("google", {
      callbackUrl: "/profile?tab=details&linkGoogle=1",
      redirect: true,
    })
  }

  const finalizeGoogleLink = async () => {
    if (!password.trim()) {
      toast.error("Add meg a jelenlegi jelszavad a kapcsoláshoz.")
      return
    }

    setIsLoading(true)
    try {
      await axios.post("/api/auth/link-google", {
        email,
        password,
      })
      toast.success("Google fiók sikeresen összekapcsolva.")
      setPassword("")
      await loadStatus()

      const url = new URL(window.location.href)
      url.searchParams.delete("linkGoogle")
      window.history.replaceState({}, "", url.toString())
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Nem sikerült a Google összekapcsolás.")
    } finally {
      setIsLoading(false)
    }
  }

  const unlinkGoogle = async () => {
    setIsLoading(true)
    try {
      await axios.post("/api/auth/unlink-google")
      await signOut({ redirect: false })
      toast.success("Google kapcsolat megszüntetve.")
      await loadStatus()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Nem sikerült a Google kapcsolat bontása.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!status) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconBrandGoogle className="w-5 h-5" />
          Google fiók kapcsolat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Kapcsolat állapota</p>
            <div className="mt-1">
              {status.googleLinked ? (
                <Badge variant="default" className="bg-success/10 text-success border-success/20">
                  <IconCircleCheck className="w-3 h-3 mr-1" />
                  Google csatlakoztatva
                </Badge>
              ) : (
                <Badge variant="destructive" className="bg-destructive/10">
                  <IconCircleX className="w-3 h-3 mr-1" />
                  Google nincs csatlakoztatva
                </Badge>
              )}
            </div>
          </div>

          {!status.googleLinked && (
            <Button onClick={startGoogleLink} disabled={isLoading}>
              <IconLink className="w-4 h-4 mr-2" />
              Google fiók csatlakoztatása
            </Button>
          )}

          {status.googleLinked && (
            <Button
              variant="outline"
              onClick={unlinkGoogle}
              disabled={isLoading || !status.canUnlinkGoogle}
              title={
                status.canUnlinkGoogle
                  ? "Google kapcsolat bontása"
                  : "Bontáshoz ellenőrzött email és beállított jelszó szükséges"
              }
            >
              <IconUnlink className="w-4 h-4 mr-2" />
              Google kapcsolat bontása
            </Button>
          )}
        </div>

        {canFinalizeLink && (
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium">
              Google hitelesítés kész. A kapcsolás véglegesítéséhez add meg a jelenlegi jelszavad:
            </p>
            <div className="space-y-2">
              <Label htmlFor="google-link-password">Jelenlegi jelszó</Label>
              <Input
                id="google-link-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
            <Button onClick={finalizeGoogleLink} disabled={isLoading}>
              Kapcsolás megerősítése
            </Button>
          </div>
        )}

        {status.googleLinked && !status.canUnlinkGoogle && (
          <p className="text-sm text-muted-foreground">
            A Google kapcsolat bontásához az email címednek ellenőrzöttnek kell lennie, és a fiókhoz jelszónak is tartoznia kell.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
