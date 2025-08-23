"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { IconTrendingUp, IconTrendingDown, IconRefresh } from '@tabler/icons-react';

interface DailyChartProps {
  title: string;
  apiEndpoint: string;
  color?: string;
  icon?: React.ReactNode;
}

interface DailyData {
  date: string;
  count: number;
}

export default function DailyChart({ title, apiEndpoint, color = 'primary', icon }: DailyChartProps) {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(apiEndpoint);
      setData(response.data.data);
    } catch (error) {
      console.error(`Error fetching ${title} data:`, error);
      setError('Hiba történt az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiEndpoint]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Csak minden 5. napot jelenítünk meg, hogy olvasható legyen
  const shouldShowDate = (index: number) => {
    return index % 5 === 0 || index === data.length - 1;
  };

  // Debug: log the data
  useEffect(() => {
    console.log('DailyChart data:', { title, data: data.slice(0, 5), totalCount });
  }, [data, title]);

  const getTotalCount = () => {
    return data.reduce((sum, item) => sum + item.count, 0);
  };

  const getAverageCount = () => {
    if (data.length === 0) return 0;
    return Math.round(getTotalCount() / data.length * 10) / 10;
  };

  const getTrend = () => {
    if (data.length < 2) return 0;
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.count, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.count, 0) / secondHalf.length;
    
    if (firstHalfAvg === 0) return 0;
    return Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
  };

  const trend = getTrend();
  const totalCount = getTotalCount();
  const averageCount = getAverageCount();

  if (loading) {
    return (
      <div className="admin-glass-card">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content/60">Adatok betöltése...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-glass-card">
        <div className="text-center">
          <div className="text-error text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-error mb-2">Hiba történt</h3>
          <p className="text-base-content/60 mb-4">{error}</p>
          <button 
            onClick={fetchData}
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
    <div className="admin-glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && <div className="text-2xl">{icon}</div>}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <button
          onClick={fetchData}
          className="admin-btn-info btn-sm"
        >
          <IconRefresh className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-sm text-base-content/60">Összesen (30 nap)</p>
          <p className="text-2xl font-bold text-primary">{totalCount}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-base-content/60">Átlagos/nap</p>
          <p className="text-2xl font-bold text-info">{averageCount}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-base-content/60">Trend</p>
          <div className="flex items-center justify-center gap-1">
            {trend > 0 ? (
              <IconTrendingUp className="w-5 h-5 text-success" />
            ) : trend < 0 ? (
              <IconTrendingDown className="w-5 h-5 text-error" />
            ) : (
              <span className="text-base-content/40">-</span>
            )}
            <span className={`font-bold ${trend > 0 ? 'text-success' : trend < 0 ? 'text-error' : 'text-base-content/40'}`}>
              {Math.abs(trend)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        <div className="flex items-end justify-between h-full gap-1">
          {data.map((item, index) => {
            const maxCount = Math.max(...data.map(d => d.count));
            const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const minHeight = 4; // Minimum oszlop magasság
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="text-xs text-base-content/60 mb-1 text-center">
                  {item.count}
                </div>
                <div
                  className={`w-full rounded-t transition-all duration-300 hover:opacity-80 ${
                    color === 'primary' ? 'bg-primary' :
                    color === 'secondary' ? 'bg-secondary' :
                    color === 'accent' ? 'bg-accent' :
                    color === 'success' ? 'bg-success' :
                    color === 'warning' ? 'bg-warning' :
                    color === 'error' ? 'bg-error' :
                    color === 'info' ? 'bg-info' :
                    'bg-primary'
                  }`}
                  style={{ 
                    height: `${Math.max(height, minHeight)}%`,
                    minHeight: '4px'
                  }}
                  title={`${formatDate(item.date)}: ${item.count}`}
                />
                <div className="text-xs text-base-content/40 mt-1 text-center">
                  {shouldShowDate(index) ? formatDate(item.date) : ''}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {[0, 25, 50, 75, 100].map((line) => (
            <div
              key={line}
              className="absolute w-full border-t border-base-300"
              style={{ top: `${100 - line}%` }}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 text-center">
        <p className="text-sm text-base-content/60">
          Az előző 30 nap napi lebontású statisztikája
        </p>
      </div>
    </div>
  );
}
