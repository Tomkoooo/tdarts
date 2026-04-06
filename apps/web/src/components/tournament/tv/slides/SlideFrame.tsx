import { ReactNode } from "react";

interface SlideFrameProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accentClassName?: string;
}

export default function SlideFrame({
  title,
  subtitle,
  children,
  accentClassName = "from-primary/25 via-transparent to-transparent",
}: SlideFrameProps) {
  return (
    <section className="relative h-full w-full overflow-hidden bg-slate-950 text-slate-100">
      <div className={`pointer-events-none absolute inset-0 bg-radial from-0% via-40% to-75% ${accentClassName}`} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.2),rgba(2,6,23,0.65))]" />

      <div className="relative z-10 flex h-full flex-col px-5 py-5 sm:px-8 sm:py-7 md:px-12 md:py-10">
        <header className="mb-4 flex items-end justify-between gap-4 sm:mb-5 md:mb-7">
          <div className="min-w-0">
            <h2 className="truncate text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-6xl">{title}</h2>
            {subtitle ? <p className="mt-1 truncate text-sm text-slate-300 sm:text-base md:text-xl">{subtitle}</p> : null}
          </div>
          <span className="hidden rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-300 sm:inline-flex">
            TV
          </span>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </section>
  );
}
