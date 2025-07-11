"use client"
import React, { useEffect, useState } from 'react';
import { IconTarget, IconBolt, IconTrophy, IconUsers, IconPlayerPlay, IconFlame, IconStar } from '@tabler/icons-react';
import IconDart from './icons/IconDart';

const ParallaxBackground = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const floatingIcons = [
    { Icon: IconTarget, size: 40, delay: 0 },
    { Icon: IconTrophy, size: 35, delay: 1 },
    { Icon: IconDart, size: 30, delay: 2 },
    { Icon: IconBolt, size: 45, delay: 3 },
    { Icon: IconUsers, size: 38, delay: 4 },
    { Icon: IconPlayerPlay, size: 32, delay: 5 },
    { Icon: IconFlame, size: 36, delay: 6 },
    { Icon: IconStar, size: 28, delay: 7 },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Enhanced Animated Background Shapes */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="floating-shape"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
            }}
          >
            <div className="w-4 h-4 bg-red-500/20 rounded-full blur-sm" />
          </div>
        ))}
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0">
        {floatingIcons.map((item, index) => (
          <div
            key={index}
            className="floating-icon text-red-500/30"
            style={{
              left: `${10 + (index * 12)}%`,
              top: `${20 + (index * 8)}%`,
              animationDelay: `${item.delay}s`,
            }}
          >
            <item.Icon size={item.size} />
          </div>
        ))}
      </div>

      {/* Additional floating icons scattered */}
      <div className="absolute inset-0">
        {floatingIcons.slice(0, 4).map((item, index) => (
          <div
            key={`scattered-${index}`}
            className="floating-icon text-red-500/20"
            style={{
              right: `${15 + (index * 15)}%`,
              bottom: `${25 + (index * 10)}%`,
              animationDelay: `${item.delay + 3}s`,
              animationDuration: '7s'
            }}
          >
            <item.Icon size={item.size - 10} />
          </div>
        ))}
      </div>

      {/* Dart Board Rings */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96">
        <div className="dart-ring w-full h-full" />
        <div className="dart-ring w-3/4 h-3/4 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="dart-ring w-1/2 h-1/2 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Parallax Icons with scroll-based movement */}
      <div 
        className="absolute top-20 left-10 text-red-500/30"
        style={{ transform: `translateY(${scrollY * 0.2}px)` }}
      >
        <IconTarget size={40} />
      </div>
      
      <div 
        className="absolute top-40 right-20 text-red-500/20"
        style={{ transform: `translateY(${scrollY * 0.3}px)` }}
      >
        <IconTrophy size={60} />
      </div>

      <div 
        className="absolute top-96 left-1/3 text-red-500/25"
        style={{ transform: `translateY(${scrollY * 0.15}px)` }}
      >
        <IconUsers size={35} />
      </div>

      <div 
        className="absolute bottom-40 right-10 text-red-500/30"
        style={{ transform: `translateY(${scrollY * -0.2}px)` }}
      >
        <IconBolt size={45} />
      </div>

      {/* Scroll-responsive horizontal elements */}
      <div 
        className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-red-500/20 to-transparent"
        style={{
          transform: `translateX(${-scrollY * 0.5}px)`,
        }}
      />
      <div 
        className="absolute top-20 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/10 to-transparent"
        style={{
          transform: `translateX(${scrollY * 0.3}px)`,
        }}
      />
    </div>
  );
};

export default ParallaxBackground;
