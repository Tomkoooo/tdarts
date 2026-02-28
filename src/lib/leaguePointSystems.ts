export const POINT_SYSTEM_IDS = ['platform', 'remiz_christmas', 'ontour', 'goldfisch'] as const;

export type PointSystemId = (typeof POINT_SYSTEM_IDS)[number];
export type PointSystemInput = PointSystemId | 'gold_fisch' | string;

export interface PointSystemDefinition {
  id: PointSystemId;
  label: string;
  description: string;
}

export const POINT_SYSTEMS: PointSystemDefinition[] = [
  {
    id: 'platform',
    label: 'Platform',
    description: 'Geometric progression based points for knockout progression and winner bonus.'
  },
  {
    id: 'remiz_christmas',
    label: 'Remiz Christmas Series',
    description: 'Participation + group performance + placement based fixed points.'
  },
  {
    id: 'ontour',
    label: 'DartsBarlang OnTour',
    description: 'Fixed placement point table (45, 32, 24, 20, 16, 10, 4, 2).'
  },
  {
    id: 'goldfisch',
    label: 'Goldfisch',
    description: 'Fixed placement table with special values for tournaments under 8 players.'
  }
];

export function normalizePointSystemId(pointSystemType?: PointSystemInput): PointSystemId {
  if (pointSystemType === 'gold_fisch') {
    return 'goldfisch';
  }

  if (POINT_SYSTEM_IDS.includes(pointSystemType as PointSystemId)) {
    return pointSystemType as PointSystemId;
  }

  return 'platform';
}

export function isPointSystemId(value: string): value is PointSystemId {
  return POINT_SYSTEM_IDS.includes(value as PointSystemId);
}

export function getPointSystemDefinition(pointSystemType?: PointSystemInput): PointSystemDefinition {
  const normalized = normalizePointSystemId(pointSystemType);
  return POINT_SYSTEMS.find(system => system.id === normalized) || POINT_SYSTEMS[0];
}
