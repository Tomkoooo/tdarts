"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/Button";
import type { FeatureFlagDenialReason } from "@/shared/lib/guards/result";

type FeatureFlagAccessCalloutProps = {
  reason: FeatureFlagDenialReason;
  /** Tighter spacing for toolbars / modals */
  variant?: "default" | "compact";
  className?: string;
};

export function FeatureFlagAccessCallout({ reason, variant = "default", className }: FeatureFlagAccessCalloutProps) {
  const t = useTranslations("FeatureFlags");
  const compact = variant === "compact";

  if (reason === "login_required") {
    return (
      <Alert className={className} variant="default">
        <AlertTitle className={compact ? "text-sm" : undefined}>{t("login_title")}</AlertTitle>
        <AlertDescription className={compact ? "text-xs space-y-2" : "space-y-3"}>
          <p>{t("login_description")}</p>
          <Button asChild size={compact ? "sm" : "default"} className="mt-1">
            <Link href="/auth/login">{t("login_cta")}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (reason === "subscription_required") {
    return (
      <Alert className={className} variant="default">
        <AlertTitle className={compact ? "text-sm" : undefined}>{t("subscription_title")}</AlertTitle>
        <AlertDescription className={compact ? "text-xs" : undefined}>
          <p>{t("subscription_description")}</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (reason === "permission_required") {
    return (
      <Alert className={className} variant="default">
        <AlertTitle className={compact ? "text-sm" : undefined}>{t("permission_title")}</AlertTitle>
        <AlertDescription className={compact ? "text-xs" : undefined}>
          <p>{t("permission_description")}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={className} variant="default">
      <AlertTitle className={compact ? "text-sm" : undefined}>{t("disabled_title")}</AlertTitle>
      <AlertDescription className={compact ? "text-xs" : undefined}>
        <p>{t("disabled_description")}</p>
      </AlertDescription>
    </Alert>
  );
}
