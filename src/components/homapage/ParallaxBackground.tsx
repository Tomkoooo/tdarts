"use client"
import React, { useEffect, useState } from 'react';
import { IconTarget, IconBolt, IconTrophy, IconUsers, IconPlayerPlay, IconFlame, IconStar } from '@tabler/icons-react';
import IconDart from './icons/IconDart';

const ParallaxBackground = () => {
  const [scrollY, setScrollY] = useState(0);
  const backgroundBlobs = Array.from({ length: 12 }, (_, i) => ({
    left: `${(i * 17) % 100}%`,
    top: `${(i * 29) % 100}%`,
    width: `${50 + ((i * 23) % 100)}px`,
    height: `${50 + ((i * 31) % 100)}px`,
    animationDelay: `${(i % 6) * 0.8}s`,
    animationDuration: `${5 + (i % 5)}s`,
  }));

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
    <div className="fixed inset-0 overflow-hidden pointer-events-none bg-background">
      {/* Enhanced Animated Background Shapes */}
      <div className="absolute inset-0 opacity-20">
        {backgroundBlobs.map((blob, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/10 blur-xl animate-pulse"
            style={{
              left: blob.left,
              top: blob.top,
              width: blob.width,
              height: blob.height,
              animationDelay: blob.animationDelay,
              animationDuration: blob.animationDuration,
            }}
          />
        ))}
      </div>

      {/* Floating Icons */}
      <div className="absolute inset-0">
        {floatingIcons.map((item, index) => (
          <div
            key={index}
            className="absolute text-primary/10 transition-transform duration-1000 ease-in-out"
            style={{
              left: `${10 + (index * 12)}%`,
              top: `${20 + (index * 8)}%`,
              animation: `float ${item.delay + 5}s ease-in-out infinite alternate`,
            }}
          >
            <item.Icon size={item.size} />
          </div>
        ))}
      </div>

      {/* Dart Board Rings - Minimalist Representation */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 opacity-5">
        <div className="absolute inset-0 border-2 border-primary rounded-full" />
        <div className="absolute inset-[15%] border-2 border-primary rounded-full" />
        <div className="absolute inset-[30%] border-2 border-primary rounded-full" />
        <div className="absolute inset-[45%] border-2 border-primary rounded-full" />
      </div>

      {/* Parallax Icons with scroll-based movement */}
      <div 
        className="absolute top-20 left-10 text-primary/10"
        style={{ transform: `translateY(${scrollY * 0.2}px)` }}
      >
        <IconTarget size={40} />
      </div>
      
      <div 
        className="absolute top-40 right-20 text-accent/10"
        style={{ transform: `translateY(${scrollY * 0.3}px)` }}
      >
        <IconTrophy size={60} />
      </div>

      <div 
        className="absolute top-96 left-1/3 text-secondary/10"
        style={{ transform: `translateY(${scrollY * 0.15}px)` }}
      >
        <IconUsers size={35} />
      </div>

      <div 
        className="absolute bottom-40 right-10 text-primary/10"
        style={{ transform: `translateY(${scrollY * -0.2}px)` }}
      >
        <IconBolt size={45} />
      </div>
    </div>
  );
};

export default ParallaxBackground;
