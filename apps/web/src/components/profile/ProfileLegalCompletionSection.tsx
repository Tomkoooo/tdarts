"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import toast from "react-hot-toast";
import { useUserContext, type SimplifiedUser } from "@/hooks/useUser";
import { completeProfileAction } from "@/features/profile/actions/completeProfile.action";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  getCountryOptionsWithInternational,
  INTERNATIONAL_COUNTRY_CODE,
  isValidCountryCode,
} from "@/lib/countries";
import { isUserCountryCompleteForOnboarding } from "@tdarts/core/profile-country";

export function ProfileLegalCompletionSection() {
  const t = useTranslations("Auth.complete_profile");
  const tProfile = useTranslations("Profile.legal_completion");
  const locale = useLocale();
  const { user, setUser } = useUserContext();
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [country, setCountry] = React.useState<string>(INTERNATIONAL_COUNTRY_CODE);
  const [submitting, setSubmitting] = React.useState(false);

  const existingCountryOk = React.useMemo(
    () => isUserCountryCompleteForOnboarding(user?.country ?? null),
    [user?.country]
  );

  const countryOptions = React.useMemo(
    () => getCountryOptionsWithInternational(locale, t("country_international")),
    [locale, t]
  );

  React.useEffect(() => {
    if (!user?.country || !isValidCountryCode(String(user.country).toUpperCase())) {
      setCountry(INTERNATIONAL_COUNTRY_CODE);
      return;
    }
    setCountry(String(user.country).toUpperCase());
  }, [user?.country]);

  if (!user?.needsProfileCompletion) {
    return null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!acceptTerms) {
      toast.error(t("error_generic"));
      return;
    }
    setSubmitting(true);
    try {
      const payload: { acceptTerms: true; country?: string } = { acceptTerms: true };
      if (!existingCountryOk) {
        payload.country = country;
      }
      const result = await completeProfileAction(payload);
      if (result && typeof result === "object" && "ok" in result && result.ok === false) {
        toast.error(t("error_generic"));
        return;
      }
      toast.success(tProfile("success_saved"));
      const next: SimplifiedUser = {
        ...user,
        country: existingCountryOk ? user.country ?? null : country,
        needsProfileCompletion: false,
        termsAcceptedAt: new Date().toISOString(),
      };
      setUser(next);
    } catch {
      toast.error(t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader>
        <CardTitle className="text-lg">{tProfile("section_title")}</CardTitle>
        <CardDescription>{tProfile("section_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="flex gap-3 items-start text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 rounded border-border"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              required
            />
            <span className="text-muted-foreground leading-relaxed">
              {t("terms_intro")}{" "}
              <Link href="/terms" className="text-primary underline-offset-2 hover:underline">
                {t("terms_link")}
              </Link>
              {t("terms_and")}
              <a href="gdpr.pdf" className="text-primary underline-offset-2 hover:underline">
                {t("privacy_link")}
              </a>
              {t("terms_outro")}
            </span>
          </label>

          {!existingCountryOk ? (
            <div>
              <label htmlFor="profile-legal-country" className="block text-sm font-medium mb-2">
                {t("country_label")}
              </label>
              <select
                id="profile-legal-country"
                className="w-full px-3 py-2 rounded-md border border-border bg-background"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {countryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("country_label")}:{" "}
              <span className="font-medium text-foreground">
                {countryOptions.find((o) => o.value === String(user.country).toUpperCase())?.label ||
                  user.country}
              </span>
            </p>
          )}

          <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
            {submitting ? t("submitting") : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
