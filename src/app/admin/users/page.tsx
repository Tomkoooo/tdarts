"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { IconCrown, IconUser, IconTrash, IconRefresh, IconSearch, IconFilter, IconShield, IconMail, IconEye, IconEyeOff } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import DailyChart from '@/components/admin/DailyChart';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  username: string;
  isAdmin: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  isDeleted?: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [emailModal, setEmailModal] = useState<{
    isOpen: boolean;
    user: AdminUser | null;
  }>({ isOpen: false, user: null });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Hiba történt a felhasználók betöltése során');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'remove-admin' : 'make-admin';
      await axios.post(`/api/admin/users/${userId}/${action}`);
      
      setUsers(prev => prev.map(user => 
        user._id === userId 
          ? { ...user, isAdmin: !currentStatus }
          : user
      ));
      
      toast.success(currentStatus ? 'Admin jogosultság eltávolítva' : 'Admin jogosultság hozzáadva');
    } catch (error) {
      console.error('Error toggling admin status:', error);
      toast.error('Hiba történt a művelet során');
    }
  };

  const deactivateUser = async (userId: string) => {
    if (!window.confirm('Biztosan deaktiválja ezt a felhasználót?')) return;
    
    try {
      await axios.post(`/api/admin/users/${userId}/deactivate`);
      setUsers(prev => prev.filter(user => user._id !== userId));
      toast.success('Felhasználó deaktiválva');
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Hiba történt a deaktiválás során');
    }
  };

  const handleEmailClick = (user: AdminUser) => {
    setEmailModal({ isOpen: true, user });
  };

  const sendEmail = async (subject: string, message: string, language: 'hu' | 'en') => {
    if (!emailModal.user) return;
    
    try {
      await axios.post('/api/admin/send-email', {
        userId: emailModal.user._id,
        subject,
        message,
        language
      });
      
      toast.success('Email sikeresen elküldve!');
      setEmailModal({ isOpen: false, user: null });
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Hiba történt az email küldése során');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'admin' && user.isAdmin) ||
                         (filter === 'user' && !user.isAdmin);
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: users.length,
    admins: users.filter(u => u.isAdmin).length,
    verified: users.filter(u => u.isVerified).length,
    unverified: users.filter(u => !u.isVerified).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Felhasználók betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gradient-red mb-2">Felhasználó Kezelés</h1>
          <p className="text-base-content/60">Felhasználói fiókok kezelése és admin jogosultságok</p>
        </div>
        <button 
          onClick={fetchUsers}
          className="admin-btn-primary text-sm"
          disabled={loading}
        >
          <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Frissítés
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconUser className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Összes Felhasználó</h3>
          <p className="text-3xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconCrown className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Adminok</h3>
          <p className="text-3xl font-bold text-primary">{stats.admins}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconShield className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Regisztrált</h3>
          <p className="text-3xl font-bold text-primary">{stats.verified}</p>
        </div>
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconUser className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Nem Regisztrált</h3>
          <p className="text-3xl font-bold text-primary">{stats.unverified}</p>
        </div>
      </div>

      {/* Daily Chart */}
      <DailyChart
        title="Felhasználók napi regisztrációja"
        apiEndpoint="/api/admin/charts/users/daily"
        color="primary"
        icon="👥"
      />

      {/* Filters */}
      <div className="admin-glass-card">
        <div className="flex flex-col  gap-4">
          <div className="form-control flex-1">
            <div className="input-group flex gap-2">
              <span className="flex items-center justify-center">
                <IconSearch className="w-4 h-4 text-primary" />
              </span>
              <input
                type="text"
                placeholder="Keresés név, email vagy felhasználónév alapján..."
                className="admin-input rounded-l-none border-l-0 flex-1"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="form-control">
            <div className="input-group flex gap-2">
              <span className="flex items-center justify-center">
                <IconFilter className="w-4 h-4 text-primary" />
              </span>
              <select 
                className="admin-select rounded-l-none border-l-0"
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
              >
                <option value="all">Összes felhasználó</option>
                <option value="admin">Adminok</option>
                <option value="user">Felhasználók</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-glass-card">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="border-b border-base-300">
                <th className="text-base-content font-semibold">Név</th>
                <th className="text-base-content font-semibold">Email</th>
                <th className="text-base-content font-semibold">Felhasználónév</th>
                <th className="text-base-content font-semibold">Státusz</th>
                <th className="text-base-content font-semibold">Regisztráció</th>
                <th className="text-base-content font-semibold">Utolsó bejelentkezés</th>
                <th className="text-base-content font-semibold">Műveletek</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user._id} className="hover:bg-base-200/30 transition-colors">
                  <td className="font-medium text-base-content">{user.name}</td>
                  <td className="text-base-content/80">
                    <button
                      onClick={() => handleEmailClick(user)}
                      className="text-primary hover:text-primary-focus underline decoration-dotted underline-offset-2 transition-colors cursor-pointer"
                      title="Email küldése"
                    >
                      {user.email}
                    </button>
                  </td>
                  <td className="text-base-content/80 font-mono text-sm">{user.username}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                                             {user.isAdmin && (
                         <span className="admin-badge-warning gap-1 inline-flex items-center">
                           <IconCrown className="w-3 h-3" />
                           Admin
                         </span>
                       )}
                       {user.isVerified ? (
                         <span className="admin-badge-secondary gap-1 inline-flex items-center">
                           <IconShield className="w-3 h-3" />
                           Regisztrált
                         </span>
                       ) : (
                         <span className="admin-badge-danger gap-1 inline-flex items-center">
                           <IconUser className="w-3 h-3" />
                           Nem regisztrált
                         </span>
                       )}
                    </div>
                  </td>
                  <td className="text-base-content/70 text-sm">
                    {new Date(user.createdAt).toLocaleDateString('hu-HU')}
                  </td>
                  <td className="text-base-content/70 text-sm">
                    {user.lastLogin 
                      ? new Date(user.lastLogin).toLocaleDateString('hu-HU')
                      : 'Soha'
                    }
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                                                                    <button
                         onClick={() => toggleAdminStatus(user._id, user.isAdmin)}
                         className="btn btn-warning btn-sm text-xs px-3 py-1 gap-1"
                         title={user.isAdmin ? 'Admin jogosultság eltávolítása' : 'Admin jogosultság hozzáadása'}
                       >
                         <IconCrown className="w-3 h-3" />
                         {user.isAdmin ? 'Admin eltávolítása' : 'Admin létrehozása'}
                       </button>
                       <button
                         onClick={() => deactivateUser(user._id)}
                         className="btn btn-error btn-sm text-xs px-3 py-1 gap-1"
                         title="Felhasználó deaktiválása"
                       >
                         <IconTrash className="w-3 h-3" />
                         Törlés
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-base-content/20 text-6xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-base-content mb-2">Nincsenek felhasználók</h3>
              <p className="text-base-content/60">
                {searchTerm || filter !== 'all' 
                  ? 'Nincsenek felhasználók a megadott feltételekkel.'
                  : 'Még nincsenek regisztrált felhasználók.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Email Modal */}
      {emailModal.isOpen && emailModal.user && (
        <EmailModal
          user={emailModal.user}
          onClose={() => setEmailModal({ isOpen: false, user: null })}
          onSend={sendEmail}
        />
      )}
    </div>
  );
}

