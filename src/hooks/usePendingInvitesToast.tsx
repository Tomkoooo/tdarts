"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";

import { useUserContext } from "@/hooks/useUser";
import { getPlayerTranslations } from "@/data/translations/player";

const DISMISS_KEY = "pendingInvitesToastDismissedUntil";
const DISMISS_MS = 1000 * 60 * 60 * 2; // 2 hours

const shouldSkipToast = () => {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedUntil = Number(raw);
  return Number.isFinite(dismissedUntil) && dismissedUntil > Date.now();
};

const dismissForWindow = () => {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
};

export const usePendingInvitesToast = () => {
  const { user } = useUserContext();
  const pathname = usePathname();
  const t = getPlayerTranslations(typeof navigator !== "undefined" ? navigator.language : "hu");

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      const isRootPage = pathname === "/";
      const isProfilePage = pathname?.startsWith("/profile");
      if (!isRootPage && !isProfilePage) return;
      if (shouldSkipToast()) return;

      try {
        const response = await fetch("/api/profile/pending-invitations");
        const data = await response.json();
        if (!response.ok || !data?.success) return;
        const count = data?.data?.count || 0;
        if (count <= 0) return;

        toast(
          (toastRef) => (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{t.pendingInvitesToast}</p>
              <div className="flex gap-2">
                <button
                  className="rounded-md bg-accent px-3 py-1.5 text-xs transition-colors hover:bg-accent/80"
                  onClick={() => {
                    window.location.href = "/profile?tab=stats";
                    toast.dismiss(toastRef.id);
                    dismissForWindow();
                  }}
                >
                  {t.pendingInvitesToastOpen}
                </button>
                <button
                  className="rounded-md bg-white/10 px-3 py-1.5 text-xs transition-colors hover:bg-white/20"
                  onClick={() => {
                    toast.dismiss(toastRef.id);
                    dismissForWindow();
                  }}
                >
                  {t.pendingInvitesToastLater}
                </button>
              </div>
            </div>
          ),
          { id: "pending-invites-toast", duration: 10000 }
        );
      } catch {
        // Silently fail toast to avoid noisy UX.
      }
    };

    void run();
  }, [
    pathname,
    t.pendingInvitesToast,
    t.pendingInvitesToastLater,
    t.pendingInvitesToastOpen,
    user,
  ]);
};
