"use client"

import React from "react"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"

type LandingTestimonialsSectionProps = {
  enabled?: boolean
}

export default function LandingTestimonialsSection({ enabled = false }: LandingTestimonialsSectionProps) {
  if (!enabled) return null

  return (
    <section id="testimonials" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <GlassmorphismCard intensity="strong" className="rounded-3xl border-primary/30 p-8 text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Vélemények hamarosan</h2>
          <p className="mt-4 text-muted-foreground">
            Ez a szekció már előkészítve várja a jóváhagyott ügyfél-visszajelzéseket.
          </p>
        </GlassmorphismCard>
      </div>
    </section>
  )
}
