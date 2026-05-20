import { getDashboardDataAction } from '@/features/admin/actions/getDashboardData.action';
import { adminGetListKpiAction } from '@/features/admin/actions/list-kpi.action';
import { getAdminContextAction } from '@/features/admin/actions/getAdminContext.action';
import { AdminOverview } from '@/features/admin/overview/AdminOverview';
import { AdminPageContainer } from '@/features/admin/components/layout/page-container';
import {
  ADMIN_KPI_LIST_PARAMS,
  parseKpiSearchParams,
} from '@/features/admin/lib/kpi-search-params';
import type { AdminListKpiRange } from '@tdarts/services';
import { getTranslations } from 'next-intl/server';

function parseKpiRange(raw?: string): AdminListKpiRange | undefined {
  if (raw === '1d' || raw === '7d' || raw === '30d' || raw === '1y' || raw === 'all' || raw === 'custom') {
    return raw;
  }
  if (raw === '90d') return '30d';
  return undefined;
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations('Admin');
  const sp = await searchParams;
  const kpi = parseKpiSearchParams(sp);

  const [dashboard, chartKpi, context] = await Promise.all([
    getDashboardDataAction(),
    adminGetListKpiAction('users', {
      range: parseKpiRange(kpi.kpiRange),
      from: kpi.kpiFrom ?? null,
      to: kpi.kpiTo ?? null,
      group: kpi.kpiGroup ?? null,
    }),
    getAdminContextAction(),
  ]);

  if (!dashboard.ok) {
    return (
      <AdminPageContainer pageTitle={t('dashboard.page_title')}>
        <p className="text-destructive text-sm">{dashboard.error ?? t('dashboard.error_loading')}</p>
      </AdminPageContainer>
    );
  }

  const userName = context?.user.name ?? '';

  return (
    <AdminOverview
      data={dashboard.data}
      userName={userName}
      chartKpi={chartKpi.ok ? chartKpi.snapshot : null}
      chartControl={{
        value: kpi.kpiRange,
        from: kpi.kpiFrom,
        to: kpi.kpiTo,
        group: kpi.kpiGroup,
        chartType: kpi.kpiChart,
        params: ADMIN_KPI_LIST_PARAMS,
      }}
    />
  );
}
