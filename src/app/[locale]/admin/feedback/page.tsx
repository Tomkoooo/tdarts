import { useTranslations } from "next-intl";

"use client"

import FeedbackTable from "@/components/admin/FeedbackTable"
import DailyChart from "@/components/admin/DailyChart"
import { Card } from "@/components/ui/Card"
import { IconBug } from "@tabler/icons-react"

export default function AdminFeedbackPage() {
    const t = useTranslations("Auto");
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <Card
        
        className="relative overflow-hidden backdrop-blur-xl bg-card/30 p-8"
      >
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-3 text-warning">
            <IconBug className="size-10" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">{t("hibabejelentések_kezelése")}</h1>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">{t("felhasználói_visszajelzések_és")}</p>
      </div>
      </Card>
      
      <DailyChart 
        title={t("visszajelzések_napi_beérkezése")} 
        apiEndpoint="/api/admin/charts/feedback/daily" 
        color="warning" 
      />
      
      <FeedbackTable />
    </div>
  )
}
