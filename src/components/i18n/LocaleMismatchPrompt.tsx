"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { updateProfileAction } from "@/features/profile/actions";
import { useUserContext } from "@/hooks/useUser";
import { routing } from "@/i18n/routing";
import { localePath, stripLocalePrefix } from "@/lib/seo";
import {
  getLocaleFromHref,
  getLocaleFromPathname,
  getLocalePromptSessionKey,
  getSavedLocaleFromCookieHeader,
  resolvePreferredLocale,
  shouldPromptLocaleMismatch,
  type SupportedLocale,
} from "@/lib/locale-mismatch";
import { useModal } from "@/components/modal/UnifiedModal";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const LAST_LOCALE_STORAGE_KEY = "tdarts.lastLocale";

const SUPPORTED_LOCALES = routing.locales as readonly SupportedLocale[];

export function LocaleMismatchPrompt() {
  const pathname = usePathname();
  const { user } = useUserContext();
  const modal = useModal();
  const activePromptKeyRef = useRef<string | null>(null);

  const localeNames: Record<SupportedLocale, string> = {
    hu: "magyar",
    en: "English",
    de: "Deutsch",
  };

  const promptTitleByLocale: Record<SupportedLocale, string> = {
    hu: "Biztos, hogy nyelvet szeretnel valtoztatni?",
    en: "Are you sure you want to change language?",
    de: "Mochtest du die Sprache wirklich wechseln?",
  };

  const promptMessageByLocale: Record<SupportedLocale, string> = {
    hu: "Jelenleg {currentLocale} nyelven hasznalod az oldalt, de ez a link {targetLocale} nyelvu.",
    en: "You are currently using the site in {currentLocale}, but this link is in {targetLocale}.",
    de: "Du nutzt die Seite aktuell auf {currentLocale}, aber dieser Link ist auf {targetLocale}.",
  };

  const declineLabelByLocale: Record<SupportedLocale, string> = {
    hu: "Maradjon magyar",
    en: "Keep English",
    de: "Deutsch behalten",
  };

  const acceptLabelByLocale: Record<SupportedLocale, string> = {
    hu: "Folytatas magyarul",
    en: "Continue in English",
    de: "Weiter auf Deutsch",
  };

  const getPersistedLocale = (): SupportedLocale | null => {
    const raw = localStorage.getItem(LAST_LOCALE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return SUPPORTED_LOCALES.includes(raw as SupportedLocale) ? (raw as SupportedLocale) : null;
  };

  const getPreferredLocale = (currentLocale: SupportedLocale | null): SupportedLocale | null => {
    const cookieLocale = getSavedLocaleFromCookieHeader(document.cookie || "", SUPPORTED_LOCALES);
    const persistedLocale = getPersistedLocale();
    return resolvePreferredLocale({
      cookieLocale,
      persistedLocale,
      currentLocale,
    });
  };

  const persistLocalePreference = async (locale: SupportedLocale) => {
    document.cookie = `NEXT_LOCALE=${locale}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`;
    localStorage.setItem(LAST_LOCALE_STORAGE_KEY, locale);
    if (!user) {
      return;
    }
    try {
      await updateProfileAction({ locale });
    } catch {
      // Locale preference save failure is non-critical here.
    }
  };

  const buildPreferredLocaleUrl = (preferredLocale: SupportedLocale): string => {
    const current = new URL(window.location.href);
    const normalizedPath = stripLocalePrefix(current.pathname);
    const localizedPath = localePath(normalizedPath, preferredLocale);
    return `${localizedPath}${current.search}${current.hash}`;
  };

  const openMismatchPrompt = (
    preferredLocale: SupportedLocale,
    destinationLocale: SupportedLocale,
    onAcceptedNavigation?: () => void,
    onDeclinedNavigation?: () => void
  ) => {
    const sessionKey = getLocalePromptSessionKey(preferredLocale, destinationLocale);
    if (sessionStorage.getItem(sessionKey) === "1") {
      return false;
    }
    if (modal.isOpen || activePromptKeyRef.current === sessionKey) {
      return true;
    }

    activePromptKeyRef.current = sessionKey;
    modal.open({
      type: "confirm",
      title: promptTitleByLocale[preferredLocale],
      message: promptMessageByLocale[preferredLocale]
        .replace("{currentLocale}", localeNames[preferredLocale])
        .replace("{targetLocale}", localeNames[destinationLocale]),
      cancelText: declineLabelByLocale[preferredLocale],
      confirmText: acceptLabelByLocale[destinationLocale],
      showCloseButton: false,
      onConfirm: async () => {
        await persistLocalePreference(destinationLocale);
        activePromptKeyRef.current = null;
        onAcceptedNavigation?.();
      },
      onCancel: async () => {
        await persistLocalePreference(preferredLocale);
        sessionStorage.setItem(sessionKey, "1");
        activePromptKeyRef.current = null;
        onDeclinedNavigation?.();
      },
    });
    return true;
  };

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      if (anchor.target && anchor.target !== "_self") {
        return;
      }
      if (anchor.hasAttribute("download")) {
        return;
      }

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) {
        return;
      }

      const currentUrl = window.location.href;
      let destination: URL;
      try {
        destination = new URL(rawHref, currentUrl);
      } catch {
        return;
      }

      if (destination.origin !== window.location.origin) {
        return;
      }

      const currentLocale = getLocaleFromPathname(pathname || "/", SUPPORTED_LOCALES);
      const savedLocale = getPreferredLocale(currentLocale);
      const destinationLocale = getLocaleFromHref(destination.toString(), currentUrl, SUPPORTED_LOCALES);
      if (!savedLocale || !destinationLocale || savedLocale === destinationLocale) {
        return;
      }

      event.preventDefault();
      const opened = openMismatchPrompt(savedLocale, destinationLocale, () => {
        window.location.assign(destination.toString());
      }, () => {
        // Stay on current page/locale when user declines a clicked cross-locale link.
      });
      if (!opened) {
        window.location.assign(destination.toString());
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [modal, pathname, user]);

  useEffect(() => {
    const pathnameLocale = getLocaleFromPathname(pathname || "/", SUPPORTED_LOCALES);
    const savedLocale = getPreferredLocale(pathnameLocale);

    if (!pathnameLocale || !savedLocale) {
      activePromptKeyRef.current = null;
      return;
    }

    const sessionKey = getLocalePromptSessionKey(savedLocale, pathnameLocale);
    const hasSessionDismissal = sessionStorage.getItem(sessionKey) === "1";
    const shouldPrompt = shouldPromptLocaleMismatch({
      pathnameLocale,
      savedLocale,
      hasSessionDismissal,
    });

    if (!shouldPrompt) {
      // Keep "last used locale" aligned only for non-mismatch states.
      localStorage.setItem(LAST_LOCALE_STORAGE_KEY, pathnameLocale);
      activePromptKeyRef.current = null;
      return;
    }

    openMismatchPrompt(savedLocale, pathnameLocale, undefined, () => {
      const preferredUrl = buildPreferredLocaleUrl(savedLocale);
      window.location.replace(preferredUrl);
    });
  }, [modal, pathname, user]);

  return null;
}
