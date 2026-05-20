export type DartMultiplier = 1 | 2 | 3;

export type DartSectorValue = number | 'bull' | 'miss';

export interface ParsedSector {
  score: number;
  multiplier: DartMultiplier;
  value: number;
}

/** Points for a board sector and multiplier (standard steel-tip rules). */
export function dartPoints(sector: number, multiplier: DartMultiplier): number {
  if (sector < 1 || sector > 20) {
    if (sector === 25) return multiplier === 1 ? 25 : 0;
    if (sector === 50) return multiplier === 1 ? 50 : 0;
    return 0;
  }
  if (multiplier === 3 && sector === 25) return 0;
  return sector * multiplier;
}

/** Parse Scolia-style sector strings (S20, D16, T20, Bull, 25). */
export function parseSectorString(sector: string): ParsedSector | null {
  if (sector === 'None' || !sector) {
    return { score: 0, multiplier: 1, value: 0 };
  }
  if (sector === 'Bull') {
    return { score: 50, multiplier: 1, value: 50 };
  }
  if (sector === '25') {
    return { score: 25, multiplier: 1, value: 25 };
  }

  const match = sector.match(/^([SDT])(\d+)$/i);
  if (match) {
    const [, type, valStr] = match;
    const value = parseInt(valStr, 10);
    let multiplier: DartMultiplier = 1;
    if (type.toUpperCase() === 'D') multiplier = 2;
    if (type.toUpperCase() === 'T') multiplier = 3;

    return {
      score: value * multiplier,
      multiplier,
      value,
    };
  }

  return null;
}

export function canUseTripleOnSector(sector: number): boolean {
  return sector >= 1 && sector <= 20;
}

export const DART_NUMBER_SECTORS: Array<{ label: string; value: number }> = Array.from(
  { length: 20 },
  (_, i) => ({ label: String(i + 1), value: i + 1 })
);

export const DART_MISS_SECTOR = { label: 'Miss', value: 0 };

export const DART_BULL_SECTORS: Array<{ label: string; value: number }> = [
  { label: '25', value: 25 },
  { label: 'Bull', value: 50 },
];

export const DART_BOARD_SECTORS: Array<{ label: string; value: number }> = [
  ...DART_NUMBER_SECTORS,
  ...DART_BULL_SECTORS,
];
