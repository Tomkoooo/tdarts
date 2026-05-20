'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import type {
  AdminTournamentRelationMatch,
  AdminTournamentRelationPlayer,
} from '@tdarts/services';
import { AdminRelationLink } from '@/features/admin/detail/AdminRelationLink';
import { AdminRelationTable } from '@/features/admin/detail/AdminRelationTable';
import { AdminListFilter } from '@/features/admin/list/AdminListFilter';
import { AdminListNumberFilter } from '@/features/admin/list/AdminListNumberFilter';
import { formatAdminDate } from '@/features/admin/list/format';
import { getMatchStatusBadgeVariant } from '@/features/admin/lib/status-badges';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  tournamentRelationFilterQuery,
  type TournamentRelationFilters,
} from '@/features/admin/tournaments/tournament-relation-filters';
import type { AdminListParams } from '@/features/admin/lib/list-params';
import { buildListQueryString } from '@/features/admin/lib/list-params';

const PLAYER_STATUSES = [
  'all',
  'applied',
  'confirmed',
  'checked-in',
  'eliminated',
  'winner',
] as const;

type Props = {
  players: AdminTournamentRelationPlayer[];
  matches: AdminTournamentRelationMatch[];
  totalPlayers: number;
  totalMatches: number;
  filters: TournamentRelationFilters;
  listParams: AdminListParams;
};

export function TournamentRelationsPanel({
  players,
  matches,
  totalPlayers,
  totalMatches,
  filters,
  listParams,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const extra = tournamentRelationFilterQuery(filters);

  const applyPlayerQ = (q: string) => {
    const qs = buildListQueryString(listParams, {
      ...extra,
      relPlayerQ: q || undefined,
    } as Partial<AdminListParams & Record<string, string | undefined>>);
    startTransition(() => router.replace(`${pathname}${qs}`));
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Játékosok</h3>
          <span className="text-muted-foreground text-xs">
            {players.length} / {totalPlayers} megjelenítve
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
          <div className="min-w-[200px] flex-1 space-y-1">
            <Label className="text-xs">Keresés (név)</Label>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const q = new FormData(e.currentTarget).get('playerQ');
                applyPlayerQ(typeof q === 'string' ? q : '');
              }}
            >
              <Input
                name="playerQ"
                className="h-8 text-sm"
                placeholder="Játékos neve…"
                defaultValue={filters.playerQ}
              />
              <Button type="submit" size="sm" variant="outline" className="h-8">
                Keresés
              </Button>
            </form>
          </div>
          <AdminListFilter
            params={listParams}
            paramKey="relPlayerStatus"
            value={filters.playerStatus}
            label="Státusz"
            extra={extra}
            options={PLAYER_STATUSES.map((s) => ({
              value: s,
              label: s === 'all' ? 'Összes' : s,
            }))}
          />
        </div>
        <AdminRelationTable
          rows={players}
          emptyLabel="Nincs játékos a szűrőkkel."
          columns={[
            {
              header: 'Játékos',
              cell: (row) => (
                <AdminRelationLink
                  href={`/admin/players/${row.playerId}`}
                  label={row.name || row.playerId}
                />
              ),
            },
            { header: 'Státusz', cell: (row) => row.status ?? '—' },
          ]}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Meccsek</h3>
          <span className="text-muted-foreground text-xs">
            {matches.length} / {totalMatches} megjelenítve
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
          <AdminListFilter
            params={listParams}
            paramKey="relMatchStatus"
            value={filters.matchStatus}
            label="Státusz"
            extra={extra}
            options={[
              { value: 'all', label: 'Összes' },
              { value: 'ongoing', label: 'ongoing' },
              { value: 'finished', label: 'finished' },
              { value: 'pending', label: 'pending' },
            ]}
          />
          <AdminListFilter
            params={listParams}
            paramKey="relMatchType"
            value={filters.matchType}
            label="Típus"
            extra={extra}
            options={[
              { value: 'all', label: 'Összes' },
              { value: 'group', label: 'group' },
              { value: 'knockout', label: 'knockout' },
            ]}
          />
          <AdminListNumberFilter
            params={listParams}
            paramKey="relMatchRound"
            value={filters.matchRound}
            label="Kör"
            placeholder="0"
            extra={extra}
          />
          <AdminListNumberFilter
            params={listParams}
            paramKey="relMatchBoard"
            value={filters.matchBoard}
            label="Tábla"
            placeholder="1"
            extra={extra}
          />
        </div>
        <AdminRelationTable
          rows={matches}
          emptyLabel="Nincs meccs a szűrőkkel."
          columns={[
            {
              header: 'Meccs',
              cell: (row) => (
                <AdminRelationLink
                  href={`/admin/matches/${row.matchId}`}
                  label={`${row.player1Name} vs ${row.player2Name}`}
                  sublabel={`${row.round}. kör · ${row.type}`}
                />
              ),
            },
            {
              header: 'Státusz',
              cell: (row) => (
                <Badge variant={getMatchStatusBadgeVariant(row.status)}>{row.status}</Badge>
              ),
            },
            { header: 'Tábla', cell: (row) => row.boardReference || '—' },
            { header: 'Létrehozva', cell: (row) => formatAdminDate(row.createdAt) },
            { header: 'Frissítve', cell: (row) => formatAdminDate(row.updatedAt) },
          ]}
        />
      </section>
    </div>
  );
}
