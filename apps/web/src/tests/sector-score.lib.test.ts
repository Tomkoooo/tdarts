import {
  canUseTripleOnSector,
  dartPoints,
  parseSectorString,
} from '@/lib/darts/sectorScore';

describe('sectorScore — dart-by-dart scoring rules', () => {
  describe('dartPoints', () => {
    it('scores singles, doubles, and triples on numbered sectors', () => {
      expect(dartPoints(20, 1)).toBe(20);
      expect(dartPoints(16, 2)).toBe(32);
      expect(dartPoints(20, 3)).toBe(60);
    });

    it('allows single bull (25) and outer bull (50) only as singles', () => {
      expect(dartPoints(25, 1)).toBe(25);
      expect(dartPoints(25, 2)).toBe(0);
      expect(dartPoints(25, 3)).toBe(0);
      expect(dartPoints(50, 1)).toBe(50);
      expect(dartPoints(50, 2)).toBe(0);
    });

    it('returns 0 for invalid sectors', () => {
      expect(dartPoints(0, 1)).toBe(0);
      expect(dartPoints(21, 1)).toBe(0);
    });
  });

  describe('canUseTripleOnSector', () => {
    it('allows triple only on sectors 1–20', () => {
      expect(canUseTripleOnSector(1)).toBe(true);
      expect(canUseTripleOnSector(20)).toBe(true);
      expect(canUseTripleOnSector(25)).toBe(false);
      expect(canUseTripleOnSector(0)).toBe(false);
    });
  });

  describe('parseSectorString', () => {
    it('parses Scolia-style sector codes', () => {
      expect(parseSectorString('S20')).toEqual({ score: 20, multiplier: 1, value: 20 });
      expect(parseSectorString('D16')).toEqual({ score: 32, multiplier: 2, value: 16 });
      expect(parseSectorString('T20')).toEqual({ score: 60, multiplier: 3, value: 20 });
      expect(parseSectorString('Bull')).toEqual({ score: 50, multiplier: 1, value: 50 });
      expect(parseSectorString('25')).toEqual({ score: 25, multiplier: 1, value: 25 });
    });

    it('treats miss / empty as zero', () => {
      expect(parseSectorString('None')).toEqual({ score: 0, multiplier: 1, value: 0 });
      expect(parseSectorString('')).toEqual({ score: 0, multiplier: 1, value: 0 });
    });

    it('returns null for unrecognized input', () => {
      expect(parseSectorString('invalid')).toBeNull();
    });
  });
});
