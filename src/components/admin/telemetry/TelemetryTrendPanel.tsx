"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TelemetryMetric, TrendPoint } from "./types";

type Props = {
  metric: TelemetryMetric;
  points: TrendPoint[];
  formatBytes: (bytes: number) => string;
  compact?: boolean;
};

const METRIC_CONFIG: Record<TelemetryMetric, { title: string; currentName: string; baselineName: string; hasBaseline: boolean }> = {
  calls: { title: "Request volume", currentName: "Calls", baselineName: "Baseline avg", hasBaseline: true },
  latency: { title: "Avg latency (ms)", currentName: "Current latency", baselineName: "Baseline avg latency", hasBaseline: true },
  errors: { title: "Error rate (%)", currentName: "Error rate", baselineName: "", hasBaseline: false },
  traffic: { title: "Traffic volume", currentName: "Traffic", baselineName: "", hasBaseline: false },
};

export function TelemetryTrendPanel({ metric, points, formatBytes, compact = false }: Props) {
  const config = METRIC_CONFIG[metric];

  const mapped = useMemo(() => points.map((point) => {
    const value =
      metric === "calls" ? point.calls
        : metric === "errors" ? point.errorRate
          : metric === "latency" ? point.avgLatencyMs
            : point.totalBytes;
    const baseline =
      metric === "calls" ? point.baselineCalls
        : metric === "latency" ? point.baselineLatencyMs
          : undefined;
    return { label: point.label, value, ...(baseline !== undefined ? { baseline } : {}) };
  }), [points, metric]);

  const periodAvg = useMemo(() => {
    if (mapped.length === 0) return 0;
    const sum = mapped.reduce((acc, p) => acc + (p.value || 0), 0);
    return sum / mapped.length;
  }, [mapped]);
  const hasBaselineSeries = useMemo(
    () => mapped.some((point) => typeof point.baseline === "number" && point.baseline > 0),
    [mapped]
  );

  const tickFormatter = (value: number) => {
    if (metric === "traffic") return formatBytes(value);
    if (metric === "errors") return `${value.toFixed(1)}%`;
    if (metric === "latency") return `${Math.round(value)}ms`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return String(Math.round(value));
  };

  const tooltipFormatter = (value: unknown, name: unknown): [string, string | number] => {
    const numericValue = typeof value === "number" ? value : Number(value ?? 0);
    const label =
      typeof name === "string" || typeof name === "number"
        ? name
        : "value";
    const formatted =
      metric === "traffic" ? formatBytes(numericValue)
        : metric === "errors" ? `${numericValue.toFixed(2)}%`
          : metric === "latency" ? `${numericValue.toFixed(1)}ms`
            : String(Math.round(numericValue));
    return [formatted, label];
  };

  const avgLabel =
    metric === "traffic" ? formatBytes(periodAvg)
      : metric === "errors" ? `${periodAvg.toFixed(2)}%`
        : metric === "latency" ? `${Math.round(periodAvg)}ms`
          : periodAvg >= 1000 ? `${(periodAvg / 1000).toFixed(1)}k` : String(Math.round(periodAvg));

  const chartHeight = compact ? 200 : 280;

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className={compact ? "pb-1 pt-3 px-4" : "pb-2"}>
        <CardTitle className="text-sm">{config.title}</CardTitle>
      </CardHeader>
      <CardContent className={compact ? "px-3 pb-3" : ""}>
        <div style={{ height: chartHeight }} className="w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={mapped} margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={compact ? 60 : 40}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={tickFormatter}
                width={compact ? 48 : 56}
              />
              <Tooltip formatter={tooltipFormatter} />
              {!compact && <Legend verticalAlign="top" height={24} iconSize={10} wrapperStyle={{ fontSize: 11 }} />}

              {/* Period average as a solid reference line */}
              {periodAvg > 0 && (
                <ReferenceLine
                  y={periodAvg}
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={
                    compact
                      ? undefined
                      : {
                          value: `avg: ${avgLabel}`,
                          position: "insideTopRight",
                          fill: "#10b981",
                          fontSize: 10,
                        }
                  }
                />
              )}

              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                fill="#6366f133"
                strokeWidth={2}
                name={config.currentName}
              />
              {config.hasBaseline && hasBaselineSeries && (
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  name={config.baselineName}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
