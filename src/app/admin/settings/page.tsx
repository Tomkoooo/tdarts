"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { IconSettings, IconDatabase, IconServer, IconRefresh, IconClock, IconCpu, IconSection, IconFile, IconCheck, IconX } from '@tabler/icons-react';
import toast from 'react-hot-toast';

interface SystemInfo {
  version: string;
  uptime: string;
  memory: {
    used: string;
    total: string;
    percentage: number;
  };
  database: {
    status: string;
    collections: number;
    documents: number;
  };
  features: {
    subscriptionEnabled: boolean;
    socketEnabled: boolean;
  };
}

export default function AdminSettingsPage() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSystemInfo = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/system-info');
      setSystemInfo(response.data);
    } catch (error) {
      console.error('Error fetching system info:', error);
      toast.error('Hiba történt a rendszer információk betöltése során');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Rendszer információk betöltése...</p>
        </div>
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-error text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-base-content mb-2">Hiba történt</h2>
          <p className="text-base-content/60 mb-4">Nem sikerült betölteni a rendszer információkat.</p>
          <button 
            onClick={fetchSystemInfo}
            className="admin-btn-primary"
          >
            <IconRefresh className="w-4 h-4" />
            Újrapróbálás
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gradient-red mb-2">Rendszer Beállítások</h1>
          <p className="text-base-content/60">Rendszer információk és konfiguráció</p>
        </div>
        <button 
          onClick={fetchSystemInfo}
          className="admin-btn-primary text-sm flex items-center gap-2"
          disabled={loading}
        >
          <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Frissítés
        </button>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconServer className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Verzió</h3>
          <p className="text-2xl font-bold text-primary">{systemInfo.version}</p>
        </div>

        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconDatabase className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Adatbázis</h3>
          <p className="text-2xl font-bold text-primary">
            {systemInfo.database.status === 'connected' ? 'Csatlakozva' : 'Hiba'}
          </p>
        </div>

        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconCpu className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Memória</h3>
          <p className="text-2xl font-bold text-primary">
            {systemInfo.memory.percentage}%
          </p>
        </div>

        <div className="admin-glass-card text-center">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 inline-block mb-3">
            <IconFile className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-base-content/60 mb-1">Dokumentumok</h3>
          <p className="text-2xl font-bold text-primary">{systemInfo.database.documents.toLocaleString()}</p>
        </div>
      </div>

      {/* Daily Chart */}


      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <div className="admin-glass-card">
          <h3 className="text-lg font-semibold text-base-content mb-4">Rendszer Állapot</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-base-200/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <IconClock className="w-4 h-4 text-primary" />
                </div>
                <span className="text-base-content/80">Uptime</span>
              </div>
              <span className="font-semibold text-base-content">{systemInfo.uptime}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-base-200/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <IconCpu className="w-4 h-4 text-accent" />
                </div>
                <span className="text-base-content/80">Memória használat</span>
              </div>
              <span className="font-semibold text-base-content">
                {systemInfo.memory.used} / {systemInfo.memory.total}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-base-200/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <IconSection className="w-4 h-4 text-secondary" />
                </div>
                <span className="text-base-content/80">Adatbázis kollekciók</span>
              </div>
              <span className="font-semibold text-base-content">{systemInfo.database.collections}</span>
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="admin-glass-card">
          <h3 className="text-lg font-semibold text-base-content mb-4">Funkciók</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-base-200/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <IconSettings className="w-4 h-4 text-success" />
                </div>
                <span className="text-base-content/80">Előfizetési rendszer</span>
              </div>
                             <span className="badge badge-sm badge-primary gap-1">
                 {systemInfo.features.subscriptionEnabled ? (
                   <>
                     <IconCheck className="w-3 h-3" />
                     Aktív
                   </>
                 ) : (
                   <>
                     <IconX className="w-3 h-3" />
                     Inaktív
                   </>
                 )}
               </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-base-200/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <IconServer className="w-4 h-4 text-info" />
                </div>
                <span className="text-base-content/80">Socket.IO</span>
              </div>
                             <span className="badge badge-sm badge-primary gap-1">
                 {systemInfo.features.socketEnabled ? (
                   <>
                     <IconCheck className="w-3 h-3" />
                     Aktív
                   </>
                 ) : (
                   <>
                     <IconX className="w-3 h-3" />
                     Inaktív
                   </>
                 )}
               </span>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="admin-glass-card">
        <h3 className="text-lg font-semibold text-base-content mb-4">Környezeti Változók</h3>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="border-b border-base-300">
                <th className="text-base-content font-semibold">Változó</th>
                <th className="text-base-content font-semibold">Érték</th>
                <th className="text-base-content font-semibold">Státusz</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="font-mono text-sm text-base-content/80">NODE_ENV</td>
                <td className="font-mono text-sm text-base-content">{process.env.NODE_ENV || 'N/A'}</td>
                <td>
                                     <span className="badge badge-sm badge-primary gap-1">
                     {process.env.NODE_ENV === 'production' ? (
                       <>
                         <IconCheck className="w-3 h-3" />
                         Production
                       </>
                     ) : (
                       <>
                         <IconX className="w-3 h-3" />
                         Development
                       </>
                     )}
                   </span>
                </td>
              </tr>
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="font-mono text-sm text-base-content/80">NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED</td>
                <td className="font-mono text-sm text-base-content">{process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED || 'false'}</td>
                <td>
                                     <span className="badge badge-sm badge-primary gap-1">
                     {process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'true' ? (
                       <>
                         <IconCheck className="w-3 h-3" />
                         Aktív
                       </>
                     ) : (
                       <>
                         <IconX className="w-3 h-3" />
                         Inaktív
                       </>
                     )}
                   </span>
                </td>
              </tr>
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="font-mono text-sm text-base-content/80">NEXT_PUBLIC_SOCKET_SERVER_URL</td>
                <td className="font-mono text-sm text-base-content">{process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'N/A'}</td>
                <td>
                                     <span className="badge badge-sm badge-primary gap-1">
                     {process.env.NEXT_PUBLIC_SOCKET_SERVER_URL ? (
                       <>
                         <IconCheck className="w-3 h-3" />
                         Beállítva
                       </>
                     ) : (
                       <>
                         <IconX className="w-3 h-3" />
                         Nincs beállítva
                       </>
                     )}
                   </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
