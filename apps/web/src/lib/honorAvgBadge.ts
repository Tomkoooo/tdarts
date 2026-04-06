export function formatHonorAverageBucket(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }

  const bucket = Math.floor(value / 5) * 5;
  return `${bucket}+`;
}

type ScoreVariant = 'base' | 'light' | 'dark';

type ScoreBucket = {
  min: number;
  max: number;
  h: [number, number];
  s: [number, number];
  l: [number, number];
};

const SCORE_BUCKETS: ScoreBucket[] = [
  { min: 10, max: 20, h: [208, 196], s: [72, 84], l: [34, 42] }, // soft baby blue
  { min: 20, max: 30, h: [194, 184], s: [80, 92], l: [34, 42] }, // gentle cyan
  { min: 30, max: 40, h: [176, 166], s: [82, 94], l: [33, 41] }, // fresh teal / turquoise
  { min: 40, max: 50, h: [154, 138], s: [84, 96], l: [32, 40] }, // vibrant emerald green
  { min: 50, max: 60, h: [72, 38], s: [94, 100], l: [34, 44] }, // electric yellow-green -> rich gold (hard split from 40s)
  { min: 60, max: 70, h: [28, 42], s: [92, 100], l: [36, 44] }, // warm orange -> bright amber
  { min: 70, max: 80, h: [10, 0], s: [92, 100], l: [36, 44] }, // energetic bright red -> crimson
  { min: 80, max: 90, h: [338, 300], s: [92, 100], l: [36, 44] }, // magenta-red -> rich purple
  { min: 90, max: 100, h: [292, 262], s: [94, 100], l: [34, 40] }, // rich purple -> deep violet
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function getScoreColor(score: number, variant: ScoreVariant = 'base'): string {
  const safeScore = clamp(Number.isFinite(score) ? score : 10, 10, 100);
  const bucket =
    SCORE_BUCKETS.find((item) => safeScore >= item.min && (safeScore < item.max || (item.max === 100 && safeScore <= 100))) ??
    SCORE_BUCKETS[0];

  const inBucket = clamp(safeScore - bucket.min, 0, 9.999);
  const shadeIndex = Math.min(4, Math.floor(inBucket / 2)); // 0..4
  const t = shadeIndex / 4;

  const h = Math.round(lerp(bucket.h[0], bucket.h[1], t));
  const s = Math.round(lerp(bucket.s[0], bucket.s[1], t));
  let l = Math.round(lerp(bucket.l[0], bucket.l[1], t));

  if (variant === 'light') l = clamp(l + 8, 0, 100);
  if (variant === 'dark') l = clamp(l - 8, 0, 100);

  return `hsl(${h} ${s}% ${l}%)`;
}

export function getHonorAverageBadgeColorClass(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return 'border-muted/40 bg-muted/20 text-muted-foreground';
  }
  return 'text-white shadow-sm border';
}

export function getPlayerHonorAverage(value: unknown): number | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as {
    stats?: { last10ClosedAvg?: number };
    playerReference?: { stats?: { last10ClosedAvg?: number } };
  };

  const avg = candidate.stats?.last10ClosedAvg ?? candidate.playerReference?.stats?.last10ClosedAvg;
  if (!Number.isFinite(avg as number) || (avg as number) <= 0) {
    return null;
  }

  return Number(avg);
}
