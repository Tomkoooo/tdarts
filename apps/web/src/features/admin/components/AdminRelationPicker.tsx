'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { adminSearchEntitiesAction } from '@/features/admin/actions/search-entities.action';
import type { AdminEntitySearchHit, AdminEntitySearchKind } from '@tdarts/services';
import { cn } from '@/lib/utils';

type Props = {
  kind: AdminEntitySearchKind;
  label: string;
  value: string | null;
  displayLabel?: string | null;
  onSelect: (hit: AdminEntitySearchHit) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
};

export function AdminRelationPicker({
  kind,
  label,
  value,
  displayLabel,
  onSelect,
  onClear,
  placeholder = 'Keresés név, email vagy kód alapján…',
  disabled,
}: Props) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<AdminEntitySearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    const t = query.trim();
    if (t.length < 2) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      start(async () => {
        const r = await adminSearchEntitiesAction(t, kind, 10);
        if (r.ok) setHits(r.hits);
        else setHits([]);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, kind]);

  const selectedText = displayLabel || (value ? `Kiválasztva (${value.slice(-6)})` : null);

  return (
    <div ref={wrapRef} className="relative space-y-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      {selectedText ? (
        <div className="border-border flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="truncate font-medium">{selectedText}</span>
          {onClear ? (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground shrink-0 text-xs"
              onClick={() => {
                onClear();
                setQuery('');
              }}
            >
              Törlés
            </button>
          ) : null}
        </div>
      ) : null}
      <Input
        value={query}
        disabled={disabled || pending}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && hits.length > 0 ? (
        <ul
          className={cn(
            'bg-popover border-border absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border py-1 shadow-md',
          )}
        >
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="hover:bg-muted flex w-full flex-col px-3 py-2 text-left text-sm"
                onClick={() => {
                  onSelect(h);
                  setQuery('');
                  setOpen(false);
                  setHits([]);
                }}
              >
                <span className="font-medium">{h.label}</span>
                {h.sublabel ? (
                  <span className="text-muted-foreground text-xs">{h.sublabel}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
