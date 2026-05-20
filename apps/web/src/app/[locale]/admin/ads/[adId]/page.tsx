import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { AdminPageContainer } from '@/features/admin/components/layout/page-container';
import { AdsCampaignDetailPanel } from '@/features/admin/ads/AdsCampaignDetailPanel';
import { adminGetAdsCampaignDetailAction } from '@/features/admin/ads/actions';

export default async function AdminAdDetailPage({
  params,
}: {
  params: Promise<{ locale: string; adId: string }>;
}) {
  const { locale, adId } = await params;
  const t = await getTranslations('Admin.ads');
  const result = await adminGetAdsCampaignDetailAction(adId);

  if (!result.ok) {
    return (
      <AdminPageContainer pageTitle={t('detail_not_found')}>
        <p className="text-destructive text-sm">{result.error}</p>
        <Link href="/admin/ads" className="text-primary mt-4 inline-block text-sm hover:underline">
          {t('back_to_list')}
        </Link>
      </AdminPageContainer>
    );
  }

  return (
    <AdminPageContainer
      pageTitle={result.campaign.name}
      pageDescription={t('detail_page_description')}
      pageHeaderAction={
        <Link href="/admin/ads" className="text-primary text-sm hover:underline">
          {t('back_to_list')}
        </Link>
      }
    >
      <AdsCampaignDetailPanel
        locale={locale}
        campaign={result.campaign}
        creatives={result.creatives}
        canWrite={result.canWrite}
      />
    </AdminPageContainer>
  );
}
