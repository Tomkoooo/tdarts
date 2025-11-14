"use client"

import React, { useMemo } from "react"

import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import {
  IconFlame,
  IconTargetArrow,
  IconPlus,
} from "@tabler/icons-react"

export type DiagramMatch = {
  id: string
  team1: string
  team2: string
  score1?: number | null
  score2?: number | null
  winner?: "team1" | "team2" | null
  status?: string | null
  meta?: Record<string, any>
}

export type DiagramRound = DiagramMatch[]

export type RoundSummary = {
  label: string
  roundNumber: number
  canAdd?: boolean
}

interface KnockoutBracketDiagramProps {
  rounds: DiagramRound[]
  onMatchClick?: (match: DiagramMatch) => void
  renderMatchActions?: (match: DiagramMatch) => React.ReactNode
  className?: string
  roundSummaries?: RoundSummary[]
  onAddMatchToRound?: (roundNumber: number) => void
}

const CARD_WIDTH = 286
const CARD_HEIGHT = 205
const COLUMN_GAP = 120
const ROW_GAP = 48
const CONNECTOR_COLOR = "rgba(255, 255, 255, 0.28)"

type PositionedMatch = {
  match: DiagramMatch
  x: number
  y: number
  center: number
  roundIndex: number
  matchIndex: number
}

type LayoutResult = {
  width: number
  height: number
  matches: PositionedMatch[]
  connectors: {
    id: string
    path: string
  }[]
}

const KnockoutBracketDiagram: React.FC<KnockoutBracketDiagramProps> = ({
  rounds,
  onMatchClick,
  renderMatchActions,
  className,
  roundSummaries,
  onAddMatchToRound,
}) => {
  const layout = useMemo<LayoutResult | null>(() => {
    if (!rounds || rounds.length === 0) {
      return null
    }

    const positioned: PositionedMatch[][] = []

    rounds.forEach((round, roundIndex) => {
      positioned[roundIndex] = []
      round.forEach((match, matchIndex) => {
        let y: number
        if (roundIndex === 0) {
          y = matchIndex * (CARD_HEIGHT + ROW_GAP)
        } else {
          const parentRound = positioned[roundIndex - 1]
          const parent1 = parentRound[matchIndex * 2]
          const parent2 = parentRound[matchIndex * 2 + 1] ?? parent1
          const centreAverage = parent2
            ? (parent1.center + parent2.center) / 2
            : parent1.center
          y = centreAverage - CARD_HEIGHT / 2
        }

        const x = roundIndex * (CARD_WIDTH + COLUMN_GAP)
        const center = y + CARD_HEIGHT / 2

        positioned[roundIndex].push({
          match,
          x,
          y,
          center,
          roundIndex,
          matchIndex,
        })
      })
    })

    const flatMatches = positioned.flat()

    const height = flatMatches.reduce((max, item) => Math.max(max, item.y + CARD_HEIGHT), CARD_HEIGHT)
    const width = rounds.length * CARD_WIDTH + (rounds.length - 1) * COLUMN_GAP

    const connectors: LayoutResult["connectors"] = []

    positioned.forEach((roundMatches, roundIndex) => {
      if (roundIndex === 0) return
      const previousRound = positioned[roundIndex - 1]
      roundMatches.forEach((child, matchIndex) => {
        const parent1 = previousRound[matchIndex * 2]
        const parent2 = previousRound[matchIndex * 2 + 1]
        const targetX = child.x
        const targetY = child.center
        const midX = parent1 ? parent1.x + CARD_WIDTH + COLUMN_GAP / 2 : targetX - COLUMN_GAP / 2

        if (parent1) {
          connectors.push({
            id: `${roundIndex}-${matchIndex}-p1`,
            path: buildConnectorPath(parent1.x + CARD_WIDTH, parent1.center, midX, targetX, targetY),
          })
        }

        if (parent2) {
          connectors.push({
            id: `${roundIndex}-${matchIndex}-p2`,
            path: buildConnectorPath(parent2.x + CARD_WIDTH, parent2.center, midX, targetX, targetY),
          })
        }
      })
    })

    return {
      width,
      height,
      matches: flatMatches,
      connectors,
    }
  }, [rounds])

  if (!layout) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/40">
        <p className="text-sm text-muted-foreground">Nincs elérhető bracket információ.</p>
      </div>
    )
  }

  return (
    <div className={cn("relative min-w-[720px] overflow-visible", className)} style={{ width: layout.width, height: layout.height }}>
      {roundSummaries?.map((round, roundIndex) => {
        const left = roundIndex * (CARD_WIDTH + COLUMN_GAP)
        return (
          <div
            key={round.roundNumber}
            className="pointer-events-none absolute -top-16 z-20 flex w-[240px] items-center justify-between rounded-xl bg-card/95 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-md shadow-black/25 backdrop-blur"
            style={{ left }}
          >
            <span className="truncate text-foreground/90">{round.label}</span>
            {round.canAdd && onAddMatchToRound ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="pointer-events-auto h-7 w-7 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                onClick={() => onAddMatchToRound(round.roundNumber)}
                aria-label={`${round.label} - meccs hozzáadása`}
              >
                <IconPlus className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        )
      })}
      <svg
        className="pointer-events-none absolute inset-0 z-0"
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        aria-hidden="true"
      >
        {layout.connectors.map((connector) => (
          <path
            key={connector.id}
            d={connector.path}
            stroke={CONNECTOR_COLOR}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {layout.matches.map((item) => (
        <MatchCard
          key={item.match.id}
          match={item.match}
          x={item.x}
          y={item.y}
          onClick={onMatchClick}
          actions={renderMatchActions?.(item.match)}
        />
      ))}
    </div>
  )
}

interface MatchCardProps {
  match: DiagramMatch
  x: number
  y: number
  onClick?: (match: DiagramMatch) => void
  actions?: React.ReactNode
}

const MatchCard: React.FC<MatchCardProps> = ({ match, x, y, onClick, actions }) => {
  const team1Winner = match.winner === "team1"
  const team2Winner = match.winner === "team2"
  const rawMatch = (match.meta?.match ?? null) as any
  const player1Stats = rawMatch?.matchReference?.player1
  const player2Stats = rawMatch?.matchReference?.player2
  const boardLabel = (match.meta?.boardLabel as string | undefined) ?? undefined
  const statusTone = toneForStatus(match.status)

  return (
    <Card
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT, left: x, top: y }}
      className="absolute z-10 overflow-hidden border-0 bg-card/96 shadow-[8px_9px_0px_-4px_rgba(0,0,0,0.45)] transition hover:shadow-[10px_12px_0px_-4px_rgba(0,0,0,0.45)]"
      onClick={() => onClick?.(match)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
    >
      <CardContent className="flex h-full flex-col justify-between p-3.5">
        <div className="space-y-2">
          {(boardLabel || match.status) ? (
            <div className="flex items-center justify-between gap-2">
              {boardLabel ? (
                <span className="max-w-[190px] truncate text-xs font-medium text-muted-foreground">{boardLabel}</span>
              ) : (
                <span className="text-xs text-transparent">.</span>
              )}
              {match.status ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full border-none px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    statusTone.badge
                  )}
                >
                  {labelStatus(match.status)}
                </Badge>
              ) : null}
            </div>
          ) : null}
          <TeamRow
            name={match.team1}
            score={match.score1}
            isWinner={team1Winner}
            oneEighties={player1Stats?.oneEightiesCount}
            highestCheckout={player1Stats?.highestCheckout}
          />
          <TeamRow
            name={match.team2}
            score={match.score2}
            isWinner={team2Winner}
            oneEighties={player2Stats?.oneEightiesCount}
            highestCheckout={player2Stats?.highestCheckout}
          />
        </div>
        {actions ? <div className="pt-2.5">{actions}</div> : null}
      </CardContent>
    </Card>
  )
}

