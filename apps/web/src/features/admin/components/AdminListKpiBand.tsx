import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { AdminBreakdownChart } from '@/features/admin/overview/charts/AdminBreakdownChart';
import type { AdminChartRangeControl } from '@/features/admin/components/AdminListKpiRangeSelect';
import type { AdminListKpiSnapshot } from '@tdarts/services';
import { Badge } from '@/components/ui/Badge';
import type { AdminListParams } from '@/features/admin/lib/list-params';

type Props = {
  snapshot: AdminListKpiSnapshot;
  trendTitle: string;
  range?: string;
  from?: string;
  to?: string;
  group?: string;
  chartType?: string;
  params: AdminListParams;
  extraQuery?: Record<string, string | undefined>;
};

export function AdminListKpiBand({
  snapshot,
  trendTitle,
  range,
  from,
  to,
  group,
  chartType,
  params,
  extraQuery,
}: Props) {
  const rangeControl: AdminChartRangeControl = {
    value: range,
    from,
    to,
    group,
    chartType,
    params,
    extraQuery,
  };
  const chartSeries =
    snapshot.breakdownSeries?.length > 0
      ? snapshot.breakdownSeries
      : [{ key: 'total', label: 'Összesen', points: snapshot.series }];

  return (
    <div className="mb-4 space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-muted-foreground text-xs font-medium">Összesen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{snapshot.total.toLocaleString('hu-HU')}</p>
            {snapshot.delta !== undefined && snapshot.deltaLabel ? (
              <Badge variant={snapshot.delta >= 0 ? 'success' : 'outline'} className="mt-1 text-xs">
                {snapshot.delta >= 0 ? '+' : ''}
                {snapshot.delta} {snapshot.deltaLabel}
              </Badge>
            ) : null}
          </CardContent>
        </Card>
        {snapshot.chips?.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-muted-foreground text-xs font-medium">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <AdminBreakdownChart
        title={trendTitle}
        description={`${snapshot.rangeLabel} · kattints a feliratokra a sorozat ki/be kapcsolásához`}
        series={chartSeries}
        granularity={snapshot.granularity}
        rangeControl={rangeControl}
      />
    </div>
  );
}
