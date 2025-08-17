"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { IconCrown, IconUser, IconTrash, IconRefresh, IconSearch, IconFilter, IconShield } from '@tabler/icons-react';
import toast from 'react-hot-toast';

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
                  <td className="text-base-content/80">{user.email}</td>
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
    </div>
  );
}
