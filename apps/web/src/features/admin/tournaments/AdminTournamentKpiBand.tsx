import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getTournamentStatusBadgeVariant } from '@/features/admin/lib/status-badges';
import { Badge } from '@/components/ui/Badge';
import { AdminStatusPieChart } from '@/features/admin/overview/charts/AdminStatusPieChart';

type Stats = {
  total: number;
  byStatus: Record<string, number>;
  sandbox: number;
  archived: number;
  avgPlayers: number;
};

export function AdminTournamentKpiBand({ stats }: { stats: Stats }) {
  const statusEntries = Object.entries(stats.byStatus);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Aktív versenyek</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{stats.total}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Átl. játékos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{stats.avgPlayers}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Sandbox</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{stats.sandbox}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Archivált</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">{stats.archived}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">Státusz</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1">
          {statusEntries.map(([status, count]) => (
            <Badge key={status} variant={getTournamentStatusBadgeVariant(status)}>
              {status}: {count}
            </Badge>
          ))}
        </CardContent>
      </Card>
      </div>
      {statusEntries.length > 0 ? (
        <AdminStatusPieChart title="Státusz eloszlás" entries={statusEntries} />
      ) : null}
    </div>
  );
}
