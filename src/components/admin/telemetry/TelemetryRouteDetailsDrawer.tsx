"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RouteDetailsData } from "./types";

const ERRORS_PER_PAGE = 5;

type Props = {
  open: boolean;
  isLoading: boolean;
  details: RouteDetailsData | null;
  selectedErrorId: string;
  formatBytes: (bytes: number) => string;
  onClose: () => void;
  onMarkFixed: () => void;
  onInspectError: (errorId: string) => void;
};

function Stat({ label, value, baseline }: { label: string; value: string; baseline?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
      {baseline && <span className="text-[11px] text-muted-foreground">baseline: {baseline}</span>}
    </div>
  );
}

function JsonBlock({ data, maxHeight = "max-h-64" }: { data: unknown; maxHeight?: string }) {
  const safeStringify = (value: unknown) => {
    try {
      const seen = new WeakSet<object>();
      return JSON.stringify(
        value,
        (_key, nested) => {
          if (typeof nested === "object" && nested !== null) {
            if (seen.has(nested)) return "[Circular]";
            seen.add(nested);
          }
          return nested;
        },
        2
      );
    } catch {
      return String(value ?? "—");
    }
  };
  return (
    <pre className={`${maxHeight} overflow-auto rounded-sm border border-border bg-muted/30 p-3 text-xs leading-relaxed`}>
      {typeof data === "string" ? data : safeStringify(data) || "—"}
    </pre>
  );
}

