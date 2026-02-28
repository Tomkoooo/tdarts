export type TelemetryGranularity = 'minute' | 'hour' | 'day';

export function resolveTimeRange(searchParams: URLSearchParams): { startDate: Date; endDate: Date } {
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  if (start && end) {
    return {
      startDate: new Date(start),
      endDate: new Date(end),
    };
  }

  const range = searchParams.get('range') || '24h';
  const endDate = new Date();
  const startDate = new Date(endDate);

  switch (range) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    default:
      startDate.setDate(startDate.getDate() - 1);
      break;
  }

  return { startDate, endDate };
}

export function resolveRouteFilters(searchParams: URLSearchParams): { routeKey?: string; method?: string } {
  const routeKey = searchParams.get('routeKey') || undefined;
  const rawMethod = searchParams.get('method');
  const method = rawMethod && rawMethod !== 'ALL' ? rawMethod.toUpperCase() : undefined;
  return { routeKey, method };
}

export function resolveGranularity(searchParams: URLSearchParams): TelemetryGranularity {
  const raw = (searchParams.get('granularity') || '').toLowerCase();
  if (raw === 'minute' || raw === 'hour' || raw === 'day') {
    return raw;
  }
  return 'minute';
}

export function formatBucketLabel(bucket: string | Date, timeZone: string, granularity: TelemetryGranularity): string {
  const date = new Date(bucket);
  if (granularity === 'day') {
    return date.toLocaleString('hu-HU', {
      timeZone,
      month: 'short',
      day: 'numeric',
    });
  }

  if (granularity === 'hour') {
    return date.toLocaleString('hu-HU', {
      timeZone,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    });
  }

  return date.toLocaleString('hu-HU', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDateTruncId(granularity: TelemetryGranularity, timeZone: string) {
  return {
    $dateTrunc: {
      date: '$bucket',
      unit: granularity,
      timezone: timeZone,
    },
  };
}
