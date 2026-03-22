"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";
import { usePathname } from "next/navigation";

import { useUserContext } from "@/hooks/useUser";
import { getManagedClubsLocationCompletenessAction } from "@/features/clubs/actions/getManagedClubsLocationCompleteness.action";

const DISMISS_KEY = "profileCompletenessToastDismissedUntil";
const DISMISS_MS = 1000 * 60 * 60 * 6; // 6 hours

/** Strip `/[locale]` prefix so checks match `next-intl` paths (`/hu/home` → `/home`). */
function pathWithoutLocale(pathname: string): string {
  const trimmed = pathname.replace(/\/$/, "") || "/";
  const stripped = trimmed.replace(/^\/(hu|en|de)(?=\/|$)/i, "");
  return stripped === "" ? "/" : stripped.startsWith("/") ? stripped : `/${stripped}`;
}

const shouldSkipToast = () => {
  const rawValue = localStorage.getItem(DISMISS_KEY);
  if (!rawValue) return false;
  const dismissedUntil = Number(rawValue);
  return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
};

const dismissForWindow = () => {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
};

function isManagedClubsSuccessPayload(
  value: unknown,
): value is { success: true; data: { clubs: { hasCorrectAddress: boolean; geoLocationSynced: boolean }[] } } {
  if (!value || typeof value !== "object") return false;
  const v = value as { success?: unknown; data?: unknown };
  if (v.success !== true || !v.data || typeof v.data !== "object") return false;
  const d = v.data as { clubs?: unknown };
  return Array.isArray(d.clubs);
}

export const useProfileCompletenessToast = () => {
  const { user } = useUserContext();
  const pathname = usePathname();

  useEffect(() => {
    const showCompletenessToast = async () => {
      if (!user) return;
      const p = pathname ? pathWithoutLocale(pathname) : "";
      const isHomePage = p === "/home" || p === "/";
      const isProfilePage = p.startsWith("/profile");
      if (!isHomePage && !isProfilePage) return;
      if (shouldSkipToast()) return;

      const missingUserCountry = !user.country;
      let missingManagedClubLocation = false;

      try {
        const result = await getManagedClubsLocationCompletenessAction();
        if (isManagedClubsSuccessPayload(result)) {
          const { clubs } = result.data;
          missingManagedClubLocation = clubs.some(
            (row) => !row.hasCorrectAddress || !row.geoLocationSynced,
          );
        }
      } catch {
        // Non-blocking: if clubs cannot be loaded, still notify for user profile incompleteness.
      }

      if (!missingUserCountry && !missingManagedClubLocation) return;

      const message = missingUserCountry
        ? "A profilod hiányos: add meg az országot a pontosabb találatokhoz."
        : "A klub helyadatai nem teljesek: ellenőrizd a címet és a térképes geokód szinkront (klub beállítások).";

      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{message}</p>
            <div className="flex gap-2">
              <button
                className="rounded-md bg-accent px-3 py-1.5 text-xs transition-colors hover:bg-accent/80"
                onClick={() => {
                  window.location.href = missingUserCountry ? "/profile?tab=details" : "/myclub";
                  toast.dismiss(t.id);
                  dismissForWindow();
                }}
              >
                Megnyitás
              </button>
              <button
                className="rounded-md bg-white/10 px-3 py-1.5 text-xs transition-colors hover:bg-white/20"
                onClick={() => {
                  toast.dismiss(t.id);
                  dismissForWindow();
                }}
              >
                Később
              </button>
            </div>
          </div>
        ),
        { id: "profile-completeness-toast", duration: 10000 },
      );
    };

    showCompletenessToast();
  }, [user, pathname]);
};
