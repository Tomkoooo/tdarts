"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { startStressRunAction, stopStressRunAction } from "@/features/admin/actions/stressRunsServer.action";

type EndpointProfile = "session_full_match" | "session_safe_match";
type RunStatus = "queued" | "running" | "completed" | "stopped" | "failed";

type RunRecord = {
  _id: string;
  name: string;
  status: RunStatus;
  createdAt: string;
  target: { environment: "production" | "staging" | "custom"; tournamentCode: string };
  config: { users: number; durationSeconds: number; endpointProfile?: EndpointProfile };
  counters: {
    totalCalls: number;
    errorCalls: number;
    droppedCalls: number;
    timedOutCalls: number;
    totalRequestBytes: number;
    totalResponseBytes: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  endpointCounters: Record<string, { calls: number; errors: number; drops: number; latencySumMs: number; latencyMaxMs: number }>;
};

type RunContext = {
  authMode: string;
  endpointProfile: EndpointProfile;
  lifecycleMode: string;
  parallelTournamentTest?: boolean;
  parallelTournamentCount?: number;
  provisionClubId?: string;
  resolvedTournamentCode: string;
  resolvedTournamentCodes?: string[];
  checks: Array<{ key: string; ok: boolean; message: string }>;
};

type SampleRecord = {
  secondFromStart: number;
  calls: number;
  errorCount: number;
  drops: number;
  latency: { avgMs: number; p95Ms: number; p99Ms: number };
  process: { cpuPercent: number; rssMb: number; heapUsedMb: number; eventLoopLagMs: number };
  host?: { cpuPercent?: number; memoryPercent?: number };
};

type FormState = {
  name: string;
  users: number;
  durationSeconds: number;
  baseUrl: string;
  locale: string;
  targetEnvironment: "production" | "staging" | "custom";
  tournamentCode: string;
  autoProvisionLifecycle: boolean;
  parallelTournamentTest: boolean;
  parallelTournamentCount: number;
  clubId: string;
  provisionPlayerCount: number;
  endpointProfile: EndpointProfile;
  rampUpSeconds: number;
  requestTimeoutMs: number;
  retryCount: number;
  circuitBreakerErrorRatePercent: number;
  productionConfirmed: boolean;
  dangerModeConfirmation: string;
  weights: {
    tournamentGet: number;
    avatarGet: number;
    matchGet: number;
    knockoutGet: number;
    tournamentPageGet: number;
    matchFinishLegPost: number;
    matchFinishPost: number;
    matchUndoLegPost: number;
    matchUpdatePlayerPost: number;
    matchUpdateBoardStatusPost: number;
    matchUpdateSettingsPost: number;
    tournamentGenerateGroupsPost: number;
    tournamentGenerateKnockoutPost: number;
    tournamentFinishPost: number;
  };
};

const DEFAULT_FORM: FormState = {
  name: "1000 users / 10m",
  users: 1000,
  durationSeconds: 600,
  baseUrl: "",
  locale: "hu",
  targetEnvironment: "production",
  tournamentCode: "",
  autoProvisionLifecycle: false,
  parallelTournamentTest: false,
  parallelTournamentCount: 1,
  clubId: "",
  provisionPlayerCount: 32,
  endpointProfile: "session_full_match",
  rampUpSeconds: 45,
  requestTimeoutMs: 10_000,
  retryCount: 0,
  circuitBreakerErrorRatePercent: 45,
  productionConfirmed: false,
  dangerModeConfirmation: "",
  weights: {
    tournamentGet: 20,
    avatarGet: 10,
    matchGet: 18,
    knockoutGet: 10,
    tournamentPageGet: 12,
    matchFinishLegPost: 8,
    matchFinishPost: 6,
    matchUndoLegPost: 4,
    matchUpdatePlayerPost: 4,
    matchUpdateBoardStatusPost: 5,
    matchUpdateSettingsPost: 3,
    tournamentGenerateGroupsPost: 2,
    tournamentGenerateKnockoutPost: 2,
    tournamentFinishPost: 1,
  },
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getPreflight(form: FormState) {
  const checks: Array<{ key: string; ok: boolean; message: string }> = [
    { key: "baseUrl", ok: /^https?:\/\//.test(form.baseUrl), message: "Base URL must start with http:// or https://" },
    { key: "users", ok: form.users >= 1 && form.users <= 1000, message: "Users must be between 1 and 1000." },
    { key: "duration", ok: form.durationSeconds >= 10 && form.durationSeconds <= 600, message: "Duration must be between 10s and 600s." },
    {
      key: "sandbox",
      ok: form.autoProvisionLifecycle || form.tournamentCode.trim().length > 0,
      message: "Provide sandbox tournament code or enable auto-provision lifecycle.",
    },
    {
      key: "clubId",
      ok: !form.parallelTournamentTest || form.clubId.trim().length === 0 || /^[a-fA-F0-9]{24}$/.test(form.clubId.trim()),
      message: "Club ID must be empty or a valid Mongo ObjectId when parallel mode is enabled.",
    },
    {
      key: "parallelAutoProvision",
      ok: !form.parallelTournamentTest || form.autoProvisionLifecycle,
      message: "Parallel tournament test requires auto-provision lifecycle.",
    },
    {
      key: "parallelTournamentCount",
      ok: !form.parallelTournamentTest || (form.parallelTournamentCount >= 1 && form.parallelTournamentCount <= 20),
      message: "Parallel tournament count must be between 1 and 20.",
    },
    {
      key: "productionConfirm",
      ok:
        form.targetEnvironment !== "production" ||
        (form.productionConfirmed && form.dangerModeConfirmation === "I_UNDERSTAND_THE_RISK"),
      message: "Production requires checkbox + exact confirmation phrase.",
    },
  ];
  return checks;
}

export default function StressAdminDashboard() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [activeRunId, setActiveRunId] = useState("");
  const [activeRun, setActiveRun] = useState<RunRecord | null>(null);
  const [samples, setSamples] = useState<SampleRecord[]>([]);
  const [runContext, setRunContext] = useState<RunContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningAction, setRunningAction] = useState(false);
  const [isExportingAiJson, setIsExportingAiJson] = useState(false);

  const preflight = useMemo(() => getPreflight(form), [form]);
  const isPreflightOk = preflight.every((check) => check.ok);

  const applyPreset = (preset: "smoke" | "heavy" | "1000x10m") => {
    if (preset === "smoke") {
      setForm((prev) => ({ ...prev, name: "Smoke", users: 40, durationSeconds: 60, rampUpSeconds: 15, endpointProfile: "session_safe_match" }));
      return;
    }
    if (preset === "heavy") {
      setForm((prev) => ({ ...prev, name: "Heavy", users: 300, durationSeconds: 300, rampUpSeconds: 30, endpointProfile: "session_full_match" }));
      return;
    }
    setForm((prev) => ({ ...prev, name: "1000 users / 10m", users: 1000, durationSeconds: 600, rampUpSeconds: 45, endpointProfile: "session_full_match" }));
  };

  const refreshRuns = async () => {
    const response = await axios.get("/api/admin/stress-runs?limit=50");
    const list = response.data?.data || [];
    setRuns(list);
    if (!activeRunId && list[0]?._id) setActiveRunId(list[0]._id);
  };

  const refreshActiveRun = async (runId: string) => {
    const [runRes, sampleRes] = await Promise.all([
      axios.get(`/api/admin/stress-runs/${runId}`),
      axios.get(`/api/admin/stress-runs/${runId}/samples?limit=3600`),
    ]);
    setActiveRun(runRes.data?.data || null);
    setSamples(sampleRes.data?.data || []);
  };

  useEffect(() => {
    void refreshRuns().catch(() => toast.error("Failed to load run history."));
  }, []);

  useEffect(() => {
    if (!activeRunId) return;
    setLoading(true);
    void refreshActiveRun(activeRunId).finally(() => setLoading(false));
  }, [activeRunId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!activeRunId) return;
      void refreshActiveRun(activeRunId).catch(() => {});
      void refreshRuns().catch(() => {});
    }, 2000);
    return () => clearInterval(timer);
  }, [activeRunId]);

  const telemetryRows = useMemo(
    () =>
      samples.map((sample) => ({
        t: sample.secondFromStart,
        rps: sample.calls,
        errors: sample.errorCount || 0,
        drops: sample.drops,
        avgLatency: sample.latency?.avgMs || 0,
        p95Latency: sample.latency?.p95Ms || 0,
        p99Latency: sample.latency?.p99Ms || 0,
        cpu: sample.process?.cpuPercent || 0,
        rssMb: sample.process?.rssMb || 0,
        heapMb: sample.process?.heapUsedMb || 0,
        lagMs: sample.process?.eventLoopLagMs || 0,
        hostCpu: sample.host?.cpuPercent || 0,
        hostMem: sample.host?.memoryPercent || 0,
      })),
    [samples]
  );

  const endpointRows = useMemo(() => {
    const map = activeRun?.endpointCounters || {};
    return Object.entries(map)
      .map(([endpoint, value]) => ({
        endpoint,
        calls: value.calls || 0,
        errors: value.errors || 0,
        drops: value.drops || 0,
        avgLatencyMs: value.calls > 0 ? value.latencySumMs / value.calls : 0,
        maxLatencyMs: value.latencyMaxMs || 0,
      }))
      .sort((a, b) => b.calls - a.calls);
  }, [activeRun]);

  const startRun = async () => {
    if (!isPreflightOk) {
      toast.error("Please fix preflight checks before starting.");
      return;
    }

    try {
      setRunningAction(true);
      const result = await startStressRunAction({
        ...form,
        tournamentCode: form.tournamentCode.trim().toUpperCase(),
        baseUrl: form.baseUrl.trim(),
      });
      if (!result.ok) {
        toast.error(result.error || "Failed to start stress run.");
        return;
      }
      const payload = result.data as { runId?: string; runContext?: RunContext };
      const newRunId = payload?.runId as string;
      setRunContext(payload?.runContext || null);
      toast.success("Stress run started.");
      await refreshRuns();
      if (newRunId) setActiveRunId(newRunId);
    } catch (error: any) {
      toast.error(error?.message || "Failed to start stress run.");
    } finally {
      setRunningAction(false);
    }
  };

  const stopRun = async () => {
    if (!activeRun?._id) return;
    try {
      setRunningAction(true);
      const result = await stopStressRunAction(activeRun._id);
      if (!result.ok) {
        toast.error(result.error || "Failed to stop run.");
        return;
      }
      toast.success("Stop requested.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to stop run.");
    } finally {
      setRunningAction(false);
    }
  };

  const exportRunJsonForAi = async () => {
    const runId = activeRun?._id || activeRunId;
    if (!runId) {
      toast.error("Select a run first.");
      return;
    }

    try {
      setIsExportingAiJson(true);
      const response = await axios.get(`/api/admin/stress-runs/${runId}/export?mode=full&limit=6000`);
      const filename = `stress-run-ai-export-${runId}-${Date.now()}.json`;
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("AI run export downloaded.");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to export AI run JSON.");
    } finally {
      setIsExportingAiJson(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stress Test Runner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => applyPreset("smoke")}>Preset: Smoke</Button>
            <Button variant="outline" onClick={() => applyPreset("heavy")}>Preset: Heavy</Button>
            <Button variant="outline" onClick={() => applyPreset("1000x10m")}>Preset: 1000 users / 10m</Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1"><label className="text-xs font-medium">Run name</label><Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} /></div>
            <div className="space-y-1"><label className="text-xs font-medium">Target environment</label><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.targetEnvironment} onChange={(e) => setForm((s) => ({ ...s, targetEnvironment: e.target.value as any }))}><option value="production">production</option><option value="staging">staging</option><option value="custom">custom</option></select></div>
            <div className="space-y-1"><label className="text-xs font-medium">Base URL</label><Input placeholder="https://example.com" value={form.baseUrl} onChange={(e) => setForm((s) => ({ ...s, baseUrl: e.target.value }))} /></div>
            <div className="space-y-1"><label className="text-xs font-medium">Users</label><Input type="number" value={form.users} onChange={(e) => setForm((s) => ({ ...s, users: Number(e.target.value || 0) }))} /></div>
            <div className="space-y-1"><label className="text-xs font-medium">Duration (seconds)</label><Input type="number" value={form.durationSeconds} onChange={(e) => setForm((s) => ({ ...s, durationSeconds: Number(e.target.value || 0) }))} /></div>
            <div className="space-y-1"><label className="text-xs font-medium">Sandbox tournament code</label><Input placeholder="Optional with auto-provision" value={form.tournamentCode} onChange={(e) => setForm((s) => ({ ...s, tournamentCode: e.target.value.toUpperCase() }))} /></div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.autoProvisionLifecycle} onChange={(e) => setForm((s) => ({ ...s, autoProvisionLifecycle: e.target.checked }))} />
              Auto-provision lifecycle (create/prepare sandbox, add players, check-in, groups, knockout)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.parallelTournamentTest} onChange={(e) => setForm((s) => ({ ...s, parallelTournamentTest: e.target.checked }))} />
              Parallel tournament test (run tournament stream + lifecycle stream together)
            </label>
            <div className="space-y-1">
              <label className="text-xs font-medium">Parallel tournament count</label>
              <Input type="number" min={1} max={20} value={form.parallelTournamentCount} onChange={(e) => setForm((s) => ({ ...s, parallelTournamentCount: Number(e.target.value || 0) }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Provision club ID (optional)</label>
              <Input placeholder="Mongo ObjectId, optional" value={form.clubId} onChange={(e) => setForm((s) => ({ ...s, clubId: e.target.value.trim() }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Provision player count</label>
              <Input type="number" value={form.provisionPlayerCount} onChange={(e) => setForm((s) => ({ ...s, provisionPlayerCount: Number(e.target.value || 0) }))} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Match API profile</label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.endpointProfile} onChange={(e) => setForm((s) => ({ ...s, endpointProfile: e.target.value as EndpointProfile }))}>
              <option value="session_full_match">Full match profile (finish-leg, finish, undo-leg, updatePlayer, updateBoardStatus, update-settings)</option>
              <option value="session_safe_match">Safe match profile (updateBoardStatus, update-settings)</option>
            </select>
          </div>

          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">Advanced settings</summary>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1"><label className="text-xs font-medium">Locale</label><Input value={form.locale} onChange={(e) => setForm((s) => ({ ...s, locale: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Ramp-up seconds</label><Input type="number" value={form.rampUpSeconds} onChange={(e) => setForm((s) => ({ ...s, rampUpSeconds: Number(e.target.value || 0) }))} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Request timeout ms</label><Input type="number" value={form.requestTimeoutMs} onChange={(e) => setForm((s) => ({ ...s, requestTimeoutMs: Number(e.target.value || 0) }))} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Retry count</label><Input type="number" value={form.retryCount} onChange={(e) => setForm((s) => ({ ...s, retryCount: Number(e.target.value || 0) }))} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Circuit breaker error/drop %</label><Input type="number" value={form.circuitBreakerErrorRatePercent} onChange={(e) => setForm((s) => ({ ...s, circuitBreakerErrorRatePercent: Number(e.target.value || 0) }))} /></div>
              <div className="space-y-1"><label className="text-xs font-medium">Confirm phrase</label><Input placeholder="I_UNDERSTAND_THE_RISK" value={form.dangerModeConfirmation} onChange={(e) => setForm((s) => ({ ...s, dangerModeConfirmation: e.target.value }))} /></div>
              <label className="flex items-center gap-2 text-sm md:col-span-3">
                <input type="checkbox" checked={form.productionConfirmed} onChange={(e) => setForm((s) => ({ ...s, productionConfirmed: e.target.checked }))} />
                I explicitly confirm production targeting if selected.
              </label>
            </div>
          </details>

          <Alert>
            <AlertTitle>Auth + Lifecycle context</AlertTitle>
            <AlertDescription>
              Auth mode: current logged-in admin session token. Lifecycle: {form.autoProvisionLifecycle ? "auto-provision sandbox" : "use existing sandbox tournament"}. Parallel: {form.parallelTournamentTest ? `enabled (${form.parallelTournamentCount} tournament(s))` : "disabled"}.
            </AlertDescription>
          </Alert>

          <div className="space-y-1">
            <div className="text-sm font-medium">Preflight</div>
            <div className="grid gap-1">
              {preflight.map((check) => (
                <div key={check.key} className={`text-xs ${check.ok ? "text-green-600" : "text-red-600"}`}>
                  {check.ok ? "OK" : "FAIL"} - {check.message}
                </div>
              ))}
            </div>
          </div>

          {runContext && (
            <Alert variant="info">
              <AlertTitle>Last start context</AlertTitle>
              <AlertDescription>
                Auth: {runContext.authMode} | Profile: {runContext.endpointProfile} | Lifecycle: {runContext.lifecycleMode} | Parallel: {runContext.parallelTournamentTest ? `on (${runContext.parallelTournamentCount || 1})` : "off"} | Club: {runContext.provisionClubId || "-"} | Tournament: {runContext.resolvedTournamentCode}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={startRun} disabled={runningAction || !isPreflightOk}>Start stress run</Button>
            <Button variant="destructive" onClick={stopRun} disabled={runningAction || !activeRun || !["running", "queued"].includes(activeRun.status)}>Stop active run</Button>
            <Button variant="outline" onClick={() => { void refreshRuns(); if (activeRunId) void refreshActiveRun(activeRunId); }}>Refresh</Button>
            <Button variant="outline" onClick={exportRunJsonForAi} disabled={isExportingAiJson || (!activeRun && !activeRunId)}>
              {isExportingAiJson ? "Exporting..." : "Export run JSON for AI"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Run history</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b"><th className="px-2 py-2 text-left">Name</th><th className="px-2 py-2 text-left">Status</th><th className="px-2 py-2 text-left">Users</th><th className="px-2 py-2 text-left">Duration</th><th className="px-2 py-2 text-left">Profile</th><th className="px-2 py-2 text-left">Created</th></tr></thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run._id} className={`cursor-pointer border-b hover:bg-muted/30 ${activeRunId === run._id ? "bg-muted/40" : ""}`} onClick={() => setActiveRunId(run._id)}>
                    <td className="px-2 py-2">{run.name}</td>
                    <td className="px-2 py-2">{run.status}</td>
                    <td className="px-2 py-2">{run.config?.users ?? "-"}</td>
                    <td className="px-2 py-2">{run.config?.durationSeconds ?? "-"}s</td>
                    <td className="px-2 py-2">{run.config?.endpointProfile || "-"}</td>
                    <td className="px-2 py-2">{new Date(run.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Run telemetry</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!activeRun || loading ? (
            <div className="text-sm text-muted-foreground">Select a run to inspect telemetry.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Calls</div><div className="text-xl font-semibold">{activeRun.counters.totalCalls}</div></div>
                <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Errors</div><div className="text-xl font-semibold">{activeRun.counters.errorCalls}</div></div>
                <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Drops</div><div className="text-xl font-semibold">{activeRun.counters.droppedCalls}</div></div>
                <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Traffic</div><div className="text-xl font-semibold">{formatBytes(activeRun.counters.totalRequestBytes + activeRun.counters.totalResponseBytes)}</div></div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card><CardHeader><CardTitle className="text-base">Throughput and errors</CardTitle></CardHeader><CardContent><div className="h-[260px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={telemetryRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="t" /><YAxis /><Tooltip /><Legend /><Line dataKey="rps" stroke="#2563eb" dot={false} name="Calls/s" /><Line dataKey="errors" stroke="#dc2626" dot={false} name="Errors/s" /><Line dataKey="drops" stroke="#f97316" dot={false} name="Drops/s" /></LineChart></ResponsiveContainer></div></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-base">Latency</CardTitle></CardHeader><CardContent><div className="h-[260px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={telemetryRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="t" /><YAxis /><Tooltip /><Legend /><Line dataKey="avgLatency" stroke="#0891b2" dot={false} name="Avg ms" /><Line dataKey="p95Latency" stroke="#7c3aed" dot={false} name="p95 ms" /><Line dataKey="p99Latency" stroke="#be123c" dot={false} name="p99 ms" /></LineChart></ResponsiveContainer></div></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-base">Process usage</CardTitle></CardHeader><CardContent><div className="h-[260px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={telemetryRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="t" /><YAxis /><Tooltip /><Legend /><Line dataKey="cpu" stroke="#059669" dot={false} name="CPU %" /><Line dataKey="rssMb" stroke="#ea580c" dot={false} name="RSS MB" /><Line dataKey="heapMb" stroke="#8b5cf6" dot={false} name="Heap MB" /><Line dataKey="lagMs" stroke="#e11d48" dot={false} name="Event loop lag ms" /></LineChart></ResponsiveContainer></div></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-base">Host metrics overlay</CardTitle></CardHeader><CardContent><div className="h-[260px] w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={telemetryRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="t" /><YAxis /><Tooltip /><Legend /><Line dataKey="hostCpu" stroke="#0f766e" dot={false} name="Host CPU %" /><Line dataKey="hostMem" stroke="#a16207" dot={false} name="Host memory %" /></LineChart></ResponsiveContainer></div></CardContent></Card>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Endpoint breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead><tr className="border-b"><th className="px-2 py-2 text-left">Endpoint key</th><th className="px-2 py-2 text-right">Calls</th><th className="px-2 py-2 text-right">Errors</th><th className="px-2 py-2 text-right">Drops</th><th className="px-2 py-2 text-right">Avg latency</th><th className="px-2 py-2 text-right">Max latency</th></tr></thead>
                    <tbody>
                      {endpointRows.map((row) => (
                        <tr key={row.endpoint} className="border-b">
                          <td className="px-2 py-2">{row.endpoint}</td>
                          <td className="px-2 py-2 text-right">{row.calls}</td>
                          <td className="px-2 py-2 text-right">{row.errors}</td>
                          <td className="px-2 py-2 text-right">{row.drops}</td>
                          <td className="px-2 py-2 text-right">{row.avgLatencyMs.toFixed(1)} ms</td>
                          <td className="px-2 py-2 text-right">{row.maxLatencyMs.toFixed(1)} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
