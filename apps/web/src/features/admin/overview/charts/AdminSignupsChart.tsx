'use client';

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useTranslations } from 'next-intl';

type Point = { day: string; count: number };

const chartConfig = {
  count: { label: 'Regisztrációk', color: 'var(--chart-1)' },
} satisfies ChartConfig;

type Props = {
  points: Point[];
};

export function AdminSignupsChart({ points }: Props) {
  const t = useTranslations('Admin');
  const data = points.map((p) => ({ day: p.day.slice(5), count: p.count }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.charts.signups')}</CardTitle>
        <CardDescription>{t('dashboard.page_description', { range: '7d' })}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
