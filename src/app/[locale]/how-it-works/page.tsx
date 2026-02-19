'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { 
  IconUserPlus, 
  IconBuilding, 
  IconTrophy, 
  IconTarget, 
  IconShare,
  IconChartLine,
  IconPlayerPlay,
  IconSearch,
  IconBook,
  IconSparkles,
  IconArrowRight,
  IconCheck,
  IconFlagCheck,
  IconDeviceMobile,
  IconSword
} from '@tabler/icons-react';
import { Link } from '@/i18n/routing';
import { useRouter, useSearchParams } from 'next/navigation';
import howItWorksData from '@/data/how-it-works.json';
import ContentRenderer from '@/components/how-it-works/ContentRenderer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// Icon mapping
const iconMap: { [key: string]: any } = {
  IconUserPlus,
  IconBuilding,
  IconTrophy,
  IconTarget,
  IconShare,
  IconChartLine,
  IconPlayerPlay,
  IconFlagCheck,
  IconDeviceMobile,
  IconSword
};

// Modern color palette with gradients
const stepColors = [
  {
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10',
    icon: 'text-blue-400',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20'
  },
  {
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10',
    icon: 'text-emerald-400',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20'
  },
  {
    gradient: 'from-purple-500 to-pink-500',
    bg: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10',
    icon: 'text-purple-400',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/20'
  },
  {
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10',
    icon: 'text-amber-400',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20'
  },
  {
    gradient: 'from-cyan-500 to-blue-500',
    bg: 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10',
    icon: 'text-cyan-400',
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/20'
  },
  {
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-gradient-to-br from-pink-500/10 to-rose-500/10',
    icon: 'text-pink-400',
    border: 'border-pink-500/30',
    glow: 'shadow-pink-500/20'
  },
  {
    gradient: 'from-indigo-500 to-purple-500',
    bg: 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10',
    icon: 'text-indigo-400',
    border: 'border-indigo-500/30',
    glow: 'shadow-indigo-500/20'
  },
];

const HowItWorksContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');

  const [activeStep, setActiveStep] = useState<number | null>(
    stepParam !== null ? parseInt(stepParam) : null
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Update URL when step changes
  const handleStepChange = (step: number | null) => {
    setActiveStep(step);
    const params = new URLSearchParams(searchParams.toString());
    if (step !== null) {
      params.set('step', step.toString());
    } else {
      params.delete('step');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Sync state if URL changes (e.g. back button)
  useEffect(() => {
    const step = searchParams.get('step');
    if (step !== null) {
      setActiveStep(parseInt(step));
    } else {
      setActiveStep(null);
    }
  }, [searchParams]);

  const filteredSteps = howItWorksData.steps.filter(step =>
    step.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    step.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentColor = activeStep !== null ? stepColors[activeStep % stepColors.length] : stepColors[0];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-background via-muted/5 to-background">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="text-center space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <IconBook className="w-4 h-4" />
              <span>Útmutató és Dokumentáció</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                Hogyan Működik a
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                tDarts Platform?
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Teljes körű útmutató a regisztrációtól a versenyindításig. Minden, amit tudnod kell a tDarts használatához.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto pt-4">
              <div className="relative">
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Keress a témakörök között..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card/50 backdrop-blur-xl border border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none text-base"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
        {activeStep === null ? (
          /* Grid View - All Topics */
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Válassz témakört</h2>
                <p className="text-muted-foreground mt-1">
                  {filteredSteps.length} témakör érhető el
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredSteps.map((step) => {
                const Icon = iconMap[step.icon];
                const color = stepColors[step.id % stepColors.length];
                
                return (
                  <Card
                    key={step.id}
                    onClick={() => handleStepChange(step.id)}
                    className={cn(
                      "group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl border-2",
                      color.border,
                      color.glow,
                      "bg-card/50 backdrop-blur-xl overflow-hidden"
                    )}
                  >
                    <CardContent className="p-6 space-y-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                        color.bg
                      )}>
                        <Icon className={cn("w-7 h-7", color.icon)} />
                      </div>

                      {/* Content */}
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {step.description}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center text-sm font-medium text-primary">
                        <span>Részletek</span>
                        <IconArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredSteps.length === 0 && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <IconSearch className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nincs találat</h3>
                <p className="text-muted-foreground">
                  Próbálj meg más keresési kifejezést használni
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Detail View - Single Topic */
          <div className="space-y-6">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => handleStepChange(null)}
              className="gap-2 -ml-2"
            >
              <IconArrowRight className="w-4 h-4 rotate-180" />
              Vissza a témakörökh öz
            </Button>

            {/* Content Card */}
            <Card className={cn(
              "border-2 shadow-2xl",
              currentColor.border,
              currentColor.glow,
              "bg-card/50 backdrop-blur-xl"
            )}>
              <CardContent className="p-8 md:p-12 space-y-8">
                {/* Header */}
                <div className="flex items-start gap-6">
                  <div className={cn(
                    "w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shrink-0",
                    currentColor.bg
                  )}>
                    {React.createElement(iconMap[howItWorksData.steps[activeStep].icon], {
                      className: cn("w-8 h-8 md:w-10 md:h-10", currentColor.icon)
                    })}
                  </div>
                  <div className="space-y-3 flex-1">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                      {howItWorksData.steps[activeStep].title}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      {howItWorksData.steps[activeStep].description}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                {/* Content */}
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <ContentRenderer content={howItWorksData.steps[activeStep].content} />
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-8 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleStepChange(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                    className="gap-2"
                  >
                    <IconArrowRight className="w-4 h-4 rotate-180" />
                    Előző
                  </Button>

                  <div className="flex items-center gap-2">
                    {howItWorksData.steps.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handleStepChange(index)}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          activeStep === index 
                            ? "w-8 bg-primary" 
                            : "w-2 bg-muted hover:bg-muted-foreground/40"
                        )}
                        aria-label={`Ugrás a ${howItWorksData.steps[index].title} témához`}
                      />
                    ))}
                  </div>

                  <Button
                    size="lg"
                    onClick={() => handleStepChange(Math.min(howItWorksData.steps.length - 1, activeStep + 1))}
                    disabled={activeStep === howItWorksData.steps.length - 1}
                    className="gap-2"
                  >
                    Következő
                    <IconArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CTA Section */}
        <Card className="mt-12 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 shadow-xl">
          <CardContent className="p-8 md:p-12">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-2">
                <IconSparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl md:text-3xl font-bold">
                  {howItWorksData.cta.title}
                </h3>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {howItWorksData.cta.description}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                {howItWorksData.cta.buttons.map((button, index) => (
                  <Button
                    key={index}
                    variant={button.variant === 'primary' ? 'default' : 'outline'}
                    size="lg"
                    asChild
                    className="gap-2"
                  >
                    <Link href={button.href}>
                      <IconCheck className="w-4 h-4" />
                      {button.text}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const HowItWorksPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HowItWorksContent />
    </Suspense>
  );
};

export default HowItWorksPage;