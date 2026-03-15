"use client"

import React, { useState } from "react"
import { useTranslations } from "next-intl"
import { IconUser, IconTrophy, IconChartBar, IconSettings } from "@tabler/icons-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import { AnimatedStat } from "@/components/ui/animated-stat"
import { Button } from "@/components/ui/Button"

interface ProfilePageLayoutProps {
  user: any
  statistics: any
  children?: React.ReactNode
}

export function ProfilePageLayout({
  user,
  statistics,
  children
}: ProfilePageLayoutProps) {
  const t = useTranslations("Profile")

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Profile Header */}
      <div className="relative bg-gradient-to-r from-primary/20 to-primary/10 border-b border-primary/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
            {/* Profile Image */}
            <div className="w-32 h-32 rounded-xl bg-muted flex items-center justify-center border-2 border-primary/20 overflow-hidden">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <IconUser className="w-16 h-16 text-muted-foreground" />
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {user?.name || "Player Name"}
              </h1>
              <p className="text-muted-foreground mb-4">
                {user?.city && `${user.city}, `}{user?.country}
              </p>
              <div className="flex gap-3">
                <Button>{t("editForm.save")}</Button>
                <Button variant="outline">{t("settings.dataExport")}</Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AnimatedStat
              label={t("statistics.totalMatches")}
              value={statistics?.totalMatches || 0}
              icon="🎯"
              trend="up"
            />
            <AnimatedStat
              label={t("statistics.winRate")}
              value={`${statistics?.winRate || 0}%`}
              icon="🏆"
              trend="up"
            />
            <AnimatedStat
              label={t("statistics.avgScore")}
              value={statistics?.avgScore || 0}
              icon="📊"
              trend="up"
            />
            <AnimatedStat
              label={t("statistics.total180")}
              value={statistics?.total180 || 0}
              icon="💯"
              trend="up"
            />
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-muted p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <IconUser className="w-4 h-4" />
              <span className="hidden sm:inline">{t("tabs.overview")}</span>
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <IconChartBar className="w-4 h-4" />
              <span className="hidden sm:inline">{t("tabs.statistics")}</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <IconTrophy className="w-4 h-4" />
              <span className="hidden sm:inline">{t("tabs.achievements")}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <IconSettings className="w-4 h-4" />
              <span className="hidden sm:inline">{t("tabs.settings")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <GlassmorphismCard className="p-8">
              <h2 className="text-2xl font-bold mb-6">{t("header.title")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t("editForm.firstName")}</h3>
                  <p className="text-muted-foreground">{user?.firstName}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t("editForm.email")}</h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t("editForm.city")}</h3>
                  <p className="text-muted-foreground">{user?.city || "-"}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">{t("editForm.country")}</h3>
                  <p className="text-muted-foreground">{user?.country || "-"}</p>
                </div>
              </div>
            </GlassmorphismCard>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <GlassmorphismCard className="p-8">
              <h2 className="text-2xl font-bold mb-6">{t("statistics.title")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(statistics || {}).map(([key, value]) => (
                  <div key={key} className="p-4 rounded-lg bg-muted/50 border border-primary/10">
                    <p className="text-sm text-muted-foreground capitalize">{key}</p>
                    <p className="text-2xl font-bold">{String(value)}</p>
                  </div>
                ))}
              </div>
            </GlassmorphismCard>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <GlassmorphismCard className="p-8 text-center">
              <p className="text-muted-foreground">Coming soon</p>
            </GlassmorphismCard>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <GlassmorphismCard className="p-8">
              <h2 className="text-2xl font-bold mb-6">{t("settings")}</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-primary/10 rounded-lg">
                  <span>{t("settings.emailNotifications")}</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between p-4 border border-primary/10 rounded-lg">
                  <span>{t("settings.pushNotifications")}</span>
                  <input type="checkbox" className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between p-4 border border-primary/10 rounded-lg">
                  <span>{t("settings.privacySettings")}</span>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            </GlassmorphismCard>
          </TabsContent>
        </Tabs>

        {children}
      </div>
    </div>
  )
}
