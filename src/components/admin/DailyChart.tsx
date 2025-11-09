"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { IconTrendingUp, IconTrendingDown, IconRefresh } from '@tabler/icons-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DailyChartProps {
  title: string;
  apiEndpoint: string;
  color?: string;
  icon?: React.ReactNode;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
  }[];
}

export default function DailyChart({ title, apiEndpoint, color = 'primary', icon }: DailyChartProps) {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(apiEndpoint);
      console.log('API response:', response.data);
      
      // Handle different API response formats
      if (response.data && response.data.labels && response.data.datasets) {
        // New ChartData format
        setData(response.data);
      } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
        // API response with success wrapper: {success: true, data: Array}
        const apiData = response.data.data;
        const labels = apiData.map((item: any) => item.date || item.formattedDate || formatDate(item.date));
        const data = apiData.map((item: any) => item.count || 0);
        
        const chartData = {
          labels: labels,
          datasets: [{
            label: title,
            data: data,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgb(59, 130, 246)'
          }]
        };
        
        console.log('Converted API response to ChartData format:', chartData);
        setData(chartData);
      } else if (Array.isArray(response.data)) {
        // Direct array format
        const labels = response.data.map((item: any) => item.date || item.formattedDate || formatDate(item.date));
        const data = response.data.map((item: any) => item.count || 0);
        
        const chartData = {
          labels: labels,
          datasets: [{
            label: title,
            data: data,
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            borderColor: 'rgb(59, 130, 246)'
          }]
        };
        
        console.log('Converted array to ChartData format:', chartData);
        setData(chartData);
      } else {
        console.error('Unknown data format:', response.data);
        setError('Ismeretlen adatformátum');
      }
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

  // Debug: log the data
  useEffect(() => {
    console.log('DailyChart data:', { title, data: data?.datasets?.[0]?.data?.slice(0, 5), totalCount });
  }, [data, title]);

  const getTotalCount = () => {
    if (!data?.datasets?.[0]?.data) return 0;
    return data.datasets[0].data.reduce((sum, count) => sum + count, 0);
  };

  const getAverageCount = () => {
    if (!data?.datasets?.[0]?.data || data.datasets[0].data.length === 0) return 0;
    return Math.round(getTotalCount() / data.datasets[0].data.length * 10) / 10;
  };

  const getTrend = () => {
    if (!data?.datasets?.[0]?.data || data.datasets[0].data.length < 2) return 0;
    const firstHalf = data.datasets[0].data.slice(0, Math.floor(data.datasets[0].data.length / 2));
    const secondHalf = data.datasets[0].data.slice(Math.floor(data.datasets[0].data.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, count) => sum + count, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, count) => sum + count, 0) / secondHalf.length;
    
    if (firstHalfAvg === 0) return 0;
    return Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);
  };

  const trend = getTrend();
  const totalCount = getTotalCount();
  const averageCount = getAverageCount();

  // Chart colors
  const getChartColors = () => {
    switch (color) {
      case 'primary':
        return { fill: 'rgba(59, 130, 246, 0.1)', stroke: 'rgb(59, 130, 246)', gradient: 'rgba(59, 130, 246, 0.3)' };
      case 'secondary':
        return { fill: 'rgba(139, 92, 246, 0.1)', stroke: 'rgb(139, 92, 246)', gradient: 'rgba(139, 92, 246, 0.3)' };
      case 'accent':
        return { fill: 'rgba(236, 72, 153, 0.1)', stroke: 'rgb(236, 72, 153)', gradient: 'rgba(236, 72, 153, 0.3)' };
      case 'success':
        return { fill: 'rgba(34, 197, 94, 0.1)', stroke: 'rgb(34, 197, 94)', gradient: 'rgba(34, 197, 94, 0.3)' };
      case 'warning':
        return { fill: 'rgba(245, 158, 11, 0.1)', stroke: 'rgb(245, 158, 11)', gradient: 'rgba(245, 158, 11, 0.3)' };
      case 'error':
        return { fill: 'rgba(239, 68, 68, 0.1)', stroke: 'rgb(239, 68, 68)', gradient: 'rgba(239, 68, 68, 0.3)' };
      case 'info':
        return { fill: 'rgba(6, 182, 212, 0.1)', stroke: 'rgb(6, 182, 212)', gradient: 'rgba(6, 182, 212, 0.3)' };
      default:
        return { fill: 'rgba(59, 130, 246, 0.1)', stroke: 'rgb(59, 130, 246)', gradient: 'rgba(59, 130, 246, 0.3)' };
    }
  };

  const chartColors = getChartColors();

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-base-200 border  rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-base-content">{`Dátum: ${formatDate(label)}`}</p>
          <p className="text-sm text-primary font-semibold">{`Mennyiség: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

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

      // Format data for recharts
    const chartData = data?.labels?.map((label, index) => ({
      date: label,
      count: data.datasets[0].data[index] || 0,
      formattedDate: label
    })) || [];

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

      {/* Modern Chart with recharts */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id={`color-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.stroke} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColors.stroke} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(156, 163, 175, 0.2)" 
              vertical={false}
            />
            
            <XAxis 
              dataKey="formattedDate" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'rgba(156, 163, 175, 0.8)' }}
              tickFormatter={(value, index) => index % 5 === 0 ? value : ''}
            />
            
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'rgba(156, 163, 175, 0.8)' }}
              tickFormatter={(value) => value}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey="count"
              stroke={chartColors.stroke}
              strokeWidth={2}
              fill={`url(#color-${color})`}
              dot={{ fill: chartColors.stroke, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: chartColors.stroke, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
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
