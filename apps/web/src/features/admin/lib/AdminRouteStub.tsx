type Props = {
  title: string;
  note?: string;
};

/** Temporary placeholder until the new admin UI is implemented. Server actions: features/admin/{domain}/actions.ts */
export function AdminRouteStub({ title, note }: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 rounded-lg border border-dashed border-border p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">
        {note ??
          'Admin UI rebuild in progress. Backend server actions are already in place under features/admin. See features/admin/README.md and docs/admin/.'}
      </p>
    </div>
  );
}
