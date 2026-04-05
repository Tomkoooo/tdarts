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
  accentClassName = "from-primary/20 to-background",
}: SlideFrameProps) {
  return (
    <section className={`h-full w-full rounded-xl sm:rounded-2xl bg-linear-to-br ${accentClassName} border border-muted/30 p-3 sm:p-5 md:p-8`}>
      <header className="mb-3 sm:mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5 sm:gap-3 md:gap-4 border-b border-muted/20 pb-2 sm:pb-3 md:pb-4">
        <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">{title}</h2>
        {subtitle ? <p className="text-xs sm:text-sm md:text-lg text-muted-foreground">{subtitle}</p> : null}
      </header>
      <div className="h-[calc(100%-4.5rem)] sm:h-[calc(100%-5rem)] md:h-[calc(100%-6rem)] overflow-hidden">{children}</div>
    </section>
  );
}
