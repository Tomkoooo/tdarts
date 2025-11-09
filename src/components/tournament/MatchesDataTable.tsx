"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { IconDots, IconEye, IconPlayerPlay, IconTrash, IconClock } from "@tabler/icons-react"

import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Match interface (adjust to match your actual interface)
interface Match {
  _id: string
  player1: {
    _id: string
    name: string
  }
  player2: {
    _id: string
    name: string
  }
  status: 'scheduled' | 'in_progress' | 'finished' | 'cancelled'
  score?: {
    player1Sets?: number
    player2Sets?: number
    player1Legs?: number
    player2Legs?: number
  }
  board?: {
    _id: string
    number: number
  }
  scheduledTime?: Date
  startedAt?: Date
  finishedAt?: Date
  round?: string
  matchNumber?: number
}

interface MatchesDataTableProps {
  matches: Match[]
  loading?: boolean
  userRole?: 'admin' | 'moderator' | 'member' | 'none'
  onViewMatch?: (match: Match) => void
  onStartMatch?: (match: Match) => void
  onDeleteMatch?: (match: Match) => void
}

export function MatchesDataTable({
  matches,
  loading = false,
  userRole = 'none',
  onViewMatch,
  onStartMatch,
  onDeleteMatch,
}: MatchesDataTableProps) {
  const canManage = userRole === 'admin' || userRole === 'moderator'

  const columns: ColumnDef<Match>[] = [
    {
      accessorKey: "matchNumber",
      header: "#",
      cell: ({ row }) => {
        const number = row.original.matchNumber
        return (
          <div className="font-medium text-muted-foreground">
            #{number || row.index + 1}
          </div>
        )
      },
    },
    {
      accessorKey: "players",
      header: "Játékosok",
      cell: ({ row }) => {
        const match = row.original
        return (
          <div className="flex flex-col gap-1 py-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{match.player1.name}</span>
              {match.score && match.status === 'finished' && (
                <Badge 
                  variant={
                    (match.score.player1Sets || 0) > (match.score.player2Sets || 0) 
                      ? 'success' 
                      : 'secondary'
                  }
                  className="text-xs"
                >
                  {match.score.player1Sets || 0}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>vs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{match.player2.name}</span>
              {match.score && match.status === 'finished' && (
                <Badge 
                  variant={
                    (match.score.player2Sets || 0) > (match.score.player1Sets || 0) 
                      ? 'success' 
                      : 'secondary'
                  }
                  className="text-xs"
                >
                  {match.score.player2Sets || 0}
                </Badge>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Státusz",
      cell: ({ row }) => {
        return <StatusBadge status={row.original.status} />
      },
    },
    {
      accessorKey: "board",
      header: "Tábla",
      cell: ({ row }) => {
        const board = row.original.board
        if (!board) return <span className="text-muted-foreground">-</span>
        return (
          <Badge variant="secondary">
            Tábla {board.number}
          </Badge>
        )
      },
    },
    {
      accessorKey: "round",
      header: "Forduló",
      cell: ({ row }) => {
        const round = row.original.round
        if (!round) return <span className="text-muted-foreground">-</span>
        return (
          <span className="text-sm font-medium">{round}</span>
        )
      },
    },
    {
      accessorKey: "scheduledTime",
      header: "Időpont",
      cell: ({ row }) => {
        const match = row.original
        
        if (match.finishedAt) {
          return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconClock className="w-4 h-4" />
              <span>
                Befejezve {new Date(match.finishedAt).toLocaleString('hu-HU', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )
        }
        
        if (match.startedAt) {
          return (
            <div className="flex items-center gap-2 text-sm text-success">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span>Folyamatban</span>
            </div>
          )
        }
        
        if (match.scheduledTime) {
          return (
            <div className="flex items-center gap-2 text-sm">
              <IconClock className="w-4 h-4 text-muted-foreground" />
              <span>
                {new Date(match.scheduledTime).toLocaleString('hu-HU', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )
        }
        
        return <span className="text-muted-foreground">Ütemezetlen</span>
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Műveletek</div>,
      cell: ({ row }) => {
        const match = row.original

        return (
          <div className="flex justify-end gap-2">
            {/* Quick Start Button */}
            {canManage && match.status === 'scheduled' && onStartMatch && (
              <Button 
                size="sm" 
                variant="default" 
                className="gap-2"
                onClick={(e) => {
                  e.stopPropagation()
                  onStartMatch(match)
                }}
              >
                <IconPlayerPlay className="w-4 h-4" />
                Indítás
              </Button>
            )}

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <IconDots className="w-4 h-4" />
                  <span className="sr-only">Műveletek</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Műveletek</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {onViewMatch && (
                  <DropdownMenuItem onClick={() => onViewMatch(match)}>
                    <IconEye className="w-4 h-4 mr-2" />
                    Részletek
                  </DropdownMenuItem>
                )}

                {canManage && match.status === 'scheduled' && onStartMatch && (
                  <DropdownMenuItem onClick={() => onStartMatch(match)}>
                    <IconPlayerPlay className="w-4 h-4 mr-2" />
                    Meccs indítása
                  </DropdownMenuItem>
                )}

                {canManage && match.status !== 'finished' && onDeleteMatch && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteMatch(match)}
                      className="text-destructive"
                    >
                      <IconTrash className="w-4 h-4 mr-2" />
                      Törlés
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
      data={matches}
      searchKey="player1.name"
      searchPlaceholder="Keresés játékos név szerint..."
      loading={loading}
      onRowClick={onViewMatch}
    />
  )
}

export default MatchesDataTable

