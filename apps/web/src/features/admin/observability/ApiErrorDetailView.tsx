'use client';

import { useTransition } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AdminDetailShell } from '@/features/admin/detail/AdminDetailShell';
import { AdminField, AdminFieldGrid } from '@/features/admin/detail/AdminFieldGrid';
import { formatAdminDate } from '@/features/admin/list/format';
import { adminResolveErrorEventAction } from '@/features/admin/observability/actions';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  event: Record<string, unknown>;
};

export function ApiErrorDetailView({ locale, event }: Props) {
  const id = String(event._id);
  const resolved = Boolean(event.isResolved);
  const [pending, start] = useTransition();

  return (
    <AdminDetailShell
      title={String(event.routeKey ?? 'API hiba')}
      description={`${event.method ?? ''} · ${event.statusCode ?? ''}`}
      backHref="/admin/observability/errors"
      backLabel="Vissza a hibákhoz"
      headerAction={
        <Button
          type="button"
          variant={resolved ? 'outline' : 'default'}
          disabled={pending}
          onClick={() => {
            start(async () => {
              const r = await adminResolveErrorEventAction(locale, id, !resolved);
              if (r.ok) toast.success(resolved ? 'Újranyitva' : 'Megoldva');
              else toast.error(r.error ?? 'Hiba');
            });
          }}
        >
          {resolved ? 'Újranyitás' : 'Megoldottnak jelöl'}
        </Button>
      }
      tabs={[
        {
          id: 'identity',
          label: 'Részletek',
          content: (
            <>
              <AdminFieldGrid>
                <AdminField label="Státusz">
                  {resolved ? (
                    <Badge variant="secondary">Megoldva</Badge>
                  ) : (
                    <Badge variant="destructive">Nyitott</Badge>
                  )}
                </AdminField>
                <AdminField label="Útvonal">
                  <span className="font-mono text-sm">{String(event.routeKey ?? '')}</span>
                </AdminField>
                <AdminField label="Method">{String(event.method ?? '')}</AdminField>
                <AdminField label="HTTP">{String(event.statusCode ?? '—')}</AdminField>
                <AdminField label="Idő">
                  {formatAdminDate(
                    event.occurredAt instanceof Date
                      ? event.occurredAt.toISOString()
                      : String(event.occurredAt ?? ''),
                  )}
                </AdminField>
                <AdminField label="Request ID">
                  <span className="font-mono text-xs">{String(event.requestId ?? '—')}</span>
                </AdminField>
              </AdminFieldGrid>
              {event.errorMessage ? (
                <pre className="bg-muted mt-4 overflow-auto rounded-lg p-4 text-xs">
                  {String(event.errorMessage)}
                </pre>
              ) : null}
            </>
          ),
        },
        {
          id: 'payload',
          label: 'Payload',
          content: (
            <pre className="bg-muted overflow-auto rounded-lg p-4 text-xs">
              {JSON.stringify(event, null, 2)}
            </pre>
          ),
        },
      ]}
    />
  );
}
