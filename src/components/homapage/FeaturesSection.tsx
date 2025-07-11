
import React from 'react';
import { IconSearch, IconBolt, IconTrophy, IconUsers, IconChartBar, IconSettings } from '@tabler/icons-react';

const FeaturesSection = () => {
  const features = [
    {
      icon: IconSearch,
      title: 'Verseny Keresés',
      description: 'Könnyedén találj versenyt lokáció, szint és időpont alapján.',
      gradient: 'from-red-500 to-orange-500'
    },
    {
      icon: IconTrophy,
      title: 'Verseny Kiírás',
      description: 'Hozz létre saját versenyeket egyedi szabályokkal és formátumokkal.',
      gradient: 'from-red-600 to-pink-600'
    },
    {
      icon: IconUsers,
      title: 'Klub Kezelés',
      description: 'Alapíts vagy csatlakozz darts klubokhoz, szervezz közösségi eseményeket.',
      gradient: 'from-red-700 to-red-500'
    },
    {
      icon: IconChartBar,
      title: 'Valós Idejű Eredmények',
      description: 'Kövesd élőben a meccseket és eredményeket minden versenyen.',
      gradient: 'from-red-500 to-red-700'
    },
    {
      icon: IconBolt,
      title: 'Azonnali Frissítések',
      description: 'Pillanatnyi értesítések minden fontos eseményről és eredményről.',
      gradient: 'from-orange-500 to-red-500'
    },
    {
      icon: IconSettings,
      title: 'Teljes Customizálás',
      description: 'Minden versenyforma támogatva: 501, 301, Cricket és egyedi szabályok.',
      gradient: 'from-red-600 to-red-800'
    }
  ];

  return (
    <section className="py-32 px-6 relative">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold text-gradient-red mb-6">
            Miért tDarts?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            A legmodernebb darts verseny platform minden funkcióval amit csak elképzelhetsz
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="depth-card group hover:scale-105 transition-all duration-500"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-red-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Effect Overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500/5 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <button className="glass-button push-button text-lg px-12 py-5">
            Minden Funkció Megtekintése
          </button>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
