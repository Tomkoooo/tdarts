"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import axios from "axios"
import Link from "next/link"
import { useParams } from "next/navigation"
import { IconRefresh, IconShare2 } from "@tabler/icons-react"
import { useUserContext } from "@/hooks/useUser"
import { useTournamentAutoRefresh } from "@/hooks/useAutoRefresh"
import { useFeatureFlag } from "@/hooks/useFeatureFlag"
import TournamentOverview from "@/components/tournament/TournamentOverview"
import TournamentPlayers from "@/components/tournament/TournamentPlayers"
import TournamentGroupsGenerator from "@/components/tournament/TournamentStatusChanger"
import TournamentGroupsView from "@/components/tournament/TournamentGroupsView"
import TournamentBoardsView from "@/components/tournament/TournamentBoardsView"
import TournamentKnockoutBracket from "@/components/tournament/TournamentKnockoutBracket"
import TournamentShareModal from "@/components/tournament/TournamentShareModal"
import EditTournamentModal from "@/components/tournament/EditTournamentModal"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const statusMeta: Record<
  string,
  {
    label: string
    badgeClass: string
    description: string
  }
> = {
  pending: {
    label: "Előkészítés alatt",
    badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    description: "A torna előkészítés alatt áll, a játékosok még jelentkezhetnek.",
  },
  "group-stage": {
    label: "Csoportkör",
    badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    description: "A csoportkör zajlik, a meccsek eredményei frissülnek.",
  },
  knockout: {
    label: "Egyenes kiesés",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
    description: "A torna egyenes kieséses szakasza fut.",
  },
  finished: {
    label: "Befejezett",
    badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    description: "A torna lezárult, az eredmények archiválva vannak.",
  },
}

const tabs = [
  { value: "overview", label: "Áttekintés" },
  { value: "players", label: "Játékosok" },
  { value: "boards", label: "Táblák" },
  { value: "groups", label: "Csoportok" },
  { value: "bracket", label: "Kiesés" },
  { value: "admin", label: "Admin" },
]

