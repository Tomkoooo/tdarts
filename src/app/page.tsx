"use client"
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ParallaxBackground from '@/components/homapage/ParallaxBackground';
import HeroSectionNew from '@/components/homapage/HeroSectionNew';
import InfiniteCarousel from '@/components/homapage/InfiniteCarousel';
import FeaturesSectionNew from '@/components/homapage/FeaturesSectionNew';
import PricingSection from '@/components/homapage/PricingSection';
import AnnouncementToast from '@/components/common/AnnouncementToast';

interface Announcement {
  _id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isActive: boolean;
  showButton: boolean;
  buttonText?: string;
  buttonAction?: string;
  duration: number;
  expiresAt: string;
}

const HomePage = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [closedAnnouncements, setClosedAnnouncements] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await axios.get('/api/announcements');
        if (response.data.success) {
          // Csak az aktív és nem lejárt announcement-okat jelenítjük meg
          const now = new Date();
          const activeAnnouncements = response.data.announcements.filter((announcement: Announcement) => {
            return announcement.isActive && new Date(announcement.expiresAt) > now;
          });
          setAnnouncements(activeAnnouncements);
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleCloseAnnouncement = (id: string) => {
    setClosedAnnouncements(prev => new Set([...prev, id]));
    // Távolítsuk el az announcement-ot a listából is
    setAnnouncements(prev => prev.filter(announcement => announcement._id !== id));
  };

  const activeAnnouncements = announcements.filter(
    announcement => !closedAnnouncements.has(announcement._id)
  );

  return (
    <div className="min-h-screen relative">
      {/* Parallax Background */}
      <ParallaxBackground />
      
      {/* Announcements - Lower z-index to be behind mobile menu */}
      <div 
        className="toast-container space-y-4"
        style={{
          position: 'fixed',
          inset: 'auto 16px 16px auto',
          zIndex: 40
        }}
      >
          {activeAnnouncements.map((announcement, index) => (
            <div 
              key={announcement._id} 
              style={{ 
                zIndex: 40 - index,
                animationDelay: `${index * 200}ms`
              }}
              className="animate-slideInFromLeft"
            >
              <AnnouncementToast
                announcement={announcement}
                onClose={handleCloseAnnouncement}
              />
            </div>
          ))}
        </div>
      
      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section */}
        <HeroSectionNew />
        
        {/* Infinite Carousel */}
        <InfiniteCarousel />
        
        {/* Features Section */}
        <FeaturesSectionNew />
        
        {/* Pricing Section */}
        <PricingSection />
        
        {/* Footer Spacer */}
        <div className="h-20" />
      </main>
    </div>
  );
};

export default HomePage;