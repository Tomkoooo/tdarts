"use client"

import React from "react"
import InfiniteCarousel from "@/components/homapage/InfiniteCarousel"
import FeaturesSectionNew from "@/components/homapage/FeaturesSectionNew"

export default function LandingFeaturesSection() {
  return (
    <section id="features" className="relative">
      <div className="mx-auto mb-4 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-primary/25 bg-card/55 p-2 backdrop-blur-xl shadow-glow-primary">
          <InfiniteCarousel />
        </div>
      </div>
      <div className="mx-auto max-w-368 px-2 sm:px-4">
        <div className="rounded-4xl border border-border/60 bg-card/40 backdrop-blur-xl">
          <FeaturesSectionNew />
        </div>
      </div>
    </section>
  )
}
