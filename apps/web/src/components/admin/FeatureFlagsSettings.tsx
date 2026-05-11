"use client";

import { useEffect, useState } from "react";
import {
  IconActivity,
  IconChartBar,
  IconCheck,
  IconFlag,
  IconRefresh,
  IconSection,
  IconShield,
  IconShieldCheck,
  IconUserShield,
  IconX,
  type Icon,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { adminSettingsActions } from "@/features/admin/actions/adminDomains.action";

type FeatureToggleKey =
  | "LEAGUES"
  | "SOCKET"
  | "LIVE_MATCH_FOLLOWING"
  | "DETAILED_STATISTICS"
  | "ADVANCED_STATISTICS"
  | "OAC_CREATION";

type SystemSettingsResult = {
  features: Record<FeatureToggleKey, boolean>;
  subscriptionPaywallEnabled: boolean;
  superAdminBypassEnabled: boolean;
  updatedAt: string;
  updatedBy: string | null;
};

type FeatureMeta = {
  key: FeatureToggleKey;
  label: string;
  description: string;
  icon: Icon;
};

const FEATURE_META: FeatureMeta[] = [
  {
    key: "LEAGUES",
    label: "Leagues",
    description: "League management, standings and points.",
    icon: IconSection,
  },
  {
    key: "SOCKET",
    label: "Live socket",
    description: "Realtime match updates over WebSocket.",
    icon: IconActivity,
  },
  {
    key: "LIVE_MATCH_FOLLOWING",
    label: "Live match following",
    description: "Public viewers can follow live matches.",
    icon: IconActivity,
  },
  {
    key: "DETAILED_STATISTICS",
    label: "Detailed statistics",
    description: "Per-throw + leg-level breakdowns.",
    icon: IconChartBar,
  },
  {
    key: "ADVANCED_STATISTICS",
    label: "Advanced statistics",
    description: "Aggregated player insights / dashboards.",
    icon: IconChartBar,
  },
  {
    key: "OAC_CREATION",
    label: "OAC creation",
    description: "Allow creating OAC tournaments.",
    icon: IconFlag,
  },
];

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <Badge
      className={cn(
        "gap-1.5 px-2.5 py-1",
        active ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
      )}
    >
      {active ? <IconCheck size={14} /> : <IconX size={14} />}
      <span className="text-xs">{label}</span>
    </Badge>
  );
}

