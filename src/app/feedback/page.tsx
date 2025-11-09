"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserContext } from '@/hooks/useUser';
import axios from 'axios';
import toast from 'react-hot-toast';
import { IconBug, IconBulb, IconSettingsCode, IconSend, IconCheck } from '@tabler/icons-react';

export default function FeedbackPage() {
  const { user } = useUserContext();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: 'bug' as 'bug' | 'feature' | 'improvement' | 'other',
    title: '',
    description: '',
    email: user?.email || '',
    page: '',
    device: 'desktop' as 'desktop' | 'mobile' | 'tablet'
  });

  useEffect(() => {
    // Ha nincs bejelentkezve, átirányítjuk a login oldalra
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent('/feedback')}`);
      return;
    }

    // Automatikus device felismerés
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(navigator.userAgent);
    
    let detectedDevice: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (isTablet) detectedDevice = 'tablet';
    else if (isMobile) detectedDevice = 'mobile';

    setFormData(prev => ({
      ...prev,
      device: detectedDevice,
      page: window.location.pathname
    }));
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.email.trim()) {
      toast.error('Kérjük, töltse ki az összes kötelező mezőt!');
      return;
    }

    setLoading(true);
    
    try {
    await axios.post('/api/feedback', {
        ...formData,
        userId: user?._id
      });

      toast.success('Hibabejelentés sikeresen elküldve!');
      
      // Form reset
      setFormData({
        category: 'bug',
        title: '',
        description: '',
        email: user?.email || '',
        page: '',
        device: formData.device
      });

    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error(error.response?.data?.error || 'Hiba történt a küldés során');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!user) {
    return null; // Redirect kezelése
  }

  return (
    <div className="min-h-screen bg-base-100 pt-24">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gradient-red mb-4">Hibabejelentés & Ötlet</h1>
            <p className="text-lg text-base-content/70">
              Segítsd fejleszteni a tDarts szolgáltatást! Jelents hibát, javasolj új funkciókat, vagy írd le az észrevételeidet.
            </p>
          </div>

          {/* Form */}
          <div className="admin-glass-card">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Kategória */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Kategória *</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'bug', label: 'Hiba', icon: IconBug, color: 'text-error' },
                    { value: 'feature', label: 'Új funkció', icon: IconBulb, color: 'text-warning' },
                    { value: 'improvement', label: 'Fejlesztés', icon: IconSettingsCode, color: 'text-info' },
                    { value: 'other', label: 'Egyéb', icon: IconCheck, color: 'text-success' }
                  ].map(({ value, label, icon: Icon, color }) => (
                    <label key={value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value={value}
                        checked={formData.category === value}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="sr-only"
                      />
                      <div
                        className={`p-4 rounded-lg transition-all duration-200 text-center ${
                          formData.category === value
                            ? 'bg-primary/15 text-primary'
                            : 'bg-muted/30 text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Cím */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Cím *</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="admin-input w-full"
                  placeholder="Rövid, leíró cím..."
                  maxLength={200}
                  required
                />
                <div className="label">
                  <span className="label-text-alt text-base-content/60">
                    {formData.title.length}/200
                  </span>
                </div>
              </div>

              {/* Leírás */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Részletes leírás *</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="admin-input w-full h-32 resize-none"
                  placeholder="Írja le részletesen a problémát, ötletet vagy észrevételt..."
                  maxLength={2000}
                  required
                />
                <div className="label">
                  <span className="label-text-alt text-base-content/60">
                    {formData.description.length}/2000
                  </span>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="label">
                  <span className="label-text font-medium">Email cím *</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="admin-input w-full"
                  placeholder="email@pelda.hu"
                  required
                />
                <div className="label">
                  <span className="label-text-alt text-base-content/60">
                    Erre az email címre küldjük el a visszajelzést
                  </span>
                </div>
              </div>

              {/* Opcionális mezők */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Oldal */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Melyik oldalon?</span>
                  </label>
                  <input
                    type="text"
                    value={formData.page}
                    onChange={(e) => handleInputChange('page', e.target.value)}
                    className="admin-input w-full"
                    placeholder="pl. /clubs/123"
                  />
                </div>

                {/* Eszköz */}
                <div>
                  <label className="label">
                    <span className="label-text font-medium">Eszköz típusa</span>
                  </label>
                  <select
                    value={formData.device}
                    onChange={(e) => handleInputChange('device', e.target.value)}
                    className="admin-select w-full"
                  >
                    <option value="desktop">Asztali számítógép</option>
                    <option value="tablet">Tablet</option>
                    <option value="mobile">Mobil telefon</option>
                  </select>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="admin-btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="loading loading-spinner loading-sm"></div>
                      Küldés...
                    </>
                  ) : (
                    <>
                      <IconSend className="w-5 h-5" />
                      Hibabejelentés küldése
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Információk */}
          <div className="mt-8 text-center text-sm text-base-content/60">
            <p>Hibabejelentését megkaptuk és hamarosan foglalkozunk vele.</p>
            <p className="mt-2">
              Visszaigazoló emailt kap a megadott címre, és értesítjük, ha változás történik.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
