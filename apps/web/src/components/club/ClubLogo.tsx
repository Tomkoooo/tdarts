"use client";

import { cn } from "@/lib/utils";
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton";

type ClubLogoProps = {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: { container: "size-16", image: "h-full w-full" },
  md: { container: "size-20 md:size-24", image: "h-full w-full" },
  lg: { container: "size-24 md:size-28", image: "h-full w-full" },
};

export function ClubLogo({
  src,
  alt,
  className,
  containerClassName,
  size = "md",
}: ClubLogoProps) {
  const sizes = sizeClasses[size];

  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-primary/20 backdrop-blur",
          sizes.container,
          containerClassName
        )}
      >
        <svg
          className="h-6 w-6 text-primary md:h-8 md:w-8"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-muted/30 p-1.5 backdrop-blur",
        sizes.container,
        containerClassName
      )}
    >
      <ImageWithSkeleton
        src={src}
        alt={alt}
        className={cn("object-contain", sizes.image, className)}
        containerClassName="flex h-full w-full items-center justify-center"
      />
    </div>
  );
}

export function resolveClubLogoSrc(club: {
  landingPage?: { logo?: string };
  logo?: string;
}): string | undefined {
  return club.landingPage?.logo || club.logo || undefined;
}
