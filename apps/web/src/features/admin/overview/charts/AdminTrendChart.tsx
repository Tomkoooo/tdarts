'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { AdminListKpiGranularity } from '@tdarts/services';

const config = {
  count: { label: 'Darab', color: 'var(--chart-1)' },
} satisfies ChartConfig;

type Point = { period: string; count: number };

type Props = {
  title: string;
  description?: string;
  points: Point[];
  granularity?: AdminListKpiGranularity;
  className?: string;
};

function formatXTick(period: string, granularity: AdminListKpiGranularity): string {
  if (!period || period === '—') return period;
  if (granularity === 'month') {
    const [y, m] = period.split('-');
    return m && y ? `${y}. ${m}.` : period;
  }
  const parts = period.split('-');
  if (parts.length >= 3) return `${parts[1]}.${parts[2]}.`;
  return period;
}

/** Mobile-friendly area chart for list KPI bands (growth over time). */
export function AdminTrendChart({ title, description, points, granularity = 'day', className }: Props) {
  const data = points.length ? points : [{ period: '—', count: 0 }];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="pb-4">
        <ChartContainer config={config} className="h-[140px] w-full min-w-0">
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              fontSize={10}
              tickFormatter={(v) => formatXTick(String(v), granularity)}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={10} width={28} allowDecimals={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(v) => formatXTick(String(v), granularity)}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              fill="var(--color-count)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
