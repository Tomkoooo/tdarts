'use client';

import { useRouter } from '@/i18n/routing';
import { Input } from '@/components/ui/Input';
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
  requestId?: string;
  resolved?: string;
};

export function ObservabilityErrorsFilters({ requestId, resolved }: Props) {
  const router = useRouter();

  const apply = (updates: { requestId?: string; resolved?: string }) => {
    const u = new URLSearchParams();
    const rid = updates.requestId !== undefined ? updates.requestId : requestId;
    const res = updates.resolved !== undefined ? updates.resolved : resolved;
    if (rid?.trim()) u.set('requestId', rid.trim());
    if (res) u.set('resolved', res);
    const qs = u.toString();
    router.push(qs ? `/admin/observability/errors?${qs}` : '/admin/observability/errors');
  };

  return (
    <AdminListToolbar>
      <div className="min-w-[220px] flex-1 space-y-1.5">
        <Label htmlFor="err-request-id">requestId</Label>
        <Input
          id="err-request-id"
          defaultValue={requestId ?? ''}
          className="font-mono text-xs"
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v !== (requestId ?? '')) apply({ requestId: v });
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Megoldva</Label>
        <Select value={resolved || 'all'} onValueChange={(v) => apply({ resolved: v === 'all' ? '' : v })}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Összes</SelectItem>
            <SelectItem value="0">Nyitott</SelectItem>
            <SelectItem value="1">Megoldva</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </AdminListToolbar>
  );
}
