"use client"

import React from "react"
import { IconBolt, IconDeviceDesktop, IconSparkles, IconUsersGroup } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import HeroSectionNew from "@/components/homapage/HeroSectionNew"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"

export default function LandingHeroSection() {
  const t = useTranslations("Hero")

  const highlights = [
    {
      icon: IconSparkles,
      label: t("features.organize"),
    },
    {
      icon: IconDeviceDesktop,
      label: t("features.results"),
    },
    {
      icon: IconBolt,
      label: t("features.pairing"),
    },
    {
      icon: IconUsersGroup,
      label: t("features.stats"),
    },
  ]

  return (
    <section id="hero" className="relative">
      <HeroSectionNew />
      <div className="mx-auto -mt-8 mb-8 grid max-w-6xl grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => {
          const Icon = item.icon
          return (
            <GlassmorphismCard
              key={item.label}
              intensity="strong"
              className="group flex items-center gap-3 rounded-2xl border-primary/30 px-4 py-4 shadow-glow-primary"
            >
              <span className="rounded-xl bg-primary/15 p-2 text-primary transition-transform duration-200 group-hover:scale-110">
                <Icon size={18} />
              </span>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </GlassmorphismCard>
          )
        })}
      </div>
    </section>
  )
}
