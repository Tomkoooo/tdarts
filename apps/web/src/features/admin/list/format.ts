export function formatAdminDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('hu-HU', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function yesNoBadge(value: boolean): string {
  return value ? 'Igen' : 'Nem';
}
