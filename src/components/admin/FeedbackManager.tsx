"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  IconBug, 
  IconBulb, 
  IconSettingsCode, 
  IconCheck, 
  IconEdit, 
  IconTrash,
  IconSearch, 
  IconRefresh, 
  IconMail, 
  IconCalendar,
  IconX,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconBrowser,
  IconUser,
  IconClock,
  IconCircleCheck,
  IconProgress,
  IconCircleX,
} from '@tabler/icons-react';

interface Feedback {
  _id: string;
  category: 'bug' | 'feature' | 'improvement' | 'other';
  title: string;
  description: string;
  email: string;
  page?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'resolved' | 'rejected' | 'closed';
  assignedTo?: { _id: string; name: string; username: string };
  adminNotes?: string;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: { _id: string; name: string; username: string };
  userId?: { _id: string; name: string; username: string };
  createdAt: Date;
  updatedAt: Date;
}

interface FeedbackStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  closed: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

export default function FeedbackManager() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
    search: ''
  });
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const [feedbackResponse, statsResponse] = await Promise.all([
        axios.get('/api/admin/feedback', { params: filters }),
        axios.get('/api/admin/feedback/stats')
      ]);
      
      setFeedback(feedbackResponse.data.feedback);
      setStats(statsResponse.data.stats);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Hiba történt az adatok betöltése során');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [filters]);

  const handleUpdateFeedback = async (feedbackId: string, updates: any) => {
    try {
      const response = await axios.put(`/api/admin/feedback/${feedbackId}`, updates);
      const updatedFeedback = response.data.feedback;
      
      setFeedback(prev => prev.map(f => 
        f._id === feedbackId ? updatedFeedback : f
      ));
      
      toast.success('Hibabejelentés frissítve');
      setEditingFeedback(null);
      fetchFeedback();
    } catch (error: any) {
      console.error('Error updating feedback:', error);
      toast.error(error.response?.data?.error || 'Hiba történt a frissítés során');
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!window.confirm('Biztosan törli ezt a hibabejelentést?')) return;
    
    try {
      await axios.delete(`/api/admin/feedback/${feedbackId}`);
      setFeedback(prev => prev.filter(f => f._id !== feedbackId));
      toast.success('Hibabejelentés törölve');
      fetchFeedback();
    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      toast.error(error.response?.data?.error || 'Hiba történt a törlés során');
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'bug': 
        return { 
          icon: IconBug, 
          label: 'Hiba', 
          color: 'bg-destructive/15 text-destructive',
          emoji: '🐛',
        };
      case 'feature': 
        return { 
          icon: IconBulb, 
          label: 'Új funkció', 
          color: 'bg-amber-200/20 text-amber-200',
          emoji: '💡',
        };
      case 'improvement': 
        return { 
          icon: IconSettingsCode, 
          label: 'Fejlesztés', 
          color: 'bg-sky-200/20 text-sky-200',
          emoji: '🔧',
        };
      default: 
        return { 
          icon: IconCheck, 
          label: 'Egyéb', 
          color: 'bg-emerald-200/20 text-emerald-200',
          emoji: '✨',
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'critical': return { color: 'bg-error text-error-content', label: 'Kritikus' };
      case 'high': return { color: 'bg-warning text-warning-content', label: 'Magas' };
      case 'medium': return { color: 'bg-info text-info-content', label: 'Közepes' };
      case 'low': return { color: 'bg-success text-success-content', label: 'Alacsony' };
      default: return { color: 'bg-base-300 text-base-content', label: 'Nincs' };
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: IconClock, color: 'bg-amber-200/25 text-amber-200', label: 'Függőben' };
      case 'in-progress':
        return { icon: IconProgress, color: 'bg-sky-200/25 text-sky-200', label: 'Folyamatban' };
      case 'resolved':
        return { icon: IconCircleCheck, color: 'bg-emerald-200/25 text-emerald-200', label: 'Megoldva' };
      case 'rejected':
        return { icon: IconCircleX, color: 'bg-rose-200/25 text-rose-200', label: 'Elutasítva' };
      case 'closed':
        return { icon: IconCheck, color: 'bg-muted/40 text-muted-foreground', label: 'Lezárva' };
      default:
        return { icon: IconClock, color: 'bg-muted/40 text-muted-foreground', label: 'Ismeretlen' };
    }
  };

  const getDeviceIcon = (device?: string) => {
    switch (device) {
      case 'desktop': return IconDeviceDesktop;
      case 'mobile': return IconDeviceMobile;
      case 'tablet': return IconDeviceTablet;
      default: return IconDeviceDesktop;
    }
  };

  const filteredByCategory = selectedCategory 
    ? feedback.filter(f => f.category === selectedCategory)
    : feedback;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16   rounded-full"></div>
            <div className="w-16 h-16    rounded-full animate-spin absolute top-0"></div>
          </div>
          <p className="text-base-content/60">Visszajelzések betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 border  rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">{stats.total}</div>
            <div className="text-sm text-base-content/70 font-medium">Összes</div>
          </div>
          <div className="bg-gradient-to-br from-warning/20 to-warning/5 border  rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-warning mb-2">{stats.pending}</div>
            <div className="text-sm text-base-content/70 font-medium">Függőben</div>
          </div>
          <div className="bg-gradient-to-br from-info/20 to-info/5 border  rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-info mb-2">{stats.inProgress}</div>
            <div className="text-sm text-base-content/70 font-medium">Folyamatban</div>
          </div>
          <div className="bg-gradient-to-br from-success/20 to-success/5 border  rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-success mb-2">{stats.resolved}</div>
            <div className="text-sm text-base-content/70 font-medium">Megoldva</div>
          </div>
          <div className="bg-gradient-to-br from-error/20 to-error/5 border  rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-error mb-2">{stats.rejected}</div>
            <div className="text-sm text-base-content/70 font-medium">Elutasítva</div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="bg-base-100 border  rounded-xl p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`btn btn-sm gap-2 ${!selectedCategory ? 'btn-primary' : 'btn-ghost'}`}
          >
            Összes ({feedback.length})
          </button>
          {['bug', 'feature', 'improvement', 'other'].map(category => {
            const config = getCategoryConfig(category);
            const count = feedback.filter(f => f.category === category).length;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`btn btn-sm gap-2 ${selectedCategory === category ? 'btn-primary' : 'btn-ghost'}`}
              >
                <span>{config.emoji}</span>
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-base-100 border  rounded-xl p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              className="select select-bordered select-sm w-full"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">Összes státusz</option>
              <option value="pending">Függőben</option>
              <option value="in-progress">Folyamatban</option>
              <option value="resolved">Megoldva</option>
              <option value="rejected">Elutasítva</option>
              <option value="closed">Lezárva</option>
            </select>
            
            <select
              className="select select-bordered select-sm w-full"
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            >
              <option value="">Összes prioritás</option>
              <option value="critical">Kritikus</option>
              <option value="high">Magas</option>
              <option value="medium">Közepes</option>
              <option value="low">Alacsony</option>
            </select>

            <div className="relative">
              <input
                type="text"
                placeholder="Keresés..."
                className="input input-bordered input-sm w-full pl-10"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
            </div>
          </div>
          
          <button
            onClick={fetchFeedback}
            className="btn btn-primary btn-sm gap-2 whitespace-nowrap"
          >
            <IconRefresh size={18} />
            Frissítés
          </button>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredByCategory.length === 0 ? (
          <div className="bg-base-100 border  rounded-xl p-12 text-center">
            <IconBug size={64} className="mx-auto mb-4 text-base-content/20" />
            <p className="text-lg text-base-content/60">Nincsenek visszajelzések</p>
          </div>
        ) : (
          filteredByCategory.map((item) => {
            const categoryConfig = getCategoryConfig(item.category);
            const priorityConfig = getPriorityConfig(item.priority);
            const statusConfig = getStatusConfig(item.status);
            const DeviceIcon = getDeviceIcon(item.device);

            return (
              <div key={item._id} className="bg-base-100 border  rounded-xl p-6 hover:shadow-xl transition-all duration-300 group">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${categoryConfig.color} border flex-shrink-0`}>
                        <categoryConfig.icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg text-base-content mb-1 break-words">{item.title}</h4>
                        <div className="flex flex-wrap gap-2">
                          <span className={`${priorityConfig.color} px-2 py-1 rounded-lg text-xs font-bold`}>
                            {priorityConfig.label}
                          </span>
                          <span className={`${statusConfig.color} border px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1`}>
                            <statusConfig.icon size={14} />
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditingFeedback(item)}
                      className="btn btn-sm btn-primary gap-2"
                    >
                      <IconEdit size={16} />
                      Szerkesztés
                    </button>
                    <button
                      onClick={() => handleDeleteFeedback(item._id)}
                      className="btn btn-sm btn-error gap-2"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-base-content/70 mb-4 leading-relaxed">{item.description}</p>
                
                {/* Meta Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-base-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <IconMail size={16} className="text-primary flex-shrink-0" />
                    <span className="truncate">{item.email}</span>
                  </div>
                  {item.page && (
                    <div className="flex items-center gap-2 text-sm">
                      <IconBrowser size={16} className="text-info flex-shrink-0" />
                      <span className="truncate">{item.page}</span>
                    </div>
                  )}
                  {item.device && (
                    <div className="flex items-center gap-2 text-sm">
                      <DeviceIcon size={16} className="text-success flex-shrink-0" />
                      <span>{item.device}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <IconCalendar size={16} className="text-warning flex-shrink-0" />
                    <span>{new Date(item.createdAt).toLocaleDateString('hu-HU')}</span>
                  </div>
                </div>
                
                {/* Admin Notes */}
                {item.adminNotes && (
                  <div className="mt-4 p-4 bg-info/10 border  rounded-lg">
                    <p className="text-sm font-bold text-info mb-2 flex items-center gap-2">
                      <IconUser size={16} />
                      Admin megjegyzés:
                    </p>
                    <p className="text-sm text-base-content/80">{item.adminNotes}</p>
                  </div>
                )}
                
                {/* Resolution */}
                {item.resolution && (
                  <div className="mt-4 p-4 bg-success/10 border  rounded-lg">
                    <p className="text-sm font-bold text-success mb-2 flex items-center gap-2">
                      <IconCircleCheck size={16} />
                      Megoldás:
                    </p>
                    <p className="text-sm text-base-content/80">{item.resolution}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editingFeedback && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-base-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-base-100   p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Hibabejelentés szerkesztése</h3>
              <button
                onClick={() => setEditingFeedback(null)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <IconX size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Státusz</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={editingFeedback.status}
                    onChange={(e) => setEditingFeedback(prev => 
                      prev ? { ...prev, status: e.target.value as any } : null
                    )}
                  >
                    <option value="pending">Függőben</option>
                    <option value="in-progress">Folyamatban</option>
                    <option value="resolved">Megoldva</option>
                    <option value="rejected">Elutasítva</option>
                    <option value="closed">Lezárva</option>
                  </select>
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Prioritás</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={editingFeedback.priority}
                    onChange={(e) => setEditingFeedback(prev => 
                      prev ? { ...prev, priority: e.target.value as any } : null
                    )}
                  >
                    <option value="low">Alacsony</option>
                    <option value="medium">Közepes</option>
                    <option value="high">Magas</option>
                    <option value="critical">Kritikus</option>
                  </select>
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Admin megjegyzés</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-24"
                  value={editingFeedback.adminNotes || ''}
                  onChange={(e) => setEditingFeedback(prev => 
                    prev ? { ...prev, adminNotes: e.target.value } : null
                  )}
                  placeholder="Admin megjegyzések..."
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Megoldás</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-24"
                  value={editingFeedback.resolution || ''}
                  onChange={(e) => setEditingFeedback(prev => 
                    prev ? { ...prev, resolution: e.target.value } : null
                  )}
                  placeholder="Megoldás leírása..."
                />
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-base-100   p-6 flex gap-3">
              <button
                className="btn btn-primary flex-1 gap-2"
                onClick={() => {
                  if (editingFeedback) {
                    handleUpdateFeedback(editingFeedback._id, {
                      status: editingFeedback.status,
                      priority: editingFeedback.priority,
                      adminNotes: editingFeedback.adminNotes,
                      resolution: editingFeedback.resolution
                    });
                  }
                }}
              >
                <IconCheck size={18} />
                Mentés
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setEditingFeedback(null)}
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
