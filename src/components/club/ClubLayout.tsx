"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { IconHome, IconTrophy, IconUsers, IconSettings, IconMedal } from "@tabler/icons-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ClubLayoutProps {
  userRole: 'admin' | 'moderator' | 'member' | 'none'
  clubName: string
  summary: React.ReactNode
  players: React.ReactNode
  tournaments: React.ReactNode
  leagues: React.ReactNode
  settings?: React.ReactNode
  defaultPage?: 'summary' | 'players' | 'tournaments' | 'leagues' | 'settings'
}

export default function ClubLayout({
  userRole,
  clubName,
  summary,
  players,
  tournaments,
  leagues,
  settings,
  defaultPage = 'summary',
}: ClubLayoutProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = React.useState<string>(defaultPage)

  // Sync activeTab with URL param
  React.useEffect(() => {
    const pageParam = searchParams.get('page')
    if (pageParam && ['summary', 'players', 'tournaments', 'leagues', 'settings'].includes(pageParam)) {
      setActiveTab(pageParam)
    }
  }, [searchParams])

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    const currentPath = window.location.pathname
    router.push(`${currentPath}?page=${tab}`, { scroll: false })
  }

  const tabs = [
    { key: 'summary', label: 'Áttekintés', icon: IconHome },
    { key: 'players', label: 'Játékosok', icon: IconUsers },
    { key: 'tournaments', label: 'Versenyek', icon: IconTrophy },
    { key: 'leagues', label: 'Ligák', icon: IconMedal },
  ]

  if (userRole === 'admin' || userRole === 'moderator') {
    tabs.push({ key: 'settings', label: 'Beállítások', icon: IconSettings })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="relative flex h-48 flex-col justify-end overflow-hidden bg-gradient-to-br from-primary/90 via-primary/70 to-accent/70 md:h-64">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.1),_transparent_50%)]" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur md:h-16 md:w-16">
              <svg className="h-6 w-6 text-white md:h-8 md:w-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow md:text-5xl">{clubName}</h1>
              <p className="mt-2 text-sm text-white/80">Versenyek, játékosok, ligák – minden egy helyen.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-4 w-full max-w-6xl px-4 pb-12 md:-mt-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="rounded-2xl border-0 bg-card/80 p-2 shadow-xl backdrop-blur">
            <TabsList className="flex w-full gap-0.5 overflow-x-auto rounded-xl bg-muted/20 p-1 sm:flex-wrap sm:justify-between">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="flex min-w-[100px] items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:min-w-0 sm:px-3"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden xs:inline sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="rounded-2xl border-0 bg-card/90 p-6 shadow-2xl backdrop-blur md:p-8">
            <TabsContent value="summary" className="mt-0">
              {summary}
            </TabsContent>
            <TabsContent value="players" className="mt-0">
              {players}
            </TabsContent>
            <TabsContent value="tournaments" className="mt-0">
              {tournaments}
            </TabsContent>
            <TabsContent value="leagues" className="mt-0">
              {leagues}
            </TabsContent>
            {(userRole === 'admin' || userRole === 'moderator') && (
              <TabsContent value="settings" className="mt-0">
                {settings}
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  )
}

