"use client";
import AnnouncementManager from '@/components/admin/AnnouncementManager';

export default function AdminAnnouncementsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gradient-red mb-2">Announcement Kezelő</h1>
        <p className="text-base-content/60">Rendszerüzenetek létrehozása és kezelése</p>
      </div>

      {/* Announcement Manager Component */}
      <AnnouncementManager />
    </div>
  );
}
