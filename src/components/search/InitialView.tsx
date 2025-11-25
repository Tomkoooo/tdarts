"use client"

import * as React from "react"
import Link from "next/link"
import { IconMapPin, IconUsers, IconTrophy, IconCalendar, IconCheck, IconListCheck } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/Button"
import { TournamentResults } from "./TournamentResults"
import PlayerCard from "@/components/player/PlayerCard"
import Pagination from "@/components/common/Pagination"

interface InitialViewProps {
  recentTournaments: any[]
  topPlayers: any[]
  popularClubs: any[]
  loading: boolean
  playersPage: number
  topPlayersTotal: number
  clubsPage: number
  itemsPerPage: number
  onPlayersPageChange: (page: number) => void
  onClubsPageChange: (page: number) => void
  onPlayerClick: (player: any) => void
  onQuickAction?: (action: 'all-tournaments' | 'todays-tournaments' | 'active-tournaments' | 'finished-tournaments' | 'all-clubs') => void
}

export function InitialView({
  recentTournaments,
  topPlayers,
  popularClubs,
  loading,
  playersPage,
  topPlayersTotal,
  clubsPage,
  itemsPerPage,
  onPlayersPageChange,
  onClubsPageChange,
  onPlayerClick,
  onQuickAction,
}: InitialViewProps) {
  if (loading) {
    return (
      <div className="space-y-12">
        {/* Tournaments Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>

        {/* Players & Clubs Skeleton */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-40" />
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-40" />
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {/* Quick Actions */}
      {onQuickAction && (
        <section>
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-bold">Gyors Műveletek</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => onQuickAction('all-tournaments')}
            >
              <IconTrophy size={24} className="text-primary" />
              <span className="text-sm font-medium">Összes Torna</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => onQuickAction('todays-tournaments')}
            >
              <IconCalendar size={24} className="text-info" />
              <span className="text-sm font-medium">Mai Tornák</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => onQuickAction('active-tournaments')}
            >
              <IconListCheck size={24} className="text-success" />
              <span className="text-sm font-medium">Aktív Tornák</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => onQuickAction('finished-tournaments')}
            >
              <IconCheck size={24} className="text-warning" />
              <span className="text-sm font-medium">Lezárt Tornák</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-4 gap-2"
              onClick={() => onQuickAction('all-clubs')}
            >
              <IconUsers size={24} className="text-accent" />
              <span className="text-sm font-medium">Összes Klub</span>
            </Button>
          </div>
        </section>
      )}

      {/* Upcoming Tournaments */}
      <section>
        <CardHeader className="px-0">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Közelgő Tornák
          </CardTitle>
        </CardHeader>
        <TournamentResults 
          tournaments={recentTournaments} 
          showViewToggle 
        />
      </section>

      {/* Top Players & Popular Clubs */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Top Players */}
        <section>
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-bold">Top Játékosok</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {topPlayers.map((player, index) => (
              <PlayerCard 
                key={player._id} 
                player={player} 
                onClick={() => onPlayerClick(player)} 
                rank={((playersPage - 1) * itemsPerPage) + index + 1} 
                showGlobalRank={true} 
              />
            ))}
          </div>
          {topPlayersTotal > itemsPerPage && (
            <div className="mt-6">
              <Pagination
                currentPage={playersPage}
                totalPages={Math.ceil(topPlayersTotal / itemsPerPage)}
                onPageChange={onPlayersPageChange}
              />
            </div>
          )}
        </section>

        {/* Popular Clubs */}
        <section>
          <CardHeader className="px-0">
            <CardTitle className="text-2xl font-bold">Népszerű klubok</CardTitle>
          </CardHeader>
          <div className="space-y-4 flex flex-col">
            {popularClubs
              .slice((clubsPage - 1) * itemsPerPage, clubsPage * itemsPerPage)
              .map((club, index) => (
                <Link key={club._id} href={`/clubs/${club._id}`}>
                  <Card
                    className="bg-card/88 shadow-md shadow-black/20 transition-transform duration-200 hover:-translate-y-1"
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <span className="text-lg font-bold text-primary">
                          #{(clubsPage - 1) * itemsPerPage + index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="truncate text-lg font-semibold text-foreground">
                          {club.name}
                        </h4>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <IconMapPin className="h-3.5 w-3.5" />
                          {club.location}
                        </p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <IconUsers className="h-3.5 w-3.5" />
                          {club.memberCount} tag
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
          {popularClubs.length > itemsPerPage && (
            <div className="mt-6">
              <Pagination
                currentPage={clubsPage}
                totalPages={Math.ceil(popularClubs.length / itemsPerPage)}
                onPageChange={onClubsPageChange}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default InitialView

