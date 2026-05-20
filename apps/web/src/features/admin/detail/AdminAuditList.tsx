import { formatAdminDate } from '@/features/admin/list/format';

type LogRow = {
  id?: string;
  _id?: string;
  operation?: string;
  message?: string;
  timestamp?: string | Date;
  userId?: string;
};

type Props = {
  logs: LogRow[];
  emptyLabel: string;
};

export function AdminAuditList({ logs, emptyLabel }: Props) {
  if (logs.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {logs.map((log) => {
        const id = log.id ?? log._id ?? String(log.timestamp);
        const ts =
          log.timestamp instanceof Date
            ? log.timestamp.toISOString()
            : typeof log.timestamp === 'string'
              ? log.timestamp
              : null;
        return (
          <li key={id} className="space-y-1 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs">{log.operation ?? '—'}</span>
              <time className="text-muted-foreground text-xs">{formatAdminDate(ts)}</time>
            </div>
            <p className="text-sm">{log.message ?? '—'}</p>
          </li>
        );
      })}
    </ul>
  );
}
