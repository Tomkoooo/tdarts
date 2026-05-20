import { Badge } from '@/components/ui/Badge';

export function formatBool(value: boolean): React.ReactNode {
  return value ? (
    <Badge variant="secondary">Igen</Badge>
  ) : (
    <span className="text-muted-foreground">Nem</span>
  );
}

export function formatText(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}
