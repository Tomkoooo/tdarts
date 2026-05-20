"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { IncidentsData } from "./types";

type Props = {
  incidents: IncidentsData | null;
  formatBytes: (bytes: number) => string;
  onErrorClick?: (routeKey: string, method: string, errorId: string) => void;
};

export function TelemetryIncidentsPanel({ incidents, formatBytes, onErrorClick }: Props) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Incidents</CardTitle>
        <CardDescription>Active anomalies and latest error events</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Active anomalies</p>
          <div className="space-y-2">
            {(incidents?.anomalies || []).slice(0, 5).map((row, idx) => (
              <div key={`${row.method}-${row.routeKey}-${row.signal}-${idx}`} className="rounded-md border border-border p-2 text-xs">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <code className="truncate">
                    {row.method} {row.routeKey}
                  </code>
                  <Badge variant="destructive">{row.ratio}x</Badge>
                </div>
                <p className="text-muted-foreground">
                  {row.signal}: {row.currentValue} vs {row.baselineValue}
                </p>
              </div>
            ))}
            {(!incidents || incidents.anomalies.length === 0) && (
              <p className="text-sm text-muted-foreground">No active anomalies.</p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Latest errors</p>
          <div className="space-y-2">
            {(incidents?.errors || []).slice(0, 6).map((row, idx) => (
              <button
                key={`${row.id}-${idx}`}
                type="button"
                onClick={() => row.id && onErrorClick?.(row.routeKey, row.method, row.id)}
                className="w-full rounded-md border border-border p-2 text-left text-xs transition-colors hover:bg-muted/40"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <code className="truncate">
                    {row.status} {row.method} {row.routeKey}
                  </code>
                  <span>{new Date(row.occurredAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-muted-foreground">
                  {row.durationMs}ms | {formatBytes(row.requestBytes + row.responseBytes)} | {row.errorMessage || row.source}
                </p>
              </button>
            ))}
            {(!incidents || incidents.errors.length === 0) && (
              <p className="text-sm text-muted-foreground">No recent errors.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
