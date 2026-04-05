export const LATENCY_BUCKET_BOUNDARIES_MS = [50, 100, 200, 300, 500, 800, 1200, 2000, 5000];

export function emptyLatencyHistogram(): number[] {
  return Array.from({ length: LATENCY_BUCKET_BOUNDARIES_MS.length + 1 }, () => 0);
}

export function mergeLatencyHistograms(target: number[], source: number[] | undefined): number[] {
  const out = [...target];
  if (!Array.isArray(source)) return out;
  for (let i = 0; i < out.length; i += 1) {
    out[i] = (out[i] || 0) + (source[i] || 0);
  }
  return out;
}

export function percentileFromHistogram(histogram: number[], percentile: number): number {
  const total = histogram.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return 0;

  const threshold = Math.ceil((percentile / 100) * total);
  let cumulative = 0;
  for (let i = 0; i < histogram.length; i += 1) {
    cumulative += histogram[i] || 0;
    if (cumulative >= threshold) {
      return LATENCY_BUCKET_BOUNDARIES_MS[i] ?? LATENCY_BUCKET_BOUNDARIES_MS[LATENCY_BUCKET_BOUNDARIES_MS.length - 1] * 1.2;
    }
  }

  return LATENCY_BUCKET_BOUNDARIES_MS[LATENCY_BUCKET_BOUNDARIES_MS.length - 1] * 1.2;
}