// Email Modal Component
interface EmailModalProps {
  user: AdminUser;
  onClose: () => void;
  onSend: (subject: string, message: string, language: 'hu' | 'en') => void;
}

function EmailModal({ user, onClose, onSend }: EmailModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState<'hu' | 'en'>('hu');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    
    setLoading(true);
    await onSend(subject, message, language);
    setLoading(false);
  };

  const generateEmailPreview = () => {
    const isHungarian = language === 'hu';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #b62441 0%, #8a1b31 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
            ${isHungarian ? 'tDarts - Admin Értesítés' : 'tDarts - Admin Notification'}
          </h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          ${isHungarian ? `
            <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Kedves ${user.name}!</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              A tDarts platform adminisztrátoraként szeretnénk értesíteni Önt a következőről:
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
              <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">${subject}</h3>
              <p style="color: #374151; margin: 0; white-space: pre-line;">${message}</p>
            </div>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              Ha bármilyen kérdése van, kérjük, lépjen kapcsolatba velünk.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Üdvözlettel,<br>
              A tDarts admin csapat
            </p>
          ` : `
            <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Dear ${user.name}!</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              As a tDarts platform administrator, we would like to inform you about the following:
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
              <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">${subject}</h3>
              <p style="color: #374151; margin: 0; white-space: pre-line;">${message}</p>
            </div>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              If you have any questions, please contact us.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Best regards,<br>
              The tDarts admin team
            </p>
          `}
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 tDarts. Minden jog fenntartva.
          </p>
        </div>
      </div>
    `;
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box relative max-w-4xl max-h-[90vh] overflow-y-auto">
        <button
          className="btn btn-sm btn-circle absolute right-2 top-2"
          onClick={onClose}
        >
          ✕
        </button>
        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
          <IconMail className="w-6 h-6" />
          Email küldése: {user.name}
        </h3>
        <p className="text-sm text-base-content/70 mb-6">
          Email cím: <span className="font-mono">{user.email}</span>
        </p>
        
        {!showPreview ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="label-text">Email nyelv</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'hu' | 'en')}
                  className="select select-bordered w-full"
                >
                  <option value="hu">Magyar (alapértelmezett)</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Címzett</span>
                </label>
                <input
                  type="text"
                  value={user.name}
                  className="input input-bordered w-full"
                  disabled
                />
              </div>
            </div>
            
            <div>
              <label className="label">
                <span className="label-text">Tárgy</span>
              </label>
              <input
                type="text"
                placeholder="Email tárgya"
                className="input input-bordered w-full"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="label">
                <span className="label-text">Üzenet</span>
              </label>
              <textarea
                placeholder="Írd ide az üzenetet..."
                className="textarea textarea-bordered w-full h-32"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              ></textarea>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button 
                type="button" 
                className="btn btn-ghost flex-1" 
                onClick={onClose}
                disabled={loading}
              >
                Mégse
              </button>
              <button 
                type="button" 
                className="btn btn-info flex-1"
                onClick={() => setShowPreview(true)}
                disabled={loading || !subject.trim() || !message.trim()}
              >
                <IconEye className="w-4 h-4" />
                Előnézet
              </button>
              <button 
                type="submit" 
                className="btn btn-primary flex-1" 
                disabled={loading || !subject.trim() || !message.trim()}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Email küldése'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Email előnézet</h4>
              <button
                onClick={() => setShowPreview(false)}
                className="btn btn-ghost btn-sm"
              >
                <IconEyeOff className="w-4 h-4" />
                Szerkesztés
              </button>
            </div>
            
            <div className="border border-base-300 rounded-lg overflow-hidden">
              <div className="bg-base-200 p-3 border-b border-base-300">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Nyelv:</span>
                  <span className="badge badge-primary">
                    {language === 'hu' ? 'Magyar' : 'English'}
                  </span>
                  <span className="font-medium ml-4">Címzett:</span>
                  <span>{user.name}</span>
                </div>
              </div>
              <div className="p-4 bg-base-100 max-h-96 overflow-y-auto">
                <div 
                  dangerouslySetInnerHTML={{ __html: generateEmailPreview() }}
                  className="email-preview"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="btn btn-ghost flex-1"
              >
                Szerkesztés
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  'Email küldése'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
