'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminSwapMatchPlayerAction } from '@/features/admin/matches/actions';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  matchId: string;
  player1?: { playerId: string; playerName?: string } | null;
  player2?: { playerId: string; playerName?: string } | null;
};

export function MatchSwapForm({ locale, matchId, player1, player2 }: Props) {
  const [pending, start] = useTransition();
  const [slot, setSlot] = useState<'player1' | 'player2'>('player1');
  const [newPlayerId, setNewPlayerId] = useState('');

  const current = slot === 'player1' ? player1 : player2;

  return (
    <div className="border-border max-w-md space-y-4 rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">
        Cserélj egy játékost a meccsen. A művelet auditálva van; ellenőrizd az ObjectId-t.
      </p>
      <div className="space-y-2">
        <Label>Pozíció</Label>
        <Select value={slot} onValueChange={(v) => setSlot(v as 'player1' | 'player2')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="player1">
              Játékos 1 — {player1?.playerName ?? player1?.playerId ?? '—'}
            </SelectItem>
            <SelectItem value="player2">
              Játékos 2 — {player2?.playerName ?? player2?.playerId ?? '—'}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {current ? (
        <p className="text-muted-foreground text-xs">
          Jelenlegi: {current.playerName ?? current.playerId}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="newPlayerId">Új játékos ObjectId</Label>
        <Input
          id="newPlayerId"
          className="font-mono text-sm"
          value={newPlayerId}
          onChange={(e) => setNewPlayerId(e.target.value)}
        />
      </div>
      <Button
        type="button"
        variant="destructive"
        disabled={pending || !newPlayerId.trim()}
        onClick={() => {
          if (!confirm('Biztosan kicseréled a játékost ezen a meccsen?')) return;
          start(async () => {
            const r = await adminSwapMatchPlayerAction(
              locale,
              matchId,
              slot,
              newPlayerId.trim(),
            );
            if (r.ok) {
              toast.success('Játékos cserélve');
              setNewPlayerId('');
            } else toast.error(r.error ?? 'Hiba');
          });
        }}
      >
        Játékos csere
      </Button>
    </div>
  );
}
