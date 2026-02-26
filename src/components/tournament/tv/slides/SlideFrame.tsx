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
    <section className={`h-full w-full rounded-2xl bg-gradient-to-br ${accentClassName} border border-muted/30 p-8`}>
      <header className="mb-6 flex items-end justify-between gap-4 border-b border-muted/20 pb-4">
        <h2 className="text-5xl font-bold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-lg text-muted-foreground">{subtitle}</p> : null}
      </header>
      <div className="h-[calc(100%-6rem)] overflow-hidden">{children}</div>
    </section>
  );
}
