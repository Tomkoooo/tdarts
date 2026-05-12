import React from 'react';

export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
      {title} — coming soon.
    </div>
  );
}
