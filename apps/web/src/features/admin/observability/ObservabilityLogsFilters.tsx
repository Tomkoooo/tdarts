'use client';

import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminListToolbar } from '@/features/admin/list/AdminListToolbar';

type Props = {
  preset?: 'admin';
  level?: string;
  category?: string;
  targetUserId?: string;
  actorUserId?: string;
};

export function ObservabilityLogsFilters({ preset, level, category }: Props) {
  const router = useRouter();

  const apply = (updates: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    if (preset === 'admin' || updates.preset === 'admin') u.set('preset', 'admin');
    const lv = updates.level !== undefined ? updates.level : level;
    const cat = updates.category !== undefined ? updates.category : category;
    if (lv) u.set('level', lv);
    if (cat) u.set('category', cat);
    const qs = u.toString();
    router.push(qs ? `/admin/observability/logs?${qs}` : '/admin/observability/logs');
  };

  return (
    <AdminListToolbar>
      <div className="space-y-1.5">
        <Label>Level</Label>
        <Select
          value={level || 'all'}
          onValueChange={(v) => apply({ level: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes</SelectItem>
            <SelectItem value="error">error</SelectItem>
            <SelectItem value="warn">warn</SelectItem>
            <SelectItem value="info">info</SelectItem>
            <SelectItem value="debug">debug</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Kategória</Label>
        <Select
          value={category || 'all'}
          onValueChange={(v) => apply({ category: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes</SelectItem>
            <SelectItem value="auth">auth</SelectItem>
            <SelectItem value="club">club</SelectItem>
            <SelectItem value="tournament">tournament</SelectItem>
            <SelectItem value="api">api</SelectItem>
            <SelectItem value="system">system</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        variant={preset === 'admin' ? 'default' : 'outline'}
        size="sm"
        className="self-end"
        onClick={() => apply({ preset: preset === 'admin' ? undefined : 'admin' })}
      >
        {preset === 'admin' ? 'Admin audit' : 'Admin audit'}
      </Button>
      <Button type="button" variant="secondary" size="sm" className="self-end" onClick={() => apply({})}>
        Szűrők törlése
      </Button>
    </AdminListToolbar>
  );
}
