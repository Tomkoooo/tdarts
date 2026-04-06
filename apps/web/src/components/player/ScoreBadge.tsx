import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatHonorAverageBucket, getScoreColor } from "@/lib/honorAvgBadge";

type ScoreBadgeProps = {
  score: number;
  label?: string;
  className?: string;
};

export default function ScoreBadge({ score, label, className }: ScoreBadgeProps) {
  if (!Number.isFinite(score) || score <= 0) return null;

  const displayLabel = label || formatHonorAverageBucket(score);
  if (!displayLabel) return null;

  const base = getScoreColor(score, "base");
  const dark = getScoreColor(score, "dark");
  const light = getScoreColor(score, "light");

  return (
    <Badge
      variant="outline"
      className={cn(
        "border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-[9px] font-bold text-white",
        className
      )}
      style={{
        backgroundColor: base.replace(")", " / 0.30)"),
        borderColor: dark.replace(")", " / 0.72)"),
        boxShadow: `0 0 0 1px ${light.replace(")", " / 0.38)")} inset, 0 2px 10px ${base.replace(")", " / 0.28)")}`,
      }}
    >
      {displayLabel}
    </Badge>
  );
}
