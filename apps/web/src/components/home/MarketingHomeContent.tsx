"use client"

import React, { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import AnnouncementToast from "@/components/common/AnnouncementToast"
import { getActiveAnnouncementsAction } from "@/features/announcements/actions/getActiveAnnouncements.action"
import LandingHeroSection from "@/components/home/LandingHeroSection"

const ParallaxBackground = dynamic(() => import("@/components/homapage/ParallaxBackground"), { ssr: false })
const LandingFeaturesSection = dynamic(() => import("@/components/home/LandingFeaturesSection"))
const LandingHowItWorksSection = dynamic(() => import("@/components/home/LandingHowItWorksSection"))
const LandingTestimonialsSection = dynamic(() => import("@/components/home/LandingTestimonialsSection"))
const LandingCtaSection = dynamic(() => import("@/components/home/LandingCtaSection"))

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

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let idleId: number | null = null
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

    // Avoid competing with first paint; request idle first.
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (window as any).requestIdleCallback(fetchAnnouncements, { timeout: 1200 })
    } else {
      timeoutId = setTimeout(fetchAnnouncements, 250)
    }

    return () => {
      if (idleId !== null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        try {
          ;(window as any).cancelIdleCallback(idleId)
          return
        } catch {}
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  const handleCloseAnnouncement = (id: string) => {
    setClosedAnnouncements((prev) => new Set([...prev, id]))
    setAnnouncements((prev) => prev.filter((announcement) => announcement._id !== id))
  }

  const activeAnnouncements = announcements.filter((announcement) => !closedAnnouncements.has(announcement._id))

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
