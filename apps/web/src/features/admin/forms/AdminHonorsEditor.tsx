'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export type HonorRow = {
  title: string;
  year: number;
  type: 'rank' | 'tournament' | 'special';
  description?: string;
};

const EMPTY: HonorRow = { title: '', year: new Date().getFullYear(), type: 'special', description: '' };

function parseHonors(raw: unknown): HonorRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const o = item as Record<string, unknown>;
      const type = o.type;
      const t: HonorRow['type'] =
        type === 'rank' || type === 'tournament' || type === 'special' ? type : 'special';
      return {
        title: String(o.title ?? ''),
        year: Number(o.year) || new Date().getFullYear(),
        type: t,
        description: o.description != null ? String(o.description) : '',
      };
    })
    .filter((h) => h.title.trim());
}

type Props = {
  value: unknown;
  onChange: (rows: HonorRow[]) => void;
};

export function AdminHonorsEditor({ value, onChange }: Props) {
  const rows = parseHonors(value).length ? parseHonors(value) : [];

  const update = (next: HonorRow[]) => onChange(next.filter((h) => h.title.trim()));

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nincs kitüntetés — adj hozzá egy sort.</p>
      ) : (
        rows.map((row, i) => (
          <div key={i} className="border-border space-y-2 rounded-lg border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Cím</Label>
                <Input
                  value={row.title}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, title: e.target.value };
                    update(next);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>Év</Label>
                <Input
                  type="number"
                  value={row.year}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, year: parseInt(e.target.value, 10) || row.year };
                    update(next);
                  }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Típus</Label>
              <Select
                value={row.type}
                onValueChange={(v) => {
                  const next = [...rows];
                  next[i] = { ...row, type: v as HonorRow['type'] };
                  update(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rank">rank</SelectItem>
                  <SelectItem value="tournament">tournament</SelectItem>
                  <SelectItem value="special">special</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Leírás</Label>
              <Textarea
                value={row.description ?? ''}
                rows={2}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, description: e.target.value };
                  update(next);
                }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => update(rows.filter((_, j) => j !== i))}
            >
              Sor törlése
            </Button>
          </div>
        ))
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => update([...rows, { ...EMPTY }])}>
        + Kitüntetés
      </Button>
    </div>
  );
}
