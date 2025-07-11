
import React from 'react';
import ParallaxBackground from '@/components/homapage/ParallaxBackground';
import Navbar from '@/components/homapage/Navbar';
import HeroSection from '@/components/homapage/HeroSection';
import InfiniteCarousel from '@/components/homapage/InfiniteCarousel';
import FeaturesSection from '@/components/homapage/FeaturesSection';


const HomePage = () => {
  return (
    <div className="min-h-screen relative">
      {/* Parallax Background */}
      <ParallaxBackground />
      
      {/* Navigation */}
      <Navbar />
      
      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <HeroSection />
        
        {/* Infinite Carousel */}
        <InfiniteCarousel />
        
        {/* Features Section */}
        <FeaturesSection />
        
        {/* Footer Spacer */}
        <div className="h-20" />
      </main>
    </div>
  );
};

export default HomePage;