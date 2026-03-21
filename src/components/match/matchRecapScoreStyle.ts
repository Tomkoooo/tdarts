import { cn } from "@/lib/utils";

export function recapLocalVisitCellClass(
  throwCell: { score: number; isCheckout: boolean } | undefined,
  isWinner: boolean,
): string {
  if (!throwCell) {
    return "border border-dashed border-primary/30 bg-muted/20 text-muted-foreground";
  }
  if (throwCell.isCheckout && isWinner) {
    return "bg-primary/20 text-primary ring-1 ring-primary/50";
  }
  if (throwCell.score >= 180) {
    return "bg-accent/20 text-accent border border-accent/20";
  }
  if (throwCell.score >= 140) {
    return "bg-rose-500/15 text-rose-400 border border-rose-500/20";
  }
  if (throwCell.score >= 120) {
    return "bg-orange-500/15 text-orange-400 border border-orange-500/20";
  }
  if (throwCell.score >= 100) {
    return "bg-blue-500/15 text-blue-400 border border-blue-500/20";
  }
  if (throwCell.score >= 60) {
    return "bg-muted/70 text-foreground";
  }
  return "bg-muted/40 text-muted-foreground";
}

export function recapTournamentVisitCellClass(
  throwObj: { score: number; isCheckout?: boolean } | undefined,
  isWinner: boolean,
): string {
  if (!throwObj) {
    return cn(
      "rounded px-1 py-0.5 text-center font-mono text-[11px] font-bold",
      "border border-dashed border-primary/30 bg-muted/20 text-primary",
    );
  }
  const base = "rounded px-1 py-0.5 text-center font-mono text-[11px] font-bold";
  if (throwObj.isCheckout && isWinner) {
    return cn(base, "bg-primary/20 text-primary ring-1 ring-primary/50");
  }
  if (throwObj.score >= 180) {
    return cn(base, "bg-accent/20 text-accent border border-accent/20");
  }
  if (throwObj.score >= 140) {
    return cn(base, "bg-rose-500/15 text-rose-400 border border-rose-500/20");
  }
  if (throwObj.score >= 120) {
    return cn(base, "bg-orange-500/15 text-orange-400 border border-orange-500/20");
  }
  if (throwObj.score >= 100) {
    return cn(base, "bg-blue-500/15 text-blue-400 border border-blue-500/20");
  }
  if (throwObj.score >= 60) {
    return cn(base, "bg-muted/70 text-foreground");
  }
  return cn(base, "bg-muted/40 text-muted-foreground");
}
