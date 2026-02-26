import * as React from "react";

import { getCountryFlagEmoji, getCountryLabel } from "@/lib/countries";
import { cn } from "@/lib/utils";

interface CountryFlagProps {
  countryCode?: string | null;
  className?: string;
  withLabel?: boolean;
}

export function CountryFlag({ countryCode, className, withLabel = false }: CountryFlagProps) {
  const locale = typeof navigator !== "undefined" ? navigator.language : "hu";
  const flag = getCountryFlagEmoji(countryCode);
  const label = getCountryLabel(countryCode, locale);

  if (!flag) return null;

  return (
    <span className={cn("inline-flex items-center gap-1", className)} title={label || countryCode || ""}>
      <span aria-hidden="true">{flag}</span>
      {withLabel && label && <span className="text-xs text-muted-foreground">{label}</span>}
    </span>
  );
}

export default CountryFlag;
