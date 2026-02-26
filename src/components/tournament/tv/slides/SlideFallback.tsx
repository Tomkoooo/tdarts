import SlideFrame from "./SlideFrame";

interface SlideFallbackProps {
  title: string;
  description: string;
}

export default function SlideFallback({ title, description }: SlideFallbackProps) {
  return (
    <SlideFrame title={title} accentClassName="from-muted/20 to-background">
      <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">
        {description}
      </div>
    </SlideFrame>
  );
}
