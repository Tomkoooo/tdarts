"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { 
  IconSettings, 
  IconDatabase, 
  IconServer, 
  IconRefresh, 
  IconClock, 
  IconSection, 
  IconCheck, 
  IconX,
  IconActivity,
  IconDeviceFloppy,
  IconCode,
  IconMail,
  IconShield,
  IconPlug,
  IconChartBar,
} from "@tabler/icons-react"
import toast from "react-hot-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { YearWrapCard } from "@/components/admin/YearWrapCard"

interface SystemInfo {
  version: string
  uptime: string
  memory: {
    used: string
    total: string
    percentage: number
  }
  database: {
    status: string
    collections: number
    documents: number
  }
  features: {
    subscriptionEnabled: boolean
    socketEnabled: boolean
    leaguesEnabled: boolean
    detailedStatisticsEnabled: boolean
  }
  environment: {
    emailUsername: string
    nodeEnv: string
    subscriptionEnabled: string
    socketServerUrl: string
  }
}

export default function AdminSettingsPage() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSystemInfo = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/admin/system-info")
      setSystemInfo(response.data)
    } catch (error: any) {
      console.error("Error fetching system info:", error)
      toast.error(error.response?.data?.error || "Hiba történt a rendszer információk betöltése során")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSystemInfo()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <p className="text-sm text-muted-foreground">Rendszer információk betöltése…</p>
        </div>
      </div>
    )
  }

  if (!systemInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="size-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <IconSettings className="size-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Hiba történt</h2>
            <p className="text-muted-foreground">Nem sikerült betölteni a rendszer információkat.</p>
          </div>
          <Button onClick={fetchSystemInfo} className="gap-2">
            <IconRefresh className="size-5" />
            Újrapróbálás
          </Button>
        </div>
      </div>
    )
  }

  const StatusBadge = ({ active }: { active: boolean }) => (
    <Badge className={cn("gap-2 px-3 py-1 backdrop-blur-md", active ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>
      {active ? <IconCheck size={16} /> : <IconX size={16} />}
      {active ? "Aktív" : "Inaktív"}
    </Badge>
  )

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <Card
        
        className="relative overflow-hidden backdrop-blur-xl bg-card/30 p-8"
      >
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-primary">
              <IconSettings className="size-10" />
              <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Rendszer Beállítások</h1>
        </div>
            <p className="max-w-xl text-sm text-muted-foreground">Rendszer információk és konfiguráció</p>
          </div>
          
          <Button onClick={fetchSystemInfo} disabled={loading} variant="outline" className="gap-2">
            <IconRefresh className={cn("size-5", loading && "animate-spin")} />
            Frissítés
          </Button>
        </div>
      </Card>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card  className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
              <div className="size-12 backdrop-blur-md bg-success/20 rounded-full flex items-center justify-center">
                <IconActivity className="size-6 text-success" />
              </div>
              <Badge className="backdrop-blur-md bg-success/20 text-success">ONLINE</Badge>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Rendszer Állapot</h3>
          <p className="text-2xl font-bold text-success">Működik</p>
          </CardContent>
        </Card>

        <Card  className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
              <div className="size-12 backdrop-blur-md bg-info/20 rounded-full flex items-center justify-center">
                <IconClock className="size-6 text-info" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Üzemidő</h3>
          <p className="text-2xl font-bold text-info">{systemInfo.uptime}</p>
          </CardContent>
        </Card>

        <Card  className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
              <div className="size-12 backdrop-blur-md bg-warning/20 rounded-full flex items-center justify-center">
                <IconDeviceFloppy className="size-6 text-warning" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Memória</h3>
          <p className="text-2xl font-bold text-warning">{systemInfo.memory.percentage}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {systemInfo.memory.used} / {systemInfo.memory.total}
            </p>
          </CardContent>
        </Card>

        <Card  className="backdrop-blur-xl bg-card/30">
          <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
              <div className="size-12 backdrop-blur-md bg-primary/20 rounded-full flex items-center justify-center">
                <IconDatabase className="size-6 text-primary" />
              </div>
              <StatusBadge active={systemInfo.database.status === "connected"} />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Adatbázis</h3>
          <p className="text-2xl font-bold text-primary capitalize">{systemInfo.database.status}</p>
          </CardContent>
        </Card>
      </div>

      {/* Database Details */}
      <Card  className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 backdrop-blur-md bg-primary/20 rounded-lg flex items-center justify-center">
              <IconDatabase className="size-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Adatbázis Információk</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card  className="backdrop-blur-md bg-muted/30">
              <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">{systemInfo.database.collections}</div>
                <div className="text-sm text-muted-foreground font-medium">Kollekciók</div>
              </CardContent>
            </Card>
            <Card  className="backdrop-blur-md bg-muted/30">
              <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">{systemInfo.database.documents.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground font-medium">Dokumentumok</div>
              </CardContent>
            </Card>
            <Card  className="backdrop-blur-md bg-muted/30">
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {systemInfo.database.status === "connected" ? "✓" : "✗"}
          </div>
                <div className="text-sm text-muted-foreground font-medium">Kapcsolat</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card  className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 backdrop-blur-md bg-success/20 rounded-lg flex items-center justify-center">
              <IconPlug className="size-6 text-success" />
            </div>
            <CardTitle className="text-2xl">Funkciók</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 backdrop-blur-md bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
                <IconShield className="size-5 text-primary" />
              <span className="font-medium">Előfizetés rendszer</span>
            </div>
            <StatusBadge active={systemInfo.features.subscriptionEnabled} />
          </div>
            <div className="flex items-center justify-between p-4 backdrop-blur-md bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
                <IconActivity className="size-5 text-primary" />
              <span className="font-medium">Socket kapcsolat</span>
            </div>
            <StatusBadge active={systemInfo.features.socketEnabled} />
          </div>
            <div className="flex items-center justify-between p-4 backdrop-blur-md bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
                <IconSection className="size-5 text-primary" />
              <span className="font-medium">Ligák</span>
            </div>
            <StatusBadge active={systemInfo.features.leaguesEnabled} />
          </div>
            <div className="flex items-center justify-between p-4 backdrop-blur-md bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
                <IconChartBar className="size-5 text-primary" />
              <span className="font-medium">Részletes statisztikák</span>
            </div>
            <StatusBadge active={systemInfo.features.detailedStatisticsEnabled} />
          </div>
        </div>
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card  className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 backdrop-blur-md bg-info/20 rounded-lg flex items-center justify-center">
              <IconCode className="size-6 text-info" />
            </div>
            <CardTitle className="text-2xl">Környezeti Változók</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
        <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
                <tr>
                  <th className="backdrop-blur-md bg-muted/20 px-4 py-4 text-left font-semibold">Változó</th>
                  <th className="backdrop-blur-md bg-muted/20 px-4 py-4 text-left font-semibold">Érték</th>
              </tr>
            </thead>
            <tbody>
                <tr className="hover:backdrop-blur-md hover:bg-muted/20 transition-colors">
                  <td className="font-mono text-sm px-4 py-5">
                  <div className="flex items-center gap-2">
                      <IconServer className="size-4 text-primary" />
                    NODE_ENV
                  </div>
                </td>
                  <td className="px-4 py-5">
                    <Badge
                      variant={systemInfo.environment.nodeEnv === "production" ? "default" : "secondary"}
                      className={
                        systemInfo.environment.nodeEnv === "production"
                          ? "backdrop-blur-md bg-success/20 text-success"
                          : "backdrop-blur-md bg-warning/20 text-warning"
                      }
                    >
                    {systemInfo.environment.nodeEnv}
                    </Badge>
                </td>
              </tr>
                <tr className="hover:backdrop-blur-md hover:bg-muted/20 transition-colors">
                  <td className="font-mono text-sm px-4 py-5">
                  <div className="flex items-center gap-2">
                      <IconShield className="size-4 text-primary" />
                    SUBSCRIPTION_ENABLED
                  </div>
                </td>
                  <td className="px-4 py-5">
                    <Badge variant="outline" className="backdrop-blur-md bg-info/20 text-info">
                    {systemInfo.environment.subscriptionEnabled}
                    </Badge>
                </td>
              </tr>
                <tr className="hover:backdrop-blur-md hover:bg-muted/20 transition-colors">
                  <td className="font-mono text-sm px-4 py-5">
                  <div className="flex items-center gap-2">
                      <IconActivity className="size-4 text-primary" />
                    SOCKET_SERVER_URL
                  </div>
                </td>
                  <td className="px-4 py-5">
                    <code className="text-xs backdrop-blur-md bg-muted/30 px-2 py-1 rounded">
                      {systemInfo.environment.socketServerUrl || "Not set"}
                  </code>
                </td>
              </tr>
                <tr className="hover:backdrop-blur-md hover:bg-muted/20 transition-colors">
                  <td className="font-mono text-sm px-4 py-5">
                  <div className="flex items-center gap-2">
                      <IconMail className="size-4 text-primary" />
                    EMAIL_USERNAME
                  </div>
                </td>
                  <td className="px-4 py-5">
                    <code className="text-xs backdrop-blur-md bg-muted/30 px-2 py-1 rounded">
                      {systemInfo.environment.emailUsername || "Not set"}
                  </code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        </CardContent>
      </Card>

      {/* System Version */}
      <Card  className="backdrop-blur-xl bg-card/30">
        <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="size-14 backdrop-blur-md bg-primary/20 rounded-full flex items-center justify-center">
                <IconCode className="size-7 text-primary" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-foreground">Rendszer Verzió</h3>
                <p className="text-sm text-muted-foreground">Aktuális verzió információk</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{systemInfo.version}</div>
              <div className="text-sm text-muted-foreground">v{systemInfo.version}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <YearWrapCard />
    </div>
  )
}
