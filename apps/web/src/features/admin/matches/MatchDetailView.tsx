import { getTranslations } from 'next-intl/server';
import { AdminDetailShell } from '@/features/admin/detail/AdminDetailShell';
import { AdminField, AdminFieldGrid } from '@/features/admin/detail/AdminFieldGrid';
import { AdminRelationLink } from '@/features/admin/detail/AdminRelationLink';
import { formatBool, formatText } from '@/features/admin/detail/format-value';
import { formatAdminDate } from '@/features/admin/list/format';
import { adminGetMatchDetailAction } from '@/features/admin/matches/actions';
import { AdminDetailBreadcrumb } from '@/features/admin/components/AdminDetailBreadcrumb';
import { Badge } from '@/components/ui/Badge';
import { notFound } from 'next/navigation';
import { MatchAdminEditPanel } from '@/features/admin/matches/MatchAdminEditPanel';
import { getMatchStatusBadgeVariant } from '@/features/admin/lib/status-badges';

type Props = {
  locale: string;
  matchId: string;
};

function PlayerField({
  label,
  player,
}: {
  label: string;
  player: { playerId: string; playerName?: string; legsWon: number; average: number } | null;
}) {
  if (!player) return null;
  return (
    <AdminField label={label}>
      <AdminRelationLink
        href={`/admin/players/${player.playerId}`}
        label={player.playerName ?? 'Játékos'}
        sublabel={`${player.legsWon} leg · átlag ${player.average.toFixed(1)}`}
      />
    </AdminField>
  );
}

export async function MatchDetailView({ locale, matchId }: Props) {
  const t = await getTranslations('Admin');
  const result = await adminGetMatchDetailAction(matchId);
  if (!result.ok) {
    if (result.error === 'Match not found') notFound();
    return <p className="text-destructive p-6 text-sm">{result.error}</p>;
  }

  const { match } = result;
  const p1 = match.player1?.playerName ?? '—';
  const p2 = match.player2?.playerName ?? '—';
  const title = `${match.tournamentCode} · ${t('detail.match_round', { round: match.round })}`;
  const crumbLabel = `${match.tournamentCode} · ${p1} vs ${p2}`;

  return (
    <>
      <AdminDetailBreadcrumb label={crumbLabel} />
      <AdminDetailShell
      title={title}
      description={match.tournamentName}
      backHref="/admin/matches"
      backLabel={t('detail.back_to_list')}
      tabs={[
        {
          id: 'identity',
          label: t('detail.tabs.identity'),
          content: (
            <>
            <AdminFieldGrid>
              <AdminField label="Verseny">
                <AdminRelationLink
                  href={`/admin/tournaments/${match.tournamentRef}`}
                  label={match.tournamentName || match.tournamentCode}
                  sublabel={match.tournamentCode}
                />
              </AdminField>
              <AdminField label="Státusz">
                <Badge variant={getMatchStatusBadgeVariant(match.status)}>{match.status}</Badge>
              </AdminField>
              <AdminField label="Típus">{match.type}</AdminField>
              <AdminField label="Tábla">{match.boardReference}</AdminField>
              <AdminField label="Legek">{match.legsCount}</AdminField>
              <AdminField label="Győztes">{formatText(match.winnerLabel)}</AdminField>
              <AdminField label="Manuális override">
                {match.manualOverride ? <Badge variant="warning">Igen</Badge> : formatBool(false)}
              </AdminField>
              {match.manualChangedByEmail ? (
                <AdminField label="Módosította">
                  {match.manualChangedById ? (
                    <AdminRelationLink
                      href={`/admin/users/${match.manualChangedById}`}
                      label={match.manualChangedByEmail}
                    />
                  ) : (
                    match.manualChangedByEmail
                  )}
                </AdminField>
              ) : null}
              <AdminField label="Frissítve">{formatAdminDate(match.updatedAt)}</AdminField>
            </AdminFieldGrid>
            <MatchAdminEditPanel
              locale={locale}
              matchId={matchId}
              status={match.status}
              type={match.type}
              round={match.round}
              boardReference={match.boardReference}
              manualOverride={match.manualOverride}
              player1={match.player1}
              player2={match.player2}
            />
            </>
          ),
        },
        {
          id: 'relations',
          label: t('detail.tabs.relations'),
          content: (
            <AdminFieldGrid>
              <PlayerField label="Játékos 1" player={match.player1} />
              <PlayerField label="Játékos 2" player={match.player2} />
            </AdminFieldGrid>
          ),
        },
        {
          id: 'audit',
          label: t('detail.tabs.audit'),
          content: (
            <div className="space-y-4">
              {match.manualOverride && match.previousState ? (
                <pre className="bg-muted overflow-auto rounded-lg p-4 text-xs">
                  {JSON.stringify(match.previousState, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-sm">{t('detail.audit_entity_hint')}</p>
              )}
            </div>
          ),
        },
      ]}
    />
    </>
  );
}
