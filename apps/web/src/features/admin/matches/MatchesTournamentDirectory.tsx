'use client';

import { useCallback, useState, useTransition } from 'react';
import type { AdminMatchListRow, AdminMatchTournamentBucket } from '@tdarts/services';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getMatchStatusBadgeVariant } from '@/features/admin/lib/status-badges';
import { formatAdminDate } from '@/features/admin/list/format';
import { adminListMatchesForTournamentAction } from '@/features/admin/matches/actions';
import type { AdminMatchesListParams } from '@/features/admin/matches/actions';
import { AdminListPagination } from '@/features/admin/components/AdminListPagination';
import type { AdminListParams } from '@/features/admin/lib/list-params';
import { Link } from '@/i18n/routing';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const MATCHES_PER_PAGE = 25;

type Props = {
  buckets: AdminMatchTournamentBucket[];
  total: number;
  params: AdminMatchesListParams;
  filterParams: {
    q?: string;
    manualOnly?: boolean;
    status?: string;
    type?: string;
    round?: string;
    board?: string;
  };
  extraQuery?: Record<string, string | undefined>;
};

function MatchMiniTable({
  rows,
  total,
  page,
  onPageChange,
  pending,
}: {
  rows: AdminMatchListRow[];
  total: number;
  page: number;
  onPageChange: (p: number) => void;
  pending: boolean;
}) {
  const pageCount = Math.max(1, Math.ceil(total / MATCHES_PER_PAGE));

  if (!rows.length && !pending) {
    return <p className="text-muted-foreground px-4 py-3 text-sm">Nincs meccs a szűrőkkel.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th className="px-4 py-2 font-medium">Játékosok</th>
              <th className="px-4 py-2 font-medium">Kör</th>
              <th className="px-4 py-2 font-medium">Típus</th>
              <th className="px-4 py-2 font-medium">Státusz</th>
              <th className="px-4 py-2 font-medium">Létrehozva</th>
              <th className="px-4 py-2 font-medium">Frissítve</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-border hover:bg-muted/50 border-b">
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/matches/${row._id}`}
                    className="text-primary font-medium hover:underline"
                  >
                    {row.player1Name} vs {row.player2Name}
                  </Link>
                  {row.manualOverride ? (
                    <Badge variant="warning" className="ml-2 text-xs">
                      manual
                    </Badge>
                  ) : null}
                </td>
                <td className="px-4 py-2 tabular-nums">{row.round}</td>
                <td className="px-4 py-2">{row.type}</td>
                <td className="px-4 py-2">
                  <Badge variant={getMatchStatusBadgeVariant(row.status)}>{row.status}</Badge>
                </td>
                <td className="text-muted-foreground px-4 py-2 whitespace-nowrap text-xs">
                  {formatAdminDate(row.createdAt)}
                </td>
                <td className="text-muted-foreground px-4 py-2 whitespace-nowrap text-xs">
                  {formatAdminDate(row.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <div className="flex items-center justify-between border-t px-4 py-2">
          <span className="text-muted-foreground text-xs">
            {total} meccs · {page}. / {pageCount} oldal
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || pending}
              onClick={() => onPageChange(page - 1)}
            >
              Előző
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pageCount || pending}
              onClick={() => onPageChange(page + 1)}
            >
              Következő
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TournamentBucketRow({
  bucket,
  filterParams,
}: {
  bucket: AdminMatchTournamentBucket;
  filterParams: Props['filterParams'];
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AdminMatchListRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pending, start] = useTransition();

  const load = useCallback(
    (targetPage: number) => {
      start(async () => {
        const roundNum = filterParams.round ? parseInt(filterParams.round, 10) : undefined;
        const boardNum = filterParams.board ? parseInt(filterParams.board, 10) : undefined;
        const r = await adminListMatchesForTournamentAction(bucket.tournamentRef, {
          q: filterParams.q,
          manualOnly: filterParams.manualOnly,
          status: filterParams.status,
          type: filterParams.type,
          round: Number.isFinite(roundNum) ? roundNum : undefined,
          boardReference: Number.isFinite(boardNum) ? boardNum : undefined,
          page: targetPage,
          limit: MATCHES_PER_PAGE,
        });
        if (r.ok) {
          setRows(r.rows);
          setTotal(r.total);
          setPage(targetPage);
        } else {
          setRows([]);
          setTotal(0);
        }
      });
    },
    [bucket.tournamentRef, filterParams],
  );

  return (
    <Collapsible
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && rows === null) load(1);
      }}
      className="border-border rounded-lg border"
    >
      <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left">
        <ChevronDown
          className={cn('text-muted-foreground size-4 shrink-0 transition-transform', open && 'rotate-180')}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {bucket.tournamentName}
            <span className="text-muted-foreground ml-2 font-mono text-xs">{bucket.tournamentCode}</span>
          </p>
          <p className="text-muted-foreground text-xs">
            {bucket.matchCount} meccs · utolsó frissítés: {formatAdminDate(bucket.lastUpdated)}
          </p>
        </div>
        <Link
          href={`/admin/tournaments/${bucket.tournamentRef}`}
          className="text-primary shrink-0 text-xs hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Verseny
        </Link>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {pending && rows === null ? (
          <p className="text-muted-foreground px-4 py-3 text-sm">Betöltés…</p>
        ) : (
          <MatchMiniTable
            rows={rows ?? []}
            total={total || bucket.matchCount}
            page={page}
            onPageChange={(p) => load(p)}
            pending={pending}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MatchesTournamentDirectory({ buckets, total, params, filterParams, extraQuery }: Props) {
  if (!buckets.length) {
    return <p className="text-muted-foreground text-sm">Nincs meccs a szűrőkkel.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        {total} verseny csoport · nyisd ki a meccsek listáját
      </p>
      {buckets.map((b) => (
        <TournamentBucketRow key={b.tournamentRef} bucket={b} filterParams={filterParams} />
      ))}
      <AdminListPagination
        total={total}
        params={params}
        basePath="/admin/matches"
        extraQuery={extraQuery}
      />
    </div>
  );
}
