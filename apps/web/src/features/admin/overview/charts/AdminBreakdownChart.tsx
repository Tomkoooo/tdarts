'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  parseChartDisplayType,
  type AdminChartDisplayType,
} from '@/features/admin/lib/admin-chart-display';
import type { AdminListKpiBreakdownSeries, AdminListKpiGranularity } from '@tdarts/services';
import {
  AdminListKpiRangeSelect,
  type AdminChartRangeControl,
} from '@/features/admin/components/AdminListKpiRangeSelect';
import { cn } from '@/lib/utils';

export const ADMIN_CHART_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f97316',
  '#ef4444',
  '#a855f7',
  '#06b6d4',
  '#ec4899',
  '#eab308',
  '#14b8a6',
  '#f43f5e',
] as const;

function formatXTick(period: string, granularity: AdminListKpiGranularity): string {
  if (!period || period === '—') return period;
  if (granularity === 'hour') {
    const m = period.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2})/);
    return m ? `${m[3]}. ${m[2]}. ${m[4]}:00` : period;
  }
  if (granularity === 'week') return period.replace('-W', ' W');
  if (granularity === 'month') {
    const [y, m] = period.split('-');
    return m && y ? `${y}. ${m}.` : period;
  }
  if (granularity === 'year') return period;
  const parts = period.split('-');
  if (parts.length >= 3) return `${parts[1]}.${parts[2]}.`;
  return period;
}

function mergeBreakdownData(series: AdminListKpiBreakdownSeries[]): Record<string, string | number>[] {
  const periods = new Set<string>();
  for (const s of series) {
    for (const p of s.points) periods.add(p.period);
  }
  return [...periods]
    .sort()
    .map((period) => {
      const row: Record<string, string | number> = { period };
      for (const s of series) {
        row[s.key] = s.points.find((p) => p.period === period)?.count ?? 0;
      }
      return row;
    });
}

type Props = {
  title: string;
  description?: string;
  series: AdminListKpiBreakdownSeries[];
  granularity?: AdminListKpiGranularity;
  className?: string;
  rangeControl?: AdminChartRangeControl;
  chartHeight?: string;
};

function SeriesLayers({
  visible,
  colorByKey,
  chartType,
}: {
  visible: AdminListKpiBreakdownSeries[];
  colorByKey: Map<string, string>;
  chartType: AdminChartDisplayType;
}) {
  return visible.map((s) => {
    const color = colorByKey.get(s.key) ?? ADMIN_CHART_COLORS[0];
    if (chartType === 'bar') {
      return (
        <Bar
          key={s.key}
          dataKey={s.key}
          name={s.label}
          fill={color}
          radius={[3, 3, 0, 0]}
          maxBarSize={32}
        />
      );
    }
    if (chartType === 'line') {
      return (
        <Line
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.label}
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 2, fill: color }}
          activeDot={{ r: 4 }}
        />
      );
    }
    return (
      <Area
        key={s.key}
        type="monotone"
        dataKey={s.key}
        name={s.label}
        stroke={color}
        fill={color}
        fillOpacity={0.35}
        strokeWidth={2.5}
      />
    );
  });
}

export function AdminBreakdownChart({
  title,
  description,
  series,
  granularity = 'day',
  className,
  rangeControl,
  chartHeight = 'h-[240px]',
}: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const chartType = parseChartDisplayType(rangeControl?.chartType);

  const visible = useMemo(
    () => series.filter((s) => !hidden.has(s.key)),
    [series, hidden],
  );

  const colorByKey = useMemo(() => {
    const map = new Map<string, string>();
    series.forEach((s, i) => map.set(s.key, ADMIN_CHART_COLORS[i % ADMIN_CHART_COLORS.length]));
    return map;
  }, [series]);

  const data = useMemo(() => {
    const merged = mergeBreakdownData(visible);
    return merged.length ? merged : [{ period: '—', ...Object.fromEntries(visible.map((s) => [s.key, 0])) }];
  }, [visible]);

  const toggle = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const axis = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
      <XAxis
        dataKey="period"
        tickLine={false}
        axisLine={false}
        fontSize={10}
        tickFormatter={(v) => formatXTick(String(v), granularity)}
        interval="preserveStartEnd"
        minTickGap={16}
      />
      <YAxis tickLine={false} axisLine={false} fontSize={10} width={36} allowDecimals={false} />
      <ChartTooltip
        content={<ChartTooltipContent labelFormatter={(v) => formatXTick(String(v), granularity)} />}
      />
      <Legend wrapperStyle={{ fontSize: 11 }} />
    </>
  );

  return (
    <Card className={className}>
      <CardHeader className="space-y-3 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description ? <CardDescription className="mt-0.5">{description}</CardDescription> : null}
        </div>
        {rangeControl ? <AdminListKpiRangeSelect {...rangeControl} embedded /> : null}
        <div className="flex flex-wrap gap-1.5">
          {series.map((s) => {
            const off = hidden.has(s.key);
            const color = colorByKey.get(s.key) ?? ADMIN_CHART_COLORS[0];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-opacity',
                  off && 'opacity-35',
                )}
                style={{ borderColor: color, color }}
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                {s.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <ChartContainer config={{}} className={cn(chartHeight, 'w-full min-w-0')}>
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              {axis}
              <SeriesLayers visible={visible} colorByKey={colorByKey} chartType={chartType} />
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              {axis}
              <SeriesLayers visible={visible} colorByKey={colorByKey} chartType={chartType} />
            </LineChart>
          ) : (
            <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              {axis}
              <SeriesLayers visible={visible} colorByKey={colorByKey} chartType={chartType} />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
