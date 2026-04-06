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
  const isCheckout = !value.startsWith("+");

  return (
    <SlideFrame
      title={title}
      accentClassName={isCheckout ? "from-amber-400/35 via-transparent to-transparent" : "from-rose-500/35 via-transparent to-transparent"}
    >
      <div className="relative flex h-full flex-col items-center justify-center gap-4 px-3 text-center sm:gap-6 md:gap-9">
        <div className="text-2xl font-semibold text-slate-300 sm:text-4xl md:text-5xl">{label}</div>
        <div className={`animate-pulse text-6xl font-black sm:text-8xl md:text-9xl ${isCheckout ? "text-amber-300" : "text-rose-300"}`}>{value}</div>
        <div className="max-w-5xl truncate text-3xl font-bold text-slate-100 sm:text-5xl md:text-6xl">{playerName}</div>
      </div>
    </SlideFrame>
  );
}
