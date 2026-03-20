"use client"

import React from "react"
import { IconArrowRight, IconRocket, IconRoute, IconTargetArrow } from "@tabler/icons-react"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/Button"
import { GlassmorphismCard } from "@/components/ui/glassmorphism-card"

const STEPS = [
  {
    icon: IconTargetArrow,
    title: "Hozd létre a klubprofilodat",
    description: "Állítsd be a klub adatait, helyszíneit és játékosait néhány perc alatt.",
  },
  {
    icon: IconRoute,
    title: "Vezesd a versenyeket valós időben",
    description: "Generálj táblákat, rögzítsd az eredményeket legről legre, és tartsd frissen a ranglistát.",
  },
  {
    icon: IconRocket,
    title: "Növekedj statisztikával és automatizációval",
    description: "Használj részletes elemzéseket és okos eszközöket, hogy a helyi eseményekből komplett rendszer legyen.",
  },
]

export default function LandingHowItWorksSection() {
  return (
    <section id="how-it-works" className="relative px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Hogyan működik</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Kluboknak, ligáknak és modern versenyvezetőknek tervezve
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">
            A felfedezéstől a valós idejű menedzsmenten át az utolsó statisztikáig minden egyetlen összekapcsolt platformon marad.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <GlassmorphismCard
                key={step.title}
                intensity="strong"
                className="rounded-2xl border-primary/25 p-6 shadow-glow-primary"
              >
                <div className="mb-4 inline-flex rounded-xl border border-primary/30 bg-primary/10 p-3 text-primary">
                  <Icon size={20} />
                </div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                  Lépés {index + 1}
                </p>
                <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </GlassmorphismCard>
            )
          })}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="min-w-[220px]" asChild>
            <Link href="/how-it-works">
              Teljes útmutató
              <IconArrowRight size={18} className="ml-2" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="min-w-[220px]" asChild>
            <Link href="/auth/register">Ingyenes kezdés</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
