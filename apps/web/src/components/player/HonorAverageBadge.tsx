import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ScoreBadge from '@/components/player/ScoreBadge';

type HonorAverageBadgeProps = {
  average: number | null;
  className?: string;
  tooltip?: string;
};

export default function HonorAverageBadge({ average, className, tooltip }: HonorAverageBadgeProps) {
  if (!average || !Number.isFinite(average) || average <= 0) {
    return null;
  }

  const badge = <ScoreBadge score={average} className={className} />;

  if (!tooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
