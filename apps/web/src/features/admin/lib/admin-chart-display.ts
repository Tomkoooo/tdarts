export type AdminChartDisplayType = 'area' | 'line' | 'bar';

export const ADMIN_CHART_TYPE_OPTIONS: { value: AdminChartDisplayType; label: string }[] = [
  { value: 'area', label: 'Terület' },
  { value: 'line', label: 'Vonal' },
  { value: 'bar', label: 'Oszlop' },
];

export function parseChartDisplayType(raw?: string | null): AdminChartDisplayType {
  if (raw === 'line' || raw === 'bar') return raw;
  return 'area';
}
