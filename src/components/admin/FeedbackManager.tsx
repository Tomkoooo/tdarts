"use client";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  IconBug, IconBulb, IconSettingsCode, IconCheck, IconEdit, IconTrash,
  IconSearch, IconRefresh, IconMail, IconCalendar
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
      
      // Frissítjük a statisztikákat
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
      
      // Frissítjük a statisztikákat
      fetchFeedback();
    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      toast.error(error.response?.data?.error || 'Hiba történt a törlés során');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug': return <IconBug className="w-4 h-4 text-error" />;
      case 'feature': return <IconBulb className="w-4 h-4 text-warning" />;
      case 'improvement': return <IconSettingsCode className="w-4 h-4 text-info" />;
      default: return <IconCheck className="w-4 h-4 text-success" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'admin-badge-error';
      case 'high': return 'admin-badge-warning';
      case 'medium': return 'admin-badge-info';
      case 'low': return 'admin-badge-success';
      default: return 'admin-badge-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'admin-badge-warning';
      case 'in-progress': return 'admin-badge-info';
      case 'resolved': return 'admin-badge-success';
      case 'rejected': return 'admin-badge-error';
      case 'closed': return 'admin-badge-outline';
      default: return 'admin-badge-outline';
    }
  };

  if (loading) {
    return (
      <div className="text-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="mt-4 text-base-content/60">Adatok betöltése...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="admin-glass-card text-center">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
              <IconBug className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-base-content/60 mb-1">Összes</h3>
            <p className="text-3xl font-bold text-primary">{stats.total}</p>
          </div>
          <div className="admin-glass-card text-center">
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 inline-block mb-3">
              <IconCalendar className="w-6 h-6 text-warning" />
            </div>
            <h3 className="text-sm font-medium text-base-content/60 mb-1">Függőben</h3>
            <p className="text-3xl font-bold text-warning">{stats.pending}</p>
          </div>
          <div className="admin-glass-card text-center">
            <div className="p-3 rounded-xl bg-info/10 border border-info/20 inline-block mb-3">
              <IconSettingsCode className="w-6 h-6 text-info" />
            </div>
            <h3 className="text-sm font-medium text-base-content/60 mb-1">Folyamatban</h3>
            <p className="text-3xl font-bold text-info">{stats.inProgress}</p>
          </div>
          <div className="admin-glass-card text-center">
            <div className="p-3 rounded-xl bg-success/10 border border-success/20 inline-block mb-3">
              <IconCheck className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-sm font-medium text-base-content/60 mb-1">Megoldva</h3>
            <p className="text-3xl font-bold text-success">{stats.resolved}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="admin-glass-card">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Státusz</span>
              </label>
              <select
                className="admin-select w-full"
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
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Kategória</span>
              </label>
              <select
                className="admin-select w-full"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="">Összes kategória</option>
                <option value="bug">Hiba</option>
                <option value="feature">Új funkció</option>
                <option value="improvement">Fejlesztés</option>
                <option value="other">Egyéb</option>
              </select>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Prioritás</span>
              </label>
              <select
                className="admin-select w-full"
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="">Összes prioritás</option>
                <option value="critical">Kritikus</option>
                <option value="high">Magas</option>
                <option value="medium">Közepes</option>
                <option value="low">Alacsony</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 items-start">
            <div className="form-control flex-1">
              <label className="label">
                <span className="label-text font-medium">Keresés</span>
              </label>
              <div className="input-group flex gap-1 items-center">
                <input
                  type="text"
                  placeholder="Keresés..."
                  className="admin-input w-full"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
                <button className="btn btn-square btn-primary">
                  <IconSearch className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={fetchFeedback}
                className="admin-btn-info btn-xs"
              >
                <IconRefresh />
                <span className="hidden sm:inline">Frissítés</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="admin-glass-card">
        <h3 className="text-lg font-semibold mb-4">Hibabejelentések ({feedback.length})</h3>
        
        {feedback.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-base-content/20 text-6xl mb-4">📝</div>
            <p className="text-base-content/60">Nincsenek hibabejelentések</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => (
              <div key={item._id} className="border border-base-300 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(item.category)}
                      <h4 className="font-semibold text-lg">{item.title}</h4>
                      <span className={`admin-badge ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className={`admin-badge ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    
                    <p className="text-base-content/70 mb-3">{item.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-base-content/60">
                      <div className="flex items-center gap-1">
                        <IconMail className="w-4 h-4" />
                        <span>{item.email}</span>
                      </div>
                      {item.page && (
                        <div className="flex items-center gap-1">
                          <IconCalendar className="w-4 h-4" />
                          <span>{item.page}</span>
                        </div>
                      )}
                      {item.device && (
                        <span>📱 {item.device}</span>
                      )}
                      {item.browser && (
                        <span>🌐 {item.browser}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <IconCalendar className="w-4 h-4" />
                        <span>{new Date(item.createdAt).toLocaleDateString('hu-HU')}</span>
                      </div>
                    </div>
                    
                    {item.adminNotes && (
                      <div className="mt-3 p-3 bg-base-200 rounded-lg">
                        <p className="text-sm font-medium text-base-content/80 mb-1">Admin megjegyzés:</p>
                        <p className="text-sm text-base-content/70">{item.adminNotes}</p>
                      </div>
                    )}
                    
                    {item.resolution && (
                      <div className="mt-3 p-3 bg-success/10 rounded-lg">
                        <p className="text-sm font-medium text-success mb-1">Megoldás:</p>
                        <p className="text-sm text-success/80">{item.resolution}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 ml-4">
                    <button
                      onClick={() => setEditingFeedback(item)}
                      className="admin-btn-info btn-xs w-full sm:w-auto"
                    >
                      <IconEdit />
                      <span className="hidden sm:inline ml-1">Szerkesztés</span>
                    </button>
                    <button
                      onClick={() => handleDeleteFeedback(item._id)}
                      className="admin-btn-danger btn-xs w-full sm:w-auto"
                    >
                      <IconTrash />
                      <span className="hidden sm:inline ml-1">Törlés</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingFeedback && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-base-200 rounded-xl p-6 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Hibabejelentés szerkesztése</h3>
            
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text font-medium">Státusz</span>
                </label>
                <select
                  className="admin-select w-full"
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
              
              <div>
                <label className="label">
                  <span className="label-text font-medium">Prioritás</span>
                </label>
                <select
                  className="admin-select w-full"
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
              
              <div>
                <label className="label">
                  <span className="label-text font-medium">Admin megjegyzés</span>
                </label>
                <textarea
                  className="admin-input w-full h-24"
                  value={editingFeedback.adminNotes || ''}
                  onChange={(e) => setEditingFeedback(prev => 
                    prev ? { ...prev, adminNotes: e.target.value } : null
                  )}
                  placeholder="Admin megjegyzések..."
                />
              </div>
              
              <div>
                <label className="label">
                  <span className="label-text font-medium">Megoldás</span>
                </label>
                <textarea
                  className="admin-input w-full h-24"
                  value={editingFeedback.resolution || ''}
                  onChange={(e) => setEditingFeedback(prev => 
                    prev ? { ...prev, resolution: e.target.value } : null
                  )}
                  placeholder="Megoldás leírása..."
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-end mt-6">
              <button
                className="admin-btn-ghost btn-xs w-full sm:w-auto"
                onClick={() => setEditingFeedback(null)}
              >
                Mégse
              </button>
              <button
                className="admin-btn-primary btn-xs w-full sm:w-auto"
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
                Mentés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}