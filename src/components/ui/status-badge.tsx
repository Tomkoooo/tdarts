import * as React from "react"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"

export type TournamentStatus = 
  | "pending" 
  | "registration" 
  | "group-stage" 
  | "knockout" 
  | "finished" 
  | "cancelled"

export type BoardStatus = 
  | "idle" 
  | "active" 
  | "maintenance"

export type PlayerStatus = 
  | "applied" 
  | "checked-in" 
  | "playing" 
  | "eliminated"

export type MatchStatus = 
  | "scheduled" 
  | "in_progress"

type StatusType = TournamentStatus | BoardStatus | PlayerStatus | MatchStatus

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

const statusConfig: Record<StatusType, {
  label: string
  variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}> = {
  // Tournament statuses
  pending: { label: "Függőben", variant: "secondary" },
  registration: { label: "Regisztráció", variant: "secondary" },
  "group-stage": { label: "Csoportkör", variant: "default" },
  knockout: { label: "Egyenes kiesés", variant: "warning" },
  finished: { label: "Befejezett", variant: "success" },
  cancelled: { label: "Törölve", variant: "destructive" },
  
  // Board statuses
  idle: { label: "Szabad", variant: "success" },
  active: { label: "Foglalt", variant: "destructive" },
  maintenance: { label: "Karbantartás", variant: "warning" },
  
  // Player statuses
  applied: { label: "Jelentkezett", variant: "secondary" },
  "checked-in": { label: "Bejelentkezett", variant: "success" },
  playing: { label: "Játszik", variant: "default" },
  eliminated: { label: "Kiesett", variant: "secondary" },
  
  // Match statuses (finished and cancelled are already defined in Tournament statuses)
  scheduled: { label: "Ütemezett", variant: "secondary" },
  in_progress: { label: "Folyamatban", variant: "warning" },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  
  if (!config) {
    return <Badge className={className}>{status}</Badge>
  }

  return (
    <Badge 
      variant={config.variant} 
      className={cn("font-semibold", className)}
    >
      {config.label}
    </Badge>
  )
}

