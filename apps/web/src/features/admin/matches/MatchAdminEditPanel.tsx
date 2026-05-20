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
import { AdminRelationPicker } from '@/features/admin/components/AdminRelationPicker';
import {
  adminRevertMatchOverrideAction,
  adminSwapMatchPlayerAction,
  adminUpdateMatchAction,
} from '@/features/admin/matches/actions';
import toast from 'react-hot-toast';

type Props = {
  locale: string;
  matchId: string;
  status: string;
  type: string;
  round: number;
  boardReference: number;
  manualOverride: boolean;
  player1?: { playerId: string; playerName?: string } | null;
  player2?: { playerId: string; playerName?: string } | null;
};

export function MatchAdminEditPanel({
  locale,
  matchId,
  status: initialStatus,
  type: initialType,
  round: initialRound,
  boardReference: initialBoard,
  manualOverride,
  player1,
  player2,
}: Props) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState(initialStatus);
  const [type, setType] = useState(initialType);
  const [round, setRound] = useState(String(initialRound));
  const [board, setBoard] = useState(String(initialBoard));
  const [slot, setSlot] = useState<'player1' | 'player2'>('player1');
  const [newPlayerId, setNewPlayerId] = useState<string | null>(null);
  const [newPlayerLabel, setNewPlayerLabel] = useState<string | null>(null);

  const current = slot === 'player1' ? player1 : player2;

  const saveFields = () => {
    start(async () => {
      const r = await adminUpdateMatchAction(locale, matchId, {
        status: status as 'pending' | 'ongoing' | 'finished',
        type: type as 'group' | 'knockout',
        round: parseInt(round, 10),
        boardReference: parseInt(board, 10),
      });
      if (r.ok) toast.success('Meccs mentve');
      else toast.error(r.error ?? 'Hiba');
    });
  };

  return (
    <div className="border-border mt-6 max-w-lg space-y-6 rounded-lg border p-4">
      <h3 className="text-sm font-semibold">Szerkesztés</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Státusz</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">pending</SelectItem>
              <SelectItem value="ongoing">ongoing</SelectItem>
              <SelectItem value="finished">finished</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Típus</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="group">group</SelectItem>
              <SelectItem value="knockout">knockout</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="match-round">Kör (round)</Label>
          <Input id="match-round" type="number" value={round} onChange={(e) => setRound(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="match-board">Tábla</Label>
          <Input id="match-board" type="number" value={board} onChange={(e) => setBoard(e.target.value)} />
        </div>
      </div>
      <Button type="button" disabled={pending} onClick={saveFields}>
        Mezők mentése
      </Button>

      <div className="border-border space-y-4 border-t pt-4">
        <p className="text-muted-foreground text-sm">Játékos csere (auditálva)</p>
        <div className="space-y-1.5">
          <Label>Pozíció</Label>
          <Select value={slot} onValueChange={(v) => setSlot(v as 'player1' | 'player2')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="player1">
                Játékos 1 — {player1?.playerName ?? '—'}
              </SelectItem>
              <SelectItem value="player2">
                Játékos 2 — {player2?.playerName ?? '—'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {current ? (
          <p className="text-muted-foreground text-xs">
            Jelenlegi: {current.playerName ?? current.playerId}
          </p>
        ) : null}
        <AdminRelationPicker
          kind="player"
          label="Új játékos"
          value={newPlayerId}
          displayLabel={newPlayerLabel}
          onSelect={(h) => {
            setNewPlayerId(h.id);
            setNewPlayerLabel(h.label);
          }}
          onClear={() => {
            setNewPlayerId(null);
            setNewPlayerLabel(null);
          }}
        />
        <Button
          type="button"
          variant="destructive"
          disabled={pending || !newPlayerId}
          onClick={() => {
            if (!newPlayerId || !confirm('Biztosan kicseréled a játékost?')) return;
            start(async () => {
              const r = await adminSwapMatchPlayerAction(locale, matchId, slot, newPlayerId);
              if (r.ok) {
                toast.success('Játékos cserélve');
                setNewPlayerId(null);
                setNewPlayerLabel(null);
              } else toast.error(r.error ?? 'Hiba');
            });
          }}
        >
          Játékos csere
        </Button>
      </div>

      {manualOverride ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (!confirm('Visszaállítod a manuális override előtti állapotot?')) return;
            start(async () => {
              const r = await adminRevertMatchOverrideAction(locale, matchId);
              if (r.ok) toast.success('Override visszavonva');
              else toast.error(r.error ?? 'Hiba');
            });
          }}
        >
          Manuális override visszavonása
        </Button>
      ) : null}
    </div>
  );
}
