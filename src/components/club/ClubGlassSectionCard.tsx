"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"

interface ClubGlassSectionCardProps {
  id?: string
  title: string
  description?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export default function ClubGlassSectionCard({
  id,
  title,
  description,
  icon,
  actions,
  className,
  children,
}: ClubGlassSectionCardProps) {
  return (
    <Card
      id={id}
      className={cn(
        "overflow-hidden border-border/60 bg-linear-to-br from-card/90 via-card/75 to-card/55 shadow-[0_14px_35px_rgba(0,0,0,0.28)] backdrop-blur-xl",
        className
      )}
    >
      <CardHeader className="border-b border-border/50 bg-linear-to-r from-primary/12 via-primary/6 to-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              {icon}
              <span>{title}</span>
            </CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6">{children}</CardContent>
    </Card>
  )
}
