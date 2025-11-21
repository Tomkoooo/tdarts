'use client';

import React, { useState } from 'react';
import { 
  IconUserPlus, 
  IconBuilding, 
  IconTrophy, 
  IconTarget, 
  IconFlagCheck,
  IconShare,
  IconChartLine,
  IconDeviceMobile,
  IconPlayerPlay,
  IconQuestionMark,
  IconChevronRight,
  IconChevronLeft
} from '@tabler/icons-react';
import Link from 'next/link';
import howItWorksData from '@/data/how-it-works.json';
import ContentRenderer from '@/components/how-it-works/ContentRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// Icon mapping with color variants
const iconMap: { [key: string]: any } = {
  IconUserPlus,
  IconBuilding,
  IconTrophy,
  IconTarget,
  IconFlagCheck,
  IconShare,
  IconChartLine,
  IconDeviceMobile,
  IconPlayerPlay
};

// Color palette for each step (vibrant, non-red colors)
const stepColors = [
  { bg: 'bg-blue-500/10', icon: 'text-blue-400', border: 'border-blue-500/20', accent: 'bg-blue-500/20' },
  { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', border: 'border-emerald-500/20', accent: 'bg-emerald-500/20' },
  { bg: 'bg-purple-500/10', icon: 'text-purple-400', border: 'border-purple-500/20', accent: 'bg-purple-500/20' },
  { bg: 'bg-amber-500/10', icon: 'text-amber-400', border: 'border-amber-500/20', accent: 'bg-amber-500/20' },
  { bg: 'bg-cyan-500/10', icon: 'text-cyan-400', border: 'border-cyan-500/20', accent: 'bg-cyan-500/20' },
  { bg: 'bg-pink-500/10', icon: 'text-pink-400', border: 'border-pink-500/20', accent: 'bg-pink-500/20' },
  { bg: 'bg-indigo-500/10', icon: 'text-indigo-400', border: 'border-indigo-500/20', accent: 'bg-indigo-500/20' },
  { bg: 'bg-teal-500/10', icon: 'text-teal-400', border: 'border-teal-500/20', accent: 'bg-teal-500/20' },
  { bg: 'bg-orange-500/10', icon: 'text-orange-400', border: 'border-orange-500/20', accent: 'bg-orange-500/20' },
];

const HowItWorksPage = () => {
  const [activeStep, setActiveStep] = useState(0);

  const currentStep = howItWorksData.steps[activeStep];
  const StepIcon = iconMap[currentStep.icon];
  const currentColor = stepColors[activeStep % stepColors.length];

  // Generate FAQ schema for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": howItWorksData.steps.map(step => ({
      "@type": "Question",
      "name": step.title,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": step.content.sections.map((section: any) => {
          if (section.type === 'text') return section.content;
          if (section.type === 'subsection') {
            return `${section.title}: ${Array.isArray(section.content) ? section.content.join(' ') : section.content}`;
          }
          return '';
        }).join(' ')
      }
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="min-h-screen w-full py-12 px-4 md:px-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <header className="mb-12 text-center">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl", currentColor.bg)}>
                <IconQuestionMark className={cn("size-8", currentColor.icon)} />
              </div>
              <div className="text-left">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                  Gyakran Ismételt Kérdések
                </h1>
                <p className="text-muted-foreground mt-1">Teljes útmutató a tDarts platform használatához</p>
              </div>
            </div>
          </header>

          <div className="grid lg:grid-cols-[280px,1fr] gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:sticky lg:top-8 lg:h-fit">
              <nav aria-label="GYIK navigáció" className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
                  Témakörök
                </h2>
                {howItWorksData.steps.map((step, index) => {
                  const Icon = iconMap[step.icon];
                  const isActive = activeStep === index;
                  const stepColor = stepColors[index % stepColors.length];
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(index)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all group",
                        "flex items-start gap-3",
                        isActive
                          ? cn("shadow-lg", stepColor.bg, stepColor.border, "ring-2 ring-offset-2 ring-offset-background")
                          : "bg-muted/20 hover:bg-muted/40"
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isActive ? stepColor.accent : "bg-muted/40"
                      )}>
                        <Icon className={cn(
                          "size-5 transition-colors",
                          isActive ? stepColor.icon : "text-muted-foreground group-hover:text-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground leading-tight">
                          {step.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {step.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Main Content */}
            <main className="space-y-6">
              <article itemScope itemType="https://schema.org/Question">
                <Card className={cn("bg-card/50 backdrop-blur-xl shadow-2xl shadow-black/20", currentColor.border)}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", currentColor.bg)}>
                        <StepIcon className={cn("size-7", currentColor.icon)} />
                      </div>
                      <div className="space-y-2 flex-1">
                        <h2 itemProp="name" className="text-3xl font-bold tracking-tight">
                          {currentStep.title}
                        </h2>
                        <p itemProp="text" className="text-muted-foreground text-lg">
                          {currentStep.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div itemScope itemType="https://schema.org/Answer">
                      <div itemProp="text">
                        <ContentRenderer content={currentStep.content} />
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-6 border-t border-border/40">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                        disabled={activeStep === 0}
                        className="gap-2"
                      >
                        <IconChevronLeft size={18} />
                        Előző
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        {howItWorksData.steps.map((_, index) => {
                          const stepColor = stepColors[index % stepColors.length];
                          const isActive = activeStep === index;
                          return (
                            <button
                              key={index}
                              onClick={() => setActiveStep(index)}
                              className={cn(
                                "h-2 rounded-full transition-all",
                                isActive 
                                  ? cn("w-8", stepColor.accent) 
                                  : "w-2 bg-muted hover:bg-muted-foreground/40"
                              )}
                              aria-label={`Ugrás a ${howItWorksData.steps[index].title} témához`}
                            />
                          );
                        })}
                      </div>
                      
                      <Button
                        size="lg"
                        onClick={() => setActiveStep(Math.min(howItWorksData.steps.length - 1, activeStep + 1))}
                        disabled={activeStep === howItWorksData.steps.length - 1}
                        className="gap-2"
                      >
                        Következő
                        <IconChevronRight size={18} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </article>

              {/* CTA */}
              <Card className="bg-gradient-to-br from-accent/10 via-card to-card shadow-lg border-accent/20">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{howItWorksData.cta.title}</CardTitle>
                  <CardDescription className="text-base">{howItWorksData.cta.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
                  {howItWorksData.cta.buttons.map((button, index) => (
                    <Button
                      key={index}
                      variant={button.variant === 'primary' ? 'default' : 'outline'}
                      size="lg"
                      asChild
                    >
                      <Link href={button.href}>{button.text}</Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default HowItWorksPage; 