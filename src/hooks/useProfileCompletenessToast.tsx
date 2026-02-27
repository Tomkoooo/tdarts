"use client";

import { useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { usePathname } from "next/navigation";

import { useUserContext } from "@/hooks/useUser";

const DISMISS_KEY = "profileCompletenessToastDismissedUntil";
const DISMISS_MS = 1000 * 60 * 60 * 6; // 6 hours

interface UserClubCompleteness {
  _id: string;
  name: string;
  role: "admin" | "moderator" | "member";
  hasBillingCountry?: boolean;
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

export const useProfileCompletenessToast = () => {
  const { user } = useUserContext();
  const pathname = usePathname();

  useEffect(() => {
    const showCompletenessToast = async () => {
      if (!user) return;
      const isRootPage = pathname === "/";
      const isProfilePage = pathname?.startsWith("/profile");
      if (!isRootPage && !isProfilePage) return;
      if (shouldSkipToast()) return;

      const missingUserCountry = !user.country;
      let missingClubCountry = false;

      try {
        const response = await axios.get<{ clubs: UserClubCompleteness[] }>("/api/users/me/clubs");
        const managedClubs = response.data.clubs.filter((club) => club.role === "admin" || club.role === "moderator");
        missingClubCountry = managedClubs.some((club) => !club.hasBillingCountry);
      } catch {
        // Non-blocking: if clubs cannot be loaded, still notify for user profile incompleteness.
      }

      if (!missingUserCountry && !missingClubCountry) return;

      const message = missingUserCountry
        ? "A profilod hiányos: add meg az országot a pontosabb találatokhoz."
        : "A klub adatai hiányosak: állíts be országot a klub számlázási adataiban.";

      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{message}</p>
            <div className="flex gap-2">
              <button
                className="text-xs px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-md transition-colors"
                onClick={() => {
                  window.location.href = missingUserCountry ? "/profile?tab=details" : "/profile?tab=details";
                  toast.dismiss(t.id);
                  dismissForWindow();
                }}
              >
                Megnyitás
              </button>
              <button
                className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md transition-colors"
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
        { id: "profile-completeness-toast", duration: 10000 }
      );
    };

    showCompletenessToast();
  }, [user, pathname]);
};
