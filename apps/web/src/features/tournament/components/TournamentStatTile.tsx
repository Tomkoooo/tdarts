"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TournamentStatTileProps {
  label: string
  value: string | number
  helper?: string
  className?: string
}

export function TournamentStatTile({ label, value, helper, className }: TournamentStatTileProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-muted/25 p-3 shadow-[0_8px_20px_rgba(0,0,0,0.2)] backdrop-blur",
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground md:text-2xl">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}