interface TeamRowProps {
  name: string
  score?: number | null
  isWinner: boolean
  oneEighties?: number | null
  highestCheckout?: number | null
}

const TeamRow: React.FC<TeamRowProps> = ({ name, score, isWinner, oneEighties, highestCheckout }) => {
  const displayName = name || "TBD"
  const scoreValue = Number.isFinite(score ?? NaN) ? score : "–"
  const hasStats = Number.isFinite(oneEighties ?? NaN) || Number.isFinite(highestCheckout ?? NaN)

  return (
    <div
      className={cn(
        "flex items-start justify-between rounded-xl border border-transparent px-3 py-1.5",
        isWinner
          ? "bg-emerald-500/15 text-emerald-400 shadow-inner shadow-emerald-500/10"
          : "bg-muted/18 text-muted-foreground"
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className={cn("truncate text-sm font-medium", isWinner && "font-semibold text-foreground")}>{displayName}</span>
        {hasStats ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-muted-foreground/70">
            {Number.isFinite(oneEighties ?? NaN) ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-[2px] text-amber-200">
                <IconFlame className="h-3 w-3" />
                {oneEighties ?? 0}
              </span>
            ) : null}
            {Number.isFinite(highestCheckout ?? NaN) ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/15 px-1.5 py-[2px] text-sky-200">
                <IconTargetArrow className="h-3 w-3" />
                {highestCheckout ?? "–"}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <span
        className={cn(
          "ml-2 flex-shrink-0 text-lg font-semibold tabular-nums",
          isWinner ? "text-emerald-300" : "text-muted-foreground"
        )}
      >
        {scoreValue}
      </span>
    </div>
  )
}

const labelStatus = (status?: string | null) => {
  if (!status) return ""
  switch (status) {
    case "pending":
      return "Várakozik"
    case "ongoing":
      return "Folyamatban"
    case "finished":
      return "Befejezve"
    default:
      return status
  }
}

const toneForStatus = (status?: string | null) => {
  switch (status) {
    case "finished":
      return { badge: "bg-emerald-500/20 text-emerald-200" }
    case "ongoing":
      return { badge: "bg-sky-500/20 text-sky-200" }
    case "pending":
      return { badge: "bg-amber-500/20 text-amber-200" }
    default:
      return { badge: "bg-muted/40 text-muted-foreground" }
  }
}

const buildConnectorPath = (startX: number, startY: number, midX: number, endX: number, endY: number) => {
  const controlMid = Number.isFinite(midX) ? midX : (startX + endX) / 2
  return `M ${startX} ${startY} H ${controlMid} V ${endY} H ${endX}`
}

export default KnockoutBracketDiagram
