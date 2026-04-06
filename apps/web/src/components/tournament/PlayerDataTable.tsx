"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { IconDots, IconEye, IconTrash, IconUserCheck } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Player interface (adjust to match your actual interface)
interface Player {
  _id: string
  playerReference: {
    _id: string
    name: string
    username?: string
  }
  status: 'applied' | 'checked-in' | 'playing' | 'eliminated'
  checkedInAt?: Date
  groupId?: string
  stats?: {
    matchesPlayed?: number
    matchesWon?: number
    setsWon?: number
    legsWon?: number
    average?: number
    highestCheckout?: number
    count180?: number
  }
}

interface PlayerDataTableProps {
  players: Player[]
  loading?: boolean
  userRole?: 'admin' | 'moderator' | 'member' | 'none'
  onViewPlayer?: (player: Player) => void
  onCheckInPlayer?: (player: Player) => void
  onRemovePlayer?: (player: Player) => void
}

export function PlayerDataTable({
  players,
  loading = false,
  userRole = 'none',
  onViewPlayer,
  onCheckInPlayer,
  onRemovePlayer,
}: PlayerDataTableProps) {
  const tTour = useTranslations("Tournament")
  const t = (key: string, values?: any) => tTour(`players_table.${key}`, values)
  const canManage = userRole === 'admin' || userRole === 'moderator'

  const columns: ColumnDef<Player>[] = [
    {
      accessorKey: "playerReference.name",
      header: t("player"),
      cell: ({ row }) => {
        const player = row.original
        const initials = player.playerReference.name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        return (
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{player.playerReference.name}</span>
              {player.playerReference.username && (
                <span className="text-xs text-muted-foreground">
                  @{player.playerReference.username}
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => {
        return <StatusBadge status={row.original.status} />
      },
    },
    {
      accessorKey: "stats.matchesPlayed",
      header: t("matches"),
      cell: ({ row }) => {
        const stats = row.original.stats
        if (!stats?.matchesPlayed) return <span className="text-muted-foreground">-</span>
        return (
          <div className="flex flex-col">
            <span className="font-medium">{stats.matchesPlayed}</span>
            <span className="text-xs text-muted-foreground">
              {stats.matchesWon || 0} {t("wins")}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "stats.average",
      header: t("avg"),
      cell: ({ row }) => {
        const avg = row.original.stats?.average
        if (!avg) return <span className="text-muted-foreground">-</span>
        
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary">{avg.toFixed(2)}</span>
            {avg >= 80 && <Badge variant="success" className="text-xs">{t("high")}</Badge>}
            {avg >= 60 && avg < 80 && <Badge variant="default" className="text-xs">{t("good")}</Badge>}
          </div>
        )
      },
    },
    {
      accessorKey: "stats.count180",
      header: t("checkouts"),
      cell: ({ row }) => {
        const count = row.original.stats?.count180
        if (!count) return <span className="text-muted-foreground">0</span>
        return (
          <Badge variant="warning" className="font-bold">
            {count}
          </Badge>
        )
      },
    },
    {
      accessorKey: "stats.highestCheckout",
      header: t("max_checkout"),
      cell: ({ row }) => {
        const checkout = row.original.stats?.highestCheckout
        if (!checkout) return <span className="text-muted-foreground">-</span>
        return (
          <span className="font-medium text-success">{checkout}</span>
        )
      },
    },
    {
      accessorKey: "groupId",
      header: t("group"),
      cell: ({ row }) => {
        const groupId = row.original.groupId
        if (!groupId) return <span className="text-muted-foreground">-</span>
        return (
          <Badge variant="secondary">
            {t("group_numbered", { id: groupId })}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("actions")}</div>,
      cell: ({ row }) => {
        const player = row.original

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <IconDots className="w-4 h-4" />
                  <span className="sr-only">{t("actions")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {onViewPlayer && (
                  <DropdownMenuItem onClick={() => onViewPlayer(player)}>
                    <IconEye className="w-4 h-4 mr-2" />
                    {t("details")}
                  </DropdownMenuItem>
                )}

                {canManage && player.status === 'applied' && onCheckInPlayer && (
                  <DropdownMenuItem onClick={() => onCheckInPlayer(player)}>
                    <IconUserCheck className="w-4 h-4 mr-2" />
                    {t("check_in")}
                  </DropdownMenuItem>
                )}

                {canManage && onRemovePlayer && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onRemovePlayer(player)}
                      className="text-destructive"
                    >
                      <IconTrash className="w-4 h-4 mr-2" />
                      {t("remove")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={players}
      searchKey="playerReference.name"
      searchPlaceholder={t("search_placeholder")}
      loading={loading}
      onRowClick={onViewPlayer}
    />
  )
}

export default PlayerDataTable

