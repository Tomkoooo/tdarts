'use client';

import { useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/textarea';
import {
  adminCreateAnnouncementAction,
  adminUpdateAnnouncementAction,
} from '@/features/admin/content/actions';
import toast from 'react-hot-toast';

type Props = {
  onDone: () => void;
  initial?: {
    _id: string;
    title: string;
    description?: string;
    type: string;
    expiresAt: string;
  };
};

export function AnnouncementEditor({ onDone, initial }: Props) {
  const params = useParams();
  const locale = String(params?.locale ?? 'hu');
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState(initial?.type ?? 'info');
  const [expiresAt, setExpiresAt] = useState(
    initial?.expiresAt ? initial.expiresAt.slice(0, 16) : '',
  );

  return (
    <form
      className="border-border space-y-4 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const payload = {
            title,
            description,
            type: type as 'info' | 'success' | 'warning' | 'error',
            expiresAt: new Date(expiresAt).toISOString(),
          };
          const r = initial
            ? await adminUpdateAnnouncementAction(locale, initial._id, payload)
            : await adminCreateAnnouncementAction(locale, payload);
          if (r.ok) {
            toast.success('Mentve');
            onDone();
          } else toast.error(r.error ?? 'Hiba');
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="ann-title">Cím</Label>
        <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ann-desc">Leírás</Label>
        <Textarea
          id="ann-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ann-type">Típus</Label>
        <select
          id="ann-type"
          className="border-border bg-background w-full rounded-md border px-2 py-2 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {['info', 'success', 'warning', 'error'].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ann-exp">Lejárat</Label>
        <Input
          id="ann-exp"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Mentés…' : initial ? 'Frissítés' : 'Létrehozás'}
      </Button>
    </form>
  );
}
