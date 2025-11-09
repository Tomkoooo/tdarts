import React from 'react';
import { Target, Play, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Main Content */}
      <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
        {/* Hero Badge */}
        <GlassCard className="inline-flex items-center gap-2 px-6 py-3 mb-8 text-sm font-medium border-primary/20">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">Professzionális Darts Tournament Platform</span>
        </GlassCard>

        {/* Main Heading */}
        <h1 className="text-6xl md:text-8xl font-bold mb-6 text-glow">
          <span className="text-gradient-red">T</span>
          <span className="text-white">DARTS</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
          A következő generációs darts verseny platform. Versenykeresés, 
          klub létrehozás, valós idejű eredmények és teljes testreszabhatóság.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Button asChild size="lg" className="gap-3">
            <Link href="/search">
              <Play className="w-5 h-5" />
              Kezdés Most
            </Link>
          </Button>

          <Button asChild variant="outline" size="lg" className="gap-3">
            <Link href="/myclub">
              <Trophy className="w-5 h-5" />
              Verseny Létrehozása
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[
            { number: '20', label: 'Aktív Klub' },
            { number: '40', label: 'Verseny Havonta' },
            { number: '24/7', label: 'Valós Idejű Követés' }
          ].map((stat, index) => (
            <GlassCard key={index} className="p-6 hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-bold text-primary mb-2">{stat.number}</div>
              <div className="text-muted-foreground">{stat.label}</div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/2 left-10 w-32 h-32 bg-red-500/10 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-24 h-24 bg-red-600/10 rounded-full blur-lg animate-pulse" 
           style={{ animationDelay: '2s' }} />
    </section>
  );
};

export default HeroSection;
