"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { IconLayoutDashboard, IconUsers, IconTrophy, IconBuilding, IconBell, IconSettings } from "@tabler/icons-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { AnimatedStat } from "@/components/ui/animated-stat"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

interface AdminDashboardLayoutProps {
  kpi?: Record<string, number>
  children?: React.ReactNode
}

export function AdminDashboardLayout({
  kpi = {},
  children
}: AdminDashboardLayoutProps) {
  const t = useTranslations("Admin")

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
              <p className="text-muted-foreground mt-2">System administration and monitoring</p>
            </div>
            <Button>{t("dashboard.settings")}</Button>
          </div>

          {/* KPI Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <AnimatedStat
              label={t("kpi.totalUsers")}
              value={kpi.totalUsers || 0}
              icon="👥"
              trend="up"
            />
            <AnimatedStat
              label={t("kpi.activeUsers")}
              value={kpi.activeUsers || 0}
              icon="🟢"
              trend="up"
            />
            <AnimatedStat
              label={t("kpi.totalTournaments")}
              value={kpi.totalTournaments || 0}
              icon="🎯"
              trend="up"
            />
            <AnimatedStat
              label={t("kpi.activeTournaments")}
              value={kpi.activeTournaments || 0}
              icon="🏆"
              trend="up"
            />
            <AnimatedStat
              label={t("kpi.totalClubs")}
              value={kpi.totalClubs || 0}
              icon="🏢"
              trend="up"
            />
            <AnimatedStat
              label={t("kpi.totalMatches")}
              value={kpi.totalMatches || 0}
              icon="🎮"
              trend="up"
            />
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 bg-muted p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <IconLayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <IconUsers className="w-4 h-4" />
              <span className="hidden sm:inline">{t("dashboard.users")}</span>
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="flex items-center gap-2">
              <IconTrophy className="w-4 h-4" />
              <span className="hidden sm:inline">Tournaments</span>
            </TabsTrigger>
            <TabsTrigger value="clubs" className="flex items-center gap-2">
              <IconBuilding className="w-4 h-4" />
              <span className="hidden sm:inline">Clubs</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <IconBell className="w-4 h-4" />
              <span className="hidden sm:inline">Feedback</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <GlassmorphismCard className="p-8">
              <h2 className="text-2xl font-bold mb-6">System Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg bg-muted/50 border border-green-500/20">
                  <p className="text-sm text-muted-foreground">API Status</p>
                  <p className="text-2xl font-bold text-green-500">Operational</p>
                </div>
                <div className="p-6 rounded-lg bg-muted/50 border border-green-500/20">
                  <p className="text-sm text-muted-foreground">Database</p>
                  <p className="text-2xl font-bold text-green-500">Healthy</p>
                </div>
              </div>
            </GlassmorphismCard>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <GlassmorphismCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{t("users.title")}</h2>
                <Input placeholder={t("users.search")} className="w-64" />
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground">User management coming soon</p>
              </div>
            </GlassmorphismCard>
          </TabsContent>

          {/* Tournaments Tab */}
          <TabsContent value="tournaments" className="space-y-6">
            <GlassmorphismCard className="p-6">
              <h2 className="text-2xl font-bold mb-6">{t("tournaments.title")}</h2>
              <p className="text-muted-foreground">Tournament management coming soon</p>
            </GlassmorphismCard>
          </TabsContent>

          {/* Clubs Tab */}
          <TabsContent value="clubs" className="space-y-6">
            <GlassmorphismCard className="p-6">
              <h2 className="text-2xl font-bold mb-6">Club Management</h2>
              <p className="text-muted-foreground">Club management coming soon</p>
            </GlassmorphismCard>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-6">
            <GlassmorphismCard className="p-6">
              <h2 className="text-2xl font-bold mb-6">User Feedback</h2>
              <p className="text-muted-foreground">Feedback system coming soon</p>
            </GlassmorphismCard>
          </TabsContent>
        </Tabs>

        {children}
      </div>
    </div>
  )
}
