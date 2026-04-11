import { ApiRequestMetricModel } from '@tdarts/core';
import { connectMongo } from '@/lib/mongoose';

const LATENCY_BUCKET_BOUNDARIES_MS = [50, 100, 200, 300, 500, 800, 1200, 2000, 5000];

export type PercentileSeriesPoint = {
  bucket: string;
  calls: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
};

function percentileFromHistogram(histogram: number[], percentile: number): number {
  const total = histogram.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return 0;

  const threshold = total * percentile;
  let cumulative = 0;
  for (let i = 0; i < histogram.length; i += 1) {
    cumulative += histogram[i] || 0;
    if (cumulative >= threshold) {
      return LATENCY_BUCKET_BOUNDARIES_MS[i] ?? LATENCY_BUCKET_BOUNDARIES_MS[LATENCY_BUCKET_BOUNDARIES_MS.length - 1];
    }
  }

  return LATENCY_BUCKET_BOUNDARIES_MS[LATENCY_BUCKET_BOUNDARIES_MS.length - 1];
}

export async function getRecentPercentileSeries(hours = 24): Promise<PercentileSeriesPoint[]> {
  await connectMongo();
  const start = new Date(Date.now() - hours * 60 * 60 * 1000);

  const docs = await ApiRequestMetricModel.find({
    bucket: { $gte: start },
    method: { $in: ['ACTION', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
  })
    .sort({ bucket: 1 })
    .select('bucket count totalDurationMs durationHistogram')
    .lean();

  const byHour = new Map<string, { calls: number; totalDurationMs: number; histogram: number[] }>();
  for (const row of docs) {
    const key = new Date(row.bucket).toISOString().slice(0, 13) + ':00';
    const existing = byHour.get(key) || { calls: 0, totalDurationMs: 0, histogram: Array.from({ length: 10 }, () => 0) };
    existing.calls += row.count || 0;
    existing.totalDurationMs += row.totalDurationMs || 0;
    const histogram = Array.isArray(row.durationHistogram) ? row.durationHistogram : [];
    for (let i = 0; i < existing.histogram.length; i += 1) {
      existing.histogram[i] += histogram[i] || 0;
    }
    byHour.set(key, existing);
  }

  return Array.from(byHour.entries()).map(([bucket, value]) => ({
    bucket,
    calls: value.calls,
    avgLatencyMs: value.calls > 0 ? value.totalDurationMs / value.calls : 0,
    p50Ms: percentileFromHistogram(value.histogram, 0.5),
    p95Ms: percentileFromHistogram(value.histogram, 0.95),
    p99Ms: percentileFromHistogram(value.histogram, 0.99),
  }));
}
