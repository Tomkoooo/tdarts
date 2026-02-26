"use client"

import * as React from "react"
import { IconMessageCircle, IconPlus, IconAlertCircle, IconClock, IconCheck, IconMailForward } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useTranslations, useLocale } from "next-intl"

interface Ticket {
  id: string
  subject: string
  status: 'open' | 'closed' | 'replied'
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
}

interface TicketListProps {
  tickets: Ticket[]
  onSelectTicket: (ticketId: string) => void
  onCreateTicket: () => void
}

export function TicketList({
  tickets,
  onSelectTicket,
  onCreateTicket,
}: TicketListProps) {
  const t = useTranslations("Profile.tickets")
  const locale = useLocale()

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'open':
        return (
          <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50">
            <IconClock className="w-3 h-3 mr-1" />
            {t("status.open")}
          </Badge>
        )
      case 'replied':
        return (
          <Badge variant="outline" className="text-emerald-500 border-emerald-200 bg-emerald-50">
            <IconMailForward className="w-3 h-3 mr-1" />
            {t("status.replied")}
          </Badge>
        )
      case 'closed':
        return (
          <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">
            <IconCheck className="w-3 h-3 mr-1" />
            {t("status.closed")}
          </Badge>
        )
    }
  }

  const getPriorityBadge = (priority: Ticket['priority']) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive">{t("priority.high")}</Badge>
      case 'medium':
        return <Badge variant="default" className="bg-warning/10 text-warning border-warning/20">{t("priority.medium")}</Badge>
      case 'low':
        return <Badge variant="secondary">{t("priority.low")}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <IconMessageCircle className="w-5 h-5" />
          {t("title")}
        </CardTitle>
        <Button size="sm" onClick={onCreateTicket}>
          <IconPlus className="w-4 h-4 mr-1" />
          {t("new_ticket")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tickets.length > 0 ? (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                className="group relative p-4 rounded-xl border border-muted/20 bg-card hover:bg-muted/5 transition-all cursor-pointer overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-primary-foreground group-hover:text-primary transition-colors">
                        {ticket.subject}
                      </h4>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{t("id_prefix")}: {ticket.id}</span>
                      <span>•</span>
                      <span>
                        {t("updated_at", { date: new Date(ticket.updatedAt).toLocaleDateString(locale === 'hu' ? 'hu-HU' : 'en-US') })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(ticket.priority)}
                  </div>
                </div>
                
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
              </div>
            ))
          ) : (
            <div className="py-12 text-center border-2 border-dashed border-muted/10 rounded-2xl">
              <IconAlertCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">
                {t("empty")}
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-4 text-primary hover:text-primary hover:bg-primary/5"
                onClick={onCreateTicket}
              >
                {t("new_ticket_desc")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default TicketList
