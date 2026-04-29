"use client";

import { useEffect, useState } from 'react';
import { adminAdsActions } from '@/features/ad-management/actions/adminAds.action';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

type TelemetryData = {
  summary: {
    impressions: number;
    clicks: number;
    interactions: number;
    uniqueActors: number;
    ctr: number;
    avgDecisionLatencyMs: number;
  };
  trend: Array<{ bucketAt: string; impressions: number; clicks: number; interactions: number }>;
};

export function AdsTelemetryDashboard() {
  const [data, setData] = useState<TelemetryData | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await adminAdsActions.telemetrySummary({});
      if (res?.ok) setData(res.data as TelemetryData);
    })();
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">Loading ad telemetry...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Impressions</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data.summary.impressions}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Clicks / CTR</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {data.summary.clicks} / {(data.summary.ctr * 100).toFixed(2)}%
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Interactions</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data.summary.interactions}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Hourly trend</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.trend.slice(-24).map((row) => (
              <div key={row.bucketAt} className="flex items-center justify-between rounded border p-2 text-sm">
                <span>{new Date(row.bucketAt).toLocaleString()}</span>
                <span className="text-muted-foreground">
                  imp {row.impressions} • clk {row.clicks} • int {row.interactions}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

