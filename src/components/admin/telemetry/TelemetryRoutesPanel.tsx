"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RouteRow } from "./types";

type SortKey = "route" | "calls" | "errors" | "errorrate" | "latency" | "traffic" | "lastseen";
type SortDir = "asc" | "desc";

type Props = {
  rows: RouteRow[];
  page: number;
  totalPages: number;
  sortBy: SortKey;
  sortDir: SortDir;
  onPrevPage: () => void;
  onNextPage: () => void;
  onOpenRoute: (row: RouteRow) => void;
  onSortChange: (sortBy: SortKey, sortDir: SortDir) => void;
  formatBytes: (bytes: number) => string;
  title?: string;
  description?: string;
  compact?: boolean;
};

const COLUMNS: Array<{ key: SortKey; label: string; align?: "right" }> = [
  { key: "route", label: "Route" },
  { key: "calls", label: "Calls", align: "right" },
  { key: "errors", label: "Errors", align: "right" },
  { key: "errorrate", label: "Err %", align: "right" },
  { key: "latency", label: "Latency", align: "right" },
  { key: "traffic", label: "Avg Packet", align: "right" },
  { key: "lastseen", label: "Last Seen", align: "right" },
];

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-muted-foreground/40">↕</span>;
  return <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>;
}

export function TelemetryRoutesPanel({
  rows,
  page,
  totalPages,
  sortBy,
  sortDir,
  onPrevPage,
  onNextPage,
  onOpenRoute,
  onSortChange,
  formatBytes,
  title = "Route diagnostics",
  description = "Click any column header to sort. Click a row to inspect.",
  compact = false,
}: Props) {
  const formatLatency = (value: number) => Number(value || 0).toFixed(2);
  const handleHeaderClick = (key: SortKey) => {
    if (sortBy === key) {
      onSortChange(key, sortDir === "asc" ? "desc" : "asc");
    } else {
      onSortChange(key, "desc");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className={`${compact ? "max-h-[280px]" : "max-h-[460px]"} overflow-auto`}>
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`cursor-pointer select-none whitespace-nowrap text-xs ${col.align === "right" ? "text-right" : ""}`}
                    onClick={() => handleHeaderClick(col.key)}
                  >
                    {col.label}
                    <SortArrow active={sortBy === col.key} dir={sortDir} />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={`${row.method}-${row.routeKey}`}
                  className="cursor-pointer"
                  onClick={() => onOpenRoute(row)}
                >
                  <TableCell className="max-w-[260px] truncate py-2 text-xs">
                    <code>{row.method} {row.routeKey}</code>
                    {row.latencyRatio >= 1.25 && row.avgLatencyMs >= 200 && (
                      <span className="ml-1.5 rounded bg-orange-500/10 px-1 py-0.5 text-[10px] text-orange-600">slow</span>
                    )}
                    {row.errorRateRatio >= 1.5 && row.errorRate >= 1 && (
                      <span className="ml-1.5 rounded bg-red-500/10 px-1 py-0.5 text-[10px] text-red-600">errors↑</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-right text-xs tabular-nums">{row.totalCalls}</TableCell>
                  <TableCell className={`py-2 text-right text-xs tabular-nums ${row.totalErrors > 0 ? "text-red-500" : ""}`}>
                    {row.totalErrors}
                  </TableCell>
                  <TableCell className={`py-2 text-right text-xs tabular-nums ${row.errorRate >= 5 ? "text-red-500" : ""}`}>
                    {row.errorRate}%
                  </TableCell>
                  <TableCell className="py-2 text-right text-xs tabular-nums">
                    <span>{formatLatency(row.avgLatencyMs)}ms</span>
                    {row.baselineAvgLatencyMs > 0 && (
                      <span className="ml-1 text-muted-foreground">/ {formatLatency(row.baselineAvgLatencyMs)}ms</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-right text-xs tabular-nums">{formatBytes(row.avgPacketBytes)}</TableCell>
                  <TableCell className="py-2 text-right text-xs tabular-nums text-muted-foreground">
                    {row.lastSeen ? new Date(row.lastSeen).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="py-8 text-center text-sm text-muted-foreground">
                    No routes found for this filter set.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className={`flex items-center justify-end gap-2 ${compact ? "hidden" : ""}`}>
          <Button variant="outline" size="sm" onClick={onPrevPage} disabled={page <= 1}>
            Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={onNextPage} disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
