"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  IconCrown, 
  IconUser, 
  IconTrash, 
  IconRefresh, 
  IconSearch, 
  IconFilter, 
  IconShield, 
  IconMail, 
  IconEye, 
  IconEyeOff,
  IconX,
  IconCalendar,
  IconClock,
  IconUsers
} from '@tabler/icons-react';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16   rounded-full"></div>
            <div className="w-16 h-16    rounded-full animate-spin absolute top-0"></div>
          </div>
          <p className="text-base-content/60">Felhasználók betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-info/20 via-info/10 to-transparent border  p-8">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-bold text-base-content flex items-center gap-3">
              <IconUsers className="w-10 h-10 text-info" />
              Felhasználó Kezelés
            </h1>
            <p className="text-base-content/70 text-lg">Felhasználói fiókok kezelése és admin jogosultságok</p>
          </div>
          
          <button 
            onClick={fetchUsers}
            disabled={loading}
            className="btn btn-info gap-2"
          >
            <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Frissítés
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border  rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconUser className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Összes Felhasználó</h3>
          <p className="text-4xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-warning/20 to-warning/5 border  rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconCrown className="w-7 h-7 text-warning" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Adminok</h3>
          <p className="text-4xl font-bold text-warning">{stats.admins}</p>
        </div>
        <div className="bg-gradient-to-br from-success/20 to-success/5 border  rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconShield className="w-7 h-7 text-success" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Regisztrált</h3>
          <p className="text-4xl font-bold text-success">{stats.verified}</p>
        </div>
        <div className="bg-gradient-to-br from-error/20 to-error/5 border  rounded-2xl p-6 text-center">
          <div className="w-14 h-14 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconUser className="w-7 h-7 text-error" />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-2">Nem Regisztrált</h3>
          <p className="text-4xl font-bold text-error">{stats.unverified}</p>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="bg-base-100 border  rounded-2xl p-6">
        <DailyChart
          title="Felhasználók napi regisztrációja"
          apiEndpoint="/api/admin/charts/users/daily"
          color="primary"
          icon="👥"
        />
      </div>

      {/* Filters */}
      <div className="bg-base-100 border  rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <IconFilter className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">Szűrők</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold">Keresés</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Keresés név, email vagy felhasználónév alapján..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <IconSearch className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
            </div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-bold">Szűrés típus szerint</span>
            </label>
            <select 
              className="select select-bordered w-full"
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

      {/* Users Table */}
      <div className="bg-base-100 border  rounded-2xl overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <IconUsers className="w-6 h-6 text-primary" />
            Felhasználók ({filteredUsers.length})
          </h3>
        </div>
        
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <IconUsers className="w-10 h-10 text-base-content/30" />
            </div>
            <h3 className="text-xl font-bold text-base-content mb-2">Nincsenek felhasználók</h3>
            <p className="text-base-content/60">
              {searchTerm || filter !== 'all' 
                ? 'Nincsenek felhasználók a megadott feltételekkel.'
                : 'Még nincsenek regisztrált felhasználók.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead className="bg-base-200">
                <tr className=""
                  <th className="font-bold">Felhasználó</th>
                  <th className="font-bold">Email</th>
                  <th className="font-bold">Felhasználónév</th>
                  <th className="font-bold">Státusz</th>
                  <th className="font-bold">Dátumok</th>
                  <th className="font-bold">Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user._id} className="hover:bg-base-200/50 transition-colors"
                    <td>
                      <div className="flex items-center gap-3">

                        <div>
                          <div className="font-bold">{user.name}</div>
                          <div className="text-sm text-base-content/60">ID: {user._id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleEmailClick(user)}
                        className="flex items-center gap-2 text-primary hover:text-primary-focus transition-colors group"
                        title="Email küldése"
                      >
                        <IconMail className="w-4 h-4" />
                        <span className="underline decoration-dotted underline-offset-2">
                          {user.email}
                        </span>
                      </button>
                    </td>
                    <td>
                      <code className="text-sm bg-base-200 px-2 py-1 rounded">
                        {user.username}
                      </code>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {user.isAdmin && (
                          <span className="badge badge-warning gap-1">
                            <IconCrown size={14} />
                            Admin
                          </span>
                        )}
                        {user.isVerified ? (
                          <span className="badge badge-success gap-1">
                            <IconShield size={14} />
                            Regisztrált
                          </span>
                        ) : (
                          <span className="badge badge-error gap-1">
                            <IconUser size={14} />
                            Nem regisztrált
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-base-content/70">
                          <IconCalendar size={14} />
                          <span>{new Date(user.createdAt).toLocaleDateString('hu-HU')}</span>
                        </div>
                        {user.lastLogin && (
                          <div className="flex items-center gap-2 text-base-content/50">
                            <IconClock size={14} />
                            <span>{new Date(user.lastLogin).toLocaleDateString('hu-HU')}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => toggleAdminStatus(user._id, user.isAdmin)}
                          className={`btn btn-sm gap-2 ${user.isAdmin ? 'btn-warning' : 'btn-info'}`}
                          title={user.isAdmin ? 'Admin jogosultság eltávolítása' : 'Admin jogosultság hozzáadása'}
                        >
                          <IconCrown size={16} />
                          {user.isAdmin ? 'Admin eltávolítása' : 'Admin létrehozása'}
                        </button>
                        <button
                          onClick={() => deactivateUser(user._id)}
                          className="btn btn-sm btn-error gap-2"
                          title="Felhasználó deaktiválása"
                        >
                          <IconTrash size={16} />
                          Törlés
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    
    setLoading(true);
    await onSend(subject, message, language);
    setLoading(false);
  };

  const generateEmailPreview = () => {
    const isHungarian = language === 'hu';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;  8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #b62441 0%, #8a1b31 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
            ${isHungarian ? 'tDarts - Admin Értesítés' : 'tDarts - Admin Notification'}
          </h1>
        </div>
        <div style="padding: 30px;">
          ${isHungarian ? `
            <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Kedves ${user.name}!</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              A tDarts platform adminisztrátoraként szeretnénk értesíteni Önt a következőről:
            </p>
            <div style="background: #f9fafb;  4px solid #b62441; padding: 16px; margin: 20px 0;">
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
            <div style="background: #f9fafb;  4px solid #b62441; padding: 16px; margin: 20px 0;">
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
        <div style="background: #f9fafb; padding: 20px; text-align: center;  1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 tDarts. Minden jog fenntartva.
          </p>
        </div>
      </div>
    `;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-base-100   p-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <IconMail className="w-7 h-7 text-primary" />
            Email küldése: {user.name}
          </h3>
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={onClose}
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-base-content/70 mb-6 flex items-center gap-2">
            <IconMail size={16} />
            Email cím: <code className="font-mono bg-base-200 px-2 py-1 rounded">{user.email}</code>
          </p>
          
          {!showPreview ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Email nyelv</span>
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
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-bold">Címzett</span>
                  </label>
                  <input
                    type="text"
                    value={user.name}
                    className="input input-bordered w-full"
                    disabled
                  />
                </div>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Tárgy</span>
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
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-bold">Üzenet</span>
                </label>
                <textarea
                  placeholder="Írd ide az üzenetet..."
                  className="textarea textarea-bordered w-full h-32"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                ></textarea>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
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
                  className="btn btn-info flex-1 gap-2"
                  onClick={() => setShowPreview(true)}
                  disabled={loading || !subject.trim() || !message.trim()}
                >
                  <IconEye size={18} />
                  Előnézet
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary flex-1 gap-2" 
                  disabled={loading || !subject.trim() || !message.trim()}
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <IconMail size={18} />
                      Email küldése
                    </>
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
                  className="btn btn-ghost btn-sm gap-2"
                >
                  <IconEyeOff size={18} />
                  Szerkesztés
                </button>
              </div>
              
              <div className="border  rounded-xl overflow-hidden">
                <div className="bg-base-200 p-4"
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Nyelv:</span>
                      <span className="badge badge-primary">
                        {language === 'hu' ? 'Magyar' : 'English'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">Címzett:</span>
                      <span>{user.name}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-base-100 max-h-96 overflow-y-auto">
                  <div 
                    dangerouslySetInnerHTML={{ __html: generateEmailPreview() }}
                    className="email-preview"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="btn btn-ghost flex-1 gap-2"
                >
                  <IconEyeOff size={18} />
                  Szerkesztés
                </button>
                <button
                  onClick={() => handleSubmit()}
                  disabled={loading}
                  className="btn btn-primary flex-1 gap-2"
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <IconMail size={18} />
                      Email küldése
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
