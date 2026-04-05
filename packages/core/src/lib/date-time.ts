const UTC_FALLBACK = "UTC";

export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || UTC_FALLBACK;
  } catch {
    return UTC_FALLBACK;
  }
}

export function getLocalDateKey(input: Date | string | number, timeZone: string = getUserTimeZone()): string | null {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return null;

  return `${year}-${month}-${day}`;
}

export function getTodayDateKey(timeZone: string = getUserTimeZone()): string | null {
  return getLocalDateKey(new Date(), timeZone);
}

export function getLocalMidnightFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function addDaysToDateKey(dateKey: string, days: number): string | null {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  const y = String(utcDate.getUTCFullYear());
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utcDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateKeyLabel(dateKey: string, locale: string): string {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  if (!year || !month || !day) return dateKey;
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateTimeLocalInput(input: Date | string | number | null | undefined): string {
  if (!input) return "";

  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function parseDateTimeLocalInput(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function parseIsoDateInput(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string") return null;

  const hasExplicitTimezone = /([zZ]|[+\-]\d{2}:\d{2})$/.test(value);
  if (!hasExplicitTimezone) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const timeZonePart = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  if (!timeZonePart || timeZonePart === "GMT") return 0;
  const match = timeZonePart.match(/^GMT([+\-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 60 + minutes);
}

function getUtcInstantForZonedDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

export function getDayBoundsInTimeZone(
  timeZone: string,
  reference: Date = new Date()
): { dayStartUtc: Date; nextDayStartUtc: Date } {
  const key = getLocalDateKey(reference, timeZone);
  if (!key) {
    const fallbackStart = new Date(reference);
    fallbackStart.setHours(0, 0, 0, 0);
    const fallbackNext = new Date(fallbackStart);
    fallbackNext.setDate(fallbackNext.getDate() + 1);
    return { dayStartUtc: fallbackStart, nextDayStartUtc: fallbackNext };
  }

  const [year, month, day] = key.split("-").map((part) => Number(part));
  const dayStartUtc = getUtcInstantForZonedDateTime(year, month, day, 0, 0, 0, 0, timeZone);

  const nextKey = addDaysToDateKey(key, 1);
  if (!nextKey) {
    const fallbackNext = new Date(dayStartUtc);
    fallbackNext.setUTCDate(fallbackNext.getUTCDate() + 1);
    return { dayStartUtc, nextDayStartUtc: fallbackNext };
  }

  const [nextYear, nextMonth, nextDay] = nextKey.split("-").map((part) => Number(part));
  const nextDayStartUtc = getUtcInstantForZonedDateTime(nextYear, nextMonth, nextDay, 0, 0, 0, 0, timeZone);
  return { dayStartUtc, nextDayStartUtc };
}

/** Calendar day bounds in `timeZone` for a `YYYY-MM-DD` key (half-open: [dayStartUtc, nextDayStartUtc)). */
export function getZonedCalendarDayBoundsUtc(
  dateKey: string,
  timeZone: string
): { dayStartUtc: Date; nextDayStartUtc: Date } | null {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  const dayStartUtc = getUtcInstantForZonedDateTime(year, month, day, 0, 0, 0, 0, timeZone);
  const nextKey = addDaysToDateKey(dateKey, 1);
  if (!nextKey) return null;
  const [ny, nm, nd] = nextKey.split("-").map((part) => Number(part));
  if (!ny || !nm || !nd) return null;
  const nextDayStartUtc = getUtcInstantForZonedDateTime(ny, nm, nd, 0, 0, 0, 0, timeZone);
  return { dayStartUtc, nextDayStartUtc };
}

export type TournamentStartDatePresetId = "yesterday" | "last7" | "last30";

const ROLLING_PRESET_DAYS: Record<"last7" | "last30", number> = {
  last7: 7,
  last30: 30,
};

/**
 * Half-open UTC range for tournament startDate queries: [dateFromInclusive, dateToExclusive).
 * Presets use calendar days in `timeZone` (yesterday = previous local day; last7/last30 include today).
 */
export function getTournamentStartDateRangeFromPreset(
  preset: TournamentStartDatePresetId,
  timeZone: string,
  reference: Date = new Date()
): { dateFromInclusive: Date; dateToExclusive: Date } | null {
  const todayKey = getLocalDateKey(reference, timeZone);
  if (!todayKey) return null;

  if (preset === "yesterday") {
    const yKey = addDaysToDateKey(todayKey, -1);
    if (!yKey) return null;
    const b = getZonedCalendarDayBoundsUtc(yKey, timeZone);
    if (!b) return null;
    return { dateFromInclusive: b.dayStartUtc, dateToExclusive: b.nextDayStartUtc };
  }

  const span = ROLLING_PRESET_DAYS[preset];
  const startKey = addDaysToDateKey(todayKey, -(span - 1));
  if (!startKey) return null;
  const startBounds = getZonedCalendarDayBoundsUtc(startKey, timeZone);
  const endBounds = getZonedCalendarDayBoundsUtc(todayKey, timeZone);
  if (!startBounds || !endBounds) return null;
  return { dateFromInclusive: startBounds.dayStartUtc, dateToExclusive: endBounds.nextDayStartUtc };
}

/** Inclusive custom range on calendar days in `timeZone` → half-open UTC instant range for queries. */
export function getTournamentStartDateRangeFromCustomKeys(
  fromKey: string,
  toKey: string,
  timeZone: string
): { dateFromInclusive: Date; dateToExclusive: Date } | null {
  const fromBounds = getZonedCalendarDayBoundsUtc(fromKey, timeZone);
  const toBounds = getZonedCalendarDayBoundsUtc(toKey, timeZone);
  if (!fromBounds || !toBounds) return null;
  let start = fromBounds.dayStartUtc;
  let endExclusive = toBounds.nextDayStartUtc;
  if (start.getTime() > endExclusive.getTime()) {
    start = toBounds.dayStartUtc;
    endExclusive = fromBounds.nextDayStartUtc;
  }
  return { dateFromInclusive: start, dateToExclusive: endExclusive };
}
