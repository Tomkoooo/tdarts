'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { AdminSection } from '@/features/admin/components/AdminSection';
import {
  adminUpsertAdsCreativeAction,
  type AdminCampaignRow,
  type AdminCreativeRow,
} from '@/features/admin/ads/actions';
import type { AdViewType } from '@tdarts/core';

const VIEW_TYPES: AdViewType[] = ['block', 'landscape', 'popup', 'inline'];

type Props = {
  locale: string;
  campaign: AdminCampaignRow;
  creatives: AdminCreativeRow[];
  canWrite: boolean;
};

export function AdsCampaignDetailPanel({ locale, campaign, creatives, canWrite }: Props) {
  const t = useTranslations('Admin.ads');
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: '',
    viewType: 'block' as AdViewType,
    title: '',
    destinationUrl: '',
    externalUrl: '',
    altText: '',
  });

  return (
    <div className="space-y-6">
      <AdminSection title={campaign.name} description={t('detail_description')}>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">{campaign.status}</Badge>
          <span className="text-muted-foreground">
            {t('detail_priority', { value: campaign.priority })}
          </span>
          <span className="text-muted-foreground font-mono text-xs">{campaign._id}</span>
        </div>
      </AdminSection>

      {canWrite ? (
        <AdminSection title={t('creative_create_title')} description={t('creative_create_description')}>
          <div className="grid max-w-2xl gap-3">
            <div className="space-y-2">
              <Label htmlFor="cr-name">{t('creative_name')}</Label>
              <Input
                id="cr-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-view">{t('creative_view_type')}</Label>
              <select
                id="cr-view"
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                value={form.viewType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, viewType: e.target.value as AdViewType }))
                }
              >
                {VIEW_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-title">{t('creative_title')}</Label>
              <Input
                id="cr-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-url">{t('creative_destination')}</Label>
              <Input
                id="cr-url"
                value={form.destinationUrl}
                onChange={(e) => setForm((f) => ({ ...f, destinationUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-media">{t('creative_media_url')}</Label>
              <Input
                id="cr-media"
                value={form.externalUrl}
                onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))}
              />
            </div>
            <Button
              type="button"
              disabled={
                pending ||
                !form.name.trim() ||
                !form.title.trim() ||
                !form.destinationUrl.trim()
              }
              onClick={() => {
                start(async () => {
                  const r = await adminUpsertAdsCreativeAction(locale, {
                    campaignId: campaign._id,
                    ...form,
                  });
                  if (r.ok) {
                    toast.success(t('toast_saved'));
                    setForm({
                      name: '',
                      viewType: 'block',
                      title: '',
                      destinationUrl: '',
                      externalUrl: '',
                      altText: '',
                    });
                    router.refresh();
                  } else {
                    toast.error(r.error ?? t('toast_error'));
                  }
                });
              }}
            >
              {t('creative_submit')}
            </Button>
          </div>
        </AdminSection>
      ) : (
        <p className="text-muted-foreground text-sm">{t('read_only')}</p>
      )}

      <AdminSection title={t('creatives_title')}>
        {creatives.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('creatives_empty')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {creatives.map((cr) => (
              <li key={cr._id} className="space-y-1 px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{cr.name}</span>
                  <Badge variant="outline">{cr.viewType}</Badge>
                  {!cr.isActive ? <Badge variant="secondary">{t('inactive')}</Badge> : null}
                </div>
                <p className="text-muted-foreground">{cr.title}</p>
                <p className="font-mono text-xs break-all">{cr.destinationUrl}</p>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
