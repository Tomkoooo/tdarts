"use client"

import * as React from "react"
import { IconSearch } from "@tabler/icons-react"
import { Card, CardContent } from "@/components/ui/Card"

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
}

export function EmptyState({ 
  title, 
  description, 
  icon 
}: EmptyStateProps) {
  return (
    <Card className="border-dashed border-2 border-muted">
      <CardContent className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          {icon || <IconSearch className="w-10 h-10 text-muted-foreground" />}
        </div>
        <h3 className="text-2xl font-bold mb-3 text-center">
          {title}
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

export default EmptyState