export function FeatureFlagsSettings() {
  const [settings, setSettings] = useState<SystemSettingsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminSettingsActions.getSystemSettings();
      if (!response?.ok) {
        toast.error(response?.data?.error || "Failed to load system settings");
        setSettings(null);
        return;
      }
      setSettings(response.data as SystemSettingsResult);
    } catch (error: any) {
      console.error("Error fetching system settings:", error);
      toast.error(error?.message || "Failed to load system settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const handleToggleFeature = async (key: FeatureToggleKey, enabled: boolean) => {
    if (!settings) return;
    const previous = settings.features[key];
    setSettings({
      ...settings,
      features: { ...settings.features, [key]: enabled },
    });
    setPendingKey(`feature:${key}`);
    try {
      const response = await adminSettingsActions.updateFeatureFlag({ key, enabled });
      if (!response?.ok) {
        setSettings({
          ...settings,
          features: { ...settings.features, [key]: previous },
        });
        toast.error(response?.data?.error || "Failed to update feature flag");
        return;
      }
      setSettings(response.data as SystemSettingsResult);
      toast.success(`${key} ${enabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      setSettings({
        ...settings,
        features: { ...settings.features, [key]: previous },
      });
      toast.error(error?.message || "Failed to update feature flag");
    } finally {
      setPendingKey(null);
    }
  };

  const handleTogglePaywall = async (enabled: boolean) => {
    if (!settings) return;
    const previous = settings.subscriptionPaywallEnabled;
    setSettings({ ...settings, subscriptionPaywallEnabled: enabled });
    setPendingKey("paywall");
    try {
      const response = await adminSettingsActions.updateSubscriptionPaywall({ enabled });
      if (!response?.ok) {
        setSettings({ ...settings, subscriptionPaywallEnabled: previous });
        toast.error(response?.data?.error || "Failed to update paywall toggle");
        return;
      }
      setSettings(response.data as SystemSettingsResult);
      toast.success(`Subscription paywall ${enabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      setSettings({ ...settings, subscriptionPaywallEnabled: previous });
      toast.error(error?.message || "Failed to update paywall toggle");
    } finally {
      setPendingKey(null);
    }
  };

  const handleToggleBypass = async (enabled: boolean) => {
    if (!settings) return;
    const previous = settings.superAdminBypassEnabled;
    setSettings({ ...settings, superAdminBypassEnabled: enabled });
    setPendingKey("bypass");
    try {
      const response = await adminSettingsActions.updateSuperAdminBypass({ enabled });
      if (!response?.ok) {
        setSettings({ ...settings, superAdminBypassEnabled: previous });
        toast.error(response?.data?.error || "Failed to update super admin bypass");
        return;
      }
      setSettings(response.data as SystemSettingsResult);
      toast.success(`Super admin bypass ${enabled ? "enabled" : "disabled"}`);
    } catch (error: any) {
      setSettings({ ...settings, superAdminBypassEnabled: previous });
      toast.error(error?.message || "Failed to update super admin bypass");
    } finally {
      setPendingKey(null);
    }
  };

  if (loading && !settings) {
    return (
      <Card className="backdrop-blur-xl bg-card/30">
        <CardContent className="space-y-4 p-6">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className="backdrop-blur-xl bg-card/30">
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-muted-foreground">Could not load system settings.</p>
          <Button onClick={fetchSettings} variant="outline" className="gap-2">
            <IconRefresh className="size-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const updatedAt = new Date(settings.updatedAt);

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 backdrop-blur-md bg-primary/20 rounded-lg flex items-center justify-center">
              <IconFlag className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">Feature Flags</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Toggle product features at runtime. Changes take effect within ~30 seconds across all
                instances.
              </p>
            </div>
            <Button
              onClick={fetchSettings}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <IconRefresh className={cn("size-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {FEATURE_META.map((meta) => {
            const enabled = settings.features[meta.key];
            const isPending = pendingKey === `feature:${meta.key}`;
            const Icon = meta.icon;
            return (
              <div
                key={meta.key}
                className="flex items-start justify-between gap-4 p-4 backdrop-blur-md bg-muted/30 rounded-xl"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{meta.label}</span>
                      <code className="text-[10px] uppercase bg-muted/50 px-1.5 py-0.5 rounded">
                        {meta.key}
                      </code>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusPill active={enabled} label={enabled ? "On" : "Off"} />
                  <Switch
                    checked={enabled}
                    onCheckedChange={(value) => handleToggleFeature(meta.key, value)}
                    disabled={isPending}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="backdrop-blur-xl bg-card/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-10 backdrop-blur-md bg-warning/20 rounded-lg flex items-center justify-center">
              <IconShield className="size-6 text-warning" />
            </div>
            <div>
              <CardTitle className="text-2xl">Access Control</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Global toggles that affect every feature gate.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-4 p-4 backdrop-blur-md bg-muted/30 rounded-xl">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-8 rounded-lg bg-warning/10 flex items-center justify-center mt-0.5">
                <IconShieldCheck className="size-4 text-warning" />
              </div>
              <div className="min-w-0">
                <span className="font-medium">Subscription paywall</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When ON, paid features check the club&apos;s subscription tier and per-club flags. When
                  OFF, paid features are open to every club (great for staging/dev).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <StatusPill
                active={settings.subscriptionPaywallEnabled}
                label={settings.subscriptionPaywallEnabled ? "Enforced" : "Open"}
              />
              <Switch
                checked={settings.subscriptionPaywallEnabled}
                onCheckedChange={handleTogglePaywall}
                disabled={pendingKey === "paywall"}
              />
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 backdrop-blur-md bg-muted/30 rounded-xl">
            <div className="flex items-start gap-3 min-w-0">
              <div className="size-8 rounded-lg bg-warning/10 flex items-center justify-center mt-0.5">
                <IconUserShield className="size-4 text-warning" />
              </div>
              <div className="min-w-0">
                <span className="font-medium">Super admin bypass</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When ON, global admins bypass every feature gate. Toggle OFF to debug a feature as a
                  regular user without losing your admin role.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <StatusPill
                active={settings.superAdminBypassEnabled}
                label={settings.superAdminBypassEnabled ? "On" : "Off"}
              />
              <Switch
                checked={settings.superAdminBypassEnabled}
                onCheckedChange={handleToggleBypass}
                disabled={pendingKey === "bypass"}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Last updated {updatedAt.getTime() === 0 ? "never" : updatedAt.toLocaleString()}
            {settings.updatedBy ? ` by ${settings.updatedBy}` : ""}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
