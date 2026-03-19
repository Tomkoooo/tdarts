'use server';

import { AnnouncementService } from '@/database/services/announcement.service';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { unstable_cache } from 'next/cache';

type SupportedLocale = 'hu' | 'en' | 'de';

function normalizeLocale(locale?: string): SupportedLocale {
  const lower = String(locale || 'hu').toLowerCase();
  if (lower.startsWith('en')) return 'en';
  if (lower.startsWith('de')) return 'de';
  return 'hu';
}

export async function getActiveAnnouncementsAction(input?: { locale?: string }) {
  const run = withTelemetry(
    'announcements.getActive',
    async (payload?: { locale?: string }) => {
      const locale = normalizeLocale(payload?.locale);
      const cacheEnabled = process.env.HOME_CACHE_ENABLED !== 'false';
      if (!cacheEnabled) {
        const announcements = await AnnouncementService.getActiveAnnouncements(locale);
        return serializeForClient({ success: true, announcements });
      }
      const cachedAnnouncements = unstable_cache(
        async () => AnnouncementService.getActiveAnnouncements(locale),
        [`active-announcements:${locale}`],
        {
          revalidate: 30,
          tags: ['home:announcements', `home:announcements:${locale}`],
        }
      );
      const announcements = await cachedAnnouncements();
      return serializeForClient({ success: true, announcements });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'announcements', actionName: 'getActiveAnnouncements' },
    }
  );

  return run(input);
}
