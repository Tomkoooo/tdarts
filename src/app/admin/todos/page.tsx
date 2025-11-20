"use client"

import TodoManager from "@/components/admin/TodoManager"
import { Card } from "@/components/ui/Card"
import { IconCheck } from "@tabler/icons-react"

export default function AdminTodosPage() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <Card
        elevation="elevated"
        className="relative overflow-hidden backdrop-blur-xl bg-card/30 p-8"
      >
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3 text-info">
            <IconCheck className="size-10" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">Todo Kezelés</h1>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">Feladatok és észrevételek követése</p>
      </div>
      </Card>

      <TodoManager />
    </div>
  )
}
