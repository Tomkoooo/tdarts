"use client"

import React, { useEffect, useState } from "react"
import ParallaxBackground from "@/components/homapage/ParallaxBackground"
import AnnouncementToast from "@/components/common/AnnouncementToast"
import { useUnreadTickets, UnreadTicketToast } from "@/hooks/useUnreadTickets"
import { getActiveAnnouncementsAction } from "@/features/announcements/actions/getActiveAnnouncements.action"
import LandingHeroSection from "@/components/home/LandingHeroSection"
import LandingFeaturesSection from "@/components/home/LandingFeaturesSection"
import LandingHowItWorksSection from "@/components/home/LandingHowItWorksSection"
import LandingTestimonialsSection from "@/components/home/LandingTestimonialsSection"
import LandingCtaSection from "@/components/home/LandingCtaSection"

interface Announcement {
  _id: string
  title: string
  description: string
  type: "info" | "success" | "warning" | "error"
  isActive: boolean
  showButton: boolean
  buttonText?: string
  buttonAction?: string
  duration: number
  expiresAt: string
}

export default function MarketingHomeContent() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [closedAnnouncements, setClosedAnnouncements] = useState<Set<string>>(new Set())
  const { unreadCount } = useUnreadTickets({ enabled: false })
  const [ticketToastDismissed, setTicketToastDismissed] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem("ticketToastDismissed")
    if (dismissed) setTicketToastDismissed(true)
  }, [])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await getActiveAnnouncementsAction({
          locale: typeof navigator !== "undefined" ? navigator.language : "hu",
        })
        if (
          response &&
          typeof response === "object" &&
          "success" in response &&
          response.success &&
          "announcements" in response &&
          Array.isArray((response as { announcements?: Announcement[] }).announcements)
        ) {
          const now = new Date()
          const activeAnnouncements = (response as { announcements: Announcement[] }).announcements.filter((announcement: Announcement) =>
            announcement.isActive && new Date(announcement.expiresAt) > now
          )
          setAnnouncements(activeAnnouncements)
        }
      } catch (error) {
        console.error("Error fetching announcements:", error)
      }
    }

    fetchAnnouncements()
  }, [])

  const handleCloseAnnouncement = (id: string) => {
    setClosedAnnouncements((prev) => new Set([...prev, id]))
    setAnnouncements((prev) => prev.filter((announcement) => announcement._id !== id))
  }

  const activeAnnouncements = announcements.filter((announcement) => !closedAnnouncements.has(announcement._id))

  const handleDismissTicketToast = () => {
    setTicketToastDismissed(true)
    localStorage.setItem("ticketToastDismissed", "true")
    setTimeout(() => {
      localStorage.removeItem("ticketToastDismissed")
    }, 60 * 60 * 1000)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ParallaxBackground />

      <div
        className="toast-container space-y-4"
        style={{
          position: "fixed",
          inset: "auto 16px 16px auto",
          zIndex: 40,
        }}
      >
        {activeAnnouncements.map((announcement, index) => (
          <div
            key={announcement._id}
            style={{
              zIndex: 40 - index,
              animationDelay: `${index * 200}ms`,
            }}
            className="animate-slideInFromLeft"
          >
            <AnnouncementToast announcement={announcement} onClose={handleCloseAnnouncement} />
          </div>
        ))}
      </div>

      {!ticketToastDismissed && (
        <UnreadTicketToast unreadCount={unreadCount} onDismiss={handleDismissTicketToast} />
      )}

      <main className="relative z-10 pb-12">
        <LandingHeroSection />
        <LandingFeaturesSection />
        <LandingHowItWorksSection />
        <LandingTestimonialsSection enabled={false} />
        <LandingCtaSection />
        <div className="h-8" />
      </main>
    </div>
  )
}
