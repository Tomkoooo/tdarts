'use client';

import { Doughnut } from 'react-chartjs-2';
import { defaultDoughnutOptions, chartColors } from '../lib/chart-config';
import type { ChartData, ChartOptions } from 'chart.js';
import { cn } from '@/lib/utils';

interface DoughnutChartProps {
  title?: string;
  data: { label: string; value: number; color?: string }[];
  height?: number;
  className?: string;
  showLegend?: boolean;
}

const defaultColors = [
  chartColors.primary,
  chartColors.accent,
  chartColors.success,
  chartColors.warning,
  chartColors.info,
  chartColors.dartsRed,
];

export function DoughnutChart({
  title,
  data,
  height = 200,
  className,
  showLegend = true,
}: DoughnutChartProps) {
  const chartData: ChartData<'doughnut'> = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: data.map((d, i) => d.color || defaultColors[i % defaultColors.length]),
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    ...defaultDoughnutOptions,
    plugins: {
      ...defaultDoughnutOptions.plugins,
      legend: {
        ...defaultDoughnutOptions.plugins?.legend,
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
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
}
