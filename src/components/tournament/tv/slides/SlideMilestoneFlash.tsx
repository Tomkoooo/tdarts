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
      <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
        <div className="text-5xl font-semibold text-muted-foreground">{label}</div>
        <div className="text-8xl font-black text-success">{value}</div>
        <div className="max-w-4xl truncate text-5xl font-bold">{playerName}</div>
      </div>
    </SlideFrame>
  );
}
