import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getRecentPercentileSeries } from "@/features/telemetry/lib/p95Metrics";
import { TelemetryP95Chart } from "./TelemetryP95Chart";

export async function TelemetryP95Panel() {
  const points = await getRecentPercentileSeries(24);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Telemetry Percentiles (24h)</CardTitle>
        <CardDescription>Server-side p50/p95/p99 trend from persisted telemetry sink.</CardDescription>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">No telemetry samples available yet.</p>
        ) : (
          <TelemetryP95Chart points={points} />
        )}
      </CardContent>
    </Card>
  );
}
