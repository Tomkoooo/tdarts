import type { SearchFilters } from '@tdarts/services';
import {
  getTournamentStartDateRangeFromCustomKeys,
  getTournamentStartDateRangeFromPreset,
  getUserTimeZone,
  type TournamentStartDatePresetId,
} from '@/lib/date-time';
import type { SearchActionInput } from './searchActionTypes';

function omitPresetDateFields(filters: SearchFilters): SearchFilters {
  const next = { ...filters };
  delete (next as { dateFrom?: unknown }).dateFrom;
  delete (next as { dateTo?: unknown }).dateTo;
  return next;
}

/** Resolves startDatePreset / custom keys into dateFrom + dateTo (exclusive end) for SearchService. */
export function applyTournamentStartDateForSearch(filters: SearchFilters): SearchFilters {
  const tz = filters.timeZone || getUserTimeZone();
  const preset = filters.startDatePreset?.trim();

  if (!preset) {
    return omitPresetDateFields(filters);
  }

  if (preset === 'yesterday' || preset === 'last7' || preset === 'last30') {
    const r = getTournamentStartDateRangeFromPreset(preset as TournamentStartDatePresetId, tz);
    if (!r) {
      return omitPresetDateFields(filters);
    }
    return { ...filters, dateFrom: r.dateFromInclusive, dateTo: r.dateToExclusive };
  }

  if (preset === 'custom') {
    const fromK = filters.dateFromKey?.trim();
    const toK = filters.dateToKey?.trim();
    if (!fromK || !toK) {
      return omitPresetDateFields(filters);
    }
    const r = getTournamentStartDateRangeFromCustomKeys(fromK, toK, tz);
    if (!r) {
      return omitPresetDateFields(filters);
    }
    return { ...filters, dateFrom: r.dateFromInclusive, dateTo: r.dateToExclusive };
  }

  return omitPresetDateFields(filters);
}

/** Stable cache key segments for `unstable_cache` (exported for tests). */
export function getSearchActionCacheKey(input: SearchActionInput): string[] {
  const { query, tab, filters, includeCounts, includeMetadata } = input;
  return [
    'search',
    tab,
    query || '',
    String(filters.page || 1),
    String(filters.limit || 10),
    filters.status || '',
    filters.type || '',
    filters.city || '',
    String(!!filters.isVerified),
    String(!!filters.isOac),
    String(!!includeCounts),
    String(!!includeMetadata),
    filters.country || '',
    filters.playerMode || '',
    filters.rankingType || '',
    filters.tournamentType || '',
    String(filters.year || ''),
    filters.timeZone || '',
    filters.startDatePreset || '',
    filters.dateFromKey || '',
    filters.dateToKey || '',
  ];
}
