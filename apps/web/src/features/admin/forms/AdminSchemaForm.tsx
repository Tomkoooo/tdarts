'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminRelationPicker } from '@/features/admin/components/AdminRelationPicker';
import { AdminHonorsEditor, type HonorRow } from '@/features/admin/forms/AdminHonorsEditor';
import type { FieldSpec } from '@/features/admin/lib/field-registry';
import type { AdminEntitySearchKind } from '@tdarts/services';

type Props = {
  fields: FieldSpec[];
  values: Record<string, unknown>;
  onSubmit: (patch: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
  submitLabel?: string;
  className?: string;
};

function getValue(values: Record<string, unknown>, key: string): unknown {
  if (key.includes('.')) {
    const [a, b] = key.split('.');
    const parent = values[a];
    if (parent && typeof parent === 'object') return (parent as Record<string, unknown>)[b];
    return undefined;
  }
  return values[key];
}

export function AdminSchemaForm({
  fields,
  values,
  onSubmit,
  submitLabel = 'Mentés',
  className,
}: Props) {
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Record<string, unknown>>(() => ({ ...values }));
  const [relationLabels, setRelationLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const setField = (key: string, value: unknown) => {
    if (key.includes('.')) {
      const [a, b] = key.split('.');
      const parent = { ...((draft[a] as Record<string, unknown>) ?? {}) };
      parent[b] = value;
      setDraft((d) => ({ ...d, [a]: parent }));
    } else {
      setDraft((d) => ({ ...d, [key]: value }));
    }
  };

  const buildPatch = (): Record<string, unknown> => {
    const patch: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.kind === 'readonly') continue;
      const v = getValue(draft, f.key);
      if (v !== undefined) patch[f.key] = v;
    }
    return patch;
  };

  return (
    <form
      className={className ?? 'border-border max-w-2xl space-y-4 rounded-lg border p-4'}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await onSubmit(buildPatch());
          if (!r.ok) setError(r.error ?? 'Hiba');
        });
      }}
    >
      {fields.map((field) => {
        const val = getValue(draft, field.key);

        if (field.kind === 'readonly') {
          return (
            <div key={field.key} className="space-y-1">
              <Label className="text-muted-foreground text-xs">{field.label}</Label>
              <p className="text-sm">{String(val ?? '—')}</p>
            </div>
          );
        }

        if (field.kind === 'boolean') {
          return (
            <label key={field.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(val)}
                onChange={(e) => setField(field.key, e.target.checked)}
              />
              {field.label}
            </label>
          );
        }

        if (field.kind === 'enum') {
          return (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <Select value={String(val ?? field.options[0]?.value ?? '')} onValueChange={(v) => setField(field.key, v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        if (field.kind === 'relation') {
          const id = val != null && val !== '' ? String(val) : null;
          return (
            <AdminRelationPicker
              key={field.key}
              kind={field.searchKind as AdminEntitySearchKind}
              label={field.label}
              value={id}
              displayLabel={relationLabels[field.key] ?? field.displayLabel}
              onSelect={(h) => {
                setField(field.key, h.id);
                setRelationLabels((l) => ({ ...l, [field.key]: h.label }));
              }}
              onClear={() => {
                setField(field.key, null);
                setRelationLabels((l) => {
                  const next = { ...l };
                  delete next[field.key];
                  return next;
                });
              }}
            />
          );
        }

        if (field.kind === 'honors') {
          return (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <AdminHonorsEditor
                value={val}
                onChange={(rows: HonorRow[]) => setField(field.key, rows)}
              />
            </div>
          );
        }

        if (field.kind === 'textarea') {
          return (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Textarea
                id={field.key}
                rows={field.rows ?? 3}
                maxLength={field.maxLength}
                value={String(val ?? '')}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            </div>
          );
        }

        const inputType = field.kind === 'email' ? 'email' : field.kind === 'number' ? 'number' : 'text';
        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key}>{field.label}</Label>
            <Input
              id={field.key}
              type={inputType}
              maxLength={'maxLength' in field ? field.maxLength : undefined}
              value={val != null ? String(val) : ''}
              onChange={(e) =>
                setField(
                  field.key,
                  field.kind === 'number' ? Number(e.target.value) : e.target.value,
                )
              }
            />
          </div>
        );
      })}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Mentés…' : submitLabel}
      </Button>
    </form>
  );
}
