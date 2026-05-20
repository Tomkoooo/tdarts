'use client';

import { Bar } from 'react-chartjs-2';
import { defaultBarOptions, chartColors } from '../lib/chart-config';
import type { ChartData, ChartOptions } from 'chart.js';
import { cn } from '@/lib/utils';

interface BarChartProps {
  title?: string;
  data: { label: string; value: number }[];
  color?: keyof typeof chartColors;
  height?: number;
  className?: string;
  horizontal?: boolean;
}

export function BarChart({
  title,
  data,
  color = 'primary',
  height = 200,
  className,
  horizontal = false,
}: BarChartProps) {
  const chartData: ChartData<'bar'> = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: chartColors[color] + 'cc',
        hoverBackgroundColor: chartColors[color],
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    ...defaultBarOptions,
    indexAxis: horizontal ? 'y' : 'x',
  };

  return (
    <div className={cn('rounded-xl bg-admin-surface-container border border-admin-outline-variant/20 p-5', className)}>
      {title && (
        <h3 className="text-sm font-medium text-admin-on-surface-variant mb-4">
          {title}
        </h3>
      )}
      <div style={{ height }}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
