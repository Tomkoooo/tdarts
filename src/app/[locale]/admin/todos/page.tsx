import { useTranslations } from "next-intl";

"use client"

import SmartTodoManager from "@/components/admin/SmartTodoManager"
import { Card } from "@/components/ui/Card"
import { IconCheck } from "@tabler/icons-react"

export default function AdminTodosPage() {
    const t = useTranslations("Auto");
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <Card
        
        className="relative overflow-hidden backdrop-blur-xl bg-card/30 p-8"
      >
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3 text-info">
            <IconCheck className="size-10" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">{t("todo_kezelés")}</h1>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">{t("feladatok_és_észrevételek")}</p>
      </div>
      </Card>

      <SmartTodoManager />
    </div>
  )
}
