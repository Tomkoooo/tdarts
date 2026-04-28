"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { SocketFeatureUiStatus } from "@/hooks/useSocket";
import type { FeatureFlagDenialReason } from "@/shared/lib/guards/result";
import type { SocketGateReason } from "@/hooks/useFeatureFlag";

export interface LiveSocketConnectionLabelProps {
  socketStatus: SocketFeatureUiStatus;
  denialReason: FeatureFlagDenialReason | null;
  gateReason?: SocketGateReason;
  featureError: string | null;
  /** Screen-reader prefix, e.g. "Live connection status" */
  labelPrefix?: string;
  className?: string;
}

function denialReasonToMessageKey(reason: FeatureFlagDenialReason | null): string {
  switch (reason) {
    case "login_required":
      return "login_required";
    case "subscription_required":
      return "subscription_required";
    case "permission_required":
      return "permission_required";
    case "feature_disabled":
      return "feature_disabled";
    default:
      return "live_off";
  }
}

export function LiveSocketConnectionLabel({
  socketStatus,
  denialReason,
  gateReason = "enabled",
  featureError,
  labelPrefix,
  className,
}: LiveSocketConnectionLabelProps) {
  const tTour = useTranslations("Tournament");
  const t = (key: string, values?: Record<string, string | number | Date>) =>
    tTour(`live_matches.socket_status.${key}`, values);

  let dotClass: string;
  let text: string;

  switch (socketStatus) {
    case "feature_loading":
      dotClass = "bg-muted-foreground animate-pulse";
      text = t("checking");
      break;
    case "feature_error":
      dotClass = "bg-destructive";
      text = featureError ? `${t("error")}: ${featureError}` : t("error");
      break;
    case "feature_off":
      dotClass = "bg-muted-foreground";
      if (gateReason === "global_disabled") {
        text = t("global_disabled");
      } else if (gateReason === "paywall_disabled_bypass") {
        text = t("paywall_off");
      } else if (gateReason === "missing_club_context") {
        text = t("missing_club_context");
      } else if (gateReason === "eligibility_check_failed") {
        text = t("eligibility_check_failed");
      } else {
        text = t(denialReasonToMessageKey(denialReason));
      }
      break;
    case "transport_failed":
      dotClass = "bg-destructive";
      text = t("connection_failed");
      break;
    case "connected":
      dotClass = "bg-green-500";
      text = tTour("live_matches.connected");
      break;
    case "transport_connecting":
    default:
      dotClass = "bg-amber-500 animate-pulse";
      text = t("connecting");
      break;
  }

  const combinedSr = labelPrefix ? `${labelPrefix}: ${text}` : text;

  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)}>
      <span className={cn("flex h-2 w-2 shrink-0 rounded-full", dotClass)} aria-hidden />
      <span className="text-xs text-muted-foreground hidden sm:inline-block truncate" title={text}>
        {text}
      </span>
      <span className="sr-only">{combinedSr}</span>
    </div>
  );
}
