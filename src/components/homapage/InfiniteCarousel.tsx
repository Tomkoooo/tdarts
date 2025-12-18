"use client"
import React, { useEffect, useState } from 'react';
import { IconTrophy, IconTarget, IconAward, IconStar, IconBolt, IconCrown } from '@tabler/icons-react';

const InfiniteCarousel = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const items = [
    { icon: IconTrophy, text: 'Világszínvonalú Versenykezelés' },
    { icon: IconTarget, text: 'Precíz Célkövetés' },
    { icon: IconAward, text: 'Professzionális Eredmények' },
    { icon: IconStar, text: 'Kiváló Felhasználói Élmény' },
    { icon: IconBolt, text: 'Villámgyors Feldolgozás' },
    { icon: IconCrown, text: 'Bajnoki Szintű Platform' },
  ];

  // Calculate scroll-based horizontal offset
  const horizontalOffset = scrollY * 0.5;

  return (
    <div className="py-16 overflow-hidden bg-muted/20 border-y border-border">
      <div className="flex">
        <div 
          className="flex transition-transform duration-100 ease-out"
          style={{
            transform: `translateX(${-horizontalOffset}px)`,
            animation: 'scrollHorizontal 30s linear infinite'
          }}
        >
          {[...items, ...items, ...items].map((item, index) => (
            <div 
              key={index}
              className="flex items-center gap-4 mx-8 whitespace-nowrap bg-card border border-border rounded-lg px-6 py-4 min-w-max shadow-sm"
            >
              <item.icon className="w-6 h-6 text-primary" />
              <span className="text-foreground font-medium">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Reverse direction carousel */}
      <div className="flex mt-8">
        <div 
          className="flex transition-transform duration-100 ease-out"
          style={{
            transform: `translateX(${horizontalOffset}px)`,
            animation: 'scrollHorizontal 25s linear infinite reverse'
          }}
        >
          {[...items.slice().reverse(), ...items.slice().reverse()].map((item, index) => (
            <div 
              key={`reverse-${index}`}
              className="flex items-center gap-4 mx-8 whitespace-nowrap bg-muted border border-border rounded-lg px-6 py-4 min-w-max opacity-80"
            >
              <item.icon className="w-5 h-5 text-secondary" />
              <span className="text-muted-foreground font-medium text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfiniteCarousel;
