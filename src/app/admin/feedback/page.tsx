"use client";
import FeedbackManager from '@/components/admin/FeedbackManager';
import DailyChart from '@/components/admin/DailyChart';

export default function AdminFeedbackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient-red mb-2">Hibabejelentések Kezelése</h1>
        <p className="text-base-content/60">Felhasználói visszajelzések és javaslatok kezelése</p>
      </div>
      
      <DailyChart 
        title="Visszajelzések napi beérkezése" 
        apiEndpoint="/api/admin/charts/feedback/daily" 
        color="warning" 
        icon="" 
      />
      
      <FeedbackManager />
    </div>
  );
}
