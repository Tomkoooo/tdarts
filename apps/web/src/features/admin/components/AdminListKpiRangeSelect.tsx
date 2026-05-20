'use client';

import { useState } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import { buildListQueryString, type AdminListParams } from '@/features/admin/lib/list-params';
import {
  ADMIN_CHART_TYPE_OPTIONS,
  parseChartDisplayType,
  type AdminChartDisplayType,
} from '@/features/admin/lib/admin-chart-display';
import type { AdminListKpiGranularity, AdminListKpiRange } from '@tdarts/services';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { BarChart3, LineChart, AreaChart } from 'lucide-react';

const QUICK_RANGES: { value: AdminListKpiRange; label: string }[] = [
  { value: '1d', label: '1 nap' },
  { value: '7d', label: '7 nap' },
  { value: '30d', label: '1 hónap' },
  { value: '1y', label: '1 év' },
  { value: 'all', label: 'Összes' },
];

const GROUP_OPTIONS: { value: AdminListKpiGranularity; label: string }[] = [
  { value: 'hour', label: 'Óra' },
  { value: 'day', label: 'Nap' },
  { value: 'week', label: 'Hét' },
  { value: 'month', label: 'Hónap' },
  { value: 'year', label: 'Év' },
];

const CHART_TYPE_ICONS: Record<AdminChartDisplayType, typeof AreaChart> = {
  area: AreaChart,
  line: LineChart,
  bar: BarChart3,
};

export type AdminChartRangeControl = {
  value?: string;
  from?: string;
  to?: string;
  group?: string;
  chartType?: string;
  params: AdminListParams;
  extraQuery?: Record<string, string | undefined>;
};

type Props = AdminChartRangeControl & {
  embedded?: boolean;
};

function parseRange(v?: string): AdminListKpiRange {
  if (v === '1d' || v === '7d' || v === '30d' || v === '1y' || v === 'all' || v === 'custom') return v;
  if (v === '90d') return '30d';
  return '7d';
}

function parseGroup(v?: string): AdminListKpiGranularity | undefined {
  if (v === 'hour' || v === 'day' || v === 'week' || v === 'month' || v === 'year') return v;
  return undefined;
}

export function AdminListKpiRangeSelect({
  value,
  from,
  to,
  group,
  chartType,
  params,
  extraQuery,
  embedded = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const preset = parseRange(value);
  const activeGroup = parseGroup(group);
  const displayType = parseChartDisplayType(chartType);

  const [draftFrom, setDraftFrom] = useState(from ?? '');
  const [draftTo, setDraftTo] = useState(to ?? new Date().toISOString().slice(0, 10));
  const [showCustom, setShowCustom] = useState(preset === 'custom' || Boolean(from && to));

  const apply = (patch: Record<string, string | undefined>) => {
    const qs = buildListQueryString(params, {
      ...extraQuery,
      ...patch,
      page: 1,
    } as Partial<AdminListParams & Record<string, string | undefined>>);
    router.push(`${pathname}${qs}`);
  };

  const withChart = (patch: Record<string, string | undefined>) => ({
    ...patch,
    kpiChart: patch.kpiChart ?? displayType,
  });

  const applyPreset = (range: AdminListKpiRange) => {
    setShowCustom(false);
    apply(
      withChart({
        kpiRange: range,
        kpiFrom: undefined,
        kpiTo: undefined,
        kpiGroup: activeGroup,
      }),
    );
  };

  return (
    <div
      className={cn(
        'space-y-2.5',
        embedded ? 'bg-muted/40 rounded-md border border-dashed p-2.5' : 'space-y-3 rounded-lg border p-3',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {!embedded ? (
          <Label className="text-muted-foreground text-xs font-medium">Időszak</Label>
        ) : null}
        <div className="flex flex-wrap gap-1">
          {QUICK_RANGES.map((r) => (
            <Button
              key={r.value}
              type="button"
              size="sm"
              variant={preset === r.value && !showCustom ? 'default' : 'outline'}
              className="h-7 px-2 text-xs"
              onClick={() => applyPreset(r.value)}
            >
              {r.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={showCustom || preset === 'custom' ? 'default' : 'outline'}
            className="h-7 px-2 text-xs"
            onClick={() => setShowCustom(true)}
          >
            Egyedi
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Label className="text-muted-foreground text-[10px] whitespace-nowrap">X tengely</Label>
          <Select
            value={activeGroup ?? 'auto'}
            onValueChange={(v) => {
              apply(
                withChart({
                  kpiRange: preset,
                  kpiFrom: from,
                  kpiTo: to,
                  kpiGroup: v === 'auto' ? undefined : v,
                }),
              );
            }}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue placeholder="Automatikus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Automatikus</SelectItem>
              {GROUP_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className="text-muted-foreground text-[10px] whitespace-nowrap">Megjelenés</Label>
          <div className="flex gap-0.5 rounded-md border p-0.5">
            {ADMIN_CHART_TYPE_OPTIONS.map((o) => {
              const Icon = CHART_TYPE_ICONS[o.value];
              const active = displayType === o.value;
              return (
                <Button
                  key={o.value}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'ghost'}
                  className="h-7 gap-1 px-2 text-xs"
                  title={o.label}
                  onClick={() =>
                    apply(
                      withChart({
                        kpiRange: preset,
                        kpiFrom: from,
                        kpiTo: to,
                        kpiGroup: activeGroup,
                        kpiChart: o.value,
                      }),
                    )
                  }
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{o.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {showCustom ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-0.5">
            <Label className="text-muted-foreground text-[10px]">Kezdő</Label>
            <Input
              type="date"
              className="h-7 w-[140px] text-xs"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-muted-foreground text-[10px]">Záró</Label>
            <Input
              type="date"
              className="h-7 w-[140px] text-xs"
              value={draftTo}
              onChange={(e) => setDraftTo(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-7"
            disabled={!draftFrom || !draftTo}
            onClick={() =>
              apply(
                withChart({
                  kpiRange: 'custom',
                  kpiFrom: draftFrom,
                  kpiTo: draftTo,
                  kpiGroup: activeGroup,
                }),
              )
            }
          >
            Alkalmaz
          </Button>
        </div>
      ) : null}
    </div>
  );
}
