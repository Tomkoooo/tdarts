import type { SearchFilters } from '@/database/services/search.service';

export type SearchActionInput = {
  query: string;
  tab: string;
  filters: SearchFilters & { page?: number; timeZone?: string };
  includeCounts?: boolean;
  includeMetadata?: boolean;
};

export type SearchActionResult = {
  results: any[];
  counts?: { global: number; tournaments: number; players: number; clubs: number; leagues: number };
  groupedResults?: { tournaments: any[]; players: any[]; clubs: any[]; leagues: any[] };
  metadata?: { cities: { city: string; count: number }[] };
  pagination?: { total: number; page: number; limit: number; totalPages?: number };
};
