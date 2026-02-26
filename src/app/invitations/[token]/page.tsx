"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { IconCheck, IconX, IconLoader2, IconUsers, IconTrophy } from "@tabler/icons-react"
import { toast } from "react-hot-toast"

import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card"
import { useUserContext } from "@/hooks/useUser"

export default function InvitationPage() {
  const params = useParams()
  const token = params?.token as string
  const router = useRouter()
  const { user } = useUserContext()

  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    if (!token) return
    if (!user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(`/invitations/${token}`)}`)
      return
    }
    if (token) {
      fetchInvitation()
    }
  }, [token, user, router])

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Hiba történt a meghívó betöltésekor")
      }

      setInvitation(data.invitation)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'accept' | 'decline') => {
    setProcessing(true)
    setError("")
    
    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401 && data?.redirectTo) {
          router.push(data.redirectTo)
          return
        }
        throw new Error(data.error || `Hiba történt a ${action === 'accept' ? 'elfogadás' : 'elutasítás'} során`)
      }

      if (action === 'accept') {
        setSuccessMessage("Sikeresen csatlakoztál a csapathoz! Átirányítunk a tornára...")
        toast.success("Csapat meghívás elfogadva!")
        setTimeout(() => {
          if (invitation?.tournamentId?._id) {
             router.push(`/tournaments/${invitation.tournamentId.tournamentId}`)
          }
        }, 2000)
      } else {
        setSuccessMessage("Meghívás elutasítva.")
        toast.success("Meghívás elutasítva")
      }
      
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Meghívó betöltése...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Bejelentkezéshez irányítás...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Hiba történt</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                Vissza a főoldalra
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (successMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-green-500/50 bg-green-500/5">
          <CardHeader>
            <div className="flex justify-center pb-4">
              <div className="rounded-full bg-green-500/20 p-3">
                <IconCheck className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-center text-green-600">Sikeres művelet</CardTitle>
            <CardDescription className="text-center text-lg">{successMessage}</CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-2">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">
                Főoldal
              </Button>
            </Link>
            {invitation?.tournamentId && (
                <Link href={`/tournaments/${invitation.tournamentId.tournamentId}`} className="flex-1">
                  <Button className="w-full">
                    Tornára lépés
                  </Button>
                </Link>
            )}
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <IconUsers className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Csapat Meghívó</CardTitle>
          <CardDescription className="text-lg">
            Meghívást kaptál egy páros/csapat tornára
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="rounded-xl bg-muted/30 p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <IconTrophy className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Torna</p>
                  <p className="font-semibold text-foreground">{invitation?.tournamentId?.tournamentSettings?.name || invitation?.tournamentId?.name || "Ismeretlen torna"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <IconUsers className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Csapat neve</p>
                  <p className="font-semibold text-foreground">{invitation?.teamId?.name || "Névtelen csapat"}</p>
                </div>
              </div>
              
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-center text-muted-foreground">
                  <span className="font-semibold text-foreground">{invitation?.inviterId?.name}</span> meghívott, hogy csatlakozz a csapatához.
                </p>
                {(invitation?.inviterId?.email || invitation?.inviteeEmail) && (
                  <div className="mt-2 space-y-1 text-center text-xs text-muted-foreground">
                    {invitation?.inviterId?.email && <p>Meghívó email: {invitation.inviterId.email}</p>}
                    {invitation?.inviteeEmail && <p>Címzett email: {invitation.inviteeEmail}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 sm:flex-row">
          <Button 
            variant="outline" 
            className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/30 dark:hover:bg-red-900/20"
            onClick={() => handleAction('decline')}
            disabled={processing}
          >
            <IconX className="h-4 w-4" />
            Elutasítás
          </Button>
          <Button 
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => handleAction('accept')}
            disabled={processing}
          >
            {processing ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconCheck className="h-4 w-4" />
            )}
            Meghívás elfogadása
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
