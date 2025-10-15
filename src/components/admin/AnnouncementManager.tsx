import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { IconPlus, IconEdit, IconTrash, IconEye, IconEyeOff, IconInfoCircle } from '@tabler/icons-react';

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
  createdAt: string;
  updatedAt: string;
}

interface AnnouncementFormData {
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  showButton: boolean;
  buttonText: string;
  buttonAction: string;
  duration: number;
  expiresAt: string;
}

const AnnouncementManager: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    description: '',
    type: 'info',
    showButton: false,
    buttonText: '',
    buttonAction: '',
    duration: 10000,
    expiresAt: ''
  });

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/announcements');
      if (response.data.success) {
        setAnnouncements(response.data.announcements);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        // Update existing announcement
        await axios.put(`/api/announcements/${editingId}`, formData);
      } else {
        // Create new announcement
        await axios.post('/api/announcements', formData);
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      description: announcement.description,
      type: announcement.type,
      showButton: announcement.showButton,
      buttonText: announcement.buttonText || '',
      buttonAction: announcement.buttonAction || '',
      duration: announcement.duration, // Ez milliszekundumban van, a form másodpercben jeleníti meg
      expiresAt: new Date(announcement.expiresAt).toISOString().slice(0, 16)
    });
    setEditingId(announcement._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt az announcement-ot?')) return;
    
    try {
      await axios.delete(`/api/announcements/${id}`);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await axios.post(`/api/announcements/${id}/toggle`);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error toggling announcement:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'info',
      showButton: false,
      buttonText: '',
      buttonAction: '',
      duration: 10000, // 10 másodperc
      expiresAt: ''
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      case 'error': return 'text-error';
      default: return 'text-info';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '';
      case 'warning': return '';
      case 'error': return '';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-base-content">Announcement Kezelő</h2>
          <p className="text-base-content/60">Rendszerüzenetek kezelése</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            resetForm();
          }}
          className="admin-btn-primary w-full lg:w-auto"
        >
          <IconPlus className="w-4 h-4" />
          Új Announcement
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="admin-glass-card">
          <h3 className="text-lg font-semibold mb-6">
            {editingId ? 'Announcement Szerkesztése' : 'Új Announcement'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title and Type */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Cím *</span>
                </label>
                <input
                  type="text"
                  className="admin-input w-full"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  maxLength={100}
                  placeholder="Announcement címe..."
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Típus</span>
                </label>
                <select
                  className="admin-select w-full"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="info">Információ</option>
                  <option value="success">Siker</option>
                  <option value="warning">Figyelmeztetés</option>
                  <option value="error">Hiba</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Leírás *</span>
              </label>
              <textarea
                className="admin-input w-full"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                maxLength={500}
                placeholder="Announcement leírása..."
              />
            </div>

            {/* Duration, Expiration and Button Toggle */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Időtartam (másodperc)</span>
                </label>
                <input
                  type="number"
                  className="admin-input w-full"
                  value={Math.round(formData.duration / 1000)}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) * 1000 })}
                  min={3}
                  max={60}
                  step={1}
                  placeholder="10"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Lejárat *</span>
                </label>
                <input
                  type="datetime-local"
                  className="admin-input w-full"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                    checked={formData.showButton}
                    onChange={(e) => setFormData({ ...formData, showButton: e.target.checked })}
                  />
                  <span className="label-text font-medium">Gomb megjelenítése</span>
                </label>
              </div>
            </div>

            {/* Button Configuration */}
            {formData.showButton && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Gomb szövege</span>
                  </label>
                  <input
                    type="text"
                    className="admin-input w-full"
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    maxLength={50}
                    placeholder="Kattints ide..."
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Gomb akció (URL)</span>
                  </label>
                  <input
                    type="text"
                    className="admin-input w-full"
                    value={formData.buttonAction}
                    onChange={(e) => setFormData({ ...formData, buttonAction: e.target.value })}
                    placeholder="/search vagy https://..."
                    maxLength={200}
                  />
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-base-300">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="admin-btn-secondary w-full sm:w-auto"
              >
                Mégse
              </button>
              <button type="submit" className="admin-btn-primary w-full sm:w-auto">
                {editingId ? 'Frissítés' : 'Létrehozás'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="admin-glass-card text-center py-8">
            <IconInfoCircle className="w-12 h-12 text-base-content/40 mx-auto mb-4" />
            <p className="text-base-content/60">Nincsenek announcement-ok</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement._id} className="admin-glass-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getTypeIcon(announcement.type)}</span>
                    <h3 className={`font-semibold ${getTypeColor(announcement.type)}`}>
                      {announcement.title}
                    </h3>
                    <span className={`badge ${announcement.isActive ? 'badge-success' : 'badge-neutral'}`}>
                      {announcement.isActive ? 'Aktív' : 'Inaktív'}
                    </span>
                  </div>
                  
                  <p className="text-base-content/80 mb-3">{announcement.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-base-content/60">
                    <span>Időtartam: {announcement.duration / 1000}s</span>
                    <span>Lejárat: {new Date(announcement.expiresAt).toLocaleString('hu-HU')}</span>
                    {announcement.showButton && (
                      <span>Gomb: {announcement.buttonText}</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 ml-4">
                  <button
                    onClick={() => handleToggle(announcement._id)}
                    className="btn btn-sm btn-ghost w-full sm:w-auto"
                    title={announcement.isActive ? 'Deaktiválás' : 'Aktiválás'}
                  >
                    {announcement.isActive ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                  
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="btn btn-sm btn-ghost w-full sm:w-auto"
                    title="Szerkesztés"
                  >
                    <IconEdit className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(announcement._id)}
                    className="btn btn-sm btn-ghost text-error hover:text-error w-full sm:w-auto"
                    title="Törlés"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnouncementManager;
