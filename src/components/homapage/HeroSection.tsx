import React from 'react';
import { IconTarget, IconPlayerPlay, IconTrophy } from '@tabler/icons-react';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Main Content */}
      <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
        {/* Hero Badge */}
        <div className="glass-card inline-flex items-center gap-2 px-6 py-3 mb-8 text-sm font-medium">
          <IconTarget className="w-4 h-4 text-red-400" />
          <span className="text-gray-300">Professzionális Darts Tournament Platform</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-6xl md:text-8xl font-bold mb-6 text-glow">
          <span className="text-gradient-red">T</span>
          <span className="text-white">DARTS</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
          A következő generációs darts verseny platform. Versenykeresés, 
          klub létrehozás, valós idejű eredmények és teljes customizálhatóság.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <button className="glass-button push-button group flex items-center gap-3">
            <IconPlayerPlay className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span>Kezdés Most</span>
          </button>
          
          <button className="tournament-create-button push-button px-8 py-4 rounded-xl font-semibold text-white hover:text-red-400 transition-colors">
            <IconTrophy className="w-5 h-5 inline mr-2" />
            Verseny Létrehozása
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[
            { number: '500+', label: 'Aktív Klub' },
            { number: '1000+', label: 'Verseny Havonta' },
            { number: '24/7', label: 'Valós Idejű Követés' }
          ].map((stat, index) => (
            <div key={index} className="glass-card p-6 hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-bold text-gradient-red mb-2">{stat.number}</div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
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
