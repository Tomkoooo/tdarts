"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PercentileSeriesPoint } from "@/features/telemetry/lib/p95Metrics";

type Props = {
  points: PercentileSeriesPoint[];
};

export function TelemetryP95Chart({ points }: Props) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
          <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v)}ms`} />
          <Tooltip
            formatter={(value: number, name: string) => [`${Math.round(value)}ms`, name]}
            labelFormatter={(value) => `Bucket: ${value}`}
          />
          <Line type="monotone" dataKey="p50Ms" name="p50" stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="p95Ms" name="p95" stroke="#f97316" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="p99Ms" name="p99" stroke="#ef4444" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
