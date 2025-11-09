import React from 'react';
import { IconTarget, IconPlayerPlay, IconTrophy, IconSparkles, IconArrowRight, IconCheck } from '@tabler/icons-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const HeroSectionNew = () => {
  const stats = [
    { number: '20+', label: 'Aktív Klub', sublabel: 'országszerte' },
    { number: '40+', label: 'Verseny', sublabel: 'havonta' },
    { number: '24/7', label: 'Valós Idejű', sublabel: 'követés' }
  ];

  const features = [
    'Verseny szervezés percek alatt',
    'Valós idejű eredmények',
    'Automatikus párosítás',
    'Részletes statisztikák'
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-20">
      {/* Animated Background Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse" 
             style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl animate-pulse" 
             style={{ animationDelay: '1s' }} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-8">
          {/* Badge */}
          <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Badge 
              variant="secondary" 
              className="px-4 py-2 gap-2 text-sm font-medium border border-primary/20 bg-card/50 backdrop-blur-sm"
            >
              <IconSparkles className="w-4 h-4 text-primary" />
              Professzionális Darts Tournament Platform
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '100ms' }}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent inline-block animate-gradient">
                TDARTS
              </span>
            </h1>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <IconTarget className="w-8 h-8 text-primary animate-pulse" />
              <Separator orientation="vertical" className="h-8" />
              <span className="text-2xl sm:text-3xl font-semibold text-foreground">
                Verseny Platform
              </span>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '200ms' }}>
            A következő generációs <span className="text-primary font-semibold">darts verseny platform</span>. 
            Versenykeresés, klub létrehozás, valós idejű eredmények és teljes testreszabhatóság.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '300ms' }}>
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm"
              >
                <IconCheck className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '400ms' }}>
            <Button size="xl" className="gap-2 group" asChild>
              <Link href="/search">
                <IconPlayerPlay className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Kezdés Most
                <IconArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            
            <Button size="xl" variant="outline" className="gap-2 group" asChild>
              <Link href="/myclub">
                <IconTrophy className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Verseny Létrehozása
              </Link>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '500ms' }}>
            {stats.map((stat, index) => (
              <Card 
                key={index} 
                className={cn(
                  "group hover:shadow-[0_8px_32px_0_oklch(51%_0.18_16_/_0.18)] transition-all duration-300 hover:-translate-y-1",
                  "border-primary/20 bg-card/50 backdrop-blur-sm"
                )}
              >
                <CardContent className="p-6 text-center space-y-2">
                  <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {stat.number}
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-semibold text-foreground">
                      {stat.label}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.sublabel}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm text-muted-foreground animate-in fade-in duration-700" style={{ animationDelay: '600ms' }}>
            <div className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-success" />
              <span>Ingyenes regisztráció</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-success" />
              <span>Nincs rejtett költség</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <IconCheck className="w-4 h-4 text-success" />
              <span>24/7 támogatás</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary/30 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default HeroSectionNew;

