"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { 
  IconUserPlus, 
  IconBuilding, 
  IconTrophy, 
  IconTarget, 
  IconLock,
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
import howItWorksHu from '@/data/how-it-works/hu.json';
import howItWorksEn from '@/data/how-it-works/en.json';
import howItWorksDe from '@/data/how-it-works/de.json';
import ContentRenderer from '@/components/how-it-works/ContentRenderer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';

// Icon mapping
const iconMap: { [key: string]: any } = {
  IconUserPlus,
  IconBuilding,
  IconTrophy,
  IconTarget,
  IconLock,
  IconShare,
  IconChartLine,
  IconPlayerPlay,
  IconFlagCheck,
  IconDeviceMobile,
  IconSword
};

const stepColors = [
  {
    gradient: 'from-primary to-accent',
    bg: 'bg-gradient-to-br from-primary/10 to-accent/10',
    icon: 'text-primary',
    border: 'border-primary/30',
    glow: 'shadow-glow-primary'
  },
  {
    gradient: 'from-accent to-primary',
    bg: 'bg-gradient-to-br from-accent/10 to-primary/10',
    icon: 'text-accent',
    border: 'border-accent/30',
    glow: 'shadow-glow-accent'
  },
  {
    gradient: 'from-primary to-primary/60',
    bg: 'bg-gradient-to-br from-primary/10 to-primary/5',
    icon: 'text-primary-light',
    border: 'border-primary/30',
    glow: 'shadow-glow-primary'
  },
  {
    gradient: 'from-accent to-primary',
    bg: 'bg-gradient-to-br from-accent/10 to-primary/10',
    icon: 'text-accent',
    border: 'border-accent/30',
    glow: 'shadow-glow-accent'
  },
  {
    gradient: 'from-primary to-accent',
    bg: 'bg-gradient-to-br from-primary/10 to-accent/10',
    icon: 'text-primary',
    border: 'border-primary/30',
    glow: 'shadow-glow-primary'
  },
  {
    gradient: 'from-accent to-primary',
    bg: 'bg-gradient-to-br from-accent/10 to-primary/10',
    icon: 'text-accent',
    border: 'border-accent/30',
    glow: 'shadow-glow-accent'
  },
  {
    gradient: 'from-primary to-accent',
    bg: 'bg-gradient-to-br from-primary/10 to-accent/10',
    icon: 'text-primary',
    border: 'border-primary/30',
    glow: 'shadow-glow-primary'
  },
];

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ');

const collectContentText = (node: any): string[] => {
  if (!node) return [];
  const collected: string[] = [];

  if (typeof node === 'string') {
    collected.push(stripHtml(node));
    return collected;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => {
      collected.push(...collectContentText(item));
    });
    return collected;
  }

  if (typeof node === 'object') {
    if (typeof node.title === 'string') {
      collected.push(stripHtml(node.title));
    }

    if (node.content !== undefined) {
      collected.push(...collectContentText(node.content));
    }

    if (Array.isArray(node.list)) {
      collected.push(...collectContentText(node.list));
    }

    if (node.note?.content) {
      collected.push(...collectContentText(node.note.content));
    }

    if (Array.isArray(node.sections)) {
      collected.push(...collectContentText(node.sections));
    }

    if (Array.isArray(node.subsections)) {
      collected.push(...collectContentText(node.subsections));
    }
  }

  return collected;
};

const HowItWorksContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');
  const t = useTranslations('HowItWorks');
  const locale = useLocale();

  const howItWorksData = useMemo(() => {
    if (locale === 'hu') return howItWorksHu;
    if (locale === 'de') return howItWorksDe;
    return howItWorksEn;
  }, [locale]);

  const [activeStep, setActiveStep] = useState<number | null>(
    stepParam !== null ? parseInt(stepParam) : null
  );
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    const step = searchParams.get('step');
    if (step !== null) {
      setActiveStep(parseInt(step));
    } else {
      setActiveStep(null);
    }
  }, [searchParams]);

  const searchableSteps = useMemo(() => {
    return howItWorksData.steps.map((step: any) => {
      const fullText = [
        step.title || '',
        step.description || '',
        ...collectContentText(step.content),
      ]
        .join(' ')
        .toLowerCase();

      return { step, fullText };
    });
  }, [howItWorksData.steps]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSteps = normalizedQuery
    ? searchableSteps
        .filter(({ fullText }) => fullText.includes(normalizedQuery))
        .map(({ step }) => step)
    : howItWorksData.steps;

  const currentColor = activeStep !== null ? stepColors[activeStep % stepColors.length] : stepColors[0];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-muted/20">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-background via-muted/5 to-background">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <IconBook className="w-4 h-4" />
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                {t('hero.title_part1')}
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                {t('hero.title_part2')}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('hero.subtitle')}
            </p>

            <div className="max-w-2xl mx-auto pt-4">
              <div className="relative">
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('hero.search_placeholder')}
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
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">{t('grid.title')}</h2>
                <p className="text-muted-foreground mt-1">
                  {t('grid.items_count', { count: filteredSteps.length })}
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredSteps.map((step: any) => {
                const Icon = iconMap[step.icon] || IconBook;
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
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                        color.bg
                      )}>
                        <Icon className={cn("w-7 h-7", color.icon)} />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {step.description}
                        </p>
                      </div>

                      <div className="flex items-center text-sm font-medium text-primary">
                        <span>{t('grid.details_btn')}</span>
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
                <h3 className="text-xl font-semibold mb-2">{t('grid.no_results')}</h3>
                <p className="text-muted-foreground">
                  {t('grid.no_results_desc')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => handleStepChange(null)}
              className="gap-2 -ml-2"
            >
              <IconArrowRight className="w-4 h-4 rotate-180" />
              {t('detail.back_btn')}
            </Button>

            <Card className={cn(
              "border-2 shadow-2xl",
              currentColor.border,
              currentColor.glow,
              "bg-card/50 backdrop-blur-xl"
            )}>
              <CardContent className="p-8 md:p-12 space-y-8">
                <div className="flex items-start gap-6">
                  <div className={cn(
                    "w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shrink-0",
                    currentColor.bg
                  )}>
                    {React.createElement(iconMap[howItWorksData.steps[activeStep].icon] || IconBook, {
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

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <ContentRenderer content={howItWorksData.steps[activeStep].content} />
                </div>

                <div className="flex items-center justify-between pt-8 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleStepChange(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                    className="gap-2"
                  >
                    <IconArrowRight className="w-4 h-4 rotate-180" />
                    {t('detail.prev_btn')}
                  </Button>

                  <div className="flex items-center gap-2">
                    {howItWorksData.steps.map((step: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => handleStepChange(index)}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          activeStep === index 
                            ? "w-8 bg-primary" 
                            : "w-2 bg-muted hover:bg-muted-foreground/40"
                        )}
                        aria-label={t('detail.aria_jump', { title: step.title })}
                      />
                    ))}
                  </div>

                  <Button
                    size="lg"
                    onClick={() => handleStepChange(Math.min(howItWorksData.steps.length - 1, activeStep + 1))}
                    disabled={activeStep === howItWorksData.steps.length - 1}
                    className="gap-2"
                  >
                    {t('detail.next_btn')}
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
                {howItWorksData.cta.buttons.map((button: any, index: number) => (
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
  const t = useTranslations('HowItWorks');
  
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">{t('loading')}</div>}>
      <HowItWorksContent />
    </Suspense>
  );
};

export default HowItWorksPage;