"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useUserContext } from "@/hooks/useUser";
import { useTranslations } from "next-intl";
import ParallaxBackground from "@/components/homapage/ParallaxBackground";

export default function VerifyEmailLinkPageClient() {
  const t = useTranslations("Auth.verify");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser } = useUserContext();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError(t("error_generic"));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await axios.post("/api/auth/verify-email-token", { token });
        if (cancelled) return;
        const u = res.data.user;
        setUser({
          _id: u._id,
          username: u.username,
          name: u.name,
          email: u.email,
          isAdmin: u.isAdmin,
          isVerified: u.isVerified,
          country: u.country ?? null,
          termsAcceptedAt: u.termsAcceptedAt ?? null,
          needsProfileCompletion: Boolean(u.needsProfileCompletion),
        });
        if (u.needsProfileCompletion) {
          router.replace("/auth/complete-profile");
        } else {
          router.replace("/home");
        }
      } catch {
        if (!cancelled) setError(t("error_generic"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, setUser, t]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <ParallaxBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <p className="text-center text-muted-foreground">
          {error || t("loading")}
        </p>
      </div>
    </div>
  );
}