const TournamentPage = () => {
  const { code } = useParams()
  const { user } = useUserContext()

  const [tournament, setTournament] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [userClubRole, setUserClubRole] = useState<'admin' | 'moderator' | 'member' | 'none'>("none")
  const [userPlayerStatus, setUserPlayerStatus] = useState<'applied' | 'checked-in' | 'none'>("none")
  const [userPlayerId, setUserPlayerId] = useState<string | null>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [tournamentShareModal, setTournamentShareModal] = useState(false)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [isReopening, setIsReopening] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("overview")

  // Handle tab from URL
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const tabParam = searchParams.get('tab')
    if (tabParam && tabs.some(t => t.value === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  // Feature flag for auto refresh
  const { isEnabled: isProFeature, isLoading: isFeatureLoading } = useFeatureFlag(
    "detailedStatistics",
    tournament?.clubId?._id || tournament?.clubId,
  )

  const fetchAll = useCallback(async () => {
    if (!code) return
    setLoading(true)
    setError("")

    try {
      const requests: Promise<any>[] = [axios.get(`/api/tournaments/${code}`)]
      if (user?._id) {
        requests.push(
          axios.get(`/api/tournaments/${code}/getUserRole`, {
            headers: { "x-user-id": user._id },
          }),
        )
        requests.push(
          axios.get(`/api/tournaments/${code}/players`, {
            headers: { "x-user-id": user._id },
          }),
        )
      }

      const [tournamentRes, userRoleRes] = await Promise.all(requests)
      const tournamentData = tournamentRes.data

      setTournament(tournamentData)
      setPlayers(Array.isArray(tournamentData.tournamentPlayers) ? tournamentData.tournamentPlayers : [])

      if (user?._id && userRoleRes) {
        const roleData = userRoleRes.data
        setUserClubRole(roleData.userClubRole || 'none')
        setUserPlayerStatus(roleData.userPlayerStatus || 'none')

        const userPlayer = tournamentData.tournamentPlayers?.find((p: any) =>
          p.playerReference?.userRef === user._id || p.playerReference?._id?.toString() === user._id,
        )
        setUserPlayerId(userPlayer ? userPlayer.playerReference?._id || userPlayer.playerReference : null)
      } else {
        setUserClubRole('none')
        setUserPlayerStatus('none')
        setUserPlayerId(null)
      }
    } catch (err: any) {
      console.error('Tournament fetch error:', err)
      setError(err.response?.data?.error || 'Nem sikerült betölteni a tornát vagy a szerepeket.')
    } finally {
      setLoading(false)
    }
  }, [code, user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const { isRefreshing, lastRefresh } = useTournamentAutoRefresh(
    code as string,
    fetchAll,
    tournament?.clubId?._id || tournament?.clubId,
    autoRefreshEnabled,
  )

  const handleRefetch = useCallback(() => {
    fetchAll()
  }, [fetchAll])

  const handleReopenTournament = useCallback(async () => {
    if (!user || !user._id || user.isAdmin !== true) {
      alert('Nincs jogosultság ehhez a művelethez. Csak super adminok használhatják ezt a funkciót.')
      return
    }

    const confirmMessage = `Biztosan újranyitja ezt a tornát?\n\nEz a művelet:\n- Visszaállítja a torna státuszát "befejezett"-ről "aktív"-ra\n- Törli az összes játékos statisztikáját\n- Megtartja az összes meccs adatot\n- Csak super adminok használhatják\n\nEz a művelet nem vonható vissza!`

    if (!confirm(confirmMessage)) return

    try {
      setIsReopening(true)
      const response = await axios.post(`/api/tournaments/${code}/reopen`)
      if (response.data.success) {
        alert('Torna sikeresen újranyitva! A statisztikák törölve, a torna újra aktív.')
        await fetchAll()
      }
    } catch (err: any) {
      console.error('Error reopening tournament:', err)
      alert(err.response?.data?.error || 'Hiba történt a torna újranyitása során')
    } finally {
      setIsReopening(false)
    }
  }, [code, fetchAll, user])

  const statusInfo = useMemo(() => {
    const status = tournament?.tournamentSettings?.status || 'pending'
    return statusMeta[status] || statusMeta.pending
  }, [tournament?.tournamentSettings?.status])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Torna betöltése...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-destructive/40 bg-card">
          <CardContent className="space-y-4 p-6">
            <Alert variant="destructive">
              <AlertTitle>Hiba történt</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={fetchAll} className="w-full">
              Újrapróbálkozás
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-dashed">
          <CardContent className="space-y-4 py-8 text-center">
            <div className="text-4xl">🏆</div>
            <p className="text-base font-semibold text-foreground">Torna nem található</p>
            <p className="text-sm text-muted-foreground">
              A keresett torna nem létezik vagy nem elérhető.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto space-y-6 px-4 py-8">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                {tournament.tournamentSettings?.name || 'Torna'}
              </h1>
              <Badge variant="outline" className={statusInfo.badgeClass}>
                {statusInfo.label}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">{statusInfo.description}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                Torna kód: <span className="font-mono text-foreground">{tournament.tournamentId}</span>
              </span>
              {lastRefresh && (
                <span>Utolsó frissítés: {lastRefresh.toLocaleTimeString('hu-HU')}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
            {user && !isFeatureLoading && isProFeature && (
              <Button
                variant={autoRefreshEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefreshEnabled((prev) => !prev)}
                className={cn("gap-2", !autoRefreshEnabled && "bg-card/80 hover:bg-card")}
              >
                <IconRefresh className={cn('h-4 w-4', autoRefreshEnabled && isRefreshing && 'animate-spin')} />
                Auto-frissítés {autoRefreshEnabled ? 'BE' : 'KI'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRefetch} className="gap-2 bg-card/80 hover:bg-card">
              <IconRefresh className="h-4 w-4" /> Frissítés
            </Button>
            {tournament && (
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link href={`/board/${tournament.tournamentId}`} target="_blank" rel="noopener noreferrer">
                  Táblák / Író program
                </Link>
              </Button>
            )}
            <Button variant="default" size="sm" onClick={() => setTournamentShareModal(true)} className="gap-2">
              <IconShare2 className="h-4 w-4" /> Megosztás
            </Button>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-6 pb-24 md:pb-0">
          <TabsList className="hidden w-full gap-2 rounded-xl bg-card/90 p-1 md:flex">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary data-[state=active]:hover:text-primary-foreground hover:bg-muted/20 hover:text-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="md:hidden">
            <div className="fixed bottom-6 left-1/2 z-40 flex w-[calc(100%-1rem)] max-w-[380px] -translate-x-1/2 items-center gap-0.5 rounded-2xl bg-card/85 backdrop-blur-xl p-1 shadow-lg shadow-black/30">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.value
                const isAdmin = tab.value === 'admin'
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center rounded-xl px-2 py-2 text-xs font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95"
                        : "text-muted-foreground hover:bg-muted/20"
                    )}
                  >
                    {isAdmin ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ) : (
                      tab.label
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <TabsContent value="overview" className="mt-0 space-y-6">
            <TournamentOverview
              tournament={tournament}
              userRole={userClubRole}
              onEdit={() => setEditModalOpen(true)}
              onRefetch={handleRefetch}
            />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Táblák állapota</h3>
              <TournamentBoardsView tournament={tournament} />
            </div>

            {tournament.groups && tournament.groups.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Csoportok és mérkőzések</h3>
                <TournamentGroupsView tournament={tournament} userClubRole={userClubRole} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="players" className="mt-0 space-y-4">
            <TournamentPlayers
              tournament={tournament}
              players={players}
              userClubRole={userClubRole}
              userPlayerStatus={userPlayerStatus}
              userPlayerId={userPlayerId}
            />
          </TabsContent>

          <TabsContent value="boards" className="mt-0 space-y-4">
            <TournamentBoardsView tournament={tournament} />
          </TabsContent>

          <TabsContent value="groups" className="mt-0 space-y-4">
            <TournamentGroupsView tournament={tournament} userClubRole={userClubRole} />
          </TabsContent>

          <TabsContent value="bracket" className="mt-0 space-y-4">
            <TournamentKnockoutBracket
              tournamentCode={tournament.tournamentId}
              userClubRole={userClubRole}
              tournamentPlayers={players}
              knockoutMethod={tournament.tournamentSettings?.knockoutMethod}
              clubId={tournament.clubId?.toString()}
            />
          </TabsContent>

          <TabsContent value="admin" className="mt-0 space-y-6">
            {(userClubRole === 'admin' || userClubRole === 'moderator') && (
              <Card className="bg-card/90 shadow-lg shadow-black/30">
                <CardContent className="p-4">
                  <TournamentGroupsGenerator
                    tournament={tournament}
                    userClubRole={userClubRole}
                    onRefetch={handleRefetch}
                  />
                </CardContent>
              </Card>
            )}

            {user && user.isAdmin === true && tournament?.tournamentSettings?.status === 'finished' && (
              <Card className="bg-destructive/15 shadow-lg shadow-black/25">
                <CardContent className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTitle>Torna újranyitása</AlertTitle>
                    <AlertDescription>
                      Ez a művelet visszavonja a befejezést és törli az összes statisztikát. Csak super adminok használhatják.
                    </AlertDescription>
                  </Alert>
                  <Button variant="destructive" onClick={handleReopenTournament} disabled={isReopening} className="gap-2">
                    {isReopening ? 'Újranyitás...' : 'Torna újranyitása'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TournamentShareModal
        isOpen={tournamentShareModal}
        onClose={() => setTournamentShareModal(false)}
        tournamentCode={tournament.tournamentId}
        tournamentName={tournament.tournamentSettings?.name || 'Torna'}
      />

      {editModalOpen && user?._id && (
        <EditTournamentModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          tournament={tournament}
          userId={user._id}
          onTournamentUpdated={handleRefetch}
        />
      )}
    </div>
  )
}

export default TournamentPage