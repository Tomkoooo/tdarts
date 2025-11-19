"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  IconSettings, 
  IconDatabase, 
  IconServer, 
  IconRefresh, 
  IconClock, 
  IconSection, 
  IconCheck, 
  IconX,
  IconActivity,
  IconDeviceFloppy,
  IconCode,
  IconMail,
  IconShield,
  IconPlug,
  IconChartBar
} from '@tabler/icons-react';
import { showErrorToast } from '@/lib/toastUtils';

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
    leaguesEnabled: boolean;
    detailedStatisticsEnabled: boolean;
  };
  environment: {
    emailUsername: string;
    nodeEnv: string;
    subscriptionEnabled: string;
    socketServerUrl: string;
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
    } catch (error: any) {
      console.error('Error fetching system info:', error);
      showErrorToast('Hiba történt a rendszer információk betöltése során', {
        error: error?.response?.data?.error,
        context: 'Rendszer információk',
        errorName: 'Adatbetöltés sikertelen',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16   rounded-full"></div>
            <div className="w-16 h-16    rounded-full animate-spin absolute top-0"></div>
          </div>
          <p className="text-base-content/60">Rendszer információk betöltése...</p>
        </div>
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mx-auto">
            <IconSettings className="w-12 h-12 text-error" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-base-content">Hiba történt</h2>
            <p className="text-base-content/60">Nem sikerült betölteni a rendszer információkat.</p>
          </div>
          <button 
            onClick={fetchSystemInfo}
            className="btn btn-primary gap-2"
          >
            <IconRefresh className="w-5 h-5" />
            Újrapróbálás
          </button>
        </div>
      </div>
    );
  }

  const StatusBadge = ({ active }: { active: boolean }) => (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-bold ${
      active ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
    }`}>
      {active ? <IconCheck size={16} /> : <IconX size={16} />}
      {active ? 'Aktív' : 'Inaktív'}
    </span>
  );

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border  p-8">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-bold text-base-content flex items-center gap-3">
              <IconSettings className="w-10 h-10 text-primary" />
              Rendszer Beállítások
            </h1>
            <p className="text-base-content/70 text-lg">Rendszer információk és konfiguráció</p>
          </div>
          
          <button 
            onClick={fetchSystemInfo}
            disabled={loading}
            className="btn btn-primary gap-2"
          >
            <IconRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Frissítés
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-success/20 to-success/5 border  rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center">
              <IconActivity className="w-6 h-6 text-success" />
            </div>
            <span className="text-xs font-bold text-success bg-success/20 px-2 py-1 rounded">ONLINE</span>
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-1">Rendszer Állapot</h3>
          <p className="text-2xl font-bold text-success">Működik</p>
        </div>

        <div className="bg-gradient-to-br from-info/20 to-info/5 border  rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-info/20 rounded-full flex items-center justify-center">
              <IconClock className="w-6 h-6 text-info" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-1">Üzemidő</h3>
          <p className="text-2xl font-bold text-info">{systemInfo.uptime}</p>
        </div>

        <div className="bg-gradient-to-br from-warning/20 to-warning/5 border  rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center">
              <IconDeviceFloppy className="w-6 h-6 text-warning" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-1">Memória</h3>
          <p className="text-2xl font-bold text-warning">{systemInfo.memory.percentage}%</p>
          <p className="text-xs text-base-content/60 mt-1">{systemInfo.memory.used} / {systemInfo.memory.total}</p>
        </div>

        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border  rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <IconDatabase className="w-6 h-6 text-primary" />
            </div>
            <StatusBadge active={systemInfo.database.status === 'connected'} />
          </div>
          <h3 className="text-sm font-medium text-base-content/70 mb-1">Adatbázis</h3>
          <p className="text-2xl font-bold text-primary capitalize">{systemInfo.database.status}</p>
        </div>
      </div>

      {/* Database Details */}
      <div className="bg-base-100 border  rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <IconDatabase className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Adatbázis Információk</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-base-200 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">{systemInfo.database.collections}</div>
            <div className="text-sm text-base-content/70 font-medium">Kollekciók</div>
          </div>
          <div className="bg-base-200 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">{systemInfo.database.documents.toLocaleString()}</div>
            <div className="text-sm text-base-content/70 font-medium">Dokumentumok</div>
          </div>
          <div className="bg-base-200 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">{systemInfo.database.status === 'connected' ? '✓' : '✗'}</div>
            <div className="text-sm text-base-content/70 font-medium">Kapcsolat</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-base-100 border  rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
            <IconPlug className="w-6 h-6 text-success" />
          </div>
          <h2 className="text-2xl font-bold">Funkciók</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-base-200 rounded-xl">
            <div className="flex items-center gap-3">
              <IconShield className="w-5 h-5 text-primary" />
              <span className="font-medium">Előfizetés rendszer</span>
            </div>
            <StatusBadge active={systemInfo.features.subscriptionEnabled} />
          </div>
          <div className="flex items-center justify-between p-4 bg-base-200 rounded-xl">
            <div className="flex items-center gap-3">
              <IconActivity className="w-5 h-5 text-primary" />
              <span className="font-medium">Socket kapcsolat</span>
            </div>
            <StatusBadge active={systemInfo.features.socketEnabled} />
          </div>
          <div className="flex items-center justify-between p-4 bg-base-200 rounded-xl">
            <div className="flex items-center gap-3">
              <IconSection className="w-5 h-5 text-primary" />
              <span className="font-medium">Ligák</span>
            </div>
            <StatusBadge active={systemInfo.features.leaguesEnabled} />
          </div>
          <div className="flex items-center justify-between p-4 bg-base-200 rounded-xl">
            <div className="flex items-center gap-3">
              <IconChartBar className="w-5 h-5 text-primary" />
              <span className="font-medium">Részletes statisztikák</span>
            </div>
            <StatusBadge active={systemInfo.features.detailedStatisticsEnabled} />
          </div>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="bg-base-100 border  rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center">
            <IconCode className="w-6 h-6 text-info" />
          </div>
          <h2 className="text-2xl font-bold">Környezeti Változók</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="">
                <th className="bg-base-200">Változó</th>
                <th className="bg-base-200">Érték</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-base-200/50">
                <td className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <IconServer className="w-4 h-4 text-primary" />
                    NODE_ENV
                  </div>
                </td>
                <td>
                  <span className={`badge ${
                    systemInfo.environment.nodeEnv === 'production' 
                      ? 'badge-success' 
                      : 'badge-warning'
                  }`}>
                    {systemInfo.environment.nodeEnv}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-base-200/50">
                <td className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <IconShield className="w-4 h-4 text-primary" />
                    SUBSCRIPTION_ENABLED
                  </div>
                </td>
                <td>
                  <span className="badge badge-info">
                    {systemInfo.environment.subscriptionEnabled}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-base-200/50">
                <td className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <IconActivity className="w-4 h-4 text-primary" />
                    SOCKET_SERVER_URL
                  </div>
                </td>
                <td>
                  <code className="text-xs bg-base-300 px-2 py-1 rounded">
                    {systemInfo.environment.socketServerUrl || 'Not set'}
                  </code>
                </td>
              </tr>
              <tr className="hover:bg-base-200/50">
                <td className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <IconMail className="w-4 h-4 text-primary" />
                    EMAIL_USERNAME
                  </div>
                </td>
                <td>
                  <code className="text-xs bg-base-300 px-2 py-1 rounded">
                    {systemInfo.environment.emailUsername || 'Not set'}
                  </code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* System Version */}
      <div className="bg-gradient-to-br from-primary/10 to-transparent border  rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center">
              <IconCode className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-base-content">Rendszer Verzió</h3>
              <p className="text-sm text-base-content/60">Aktuális verzió információk</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{systemInfo.version}</div>
            <div className="text-sm text-base-content/60">v{systemInfo.version}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
