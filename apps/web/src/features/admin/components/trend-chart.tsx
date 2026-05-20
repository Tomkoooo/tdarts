'use client';

import { Line } from 'react-chartjs-2';
import { useRef, useEffect, useState } from 'react';
import { defaultChartOptions, chartColors, createGradient } from '../lib/chart-config';
import type { ChartData, ChartOptions } from 'chart.js';
import { cn } from '@/lib/utils';

interface TrendChartProps {
  title?: string;
  data: { label: string; value: number }[];
  color?: keyof typeof chartColors;
  height?: number;
  className?: string;
  showLegend?: boolean;
}

export function TrendChart({
  title,
  data,
  color = 'primary',
  height = 200,
  className,
  showLegend = false,
}: TrendChartProps) {
  const chartRef = useRef<any>(null);
  const [gradient, setGradient] = useState<CanvasGradient | string>(chartColors[color]);

  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      const ctx = chart.ctx;
      setGradient(createGradient(ctx, chartColors[color], 0.4));
    }
  }, [color, data]);

  const chartData: ChartData<'line'> = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        borderColor: chartColors[color],
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: chartColors[color],
        pointHoverBorderColor: chartColors.surface,
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      legend: {
        display: showLegend,
      },
    },
  };

  return (
    <div className={cn('rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-5', className)}>
      {title && (
        <h3 className="text-sm font-medium text-admin-on-surface-variant mb-4">
          {title}
        </h3>
      )}
      <div style={{ height }}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
}
