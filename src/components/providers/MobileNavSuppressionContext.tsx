"use client";

import React from "react";

const MobileNavSuppressionContext = React.createContext<{
  suppress: boolean;
  setSuppress: (v: boolean) => void;
}>({
  suppress: false,
  setSuppress: () => {},
});

export function MobileNavSuppressionProvider({ children }: { children: React.ReactNode }) {
  const [suppress, setSuppress] = React.useState(false);
  const value = React.useMemo(() => ({ suppress, setSuppress }), [suppress]);
  return (
    <MobileNavSuppressionContext.Provider value={value}>{children}</MobileNavSuppressionContext.Provider>
  );
}

export function useMobileNavSuppression() {
  return React.useContext(MobileNavSuppressionContext);
}
