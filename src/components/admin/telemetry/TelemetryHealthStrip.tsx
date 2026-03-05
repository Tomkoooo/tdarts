"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { OverviewData } from "./types";

type Props = {
  overview: OverviewData | null;
  formatBytes: (bytes: number) => string;
};

function BaselineIndicator({ current, baseline, unit = "", invert = false }: { current: number; baseline: number; unit?: string; invert?: boolean }) {
  if (!baseline || baseline === 0) return null;
  const pctChange = ((current - baseline) / baseline) * 100;
  if (!Number.isFinite(pctChange)) return null;
  const isWorse = invert ? pctChange < 0 : pctChange > 0;
  const sign = pctChange > 0 ? "+" : "";
  return (
    <span className={`text-xs ${isWorse ? "text-red-500" : "text-green-600"}`}>
      {sign}{pctChange.toFixed(1)}%{unit ? ` ${unit}` : ""} vs baseline
    </span>
  );
}

export function TelemetryHealthStrip({ overview, formatBytes }: Props) {
  const statusVariant =
    overview?.status === "critical"
      ? "destructive"
      : overview?.status === "degraded"
        ? "secondary"
        : "outline";

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm text-muted-foreground">Platform health</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-xl font-semibold capitalize">{overview?.status || "unknown"}</span>
          <Badge variant={statusVariant}>{overview?.incidents.activeAnomalies || 0} anomalies</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm text-muted-foreground">Calls</CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold tabular-nums">{overview?.kpis.totalCalls ?? 0}</CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm text-muted-foreground">Errors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tabular-nums">{overview?.kpis.totalErrors ?? 0}</span>
            <span className="text-sm text-muted-foreground">({overview?.kpis.errorRate ?? 0}%)</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-orange-500">{overview?.incidents.count4xx ?? 0} 4xx</span>
            <span className="text-red-500">{overview?.incidents.count5xx ?? 0} 5xx</span>
          </div>
          <BaselineIndicator current={overview?.kpis.errorRate ?? 0} baseline={overview?.kpis.baselineErrorRate ?? 0} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm text-muted-foreground">Avg / Peak latency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-semibold tabular-nums">{overview?.kpis.avgLatencyMs ?? 0}ms</span>
            <span className="text-sm text-muted-foreground">/ {overview?.kpis.peakLatencyMs ?? 0}ms</span>
          </div>
          <BaselineIndicator current={overview?.kpis.avgLatencyMs ?? 0} baseline={overview?.kpis.baselineAvgLatencyMs ?? 0} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm text-muted-foreground">Avg packet</CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold">{formatBytes(overview?.kpis.avgPacketBytes ?? 0)}</CardContent>
      </Card>
    </div>
  );
}
