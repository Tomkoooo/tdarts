import {
  emptyLatencyHistogram,
  mergeLatencyHistograms,
  percentileFromHistogram,
} from '@/shared/lib/telemetry/percentiles';

describe('telemetry percentiles', () => {
  it('creates empty histogram with expected size', () => {
    const histogram = emptyLatencyHistogram();
    expect(histogram.length).toBeGreaterThan(0);
    expect(histogram.every((v) => v === 0)).toBe(true);
  });

  it('merges histogram buckets', () => {
    const merged = mergeLatencyHistograms([1, 2, 0], [3, 0, 4]);
    expect(merged).toEqual([4, 2, 4]);
  });

  it('returns percentile from histogram distribution', () => {
    expect(percentileFromHistogram([0, 10, 0, 0], 95)).toBe(100);
    expect(percentileFromHistogram([0, 0, 0], 95)).toBe(0);
  });
});
