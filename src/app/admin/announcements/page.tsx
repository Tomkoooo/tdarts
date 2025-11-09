"use client";
import AnnouncementManager from '@/components/admin/AnnouncementManager';
import { IconSpeakerphone } from '@tabler/icons-react';

export default function AdminAnnouncementsPage() {
  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border  p-8">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        
        <div className="relative z-10 space-y-2">
          <h1 className="text-4xl lg:text-5xl font-bold text-base-content flex items-center gap-3">
            <IconSpeakerphone className="w-10 h-10 text-primary" />
            Announcement Kezelő
          </h1>
          <p className="text-base-content/70 text-lg">Rendszerüzenetek létrehozása és kezelése</p>
        </div>
      </div>

      {/* Announcement Manager Component */}
      <AnnouncementManager />
    </div>
  );
}
