'use client';

import { useTranslations } from 'next-intl';
import { AdminSection } from '@/features/admin/components/AdminSection';
import { Badge } from '@/components/ui/Badge';
import type { adminAdsTelemetrySummaryAction } from '@/features/admin/ads/actions';

type TelemetryData = NonNullable<
  Extract<Awaited<ReturnType<typeof adminAdsTelemetrySummaryAction>>, { ok: true }>['data']
>;

type Props = {
  data: TelemetryData;
};

export function AdsTelemetryPanel({ data }: Props) {
  const t = useTranslations('Admin.ads');

  return (
    <AdminSection title={t('telemetry_title')} description={t('telemetry_description')}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">{t('metric_impressions')}</p>
          <p className="text-2xl font-semibold">{data.summary.impressions}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">{t('metric_clicks_ctr')}</p>
          <p className="text-2xl font-semibold">
            {data.summary.clicks}{' '}
            <Badge variant="secondary" className="ml-1 align-middle text-xs">
              {(data.summary.ctr * 100).toFixed(2)}%
            </Badge>
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">{t('metric_interactions')}</p>
          <p className="text-2xl font-semibold">{data.summary.interactions}</p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
        {data.trend.slice(-24).map((row) => (
          <li
            key={String(row.bucketAt)}
            className="flex items-center justify-between gap-4 px-3 py-2 text-sm"
          >
            <span>{new Date(row.bucketAt).toLocaleString('hu-HU')}</span>
            <span className="text-muted-foreground font-mono text-xs">
              imp {row.impressions} · clk {row.clicks} · int {row.interactions}
            </span>
          </li>
        ))}
      </ul>
    </AdminSection>
  );
}
