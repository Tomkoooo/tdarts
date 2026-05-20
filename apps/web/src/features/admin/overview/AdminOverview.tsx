'use client';

import { Badge } from '@/components/ui/Badge';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { AdminPageContainer } from '@/features/admin/components/layout/page-container';
import { AdminBreakdownChart } from '@/features/admin/overview/charts/AdminBreakdownChart';
import { AdminRecentActivity } from '@/features/admin/overview/AdminRecentActivity';
import type { AdminChartRangeControl } from '@/features/admin/components/AdminListKpiRangeSelect';
import type { AdminDashboardSummary } from '@/features/admin/types';
import type { AdminListKpiSnapshot } from '@tdarts/services';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = {
  data: AdminDashboardSummary;
  userName: string;
  chartKpi?: AdminListKpiSnapshot | null;
  chartControl?: AdminChartRangeControl;
};

function trendPercent(trend: { current: number; previous: number }): number {
  if (trend.previous === 0) return trend.current > 0 ? 100 : 0;
  return ((trend.current - trend.previous) / trend.previous) * 100;
}

function Delta24hBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <Badge variant="outline" className="text-xs">
        0 / 24h
      </Badge>
    );
  }
  const up = delta > 0;
  return (
    <Badge variant={up ? 'success' : 'destructive'} className="gap-1 text-xs">
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {up ? '+' : ''}
      {delta} / 24h
    </Badge>
  );
}

function MetricCard({
  label,
  value,
  trend,
  delta24h,
  footer,
}: {
  label: string;
  value: string | number;
  trend?: { current: number; previous: number; periodLabel: string };
  delta24h?: number;
  footer?: string;
}) {
  const pct = trend ? trendPercent(trend) : null;
  const up = pct !== null && pct >= 0;

  return (
    <Card className="@container/card">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1.5">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {value}
          </CardTitle>
          {delta24h !== undefined ? <Delta24hBadge delta={delta24h} /> : null}
        </div>
        {pct !== null ? (
          <CardAction>
            <Badge variant="outline" className="gap-1">
              {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {up ? '+' : ''}
              {pct.toFixed(1)}%
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      {footer ? (
        <CardFooter className="text-muted-foreground text-sm">{footer}</CardFooter>
      ) : null}
    </Card>
  );
}

export function AdminOverview({ data, userName, chartKpi, chartControl }: Props) {
  const t = useTranslations('Admin');

  const chartSeries =
    chartKpi?.breakdownSeries?.length
      ? chartKpi.breakdownSeries
      : chartKpi
        ? [{ key: 'total', label: 'Összesen', points: chartKpi.series }]
        : [];

  return (
    <AdminPageContainer
      pageTitle={t('dashboard.title', { name: userName })}
      pageDescription={t('dashboard.page_description', { range: chartKpi?.rangeLabel ?? data.range })}
    >
      <div className="flex flex-1 flex-col space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label={t('dashboard.stats.users')}
            value={data.usersTotal.toLocaleString('hu-HU')}
            trend={data.usersTrend}
            delta24h={data.usersDelta24h}
            footer={t('dashboard.stats.signups_7d', { count: data.usersLast7d })}
          />
          <MetricCard
            label={t('dashboard.stats.clubs')}
            value={data.clubsActive.toLocaleString('hu-HU')}
            trend={data.clubsTrend}
            delta24h={data.clubsDelta24h}
          />
          <MetricCard
            label={t('dashboard.stats.tournaments')}
            value={data.tournamentsTotal.toLocaleString('hu-HU')}
          />
          <MetricCard
            label={t('dashboard.stats.errors')}
            value={data.apiErrorEvents24h.toLocaleString('hu-HU')}
            trend={data.apiErrorsTrend}
            delta24h={data.apiErrorsDelta24h}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {chartKpi && chartControl ? (
            <AdminBreakdownChart
              title={t('dashboard.charts.signups')}
              description={`${chartKpi.rangeLabel} · kattints a feliratokra a sorozat ki/be kapcsolásához`}
              series={chartSeries}
              granularity={chartKpi.granularity}
              rangeControl={chartControl}
              chartHeight="h-[280px]"
            />
          ) : null}
          <AdminRecentActivity items={data.activityFeed ?? []} />
        </div>

        {data.feedbackOpenHigh > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.stats.feedback_high')}</CardTitle>
              <CardDescription>{data.feedbackOpenHigh}</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </AdminPageContainer>
  );
}