export function TelemetryRouteDetailsDrawer({
  open,
  isLoading,
  details,
  selectedErrorId,
  formatBytes,
  onClose,
  onMarkFixed,
  onInspectError,
}: Props) {
  const [errorPage, setErrorPage] = useState(0);

  const totalErrors = details?.recentErrors.length ?? 0;
  const totalErrorPages = Math.max(1, Math.ceil(totalErrors / ERRORS_PER_PAGE));
  const paginatedErrors = details?.recentErrors.slice(
    errorPage * ERRORS_PER_PAGE,
    (errorPage + 1) * ERRORS_PER_PAGE
  ) ?? [];

  const handleClose = () => {
    setErrorPage(0);
    onClose();
  };

  const handleBackToList = () => {
    onInspectError("");
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && handleClose()}>
      <SheetContent side="right" className="flex w-[98vw] max-w-3xl flex-col overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-mono text-sm font-semibold">
            {details ? `${details.method} ${details.routeKey}` : "Route details"}
          </SheetTitle>
          <SheetDescription>Route diagnostics with error drill-down</SheetDescription>
        </SheetHeader>

        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading details...</p>}

        {!isLoading && details && (
          <div className="flex-1 space-y-4 pt-2">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Stat label="Calls" value={String(details.summary.totalCalls)} baseline={String(details.summary.baselineCalls)} />
              <Stat label="Error rate" value={`${details.summary.errorRate}%`} baseline={`${details.summary.baselineErrorRate}%`} />
              <Stat label="Errors" value={String(details.summary.totalErrors)} />
              <Stat label="Avg latency" value={`${details.summary.avgLatencyMs}ms`} baseline={`${details.summary.baselineAvgLatencyMs}ms`} />
              <Stat label="Max latency" value={`${details.summary.maxLatencyMs}ms`} />
              <Stat label="Avg packet" value={formatBytes(details.summary.avgPacketBytes)} baseline={formatBytes(details.summary.baselineAvgPacketBytes)} />
              <Stat label="Total traffic" value={formatBytes(details.summary.totalTrafficBytes)} />
            </div>

            <Separator />

            {/* Error section: either inspection view OR list view */}
            {details.selectedError && selectedErrorId ? (
              /* ===== Error Inspection View (replaces list) ===== */
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleBackToList} className="text-xs">
                    ← Back to errors
                  </Button>
                  <Badge variant={details.selectedError.status >= 500 ? "destructive" : "secondary"}>
                    {details.selectedError.status}
                  </Badge>
                  <code className="text-xs">{details.selectedError.method} {details.selectedError.routeKey}</code>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(details.selectedError.occurredAt).toLocaleString()}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3 sm:gap-3">
                  <div><span className="text-muted-foreground">Duration:</span> {details.selectedError.durationMs}ms</div>
                  <div><span className="text-muted-foreground">Req size:</span> {formatBytes(details.selectedError.requestBytes)}</div>
                  <div><span className="text-muted-foreground">Res size:</span> {formatBytes(details.selectedError.responseBytes)}</div>
                </div>

                <Tabs defaultValue="req-headers">
                  <TabsList className="w-full overflow-x-auto">
                    <TabsTrigger value="req-headers" className="flex-1 text-xs whitespace-nowrap">Req Headers</TabsTrigger>
                    <TabsTrigger value="req-body" className="flex-1 text-xs whitespace-nowrap">Req Body</TabsTrigger>
                    <TabsTrigger value="res-headers" className="flex-1 text-xs whitespace-nowrap">Res Headers</TabsTrigger>
                    <TabsTrigger value="res-body" className="flex-1 text-xs whitespace-nowrap">Res Body</TabsTrigger>
                  </TabsList>
                  <TabsContent value="req-headers">
                    <JsonBlock data={details.selectedError.request.headers} />
                    {details.selectedError.request.contentType && (
                      <p className="mt-1 text-[11px] text-muted-foreground">Content-Type: {details.selectedError.request.contentType}</p>
                    )}
                    {Object.keys(details.selectedError.request.query || {}).length > 0 && (
                      <div className="mt-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Query params</p>
                        <JsonBlock data={details.selectedError.request.query} maxHeight="max-h-32" />
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="req-body">
                    <JsonBlock data={details.selectedError.request.body} />
                    {details.selectedError.request.bodyTruncated && (
                      <p className="mt-1 text-[11px] text-orange-500">Body was truncated for display.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="res-headers">
                    <JsonBlock data={details.selectedError.response.headers} />
                  </TabsContent>
                  <TabsContent value="res-body">
                    <JsonBlock data={details.selectedError.response.body} />
                    {details.selectedError.response.errorMessage && (
                      <p className="mt-1 text-xs text-red-500">{details.selectedError.response.errorMessage}</p>
                    )}
                    {details.selectedError.response.bodyTruncated && (
                      <p className="mt-1 text-[11px] text-orange-500">Body was truncated for display.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              /* ===== Error List View with Pagination ===== */
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Recent errors ({totalErrors})
                  </h4>
                  {totalErrorPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled={errorPage <= 0} onClick={() => setErrorPage((p) => p - 1)}>
                        Prev
                      </Button>
                      <span className="text-[10px] text-muted-foreground">{errorPage + 1}/{totalErrorPages}</span>
                      <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]" disabled={errorPage >= totalErrorPages - 1} onClick={() => setErrorPage((p) => p + 1)}>
                        Next
                      </Button>
                    </div>
                  )}
                </div>
                {totalErrors === 0 && (
                  <p className="text-sm text-muted-foreground">No recent errors on this route.</p>
                )}
                <div className="space-y-1.5">
                  {paginatedErrors.map((row, idx) => (
                    <button
                      key={`${row.id}-${idx}`}
                      type="button"
                      onClick={() => onInspectError(row.id)}
                      className="w-full rounded-sm px-3 py-2 text-left text-xs transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={row.status >= 500 ? "destructive" : "secondary"} className="px-1.5 py-0 text-[10px]">
                            {row.status}
                          </Badge>
                          <code className="truncate">{row.method}</code>
                        </div>
                        <span className="text-muted-foreground">{new Date(row.occurredAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {row.durationMs}ms | {formatBytes(row.requestBytes + row.responseBytes)} | {row.errorMessage || row.source}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sticky footer */}
        {!isLoading && details && (
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background pt-3">
            <Button variant="outline" size="sm" onClick={onMarkFixed}>
              Mark route fixed
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
