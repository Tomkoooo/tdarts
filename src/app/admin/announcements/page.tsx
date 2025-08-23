"use client";
import AnnouncementManager from '@/components/admin/AnnouncementManager';
import DailyChart from '@/components/admin/DailyChart';

export default function AdminAnnouncementsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gradient-red mb-2">Announcement Kezelő</h1>
        <p className="text-base-content/60">Rendszerüzenetek létrehozása és kezelése</p>
      </div>

      {/* Daily Chart */}
      <DailyChart
        title="Közlemények napi létrehozása"
        apiEndpoint="/api/admin/announcements/daily"
        color="warning"
        icon="📢"
      />

      {/* Announcement Manager Component */}
      <AnnouncementManager />
    </div>
  );
}
