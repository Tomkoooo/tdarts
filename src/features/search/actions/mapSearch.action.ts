'use server';

import { SearchService } from '@/database/services/search.service';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { serializeForClient } from '@/shared/lib/serializeForClient';

export type MapSearchActionInput = {
  query?: string;
  showClubs?: boolean;
  showTournaments?: boolean;
};

export type MapSearchActionResult = {
  items: any[];
  counts?: { total: number };
};

export async function mapSearchAction(input: MapSearchActionInput): Promise<MapSearchActionResult> {
  const run = withTelemetry(
    'search.mapSearch',
    async (params: MapSearchActionInput) => {
      const { query = '', showClubs = true, showTournaments = true } = params;
      const { items, total } = await SearchService.searchMapItems(query, {
        showClubs,
        showTournaments,
        limit: 200,
      });
      return serializeForClient({
        items,
        counts: { total },
      }) as MapSearchActionResult;
    },
    { method: 'ACTION', metadata: { feature: 'search', actionName: 'mapSearch' } }
  );

  return run(input);
}
