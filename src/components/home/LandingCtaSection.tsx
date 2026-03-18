"use client"

import React from "react"
import { IconArrowRight, IconCalendarEvent, IconTarget } from "@tabler/icons-react"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/Button"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"
import PricingSection from "@/components/homapage/PricingSection"

export default function LandingCtaSection() {
  return (
    <section id="cta" className="relative">
      <div className="mx-auto max-w-368 px-2 sm:px-4">
        <div className="rounded-4xl border border-border/60 bg-card/35 backdrop-blur-xl">
          <PricingSection />
        </div>
      </div>

      <div className="px-4 pb-28 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <GlassmorphismCard
            intensity="strong"
            className="rounded-3xl border-primary/30 p-8 text-center shadow-glow-primary sm:p-12"
          >
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-primary">
              <IconTarget size={14} />
              Indulasra kesz
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
              Emeld premium szintre minden darts estedet
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Kezeld a jatekosokat, sorsolasokat, merkozeseket es statisztikakat egyetlen folyamatban az elso dobastol a dontoig.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="min-w-[220px]" asChild>
                <Link href="/search">
                  Versenyek bongeszese
                  <IconArrowRight size={18} className="ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="min-w-[220px]" asChild>
                <Link href="/myclub">
                  <IconCalendarEvent size={18} className="mr-2" />
                  Klub inditasa
                </Link>
              </Button>
            </div>
          </GlassmorphismCard>
        </div>
      </div>
    </section>
  )
}
