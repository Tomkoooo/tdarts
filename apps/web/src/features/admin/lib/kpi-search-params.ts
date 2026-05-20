export type AdminKpiSearchParams = {
  kpiRange?: string;
  kpiFrom?: string;
  kpiTo?: string;
  kpiGroup?: string;
  kpiChart?: string;
};

export function parseKpiSearchParams(
  sp: Record<string, string | string[] | undefined>,
): AdminKpiSearchParams {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return {
    kpiRange: first(sp.kpiRange),
    kpiFrom: first(sp.kpiFrom),
    kpiTo: first(sp.kpiTo),
    kpiGroup: first(sp.kpiGroup),
    kpiChart: first(sp.kpiChart),
  };
}

export const ADMIN_KPI_LIST_PARAMS = { page: 1, limit: 20 } as const;
