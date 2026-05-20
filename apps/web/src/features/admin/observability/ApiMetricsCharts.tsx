'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

type Row = {
  routeKey: string;
  method: string;
  count: number;
  errorCount: number;
  bucket?: string;
};

const chartConfig = {
  calls: { label: 'Hívások', color: 'var(--chart-1)' },
  errors: { label: 'Hibák', color: 'hsl(var(--destructive))' },
} satisfies ChartConfig;

export function ApiMetricsCharts({ metrics }: { metrics: Record<string, unknown>[] }) {
  const rows: Row[] = metrics.map((m) => ({
    routeKey: String(m.routeKey ?? ''),
    method: String(m.method ?? ''),
    count: Number(m.count) || 0,
    errorCount: Number(m.errorCount) || 0,
    bucket: m.bucket instanceof Date ? m.bucket.toISOString() : m.bucket ? String(m.bucket) : undefined,
  }));

  const byRoute = [...rows]
    .sort((a, b) => b.errorCount - a.errorCount)
    .slice(0, 8)
    .map((r) => ({
      label: `${r.method} ${r.routeKey}`.slice(0, 32),
      errors: r.errorCount,
      calls: r.count,
    }));

  const byBucket = new Map<string, { bucket: string; calls: number; errors: number }>();
  for (const r of rows) {
    const key = r.bucket?.slice(0, 10) ?? 'unknown';
    const cur = byBucket.get(key) ?? { bucket: key, calls: 0, errors: 0 };
    cur.calls += r.count;
    cur.errors += r.errorCount;
    byBucket.set(key, cur);
  }
  const timeSeries = [...byBucket.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Forgalom időben</CardTitle>
          <CardDescription>Összesített hívások és hibák bucket szerint</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart data={timeSeries}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="calls" fill="var(--color-calls)" radius={4} />
              <Bar dataKey="errors" fill="var(--color-errors)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top hibás útvonalak</CardTitle>
          <CardDescription>Legtöbb API hiba az ablakban</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart data={byRoute} layout="vertical">
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                tickLine={false}
                axisLine={false}
                fontSize={10}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="errors" fill="var(--color-errors)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
