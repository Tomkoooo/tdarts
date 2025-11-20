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
  compactMode?: boolean
}

const CARD_WIDTH = 286
const CARD_HEIGHT = 205
const COMPACT_CARD_WIDTH = 220
const COMPACT_CARD_HEIGHT = 160
const COLUMN_GAP = 120
const COMPACT_COLUMN_GAP = 90
const ROW_GAP = 48
const COMPACT_ROW_GAP = 32
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
  compactMode = false,
}) => {
  const cardWidth = compactMode ? COMPACT_CARD_WIDTH : CARD_WIDTH
  const cardHeight = compactMode ? COMPACT_CARD_HEIGHT : CARD_HEIGHT
  const columnGap = compactMode ? COMPACT_COLUMN_GAP : COLUMN_GAP
  const rowGap = compactMode ? COMPACT_ROW_GAP : ROW_GAP
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
          y = matchIndex * (cardHeight + rowGap)
        } else {
          const parentRound = positioned[roundIndex - 1]
          const parent1 = parentRound[matchIndex * 2]
          const parent2 = parentRound[matchIndex * 2 + 1] ?? parent1
          const centreAverage = parent2
            ? (parent1.center + parent2.center) / 2
            : parent1.center
          y = centreAverage - cardHeight / 2
        }

        const x = roundIndex * (cardWidth + columnGap)
        const center = y + cardHeight / 2

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

    const height = flatMatches.reduce((max, item) => Math.max(max, item.y + cardHeight), cardHeight)
    const width = rounds.length * cardWidth + (rounds.length - 1) * columnGap

    const connectors: LayoutResult["connectors"] = []

    positioned.forEach((roundMatches, roundIndex) => {
      if (roundIndex === 0) return
      const previousRound = positioned[roundIndex - 1]
      roundMatches.forEach((child, matchIndex) => {
        const parent1 = previousRound[matchIndex * 2]
        const parent2 = previousRound[matchIndex * 2 + 1]
        const targetX = child.x
        const targetY = child.center
        const midX = parent1 ? parent1.x + cardWidth + columnGap / 2 : targetX - columnGap / 2

        if (parent1) {
          connectors.push({
            id: `${roundIndex}-${matchIndex}-p1`,
            path: buildConnectorPath(parent1.x + cardWidth, parent1.center, midX, targetX, targetY),
          })
        }

        if (parent2) {
          connectors.push({
            id: `${roundIndex}-${matchIndex}-p2`,
            path: buildConnectorPath(parent2.x + cardWidth, parent2.center, midX, targetX, targetY),
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
  }, [rounds, cardWidth, cardHeight, columnGap, rowGap])

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
        const left = roundIndex * (cardWidth + columnGap)
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
                
                variant="ghost"
                className="pointer-events-auto rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                onClick={() => onAddMatchToRound(round.roundNumber)}
                aria-label={`${round.label} - meccs hozzáadása`}
              >
                <IconPlus color="white" size={16}/>
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
          compactMode={compactMode}
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
  compactMode?: boolean
}

const MatchCard: React.FC<MatchCardProps> = ({ match, x, y, onClick, actions, compactMode = false }) => {
  const cardWidth = compactMode ? COMPACT_CARD_WIDTH : CARD_WIDTH
  const cardHeight = compactMode ? COMPACT_CARD_HEIGHT : CARD_HEIGHT
  const team1Winner = match.winner === "team1"
  const team2Winner = match.winner === "team2"
  const rawMatch = (match.meta?.match ?? null) as any
  const player1Stats = rawMatch?.matchReference?.player1
  const player2Stats = rawMatch?.matchReference?.player2
  const boardLabel = (match.meta?.boardLabel as string | undefined) ?? undefined
  const statusTone = toneForStatus(match.status)

  return (
    <Card
      style={{ width: cardWidth, height: cardHeight, left: x, top: y }}
      className="absolute z-10 overflow-hidden border-0 bg-card/96 shadow-[8px_9px_0px_-4px_rgba(0,0,0,0.45)] transition hover:shadow-[10px_12px_0px_-4px_rgba(0,0,0,0.45)]"
      onClick={() => onClick?.(match)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
    >
      <CardContent className={cn("flex h-full flex-col justify-between", compactMode ? "p-2.5" : "p-3.5")}>
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
            compactMode={compactMode}
          />
          <TeamRow
            name={match.team2}
            score={match.score2}
            isWinner={team2Winner}
            oneEighties={player2Stats?.oneEightiesCount}
            highestCheckout={player2Stats?.highestCheckout}
            compactMode={compactMode}
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
  compactMode?: boolean
}

const TeamRow: React.FC<TeamRowProps> = ({ name, score, isWinner, oneEighties, highestCheckout, compactMode = false }) => {
  const displayName = name || "TBD"
  const scoreValue = Number.isFinite(score ?? NaN) ? score : "–"
  const hasStats = Number.isFinite(oneEighties ?? NaN) || Number.isFinite(highestCheckout ?? NaN)

  return (
    <div
      className={cn(
        "flex items-start justify-between rounded-xl border border-transparent",
        compactMode ? "px-2 py-1" : "px-3 py-1.5",
        isWinner
          ? "bg-success/15 text-success shadow-inner shadow-success/10"
          : "bg-muted/18 text-muted-foreground"
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className={cn(
          "truncate font-medium",
          compactMode ? "text-xs" : "text-sm",
          isWinner && "font-semibold text-foreground"
        )}>{displayName}</span>
        {hasStats && !compactMode ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-muted-foreground/70">
            {Number.isFinite(oneEighties ?? NaN) ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-warning/15 px-1.5 py-[2px] text-warning">
                <IconFlame className="h-3 w-3" />
                {oneEighties ?? 0}
              </span>
            ) : null}
            {Number.isFinite(highestCheckout ?? NaN) ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-info/15 px-1.5 py-[2px] text-info">
                <IconTargetArrow className="h-3 w-3" />
                {highestCheckout ?? "–"}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <span
        className={cn(
          "ml-2 flex-shrink-0 font-semibold tabular-nums",
          compactMode ? "text-base" : "text-lg",
          isWinner ? "text-success" : "text-muted-foreground"
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
      return { badge: "bg-success/20 text-success" }
    case "ongoing":
      return { badge: "bg-info/20 text-info" }
    case "pending":
      return { badge: "bg-warning/20 text-warning" }
    default:
      return { badge: "bg-muted/40 text-muted-foreground" }
  }
}

const buildConnectorPath = (startX: number, startY: number, midX: number, endX: number, endY: number) => {
  const controlMid = Number.isFinite(midX) ? midX : (startX + endX) / 2
  return `M ${startX} ${startY} H ${controlMid} V ${endY} H ${endX}`
}

export default KnockoutBracketDiagram
