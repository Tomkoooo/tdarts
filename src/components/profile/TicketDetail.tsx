"use client"

import * as React from "react"
import { IconArrowLeft, IconSend, IconClock, IconMessageCircle, IconShield, IconUser, IconMailForward, IconCheck } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTranslations, useLocale } from "next-intl"

interface Message {
  id: string
  content: string
  isAdmin: boolean
  createdAt: string
  authorName: string
}

interface TicketDetailProps {
  ticket: {
    id: string
    subject: string
    status: 'open' | 'closed' | 'replied'
    priority: 'low' | 'medium' | 'high'
    messages: Message[]
  }
  onBack: () => void
  onSendMessage: (content: string) => Promise<void>
  onUpdate?: () => void
  isLoading: boolean
}

export function TicketDetail({
  ticket,
  onBack,
  onSendMessage,
  onUpdate,
  isLoading,
}: TicketDetailProps) {
  const t = useTranslations("Profile.tickets")
  const locale = useLocale()
  const [newMessage, setNewMessage] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [ticket.messages])

  // Mark ticket as read when opened
  React.useEffect(() => {
    const markAsRead = async () => {
      // Logic for marking as read could go here if needed, 
      // but for now we follow the props pattern
      onUpdate?.()
    }
    markAsRead()
  }, [ticket.id, onUpdate])

  const handleSend = async () => {
    if (!newMessage.trim() || isLoading) return
    await onSendMessage(newMessage)
    setNewMessage("")
  }

  const getStatusBadge = (status: TicketDetailProps['ticket']['status']) => {
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

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b bg-muted/5 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <IconArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <CardTitle className="text-lg font-bold">{ticket.subject}</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{t("id_prefix")}: {ticket.id}</span>
                <span>•</span>
                {getStatusBadge(ticket.status)}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full px-6 py-6" viewportRef={scrollRef}>
          <div className="space-y-6">
            {ticket.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.isAdmin ? "items-start" : "items-end"
                }`}
              >
                <div className={`flex items-center gap-2 mb-1.5 ${
                  msg.isAdmin ? "flex-row" : "flex-row-reverse"
                }`}>
                  <div className={`p-1 rounded-md ${msg.isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {msg.isAdmin ? <IconShield className="w-3 h-3" /> : <IconUser className="w-3 h-3" />}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {msg.authorName}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {new Date(msg.createdAt).toLocaleString(locale === 'hu' ? 'hu-HU' : 'en-US')}
                  </span>
                </div>
                
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.isAdmin
                      ? "bg-muted rounded-tl-none text-primary-foreground"
                      : "bg-primary text-primary-foreground rounded-tr-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t p-4 bg-muted/5">
        {ticket.status !== 'closed' ? (
          <div className="flex w-full items-center gap-3">
            <div className="relative flex-1">
              <Input
                placeholder={t("reply_placeholder")}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isLoading}
                className="pr-10 bg-background"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <IconMessageCircle className="w-4 h-4" />
              </div>
            </div>
            <Button 
                onClick={handleSend} 
                disabled={isLoading || !newMessage.trim()}
                className="px-6"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <IconSend className="w-4 h-4 mr-2" />
                  {t("send_button")}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="w-full text-center py-2 text-sm text-muted-foreground italic bg-muted/20 rounded-lg">
            {t("closed_message")}
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

export default TicketDetail
