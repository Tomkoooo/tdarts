/**
 * Compare calendar days in the user's local timezone (not UTC).
 */
export function isSameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** True if `dateValue` falls on today's local calendar date. */
export function isLocalCalendarDayToday(dateValue?: string | Date | null): boolean {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;
  return isSameLocalCalendarDay(d, new Date());
}

/**
 * Live / TV entry points: only when the tournament is no longer pending and the
 * scheduled start date is today in the user's local calendar (same rule everywhere).
 */
export function shouldShowTournamentLiveTvLinks(
  status: string | undefined | null,
  startDate: string | Date | null | undefined
): boolean {
  const s = String(status ?? "").trim();
  if (!s || s === "pending") return false;
  return isLocalCalendarDayToday(startDate);
}
