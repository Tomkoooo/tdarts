import {
  formatHonorAverageBucket,
  getHonorAverageBadgeColorClass,
  getPlayerHonorAverage,
  getScoreColor,
} from '@/lib/honorAvgBadge';

describe('honor avg badge helpers', () => {
  it('formats to 5-point bucket with plus suffix', () => {
    expect(formatHonorAverageBucket(40)).toBe('40+');
    expect(formatHonorAverageBucket(44.9)).toBe('40+');
    expect(formatHonorAverageBucket(45)).toBe('45+');
    expect(formatHonorAverageBucket(50.1)).toBe('50+');
  });

  it('returns neutral classes and uses dynamic hsl palette', () => {
    expect(getHonorAverageBadgeColorClass(35)).toContain('text-white');
    expect(getHonorAverageBadgeColorClass(60)).toContain('border');
    expect(getHonorAverageBadgeColorClass(90)).toContain('shadow-sm');
  });

  it('maps scores into premium hsl gradient bands', () => {
    expect(getScoreColor(11)).toBe('hsl(208 72% 34%)');
    expect(getScoreColor(41)).toBe('hsl(154 84% 32%)');
    expect(getScoreColor(59)).toBe('hsl(38 100% 44%)');
    expect(getScoreColor(78)).toBe('hsl(0 100% 44%)');
    expect(getScoreColor(92)).toBe('hsl(285 96% 36%)');
    expect(getScoreColor(120)).toBe('hsl(262 100% 40%)');
  });

  it('supports light and dark color variants', () => {
    expect(getScoreColor(70, 'base')).toBe('hsl(10 92% 36%)');
    expect(getScoreColor(70, 'light')).toBe('hsl(10 92% 44%)');
    expect(getScoreColor(70, 'dark')).toBe('hsl(10 92% 28%)');
  });

  it('extracts average from both direct and playerReference stats', () => {
    expect(getPlayerHonorAverage({ stats: { last10ClosedAvg: 52.3 } })).toBe(52.3);
    expect(getPlayerHonorAverage({ playerReference: { stats: { last10ClosedAvg: 47.1 } } })).toBe(47.1);
    expect(getPlayerHonorAverage({})).toBeNull();
  });
});
