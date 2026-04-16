"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { useUserContext, SimplifiedUser } from "@/hooks/useUser";
import {
  getCountryOptionsWithInternational,
  INTERNATIONAL_COUNTRY_CODE,
  isValidCountryCode,
} from "@/lib/countries";
import { isUserCountryCompleteForOnboarding } from "@tdarts/core/profile-country";
import { completeProfileAction } from "@/features/profile/actions/completeProfile.action";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import ParallaxBackground from "@/components/homapage/ParallaxBackground";
import toast from "react-hot-toast";

export default function CompleteProfilePageClient() {
  const t = useTranslations("Auth.complete_profile");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser } = useUserContext();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [country, setCountry] = useState<string>(INTERNATIONAL_COUNTRY_CODE);
  const [submitting, setSubmitting] = useState(false);

  const redirectTarget = searchParams.get("redirect") || "/home";

  const existingCountryOk = useMemo(
    () => isUserCountryCompleteForOnboarding(user?.country ?? null),
    [user?.country],
  );

  const countryOptions = useMemo(
    () => getCountryOptionsWithInternational(locale, t("country_international")),
    [locale, t],
  );

  useEffect(() => {
    if (!user) {
      router.replace("/auth/login");
      return;
    }
    if (user.country && isValidCountryCode(String(user.country).toUpperCase())) {
      setCountry(String(user.country).toUpperCase());
    } else {
      setCountry(INTERNATIONAL_COUNTRY_CODE);
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success(t("success_saved"));
      const next: SimplifiedUser = {
        ...user,
        country: existingCountryOk ? user.country ?? null : country,
        needsProfileCompletion: false,
        termsAcceptedAt: new Date().toISOString(),
      };
      setUser(next);
      router.push(redirectTarget);
    } catch {
      toast.error(t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParallaxBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-8">
        <Card className="w-full max-w-md border-primary/20 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl">{t("title")}</CardTitle>
            <CardDescription>{t("subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
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
                  {t("terms_and")}{" "}
                  <a href="gdpr.pdf" className="text-primary underline-offset-2 hover:underline">
                    {t("privacy_link")}
                  </a>
                  {t("terms_outro")}
                </span>
              </label>

              {!existingCountryOk ? (
                <div>
                  <label htmlFor="country" className="block text-sm font-medium mb-2">
                    {t("country_label")}
                  </label>
                  <select
                    id="country"
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t("submitting") : t("submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
