import { AdminListKpiBand } from '@/features/admin/components/AdminListKpiBand';
import {
  adminGetListKpiAction,
  type AdminListKpiDomain,
} from '@/features/admin/actions/list-kpi.action';
import type { AdminListKpiGranularity, AdminListKpiRange } from '@tdarts/services';
import type { AdminListParams } from '@/features/admin/lib/list-params';

type Props = {
  domain: AdminListKpiDomain;
  trendTitle: string;
  range?: string;
  from?: string;
  to?: string;
  group?: string;
  chartType?: string;
  params: AdminListParams;
  extraQuery?: Record<string, string | undefined>;
};

function parseKpiRange(raw?: string): AdminListKpiRange | undefined {
  if (raw === '1d' || raw === '7d' || raw === '30d' || raw === '1y' || raw === 'all' || raw === 'custom') {
    return raw;
  }
  if (raw === '90d') return '30d';
  return undefined;
}

function parseKpiGroup(raw?: string): AdminListKpiGranularity | undefined {
  if (raw === 'hour' || raw === 'day' || raw === 'week' || raw === 'month' || raw === 'year') return raw;
  return undefined;
}

export async function AdminListPageKpi({
  domain,
  trendTitle,
  range,
  from,
  to,
  group,
  chartType,
  params,
  extraQuery,
}: Props) {
  const kpiRange = parseKpiRange(range);
  const result = await adminGetListKpiAction(domain, {
    range: kpiRange,
    from: from || null,
    to: to || null,
    group: parseKpiGroup(group) ?? null,
  });

  if (!result.ok) return null;

  return (
    <AdminListKpiBand
      snapshot={result.snapshot}
      trendTitle={trendTitle}
      range={range}
      from={from}
      to={to}
      group={group}
      chartType={chartType}
      params={params}
      extraQuery={extraQuery}
    />
  );
}
