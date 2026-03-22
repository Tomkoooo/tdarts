"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminTelemetryActions } from "@/features/admin/actions/adminDomains.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TelemetryRange = "24h" | "7d" | "30d" | "90d" | "custom";
type TelemetryGranularity = "minute" | "hour" | "day";
type TelemetrySource = "all" | "api" | "action" | "page";
type Delta = { direction: "up" | "down" | "flat"; deltaPct: number };
type EntitySortKey =
  | "source"
  | "entity"
  | "calls"
  | "callsPerSecond"
  | "avgLatencyMs"
  | "errorRate"
  | "timeouts"
  | "traffic"
  | "avgPacket";
type SortDir = "asc" | "desc";

function formatNumber(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(Math.min(3, Math.max(0, decimals)));
}

function formatLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0 ms";
  if (ms >= 1000) return `${formatNumber(ms / 1000)} s`;
  return `${formatNumber(ms)} ms`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${formatNumber(bytes / (1024 * 1024))} MB`;
  return `${formatNumber(bytes / (1024 * 1024 * 1024))} GB`;
}

function trendBadgeVariant(delta?: Delta, inverseBad = false): "secondary" | "warning" | "success" {
  if (!delta || delta.direction === "flat") return "secondary";
  const isWorsening = inverseBad ? delta.direction === "up" : delta.direction === "down";
  return isWorsening ? "warning" : "success";
}

function trendBadge(delta?: Delta, inverseBad = false) {
  if (!delta) return <Badge variant="secondary">flat</Badge>;
  const sign = delta.deltaPct > 0 ? "+" : "";
  return <Badge variant={trendBadgeVariant(delta, inverseBad)}>{`${delta.direction} (${sign}${formatNumber(delta.deltaPct, 2)}%)`}</Badge>;
}

const tooltipTheme = {
  contentStyle: {
    backgroundColor: "#fefce8",
    borderColor: "#d6d3d1",
    borderRadius: 8,
  },
  labelStyle: {
    color: "#000000",
    fontWeight: 600,
  },
  itemStyle: {
    color: "#000000",
  },
} as const;

function buildParams(args: {
  range: TelemetryRange;
  granularity: TelemetryGranularity;
  source: TelemetrySource;
  method: string;
  search: string;
  customStart: string;
  customEnd: string;
}) {
  const p = new URLSearchParams({
    range: args.range,
    granularity: args.granularity,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    source: args.source,
  });
  if (args.method !== "ALL") p.set("method", args.method);
  if (args.search.trim()) p.set("search", args.search.trim());
  if (args.range === "custom" && args.customStart && args.customEnd) {
    p.set("start", new Date(args.customStart).toISOString());
    p.set("end", new Date(args.customEnd).toISOString());
  }
  return Object.fromEntries(p.entries());
}

export default function TelemetryDashboardV2() {
  const [range, setRange] = useState<TelemetryRange>("24h");
  const [granularity, setGranularity] = useState<TelemetryGranularity>("hour");
  const [source, setSource] = useState<TelemetrySource>("all");
  const [method, setMethod] = useState("ALL");
  const [search, setSearch] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [importedSnapshot, setImportedSnapshot] = useState<any | null>(null);
  const [selectedError, setSelectedError] = useState<any | null>(null);
  const [selectedErrorDetail, setSelectedErrorDetail] = useState<any | null>(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [isErrorDetailLoading, setIsErrorDetailLoading] = useState(false);
  const [entitySortKey, setEntitySortKey] = useState<EntitySortKey>("traffic");
  const [entitySortDir, setEntitySortDir] = useState<SortDir>("desc");

  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any>(null);
  const [entities, setEntities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (range === "custom" && (!customStart || !customEnd)) return;
    const params = buildParams({ range, granularity, source, method, search, customStart, customEnd });
    try {
      setIsLoading(true);
      const [o, t, i, r] = await Promise.all([
        adminTelemetryActions.overview(params),
        adminTelemetryActions.trends(params),
        adminTelemetryActions.incidents(params),
        adminTelemetryActions.routes({ ...params, page: "1", limit: "25", sortBy: "traffic", sortDir: "desc" }),
      ]);
      setOverview(o.data?.data || null);
      const trendPayload = t.data?.data as { points?: unknown[]; granularity?: string; timeZone?: string; bucketCount?: number; window?: { start?: string; end?: string } } | undefined;
      setTrends(Array.isArray(trendPayload?.points) ? trendPayload.points : []);
      setIncidents(i.data?.data || null);
      setEntities(r.data?.data || []);
      setImportedSnapshot(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load telemetry");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range, granularity, source, method]);

  const activeOverview = importedSnapshot?.overview?.data || overview;
  const activeIncidents = importedSnapshot?.incidents?.data || incidents;
  const activeEntities = importedSnapshot?.routes?.data || entities;

  const chartData = useMemo(() => {
    const points = importedSnapshot?.trends?.data?.points || trends;
    return points.map((p: any) => ({
      label: p.label,
      callsPerSecond: Number(p.callsPerSecond || 0),
      avgLatencyMs: Number(p.avgLatencyMs || 0),
      errorRatePct: Number(p.errorRate || 0) * 100,
      timeoutRatePct: Number(p.timeoutRate || 0) * 100,
      totalBytesMb: Number(p.totalBytes || 0) / 1024 / 1024,
      avgPacketKb: Number(p.avgPacketBytes || 0) / 1024,
      avgTtfbMs: Number(p.pageLoad?.avgTtfbMs || 0),
      avgLcpMs: Number(p.pageLoad?.avgLcpMs || 0),
    }));
  }, [trends, importedSnapshot]);

  const topHeavy = useMemo(
    () => [...(activeEntities || [])].sort((a: any, b: any) => Number(b.totalCalls || 0) - Number(a.totalCalls || 0)).slice(0, 10),
    [activeEntities]
  );
  const topErrors = useMemo(
    () => [...(activeEntities || [])].sort((a: any, b: any) => Number(b.totalErrors || 0) - Number(a.totalErrors || 0)).slice(0, 10),
    [activeEntities]
  );

  const sortedEntities = useMemo(() => {
    const rows = [...(activeEntities || [])];
    const getSortValue = (row: any) => {
      switch (entitySortKey) {
        case "source":
          return String(row.sourceType || "");
        case "entity":
          return `${String(row.method || "")} ${String(row.routeKey || "")}`;
        case "calls":
          return Number(row.totalCalls || 0);
        case "callsPerSecond":
          return activeOverview?.window?.seconds
            ? Number(row.totalCalls || 0) / Number(activeOverview.window.seconds || 1)
            : 0;
        case "avgLatencyMs":
          return Number(row.avgLatencyMs || 0);
        case "errorRate":
          return Number(row.errorRate || 0);
        case "timeouts":
          return Number(row.totalTimeouts || 0);
        case "traffic":
          return Number(row.totalTrafficBytes || 0);
        case "avgPacket":
          return Number(row.avgPacketBytes || 0);
        default:
          return 0;
      }
    };
    rows.sort((a: any, b: any) => {
      const av = getSortValue(a);
      const bv = getSortValue(b);
      const cmp =
        typeof av === "string" || typeof bv === "string"
          ? String(av).localeCompare(String(bv))
          : Number(av) - Number(bv);
      return entitySortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [activeEntities, activeOverview?.window?.seconds, entitySortDir, entitySortKey]);

  const toggleEntitySort = (key: EntitySortKey) => {
    if (entitySortKey === key) {
      setEntitySortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setEntitySortKey(key);
    setEntitySortDir(key === "source" || key === "entity" ? "asc" : "desc");
  };

  const sortLabel = (key: EntitySortKey, label: string) =>
    `${label}${entitySortKey === key ? (entitySortDir === "asc" ? " ↑" : " ↓") : ""}`;

  const exportSnapshot = async () => {
    try {
      const params = buildParams({ range, granularity, source, method, search, customStart, customEnd });
      const res = await adminTelemetryActions.export(params);
      const pack = res.data as {
        filters?: Record<string, string>;
        overview?: unknown;
        incidents?: unknown;
        routes?: unknown;
        trends?: unknown;
      } | undefined;
      const payload = {
        exportedAt: new Date().toISOString(),
        filters: pack?.filters ?? params,
        overview: pack?.overview,
        incidents: pack?.incidents,
        routes: pack?.routes,
        trends: pack?.trends,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `telemetry-v3-${Date.now()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Telemetry snapshot exported.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to export snapshot");
    }
  };

  const exportErrorsCsv = () => {
    try {
      const rows = activeIncidents?.errors || [];
      const header = [
        "occurredAt",
        "sourceType",
        "method",
        "routeKey",
        "status",
        "durationMs",
        "requestBytes",
        "responseBytes",
        "errorMessage",
      ];
      const csv = [
        header.join(","),
        ...rows.map((r: any) =>
          [
            r.occurredAt,
            r.sourceType || "",
            r.method,
            `"${String(r.routeKey || "").replace(/"/g, '""')}"`,
            r.status,
            formatNumber(Number(r.durationMs || 0)),
            Number(r.requestBytes || 0),
            Number(r.responseBytes || 0),
            `"${String(r.errorMessage || "").replace(/"/g, '""')}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `telemetry-errors-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Error logs exported.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to export error logs");
    }
  };

  const importSnapshot = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const serverValidation = await adminTelemetryActions.importSnapshot({ snapshot: parsed });
      setImportedSnapshot(serverValidation.data?.snapshot || parsed);
      toast.success("Snapshot imported for local view.");
    } catch (error: any) {
      toast.error(error?.message || "Invalid snapshot file");
    }
  };

  const openErrorDetails = async (errorItem: any) => {
    setSelectedError(errorItem);
    setSelectedErrorDetail(null);
    setIsErrorDialogOpen(true);
    setIsErrorDetailLoading(true);
    try {
      const params = buildParams({
        range,
        granularity,
        source,
        method: errorItem.method || method,
        search: "",
        customStart,
        customEnd,
      });
      const details = await adminTelemetryActions.routeDetails({
        ...params,
        routeKey: errorItem.routeKey,
        method: errorItem.method,
        errorId: errorItem.id,
        source: errorItem.sourceType || source,
      });
      setSelectedErrorDetail(details.data?.data?.selectedError || null);
    } catch {
      setSelectedErrorDetail(null);
    } finally {
      setIsErrorDetailLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1700px] space-y-4 p-3 sm:p-6">
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Telemetry V3</CardTitle>
          <CardDescription>Better readability with filters, drill-down and report export.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-6">
            <Select value={range} onValueChange={(v) => setRange(v as TelemetryRange)}>
              <SelectTrigger><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24h</SelectItem>
                <SelectItem value="7d">7d</SelectItem>
                <SelectItem value="30d">30d</SelectItem>
                <SelectItem value="90d">90d</SelectItem>
                <SelectItem value="custom">custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={granularity} onValueChange={(v) => setGranularity(v as TelemetryGranularity)}>
              <SelectTrigger className="min-w-[9rem]">
                <SelectValue placeholder="Time resolution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minute">per minute</SelectItem>
                <SelectItem value="hour">per hour</SelectItem>
                <SelectItem value="day">per day</SelectItem>
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={(v) => setSource(v as TelemetrySource)}>
              <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all sources</SelectItem>
                <SelectItem value="api">api</SelectItem>
                <SelectItem value="action">actions</SelectItem>
                <SelectItem value="page">pages</SelectItem>
              </SelectContent>
            </Select>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">all methods</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="ACTION">ACTION</SelectItem>
                <SelectItem value="PAGE_LOAD">PAGE_LOAD</SelectItem>
              </SelectContent>
            </Select>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="route/page/action search" />
            <Button onClick={loadData}>Apply filters</Button>
          </div>
          {range === "custom" && (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <Input type="datetime-local" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Time resolution applies to the trend charts and JSON export. Use a <span className="font-medium text-foreground">custom</span> range for a narrow
            window, then <span className="font-medium text-foreground">per minute</span> or <span className="font-medium text-foreground">per hour</span> to
            inspect that interval. Export snapshot includes overview, routes, incidents, and trend series for the same filters (use{" "}
            <span className="font-medium text-foreground">Apply filters</span> before exporting).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportSnapshot}>Export snapshot JSON</Button>
            <Button variant="secondary" onClick={exportErrorsCsv}>Export error logs CSV</Button>
            <label className="inline-flex">
              <Button asChild variant="secondary"><span>Import snapshot</span></Button>
              <input type="file" accept="application/json" className="hidden" onChange={(e) => importSnapshot(e.target.files?.[0])} />
            </label>
            {importedSnapshot && <Button variant="outline" onClick={() => setImportedSnapshot(null)}>Back to live data</Button>}
          </div>
          {importedSnapshot && <Badge variant="warning">Viewing imported snapshot only (not persisted).</Badge>}
        </CardContent>
      </Card>

      {isLoading || !activeOverview ? (
        <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/30" />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-blue-400/30">
            <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Calls / sec</p>
            <p className="text-2xl font-semibold">{formatNumber(Number(activeOverview.kpis.callsPerSecond || 0))}</p>
            {trendBadge(activeOverview.deltas?.callsPerSecond)}
            </CardContent>
          </Card>
          <Card className="border-amber-400/30">
            <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Latency avg/min/peak</p>
            <p className="text-lg font-semibold">
              {formatLatency(Number(activeOverview.kpis.avgLatencyMs || 0))} / {formatLatency(Number(activeOverview.kpis.minLatencyMs || 0))} / {formatLatency(Number(activeOverview.kpis.peakLatencyMs || 0))}
            </p>
            {trendBadge(activeOverview.deltas?.latency, true)}
            </CardContent>
          </Card>
          <Card className="border-red-400/30">
            <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Errors / Timeouts</p>
            <p className="text-lg font-semibold">
              {formatNumber(Number(activeOverview.kpis.errorRate || 0) * 100)}% / {formatNumber(Number(activeOverview.kpis.timeoutRate || 0) * 100)}%
            </p>
            <div className="flex gap-3">
              {trendBadge(activeOverview.deltas?.errors, true)}
              {trendBadge(activeOverview.deltas?.timeouts, true)}
            </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-400/30">
            <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Traffic / Avg packet</p>
            <p className="text-lg font-semibold">{formatBytes(Number(activeOverview.kpis.totalMovedBytes || 0))}</p>
            <p className="text-xs text-muted-foreground">avg {formatBytes(Number(activeOverview.kpis.avgPacketBytes || 0))}</p>
            {trendBadge(activeOverview.deltas?.traffic)}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-semibold">System trends</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Buckets: <span className="font-medium text-foreground">{granularity}</span>
            {activeOverview?.window?.start && activeOverview?.window?.end
              ? ` · ${String(activeOverview.window.start).slice(0, 19)} → ${String(activeOverview.window.end).slice(0, 19)}`
              : null}
            {chartData.length > 0 ? ` · ${chartData.length} points` : null}
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" minTickGap={granularity === "minute" ? 6 : granularity === "hour" ? 14 : 20} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  {...tooltipTheme}
                  formatter={(value: any, name: any) => {
                    if (String(name).includes("Rate")) return `${formatNumber(Number(value))}%`;
                    if (String(name).toLowerCase().includes("latency")) return formatLatency(Number(value));
                    return formatNumber(Number(value));
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="callsPerSecond" stroke="#2563eb" dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="avgLatencyMs" stroke="#f97316" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="errorRatePct" stroke="#ef4444" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="timeoutRatePct" stroke="#a855f7" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-semibold">Page-load trends (RUM)</h3>
          <p className="mb-2 text-xs text-muted-foreground">Same time buckets as system trends ({granularity}).</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" minTickGap={granularity === "minute" ? 6 : granularity === "hour" ? 14 : 20} />
                <YAxis />
                <Tooltip
                  {...tooltipTheme}
                  formatter={(value: any, name: any) => {
                    if (String(name).toLowerCase().includes("packet")) return `${formatNumber(Number(value))} KB`;
                    return formatLatency(Number(value));
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="avgTtfbMs" stroke="#14b8a6" dot={false} />
                <Line type="monotone" dataKey="avgLcpMs" stroke="#22c55e" dot={false} />
                <Line type="monotone" dataKey="avgPacketKb" stroke="#0ea5e9" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Most used pages/routes/actions</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topHeavy.map((row: any) => ({ key: `${row.sourceType}:${row.method} ${row.routeKey}`, calls: row.totalCalls }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="key" hide />
                <YAxis />
                <Tooltip {...tooltipTheme} />
                <Bar dataKey="calls" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Most error-prone entities</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topErrors.map((row: any) => ({ key: `${row.sourceType}:${row.method} ${row.routeKey}`, errors: row.totalErrors }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="key" hide />
                <YAxis />
                <Tooltip {...tooltipTheme} />
                <Bar dataKey="errors" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Heavy entity table</h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEntitySortKey("traffic");
                setEntitySortDir("desc");
              }}
            >
              Reset sort
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button type="button" onClick={() => toggleEntitySort("source")} className="hover:text-foreground">
                    {sortLabel("source", "source")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleEntitySort("entity")} className="hover:text-foreground">
                    {sortLabel("entity", "entity")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleEntitySort("calls")} className="hover:text-foreground">
                    {sortLabel("calls", "calls")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleEntitySort("callsPerSecond")} className="hover:text-foreground">
                    {sortLabel("callsPerSecond", "calls/sec")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleEntitySort("avgLatencyMs")} className="hover:text-foreground">
                    {sortLabel("avgLatencyMs", "avg latency")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleEntitySort("errorRate")} className="hover:text-foreground">
                    {sortLabel("errorRate", "error %")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleEntitySort("timeouts")} className="hover:text-foreground">
                    {sortLabel("timeouts", "timeouts")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleEntitySort("traffic")} className="hover:text-foreground">
                    {sortLabel("traffic", "traffic")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleEntitySort("avgPacket")} className="hover:text-foreground">
                    {sortLabel("avgPacket", "avg packet")}
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntities.map((row: any, idx: number) => (
                <TableRow key={`${row.sourceType}-${row.method}-${row.routeKey}-${idx}`}>
                  <TableCell><Badge variant="secondary">{row.sourceType || "api"}</Badge></TableCell>
                  <TableCell className="max-w-[340px] truncate">{row.method} {row.routeKey}</TableCell>
                  <TableCell>{formatNumber(Number(row.totalCalls || 0), 0)}</TableCell>
                  <TableCell>{activeOverview?.window?.seconds ? formatNumber(Number(row.totalCalls || 0) / Number(activeOverview.window.seconds || 1)) : "0.000"}</TableCell>
                  <TableCell>{formatLatency(Number(row.avgLatencyMs || 0))}</TableCell>
                  <TableCell>{formatNumber((Number(row.errorRate || 0) * 100))}%</TableCell>
                  <TableCell>{formatNumber(Number(row.totalTimeouts || 0), 0)}</TableCell>
                  <TableCell>{formatBytes(Number(row.totalTrafficBytes || 0))}</TableCell>
                  <TableCell>{formatBytes(Number(row.avgPacketBytes || 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Incidents and latest errors</h3>
          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground">Active anomalies: {activeIncidents?.anomalies?.length || 0}</p>
            {(activeIncidents?.anomalies || []).slice(0, 8).map((a: any, idx: number) => (
              <div key={`${a.routeKey}-${a.signal}-${idx}`} className="rounded border border-border p-2">
                <div className="font-medium">[{a.sourceType || "api"}] {a.method} {a.routeKey}</div>
                <div className="text-muted-foreground">{a.signal}: {Number(a.ratio || 0).toFixed(2)}x baseline</div>
              </div>
            ))}
            <p className="pt-2 text-muted-foreground">Latest errors:</p>
            {(activeIncidents?.errors || []).slice(0, 8).map((e: any) => (
              <button
                key={e.id}
                type="button"
                onClick={() => openErrorDetails(e)}
                className="w-full rounded border border-border p-2 text-left hover:bg-muted/40"
              >
                <div className="font-medium">[{e.sourceType || "api"}] {e.method} {e.routeKey}</div>
                <div className="text-muted-foreground">{e.status} • {formatLatency(Number(e.durationMs || 0))} • {e.errorMessage || "error"}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Error details</DialogTitle>
            <DialogDescription>
              {selectedError
                ? `[${selectedError.sourceType || "api"}] ${selectedError.method} ${selectedError.routeKey}`
                : "Selected error"}
            </DialogDescription>
          </DialogHeader>
          {isErrorDetailLoading ? (
            <div className="h-24 animate-pulse rounded-md bg-muted/40" />
          ) : (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="rounded border p-2">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedError?.status || selectedErrorDetail?.status || "-"}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-xs text-muted-foreground">Latency</p>
                  <p className="font-medium">{formatLatency(Number(selectedError?.durationMs || selectedErrorDetail?.durationMs || 0))}</p>
                </div>
                <div className="rounded border p-2">
                  <p className="text-xs text-muted-foreground">Traffic</p>
                  <p className="font-medium">
                    {formatBytes(
                      Number(selectedError?.requestBytes || selectedErrorDetail?.requestBytes || 0) +
                        Number(selectedError?.responseBytes || selectedErrorDetail?.responseBytes || 0)
                    )}
                  </p>
                </div>
              </div>
              <div className="rounded border p-2">
                <p className="mb-1 text-xs text-muted-foreground">Error message</p>
                <p className="wrap-break-word">{selectedError?.errorMessage || selectedErrorDetail?.response?.errorMessage || "N/A"}</p>
              </div>
              {selectedErrorDetail?.request && (
                <div className="rounded border p-2">
                  <p className="mb-1 text-xs text-muted-foreground">Request payload/query</p>
                  <pre className="max-h-60 overflow-auto text-xs">
{JSON.stringify(
  {
    query: selectedErrorDetail.request.query,
    body: selectedErrorDetail.request.body,
  },
  null,
  2
)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
