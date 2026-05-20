"use client";

import { TelemetryGranularity, TelemetryMetric, TelemetryRange } from "./types";

type Props = {
  range: TelemetryRange;
  granularity: TelemetryGranularity;
  method: string;
  routeSearch: string;
  metric: TelemetryMetric;
  onlyProblematic: boolean;
  customStart: string;
  customEnd: string;
  isLoading: boolean;
  onRangeChange: (value: TelemetryRange) => void;
  onGranularityChange: (value: TelemetryGranularity) => void;
  onMethodChange: (value: string) => void;
  onRouteSearchChange: (value: string) => void;
  onMetricChange: (value: TelemetryMetric) => void;
  onOnlyProblematicChange: (value: boolean) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  onApplyCustom: () => void;
  onRefresh: () => void;
};

const selectClass = "min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-xs sm:text-sm";
const inputClass = "min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-xs sm:text-sm";

export function TelemetryFilterBar(props: Props) {
  return (
    <div className="sticky top-0 z-10 rounded-xl border border-border bg-background/95 p-2 shadow-sm backdrop-blur sm:p-3">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <select value={props.range} onChange={(e) => props.onRangeChange(e.target.value as TelemetryRange)} className={selectClass}>
          <option value="24h">24h</option>
          <option value="7d">7d</option>
          <option value="30d">30d</option>
          <option value="90d">90d</option>
          <option value="custom">Custom</option>
        </select>
        <select value={props.granularity} onChange={(e) => props.onGranularityChange(e.target.value as TelemetryGranularity)} className={selectClass}>
          <option value="minute">Minute</option>
          <option value="hour">Hour</option>
          <option value="day">Day</option>
        </select>
        <select value={props.method} onChange={(e) => props.onMethodChange(e.target.value)} className={selectClass}>
          <option value="ALL">All</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          value={props.routeSearch}
          onChange={(e) => props.onRouteSearchChange(e.target.value)}
          placeholder="Filter route..."
          className={`${inputClass} flex-1 basis-32`}
        />
        <select value={props.metric} onChange={(e) => props.onMetricChange(e.target.value as TelemetryMetric)} className={selectClass}>
          <option value="calls">Calls</option>
          <option value="latency">Latency</option>
          <option value="traffic">Traffic</option>
          <option value="errors">Errors</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs sm:text-sm">
          <input type="checkbox" checked={props.onlyProblematic} onChange={(e) => props.onOnlyProblematicChange(e.target.checked)} />
          <span className="hidden sm:inline">Only problematic</span>
          <span className="sm:hidden">Issues</span>
        </label>
        <button
          type="button"
          onClick={props.onRefresh}
          disabled={props.isLoading}
          className="ml-auto rounded-md border border-border bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-60 sm:text-sm"
        >
          {props.isLoading ? "..." : "Refresh"}
        </button>
      </div>
      {props.range === "custom" && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="datetime-local" value={props.customStart} onChange={(e) => props.onCustomStartChange(e.target.value)} className={`${inputClass} flex-1 basis-36`} />
          <input type="datetime-local" value={props.customEnd} onChange={(e) => props.onCustomEndChange(e.target.value)} className={`${inputClass} flex-1 basis-36`} />
          <button type="button" onClick={props.onApplyCustom} className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground sm:text-sm">
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
