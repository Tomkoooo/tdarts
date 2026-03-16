'use server';

import { AnnouncementService } from '@/database/services/announcement.service';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { withTelemetry } from '@/shared/lib/withTelemetry';

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
      const announcements = await AnnouncementService.getActiveAnnouncements(locale);
      return serializeForClient({ success: true, announcements });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'announcements', actionName: 'getActiveAnnouncements' },
    }
  );

  return run(input);
}
