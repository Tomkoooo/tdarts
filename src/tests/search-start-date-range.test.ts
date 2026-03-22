import {
  getTournamentStartDateRangeFromCustomKeys,
  getTournamentStartDateRangeFromPreset,
} from '@/lib/date-time';
import { getSearchActionCacheKey } from '@/features/search/lib/searchActionHelpers';
import type { SearchActionInput } from '@/features/search/lib/searchActionTypes';

describe('search startDate range helpers', () => {
  const tz = 'Europe/Budapest';

  it('last7 range is half-open and spans 7 local calendar days including today', () => {
    const ref = new Date('2026-03-21T12:00:00Z');
    const r = getTournamentStartDateRangeFromPreset('last7', tz, ref);
    expect(r).not.toBeNull();
    expect(r!.dateFromInclusive.getTime()).toBeLessThan(r!.dateToExclusive.getTime());
    const msPerDay = 24 * 60 * 60 * 1000;
    expect(r!.dateToExclusive.getTime() - r!.dateFromInclusive.getTime()).toBeGreaterThan(5 * msPerDay);
  });

  it('custom range swaps inverted from/to keys', () => {
    const r = getTournamentStartDateRangeFromCustomKeys('2026-03-10', '2026-03-01', tz);
    expect(r).not.toBeNull();
    expect(r!.dateFromInclusive.getTime()).toBeLessThanOrEqual(r!.dateToExclusive.getTime());
  });
});

describe('getSearchActionCacheKey', () => {
  const base: SearchActionInput = {
    query: '',
    tab: 'tournaments',
    filters: { page: 1, limit: 10 },
    includeCounts: false,
    includeMetadata: false,
  };

  it('differs when startDatePreset changes', () => {
    const a = getSearchActionCacheKey(base);
    const b = getSearchActionCacheKey({
      ...base,
      filters: { ...base.filters, startDatePreset: 'last7' },
    });
    expect(a).not.toEqual(b);
    expect(b.join('|')).toContain('last7');
  });

  it('differs when custom date keys change', () => {
    const a = getSearchActionCacheKey({
      ...base,
      filters: { ...base.filters, startDatePreset: 'custom', dateFromKey: '2026-01-01', dateToKey: '2026-01-31' },
    });
    const b = getSearchActionCacheKey({
      ...base,
      filters: { ...base.filters, startDatePreset: 'custom', dateFromKey: '2026-02-01', dateToKey: '2026-02-28' },
    });
    expect(a).not.toEqual(b);
  });
});
