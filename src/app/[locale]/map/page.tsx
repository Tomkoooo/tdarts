import { headers } from 'next/headers';
import MapExplorer from '@/components/map/MapExplorer';
import { getMapSettingsTranslations } from '@/data/translations/map-settings';

export async function generateMetadata() {
  const acceptLanguage = (await headers()).get('accept-language') || 'hu';
  const t = getMapSettingsTranslations(acceptLanguage);
  return {
    title: t.mapPageTitle,
    description: t.mapPageDescription,
  };
}

export default async function MapPage() {
  const acceptLanguage = (await headers()).get('accept-language') || 'hu';
  const t = getMapSettingsTranslations(acceptLanguage);
  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t.mapHeroTitle}</h1>
        <p className="text-muted-foreground">{t.mapHeroSubtitle}</p>
      </div>
      <MapExplorer />
    </main>
  );
}
