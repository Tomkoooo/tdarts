'use client';

import { Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Link } from '@/i18n/routing';
import { AlertTriangle, FileText, LineChart } from 'lucide-react';
import { formatAdminDate } from '@/features/admin/list/format';

type Snapshot = {
  timeSeries: { bucket: string; calls: number; errors: number; errorRate: number }[];
  topErrorRoutes: { label: string; errors: number; calls: number }[];
  openErrors: number;
  errors24h: number;
  totalCalls: number;
  overallErrorRate: number;
  recentErrors: {
    _id: string;
    routeKey: string;
    method: string;
    statusCode: number;
    occurredAt: string;
  }[];
};

const trafficConfig = {
  calls: { label: 'Hívások', color: 'var(--chart-1)' },
  errors: { label: 'Hibák', color: 'hsl(var(--destructive))' },
  errorRate: { label: 'Hiba %', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const routeConfig = {
  errors: { label: 'Hibák', color: 'hsl(var(--destructive))' },
} satisfies ChartConfig;

export function ObservabilityDashboard({ snapshot }: { snapshot: Snapshot }) {
  const healthVariant =
    snapshot.overallErrorRate > 5
      ? 'destructive'
      : snapshot.overallErrorRate > 1
        ? 'warning'
        : 'success';

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Összes hívás (ablak)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{snapshot.totalCalls.toLocaleString('hu-HU')}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hibaráta</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl tabular-nums">
              {snapshot.overallErrorRate}%
              <Badge variant={healthVariant}>{snapshot.overallErrorRate > 5 ? 'Kritikus' : snapshot.overallErrorRate > 1 ? 'Figyelj' : 'OK'}</Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Nyitott hibák</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{snapshot.openErrors}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hibák 24h</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{snapshot.errors24h}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Forgalom és hibák</CardTitle>
            <CardDescription>Bucket szerint — piros hiba sáv azonnal feltűnik</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trafficConfig} className="h-[280px] w-full">
              <ComposedChart data={snapshot.timeSeries}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="bucket" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={11} unit="%" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar yAxisId="left" dataKey="calls" fill="var(--color-calls)" radius={4} />
                <Bar yAxisId="left" dataKey="errors" fill="var(--color-errors)" radius={4} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="errorRate"
                  stroke="var(--color-errorRate)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top hibás útvonalak</CardTitle>
            <CardDescription>Legtöbb API hiba</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={routeConfig} className="h-[280px] w-full">
              <BarChart data={snapshot.topErrorRoutes} layout="vertical">
                <CartesianGrid horizontal={false} className="stroke-border/50" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="errors" fill="var(--color-errors)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Legutóbbi nyitott incidensek</CardTitle>
            <CardDescription>Azonnali beavatkozás szükséges lehet</CardDescription>
          </div>
          <Link href="/admin/observability/errors" className="text-primary text-sm hover:underline">
            Összes hiba →
          </Link>
        </CardHeader>
        <CardContent>
          {snapshot.recentErrors.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nincs nyitott API hiba esemény.</p>
          ) : (
            <ul className="divide-border divide-y">
              {snapshot.recentErrors.map((e) => (
                <li key={e._id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <Badge variant="destructive">{e.statusCode}</Badge>
                  <span className="font-mono text-xs">
                    {e.method} {e.routeKey}
                  </span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {formatAdminDate(e.occurredAt)}
                  </span>
                  <Link
                    href={`/admin/observability/errors/${e._id}`}
                    className="text-primary text-xs hover:underline"
                  >
                    Részlet
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/observability/logs">
          <Card className="hover:bg-muted/50 h-full transition-colors">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="text-primary size-5" />
                <CardTitle className="text-base">Naplók</CardTitle>
              </div>
              <CardDescription>Részletes log lista és szűrők</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/observability/api">
          <Card className="hover:bg-muted/50 h-full transition-colors">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LineChart className="text-primary size-5" />
                <CardTitle className="text-base">API metrikák</CardTitle>
              </div>
              <CardDescription>Útvonal táblázat és nyers bucket adat</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/admin/observability/errors">
          <Card className="hover:bg-muted/50 h-full transition-colors">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-primary size-5" />
                <CardTitle className="text-base">Hibák inbox</CardTitle>
              </div>
              <CardDescription>Megoldás / újranyitás</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
