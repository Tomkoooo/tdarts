"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PlayerHonorForm = {
  title: string;
  year: number;
  type: "rank" | "tournament" | "special";
  description?: string;
};

export type AdminUserLite = {
  _id: string;
  name: string;
  email: string;
  playerProfile?: {
    _id: string;
    name: string;
    honors: PlayerHonorForm[];
  } | null;
};

function newHonorRow(): PlayerHonorForm {
  return { title: "", year: new Date().getFullYear(), type: "tournament", description: "" };
}

function normalizeHonors(raw: PlayerHonorForm[]): PlayerHonorForm[] {
  return raw
    .map((h) => ({
      title: String(h.title || "").trim(),
      year: Number.isFinite(Number(h.year)) ? Math.floor(Number(h.year)) : new Date().getFullYear(),
      type: h.type === "rank" || h.type === "tournament" || h.type === "special" ? h.type : "special",
      description: h.description?.trim() ? String(h.description).trim() : undefined,
    }))
    .filter((h) => h.title.length > 0);
}

type SetPasswordModalProps = {
  user: AdminUserLite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => Promise<void>;
};

export function SetPasswordModal({ user, open, onOpenChange, onSubmit }: SetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirm("");
      setShow(false);
    }
  }, [open, user._id]);

  const canSave =
    password.length >= 8 && password === confirm && !loading;

  const handleSave = async () => {
    if (!canSave) return;
    setLoading(true);
    try {
      await onSubmit(password);
      onOpenChange(false);
    } catch {
      /* parent toasts */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Jelszó beállítása</DialogTitle>
          <DialogDescription>
            Új jelszó ehhez a fiókhoz: <span className="font-medium text-foreground">{user.email}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="admin-pw-new">Új jelszó</Label>
            <Input
              id="admin-pw-new"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Legalább 8 karakter"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="admin-pw-confirm">Jelszó megerősítése</Label>
            <Input
              id="admin-pw-confirm"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ismételje meg a jelszót"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            Jelszó megjelenítése
          </label>
          {password.length > 0 && password.length < 8 && (
            <p className="text-xs text-destructive">A jelszónak legalább 8 karakteresnek kell lennie.</p>
          )}
          {confirm.length > 0 && password !== confirm && (
            <p className="text-xs text-destructive">A két jelszó nem egyezik.</p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Mégse
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            {loading ? "Mentés…" : "Jelszó mentése"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type EditPlayerNameModalProps = {
  user: AdminUserLite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
};

export function EditPlayerNameModal({ user, open, onOpenChange, onSubmit }: EditPlayerNameModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(user.playerProfile?.name?.trim() || user.name || "");
    }
  }, [open, user]);

  const trimmed = name.trim();
  const unchanged = trimmed === (user.playerProfile?.name || "").trim();
  const canSave = trimmed.length >= 2 && !unchanged && !loading;

  const handleSave = async () => {
    if (trimmed.length < 2) return;
    setLoading(true);
    try {
      await onSubmit(trimmed);
      onOpenChange(false);
    } catch {
      /* parent toasts */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Játékos profil név</DialogTitle>
          <DialogDescription>
            A játékos kártyán és listákon megjelenő név ({user.email}).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-1">
          <Label htmlFor="admin-player-name">Megjelenített név</Label>
          <Input
            id="admin-player-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Játékos neve"
            autoComplete="off"
          />
          {trimmed.length > 0 && trimmed.length < 2 && (
            <p className="text-xs text-destructive">Legalább 2 karakter szükséges.</p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Mégse
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            {loading ? "Mentés…" : "Mentés"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type EditHonorsModalProps = {
  user: AdminUserLite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (honors: PlayerHonorForm[]) => Promise<void>;
};

export function EditHonorsModal({ user, open, onOpenChange, onSubmit }: EditHonorsModalProps) {
  const [rows, setRows] = useState<PlayerHonorForm[]>([]);
  const [advancedJson, setAdvancedJson] = useState("");
  const [advancedMode, setAdvancedMode] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const h = user.playerProfile?.honors?.length ? [...user.playerProfile.honors] : [newHonorRow()];
      setRows(h.map((x) => ({ ...x, description: x.description ?? "" })));
      setAdvancedJson(JSON.stringify(user.playerProfile?.honors || [], null, 2));
      setAdvancedMode(false);
      setJsonError(null);
    }
  }, [open, user]);

  const syncJsonFromRows = () => {
    const clean = normalizeHonors(rows);
    setAdvancedJson(JSON.stringify(clean, null, 2));
    setJsonError(null);
  };

  const addRow = () => setRows((r) => [...r, newHonorRow()]);

  const removeRow = (index: number) => {
    setRows((r) => (r.length <= 1 ? [newHonorRow()] : r.filter((_, i) => i !== index)));
  };

  const updateRow = (index: number, patch: Partial<PlayerHonorForm>) => {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleSave = async () => {
    setLoading(true);
    setJsonError(null);
    try {
      let payload: PlayerHonorForm[];
      if (advancedMode) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(advancedJson) as unknown;
        } catch {
          setJsonError("Érvénytelen JSON szintaxis.");
          setLoading(false);
          return;
        }
        if (!Array.isArray(parsed)) {
          setJsonError("A JSON tömbnek kell lennie.");
          setLoading(false);
          return;
        }
        payload = normalizeHonors(parsed as PlayerHonorForm[]);
      } else {
        payload = normalizeHonors(rows);
      }
      await onSubmit(payload);
      onOpenChange(false);
    } catch (e: any) {
      setJsonError(e?.message || "Mentési hiba.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Játékos elismerések (honors)</DialogTitle>
          <DialogDescription>
            Címek, évek és típusok szerkesztése. Üres sorok mentéskor elvesznek. Haladó: JSON nézet szinkronizálható a táblázattal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 py-1">
          <Button type="button" variant={advancedMode ? "secondary" : "outline"} size="sm" onClick={() => setAdvancedMode((v) => !v)}>
            {advancedMode ? "Egyszerű nézet" : "JSON (haladó)"}
          </Button>
          {!advancedMode && (
            <Button type="button" variant="outline" size="sm" onClick={syncJsonFromRows}>
              JSON frissítése a táblázatból
            </Button>
          )}
        </div>

        {advancedMode ? (
          <div className="grid gap-2">
            <Label htmlFor="admin-honors-json">Honors JSON tömb</Label>
            <Textarea
              id="admin-honors-json"
              className="font-mono text-xs min-h-[220px]"
              value={advancedJson}
              onChange={(e) => setAdvancedJson(e.target.value)}
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className={cn("rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2",)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeRow(idx)}
                    aria-label="Sor törlése"
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Cím</Label>
                  <Input value={row.title} onChange={(e) => updateRow(idx, { title: e.target.value })} placeholder="pl. Bajnok" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Év</Label>
                    <Input
                      type="number"
                      min={1900}
                      max={2100}
                      value={Number.isFinite(row.year) ? row.year : ""}
                      onChange={(e) => updateRow(idx, { year: Number(e.target.value) || new Date().getFullYear() })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Típus</Label>
                    <Select value={row.type} onValueChange={(v) => updateRow(idx, { type: v as PlayerHonorForm["type"] })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rank">Rang / helyezés</SelectItem>
                        <SelectItem value="tournament">Verseny</SelectItem>
                        <SelectItem value="special">Egyéb / különleges</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Leírás (opcionális)</Label>
                  <Textarea
                    className="min-h-[60px] text-sm"
                    value={row.description || ""}
                    onChange={(e) => updateRow(idx, { description: e.target.value })}
                    placeholder="Rövid megjegyzés a badge tooltiphez"
                  />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-full gap-1" onClick={addRow}>
              <IconPlus className="size-4" />
              Új elismerés
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Mégse
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            {loading ? "Mentés…" : "Mentés"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
};

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Megerősítés",
  destructive,
  onConfirm,
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Mégse
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} onClick={run} disabled={loading}>
            {loading ? "…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
