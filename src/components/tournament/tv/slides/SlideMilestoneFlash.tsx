import SlideFrame from "./SlideFrame";

interface SlideMilestoneFlashProps {
  title: string;
  label: string;
  value: string;
  playerName: string;
}

export default function SlideMilestoneFlash({
  title,
  label,
  value,
  playerName,
}: SlideMilestoneFlashProps) {
  return (
    <SlideFrame title={title} accentClassName="from-success/25 to-background">
      <div className="flex h-full flex-col items-center justify-center gap-3 sm:gap-5 md:gap-8 text-center px-3">
        <div className="text-2xl sm:text-4xl md:text-5xl font-semibold text-muted-foreground">{label}</div>
        <div className="text-5xl sm:text-7xl md:text-8xl font-black text-success">{value}</div>
        <div className="max-w-4xl truncate text-2xl sm:text-4xl md:text-5xl font-bold">{playerName}</div>
      </div>
    </SlideFrame>
  );
}
