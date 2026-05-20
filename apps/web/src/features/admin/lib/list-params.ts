export type AdminListSortDir = 'asc' | 'desc';

export type AdminListParams = {
  q?: string;
  page: number;
  limit: number;
  sort?: string;
  dir?: AdminListSortDir;
};

export type AdminListSearchParamsInput = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAdminListParams(
  searchParams: AdminListSearchParamsInput,
  defaults?: { limit?: number; sort?: string; dir?: AdminListSortDir },
): AdminListParams {
  const pageRaw = parseInt(first(searchParams.page) ?? '1', 10);
  const limitRaw = parseInt(first(searchParams.limit) ?? String(defaults?.limit ?? 20), 10);
  const dirRaw = first(searchParams.dir);
  const sortFromUrl = first(searchParams.sort);

  return {
    q: first(searchParams.q)?.trim() || undefined,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    limit: Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 20,
    sort: sortFromUrl || defaults?.sort,
    dir: dirRaw === 'asc' || dirRaw === 'desc' ? dirRaw : (sortFromUrl ? 'desc' : defaults?.dir),
  };
}

export function toListSort(params: AdminListParams): { key: string; dir: AdminListSortDir } | undefined {
  if (!params.sort) return undefined;
  return { key: params.sort, dir: params.dir ?? 'desc' };
}

/** Query keys where `all` is a real value (e.g. KPI “all time”), not “no filter”. */
const QUERY_KEYS_KEEP_ALL_VALUE = new Set(['kpiRange']);

export function buildListQueryString(
  base: AdminListParams,
  patch: Partial<AdminListParams & Record<string, string | undefined>>,
): string {
  const merged = { ...base, ...patch };
  const sp = new URLSearchParams();
  if (merged.q) sp.set('q', merged.q);
  if (merged.page > 1) sp.set('page', String(merged.page));
  if (merged.limit !== 20) sp.set('limit', String(merged.limit));
  if (merged.sort) {
    sp.set('sort', merged.sort);
    sp.set('dir', merged.dir ?? 'desc');
  }
  const extras = { ...patch };
  delete extras.q;
  delete extras.page;
  delete extras.limit;
  delete extras.sort;
  delete extras.dir;
  for (const [key, value] of Object.entries(extras)) {
    if (value == null || value === '') continue;
    if (value === 'all' && !QUERY_KEYS_KEEP_ALL_VALUE.has(key)) continue;
    sp.set(key, String(value));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}
