"use client";

import { useEffect } from "react";
import { getUserTimeZone } from "@/lib/date-time";

const COOKIE_NAME = "user-timezone";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export default function TimezoneSync() {
  useEffect(() => {
    const timeZone = getUserTimeZone();
    const currentCookie = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${COOKIE_NAME}=`))
      ?.split("=")[1];

    if (currentCookie === encodeURIComponent(timeZone)) return;

    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(timeZone)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  }, []);

  return null;
}
