/** Same as board MatchGame: initials + last name (e.g. "D. S. Erika"). Single token unchanged. */
export function formatBoardPlayerName(fullName: string | undefined | null): string {
  const parts = String(fullName ?? "")
    .trim()
    .split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const last = parts.pop() as string;
  const initials = parts.map((p) => p.charAt(0).toUpperCase() + ".");
  return [...initials, last].join(" ");
}

/** After initials+last, cap length so narrow columns can ellipsis (single long token). */
export function formatBoardPlayerNameMax(
  fullName: string | undefined | null,
  max = 40,
): string {
  const s = formatBoardPlayerName(fullName);
  if (s.length <= max) return s;
  return s.slice(0, Math.max(1, max - 1)) + "\u2026";
}
