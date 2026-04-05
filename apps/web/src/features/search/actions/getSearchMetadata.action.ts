'use server';

import { SearchService } from '@/database/services/search.service';
import type { SearchFilters } from '@/database/services/search.service';
import { withTelemetry } from '@/shared/lib/withTelemetry';

export type GetSearchMetadataActionInput = {
  showFinished?: boolean;
  query?: string;
  filters?: Partial<SearchFilters>;
};

export type GetSearchMetadataActionResult = {
  success: boolean;
  cities: { city: string; count: number }[];
};

export async function getSearchMetadataAction(
  input: GetSearchMetadataActionInput = {}
): Promise<GetSearchMetadataActionResult> {
  const run = withTelemetry(
    'search.getMetadata',
    async (params: GetSearchMetadataActionInput) => {
      const { showFinished = false, query, filters = {} } = params;
      const searchFilters: SearchFilters = {
        ...filters,
        status: showFinished ? 'all' : 'upcoming',
      };
      const metadata = await SearchService.getMetadata(query, searchFilters);
      return {
        success: true,
        cities: metadata.cities,
      };
    },
    { method: 'ACTION', metadata: { feature: 'search', actionName: 'getMetadata' } }
  );

  return run(input);
}
