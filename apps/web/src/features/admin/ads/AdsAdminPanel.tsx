'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { AdminSection } from '@/features/admin/components/AdminSection';
import { AdminRelationLink } from '@/features/admin/detail/AdminRelationLink';
import {
  adminDeleteAdsCampaignAction,
  adminUpsertAdsCampaignAction,
  type AdminAdsOverview,
  type AdminCampaignRow,
} from '@/features/admin/ads/actions';
import { AdsTelemetryPanel } from '@/features/admin/ads/AdsTelemetryPanel';
import type { adminAdsTelemetrySummaryAction } from '@/features/admin/ads/actions';

type Props = {
  locale: string;
  campaigns: AdminCampaignRow[];
  overview: AdminAdsOverview;
  canWrite: boolean;
  canTelemetry: boolean;
  telemetry: Extract<Awaited<ReturnType<typeof adminAdsTelemetrySummaryAction>>, { ok: true }>['data'] | null;
};

export function AdsAdminPanel({
  locale,
  campaigns,
  overview,
  canWrite,
  canTelemetry,
  telemetry,
}: Props) {
  const t = useTranslations('Admin.ads');
  const router = useRouter();
  const [name, setName] = useState('');
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <AdminSection title={t('flags_title')} description={t('flags_description')}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={overview.adsEnabled ? 'success' : 'secondary'}>
            ADS: {overview.adsEnabled ? t('flag_on') : t('flag_off')}
          </Badge>
          <Badge variant={overview.adsPlaceholderEnabled ? 'success' : 'secondary'}>
            ADS_PLACEHOLDER:{' '}
            {overview.adsPlaceholderEnabled ? t('flag_on') : t('flag_off')}
          </Badge>
          <Link href="/admin/system" className="text-primary text-sm hover:underline">
            {t('flags_link_system')}
          </Link>
        </div>
      </AdminSection>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">{t('kpi_campaigns')}</p>
          <p className="text-2xl font-semibold">{overview.campaignCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">{t('kpi_active')}</p>
          <p className="text-2xl font-semibold">{overview.activeCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-muted-foreground text-xs">{t('kpi_creatives')}</p>
          <p className="text-2xl font-semibold">{overview.creativeCount}</p>
        </div>
      </div>

      {canWrite ? (
        <AdminSection title={t('create_title')} description={t('create_description')}>
          <div className="flex max-w-lg flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="campaign-name">{t('create_name_label')}</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('create_name_placeholder')}
              />
            </div>
            <Button
              type="button"
              disabled={pending || !name.trim()}
              onClick={() => {
                start(async () => {
                  const r = await adminUpsertAdsCampaignAction(locale, { name: name.trim() });
                  if (r.ok) {
                    toast.success(t('toast_saved'));
                    setName('');
                    router.refresh();
                  } else {
                    toast.error(r.error ?? t('toast_error'));
                  }
                });
              }}
            >
              {t('create_submit')}
            </Button>
          </div>
        </AdminSection>
      ) : (
        <p className="text-muted-foreground text-sm">{t('read_only')}</p>
      )}

      <AdminSection title={t('campaigns_title')} description={t('campaigns_description')}>
        {campaigns.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('campaigns_empty')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {campaigns.map((campaign) => (
              <li
                key={campaign._id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <AdminRelationLink
                  href={`/admin/ads/${campaign._id}`}
                  label={campaign.name}
                  sublabel={`${campaign.status} · priority ${campaign.priority}`}
                />
                {canWrite ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      start(async () => {
                        const r = await adminDeleteAdsCampaignAction(locale, campaign._id);
                        if (r.ok) {
                          toast.success(t('toast_deleted'));
                          router.refresh();
                        } else {
                          toast.error(r.error ?? t('toast_error'));
                        }
                      });
                    }}
                  >
                    {t('delete_campaign')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      {canTelemetry && telemetry ? <AdsTelemetryPanel data={telemetry} /> : null}
    </div>
  );
}
