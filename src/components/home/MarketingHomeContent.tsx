"use client"

import React, { useEffect, useState } from "react"
import axios from "axios"
import ParallaxBackground from "@/components/homapage/ParallaxBackground"
import HeroSectionNew from "@/components/homapage/HeroSectionNew"
import InfiniteCarousel from "@/components/homapage/InfiniteCarousel"
import FeaturesSectionNew from "@/components/homapage/FeaturesSectionNew"
import PricingSection from "@/components/homapage/PricingSection"
import AnnouncementToast from "@/components/common/AnnouncementToast"
import { useUnreadTickets, UnreadTicketToast } from "@/hooks/useUnreadTickets"
import { useUserContext } from "@/hooks/useUser"

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
  const { user } = useUserContext()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [closedAnnouncements, setClosedAnnouncements] = useState<Set<string>>(new Set())
  const { unreadCount } = useUnreadTickets({ enabled: Boolean(user?._id) })
  const [ticketToastDismissed, setTicketToastDismissed] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem("ticketToastDismissed")
    if (dismissed) setTicketToastDismissed(true)
  }, [])

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await axios.get("/api/announcements", {
          headers: {
            "Accept-Language": typeof navigator !== "undefined" ? navigator.language : "hu",
          },
        })
        if (response.data.success) {
          const now = new Date()
          const activeAnnouncements = response.data.announcements.filter((announcement: Announcement) =>
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
    <div className="min-h-screen relative">
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

      <main className="relative z-10">
        <HeroSectionNew />
        <InfiniteCarousel />
        <FeaturesSectionNew />
        <PricingSection />
        <div className="h-20" />
      </main>
    </div>
  )
}
