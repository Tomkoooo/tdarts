"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TelemetryFilterBar } from "./TelemetryFilterBar";
import { TelemetryHealthStrip } from "./TelemetryHealthStrip";
import { TelemetryIncidentsPanel } from "./TelemetryIncidentsPanel";
import { TelemetryRouteDetailsDrawer } from "./TelemetryRouteDetailsDrawer";
import { TelemetryRoutesPanel } from "./TelemetryRoutesPanel";
import { TelemetryTrendPanel } from "./TelemetryTrendPanel";
import {
  IncidentsData,
  OverviewData,
  RouteDetailsData,
  RouteRow,
  TelemetryGranularity,
  TelemetryMetric,
  TelemetryRange,
  TrendPoint,
} from "./types";
import { adminTelemetryActions } from "@/features/admin/actions/adminDomains.action";

type SortKey = "route" | "calls" | "errors" | "errorrate" | "latency" | "traffic" | "lastseen";
type SortDir = "asc" | "desc";
type InsightView = "all" | "high-latency" | "regressed" | "large-packets" | "rising-errors";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${Math.round((bytes / 1024) * 100) / 100} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round((bytes / (1024 * 1024)) * 100) / 100} MB`;
  return `${Math.round((bytes / (1024 * 1024 * 1024)) * 100) / 100} GB`;
}

function buildCommonParams(
  range: TelemetryRange,
  granularity: TelemetryGranularity,
  method: string,
  routeKey: string,
  customStart: string,
  customEnd: string
) {
  const params = new URLSearchParams({
    range,
    granularity,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  if (method !== "ALL") params.set("method", method);
  if (routeKey.trim()) params.set("routeKey", routeKey.trim());
  if (range === "custom" && customStart && customEnd) {
    params.set("start", new Date(customStart).toISOString());
    params.set("end", new Date(customEnd).toISOString());
  }
  return params;
}

const INSIGHT_TABS: Array<{ value: InsightView; label: string }> = [
  { value: "all", label: "All routes" },
  { value: "high-latency", label: "High latency" },
  { value: "regressed", label: "Latency regressed" },
  { value: "large-packets", label: "Large packets" },
  { value: "rising-errors", label: "Rising errors" },
];

export default function TelemetryDashboardV2() {
  const t = useTranslations("Admin.telemetry");
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [range, setRange] = useState<TelemetryRange>("24h");
  const [granularity, setGranularity] = useState<TelemetryGranularity>("hour");
  const [method, setMethod] = useState("ALL");
  const [routeSearch, setRouteSearch] = useState("");
  const [debouncedRouteSearch, setDebouncedRouteSearch] = useState("");
  const [metric, setMetric] = useState<TelemetryMetric>("calls");
  const [onlyProblematic, setOnlyProblematic] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("errors");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [insightView, setInsightView] = useState<InsightView>("all");

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [incidents, setIncidents] = useState<IncidentsData | null>(null);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [routeInsights, setRouteInsights] = useState<{
    highBaselineLatency: RouteRow[];
    latencyRegressed: RouteRow[];
    largestIncomingPackets: RouteRow[];
    largestOutgoingPackets: RouteRow[];
    risingErrorRate: RouteRow[];
  } | null>(null);

  const [selectedRoute, setSelectedRoute] = useState<RouteRow | null>(null);
  const [routeDetails, setRouteDetails] = useState<RouteDetailsData | null>(null);
  const [selectedErrorId, setSelectedErrorId] = useState("");
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [isTrendLoading, setIsTrendLoading] = useState(true);
  const [isIncidentsLoading, setIsIncidentsLoading] = useState(true);
  const [isRoutesLoading, setIsRoutesLoading] = useState(true);
  const [isAiExporting, setIsAiExporting] = useState(false);
  const [isAiCopying, setIsAiCopying] = useState(false);
  const [isApplyFixesOpen, setIsApplyFixesOpen] = useState(false);
  const [fixesJsonInput, setFixesJsonInput] = useState("");
  const [isApplyingFixes, setIsApplyingFixes] = useState(false);
  const hasInitializedFilters = useRef(false);

  useEffect(() => {
    if (hasInitializedFilters.current) return;
    const rangeFromUrl = (searchParams.get("range") || "") as TelemetryRange;
    const metricFromUrl = (searchParams.get("metric") || "") as TelemetryMetric;
    const granularityFromUrl = (searchParams.get("granularity") || "") as TelemetryGranularity;
    const methodFromUrl = searchParams.get("method") || "ALL";
    const routeSearchFromUrl = searchParams.get("search") || "";
    const localRange = (localStorage.getItem("telemetry.v2.range") || "") as TelemetryRange;
    const localMetric = (localStorage.getItem("telemetry.v2.metric") || "") as TelemetryMetric;
    const localGranularity = (localStorage.getItem("telemetry.v2.granularity") || "") as TelemetryGranularity;
    const localMethod = localStorage.getItem("telemetry.v2.method") || "ALL";
    const localProblematic = localStorage.getItem("telemetry.v2.onlyProblematic") === "true";

    if (rangeFromUrl || localRange) setRange(rangeFromUrl || localRange);
    if (metricFromUrl || localMetric) setMetric(metricFromUrl || localMetric);
    if (granularityFromUrl || localGranularity) setGranularity(granularityFromUrl || localGranularity);
    if (methodFromUrl || localMethod) setMethod(methodFromUrl || localMethod);
    if (routeSearchFromUrl) setRouteSearch(routeSearchFromUrl);
    setOnlyProblematic(localProblematic);
    hasInitializedFilters.current = true;
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRouteSearch(routeSearch.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [routeSearch]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("range", range);
    params.set("metric", metric);
    params.set("granularity", granularity);
    params.set("method", method);
    if (debouncedRouteSearch) params.set("search", debouncedRouteSearch);
    const nextQuery = params.toString();
    if (nextQuery !== searchParams.toString()) {
      router.replace(`${pathname}?${nextQuery}`, { scroll: false });
    }

    localStorage.setItem("telemetry.v2.range", range);
    localStorage.setItem("telemetry.v2.metric", metric);
    localStorage.setItem("telemetry.v2.granularity", granularity);
    localStorage.setItem("telemetry.v2.method", method);
    localStorage.setItem("telemetry.v2.onlyProblematic", String(onlyProblematic));
  }, [range, metric, granularity, method, onlyProblematic, debouncedRouteSearch, pathname, router, searchParams]);

  const refreshDashboard = async () => {
    try {
      const common = buildCommonParams(range, granularity, method, "", customStart, customEnd);
      if (debouncedRouteSearch) common.set("search", debouncedRouteSearch);
      const routesParams = new URLSearchParams(common.toString());
      routesParams.set("onlyProblematic", onlyProblematic ? "true" : "false");
      routesParams.set("page", String(page));
      routesParams.set("limit", "20");
      routesParams.set("sortBy", sortBy);
      routesParams.set("sortDir", sortDir);

      if (!overview) setIsOverviewLoading(true);
      if (trendPoints.length === 0) setIsTrendLoading(true);
      if (!incidents) setIsIncidentsLoading(true);
      if (routes.length === 0) setIsRoutesLoading(true);

      const [overviewRes, trendsRes, incidentsRes, routesRes] = await Promise.all([
        adminTelemetryActions.overview(Object.fromEntries(common.entries())),
        adminTelemetryActions.trends(Object.fromEntries(common.entries())),
        adminTelemetryActions.incidents(Object.fromEntries(common.entries())),
        adminTelemetryActions.routes(Object.fromEntries(routesParams.entries())),
      ]);

      setOverview(overviewRes.data?.data || null);
      setTrendPoints(trendsRes.data?.data?.points || []);
      setIncidents(incidentsRes.data?.data || null);
      setRoutes(routesRes.data?.data || []);
      setTotalPages(routesRes.data?.pagination?.totalPages || 1);
      setRouteInsights(routesRes.data?.insights || null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("error_loading"));
    } finally {
      setIsOverviewLoading(false);
      setIsTrendLoading(false);
      setIsIncidentsLoading(false);
      setIsRoutesLoading(false);
    }
  };

  const fetchRouteDetails = async (row: RouteRow, errorId?: string) => {
    if (!selectedRoute || selectedRoute.routeKey !== row.routeKey || selectedRoute.method !== row.method) {
      setSelectedErrorId("");
    }
    setSelectedRoute(row);
    setIsDetailsLoading(true);
    try {
      const common = buildCommonParams(range, granularity, row.method, row.routeKey, customStart, customEnd);
      if (errorId) common.set("errorId", errorId);
      const response = await adminTelemetryActions.routeDetails(Object.fromEntries(common.entries()));
      setRouteDetails(response.data?.data || null);
      setSelectedErrorId(errorId || "");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to load route details");
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const markRouteFixed = async () => {
    if (!selectedRoute) return;
    try {
      await adminTelemetryActions.errorResets({
        routeKey: selectedRoute.routeKey,
        method: selectedRoute.method,
      });
      toast.success("Route baseline reset and old errors marked fixed.");
      await Promise.all([refreshDashboard(), fetchRouteDetails(selectedRoute)]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to mark route fixed");
    }
  };

  const fetchAiPromptPayload = async () => {
    const params = buildCommonParams(range, granularity, method, "", customStart, customEnd);
    if (debouncedRouteSearch) params.set("search", debouncedRouteSearch);
    params.set("mode", "ai_prompt");
    const response = await adminTelemetryActions.export(Object.fromEntries(params.entries()));
    return response.data;
  };

  const exportAiPromptJson = async () => {
    try {
      setIsAiExporting(true);
      const payload = await fetchAiPromptPayload();
      const filename = `api-telemetry-ai-prompt-${Date.now()}.json`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("AI prompt JSON exported.");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to export AI prompt JSON");
    } finally {
      setIsAiExporting(false);
    }
  };

  const copyAiPromptJson = async () => {
    try {
      setIsAiCopying(true);
      const payload = await fetchAiPromptPayload();
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success("AI prompt JSON copied.");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to copy AI prompt JSON");
    } finally {
      setIsAiCopying(false);
    }
  };

  const applyFixesFromJson = async () => {
    try {
      setIsApplyingFixes(true);
      const parsed = JSON.parse(fixesJsonInput || "{}");
      const fixes = Array.isArray(parsed?.fixes) ? parsed.fixes : [];
      const routes = fixes
        .map((item: any) => ({
          routeKey: typeof item?.routeKey === "string" ? item.routeKey.trim() : "",
          method: typeof item?.method === "string" ? item.method.trim().toUpperCase() : "ALL",
        }))
        .filter((item: { routeKey: string; method: string }) => item.routeKey);

      if (routes.length === 0) {
        toast.error("No valid fixes found. Expected { fixes: [{ routeKey, method }] }");
        return;
      }

      const response = await adminTelemetryActions.errorResets({ routes });
      const processed = response.data?.data?.totalRoutesProcessed || routes.length;
      const resolved = response.data?.data?.totalResolvedCount || 0;
      toast.success(`Applied fixes to ${processed} routes (${resolved} errors resolved).`);
      setIsApplyFixesOpen(false);
      setFixesJsonInput("");
      await refreshDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Invalid JSON or failed applying fixes");
    } finally {
      setIsApplyingFixes(false);
    }
  };

  const inspectError = async (errorId: string) => {
    if (!selectedRoute) return;
    if (!errorId) {
      setSelectedErrorId("");
      if (routeDetails) {
        setRouteDetails({ ...routeDetails, selectedError: null });
      }
      return;
    }
    await fetchRouteDetails(selectedRoute, errorId);
  };

  const handleIncidentErrorClick = async (routeKey: string, method: string, errorId: string) => {
    const syntheticRow: RouteRow = {
      routeKey,
      method,
      totalCalls: 0,
      totalErrors: 0,
      errorRate: 0,
      avgLatencyMs: 0,
      totalRequestBytes: 0,
      totalResponseBytes: 0,
      totalTrafficBytes: 0,
      avgPacketBytes: 0,
      baselineAvgLatencyMs: 0,
      latencyRatio: 0,
      baselineErrorRate: 0,
      errorRateRatio: 0,
      avgIncomingPacketBytes: 0,
      avgOutgoingPacketBytes: 0,
      lastSeen: "",
    };
    await fetchRouteDetails(syntheticRow, errorId);
  };

  useEffect(() => {
    if (range === "custom" && (!customStart || !customEnd)) return;
    refreshDashboard();
  }, [range, granularity, method, debouncedRouteSearch, onlyProblematic, page, customStart, customEnd, sortBy, sortDir]);

  useEffect(() => {
    const timer = setInterval(() => {
      const common = buildCommonParams(range, granularity, method, "", customStart, customEnd);
      if (debouncedRouteSearch) common.set("search", debouncedRouteSearch);
      Promise.all([
        adminTelemetryActions.overview(Object.fromEntries(common.entries())),
        adminTelemetryActions.incidents(Object.fromEntries(common.entries())),
      ])
        .then(([overviewRes, incidentsRes]) => {
          setOverview(overviewRes.data?.data || null);
          setIncidents(incidentsRes.data?.data || null);
        })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, [range, granularity, method, debouncedRouteSearch, customStart, customEnd]);

  const isRefreshing = useMemo(
    () => isOverviewLoading || isTrendLoading || isIncidentsLoading || isRoutesLoading,
    [isOverviewLoading, isTrendLoading, isIncidentsLoading, isRoutesLoading]
  );

  const displayedRoutes = useMemo(() => {
    if (!routeInsights || insightView === "all") return routes;
    switch (insightView) {
      case "high-latency":
        return routeInsights.highBaselineLatency;
      case "regressed":
        return routeInsights.latencyRegressed;
      case "large-packets":
        return [...routeInsights.largestIncomingPackets, ...routeInsights.largestOutgoingPackets]
          .filter((r, i, arr) => arr.findIndex((x) => x.routeKey === r.routeKey && x.method === r.method) === i)
          .sort((a, b) => b.avgPacketBytes - a.avgPacketBytes);
      case "rising-errors":
        return routeInsights.risingErrorRate;
      default:
        return routes;
    }
  }, [insightView, routes, routeInsights]);

  const displayedTotalPages = insightView === "all" ? totalPages : 1;

  return (
    <div className="mx-auto max-w-[1650px] space-y-4 p-3 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("description")} &middot; {format.dateTime(new Date(), { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyAiPromptJson}
            disabled={isAiCopying}
            className="rounded-md border border-border bg-secondary px-3 py-2 text-xs text-secondary-foreground disabled:opacity-60"
          >
            {isAiCopying ? "Copying..." : "Copy AI Prompt JSON"}
          </button>
          <button
            type="button"
            onClick={exportAiPromptJson}
            disabled={isAiExporting}
            className="rounded-md border border-border bg-secondary px-3 py-2 text-xs text-secondary-foreground disabled:opacity-60"
          >
            {isAiExporting ? "Exporting..." : "Download AI Prompt JSON"}
          </button>
          <button
            type="button"
            onClick={() => setIsApplyFixesOpen(true)}
            className="rounded-md border border-border bg-primary px-3 py-2 text-xs text-primary-foreground"
          >
            Apply Fixes JSON
          </button>
        </div>
      </div>

      <TelemetryFilterBar
        range={range}
        granularity={granularity}
        method={method}
        routeSearch={routeSearch}
        metric={metric}
        onlyProblematic={onlyProblematic}
        customStart={customStart}
        customEnd={customEnd}
        isLoading={isRefreshing}
        onRangeChange={(value) => { setRange(value); setPage(1); }}
        onGranularityChange={setGranularity}
        onMethodChange={(value) => { setMethod(value); setPage(1); }}
        onRouteSearchChange={(value) => { setRouteSearch(value); setPage(1); }}
        onMetricChange={setMetric}
        onOnlyProblematicChange={(value) => { setOnlyProblematic(value); setPage(1); }}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        onApplyCustom={() => {
          if (!customStart || !customEnd) { toast.error("Select both custom range dates."); return; }
          refreshDashboard();
        }}
        onRefresh={refreshDashboard}
      />

      <TelemetryHealthStrip overview={overview} formatBytes={formatBytes} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isTrendLoading ? (
            <div className="h-[320px] animate-pulse rounded-xl border border-border bg-muted/30" />
          ) : (
            <TelemetryTrendPanel metric={metric} points={trendPoints} formatBytes={formatBytes} />
          )}
        </div>
        <div>
          {isIncidentsLoading ? (
            <div className="h-[320px] animate-pulse rounded-xl border border-border bg-muted/30" />
          ) : (
            <TelemetryIncidentsPanel
              incidents={incidents}
              formatBytes={formatBytes}
              onErrorClick={handleIncidentErrorClick}
            />
          )}
        </div>
      </div>

      {/* Dedicated secondary latency chart row (always visible). */}
      {!isTrendLoading && (
        <div>
          <TelemetryTrendPanel metric="latency" points={trendPoints} formatBytes={formatBytes} />
        </div>
      )}

      {/* Route table with insight view tabs */}
      {isRoutesLoading ? (
        <div className="h-[400px] animate-pulse rounded-xl border border-border bg-muted/30" />
      ) : (
        <div className="space-y-2">
          <Tabs value={insightView} onValueChange={(v) => { setInsightView(v as InsightView); setPage(1); }}>
            <TabsList>
              {INSIGHT_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                  {tab.label}
                  {tab.value !== "all" && routeInsights && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      ({tab.value === "high-latency" ? routeInsights.highBaselineLatency.length
                        : tab.value === "regressed" ? routeInsights.latencyRegressed.length
                          : tab.value === "large-packets"
                            ? [...routeInsights.largestIncomingPackets, ...routeInsights.largestOutgoingPackets]
                                .filter((r, i, arr) => arr.findIndex((x) => x.routeKey === r.routeKey && x.method === r.method) === i).length
                            : routeInsights.risingErrorRate.length})
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <TelemetryRoutesPanel
            rows={displayedRoutes}
            page={insightView === "all" ? page : 1}
            totalPages={displayedTotalPages}
            sortBy={sortBy}
            sortDir={sortDir}
            onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
            onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            onOpenRoute={fetchRouteDetails}
            onSortChange={(newSort, newDir) => { setSortBy(newSort); setSortDir(newDir); setPage(1); }}
            formatBytes={formatBytes}
            compact={insightView !== "all"}
          />
        </div>
      )}

      <TelemetryRouteDetailsDrawer
        open={Boolean(selectedRoute)}
        isLoading={isDetailsLoading}
        details={routeDetails}
        selectedErrorId={selectedErrorId}
        formatBytes={formatBytes}
        onClose={() => {
          setSelectedRoute(null);
          setRouteDetails(null);
          setSelectedErrorId("");
        }}
        onMarkFixed={markRouteFixed}
        onInspectError={inspectError}
      />

      <Dialog open={isApplyFixesOpen} onOpenChange={setIsApplyFixesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply Fixes JSON</DialogTitle>
            <DialogDescription>
              Paste AI output JSON with a top-level <code>fixes</code> array. Each item must include <code>routeKey</code> and <code>method</code>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <textarea
              value={fixesJsonInput}
              onChange={(e) => setFixesJsonInput(e.target.value)}
              placeholder={`{\n  \"fixes\": [\n    { \"routeKey\": \"/v1/foo\", \"method\": \"GET\" }\n  ]\n}`}
              className="h-64 w-full rounded-md border border-border bg-background p-3 text-xs font-mono"
            />
            <input
              type="file"
              accept="application/json,.json,text/plain"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const content = await file.text();
                setFixesJsonInput(content);
              }}
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsApplyFixesOpen(false)}
              className="rounded-md border border-border px-3 py-2 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyFixesFromJson}
              disabled={isApplyingFixes}
              className="rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-60"
            >
              {isApplyingFixes ? "Applying..." : "Apply fixes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
