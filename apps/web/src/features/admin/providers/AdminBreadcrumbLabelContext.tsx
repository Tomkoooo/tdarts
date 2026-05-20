'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type Ctx = {
  label: string | null;
  setLabel: (label: string | null) => void;
};

const AdminBreadcrumbLabelContext = createContext<Ctx | null>(null);

export function AdminBreadcrumbLabelProvider({ children }: { children: ReactNode }) {
  const [label, setLabelState] = useState<string | null>(null);
  const setLabel = useCallback((l: string | null) => setLabelState(l), []);
  return (
    <AdminBreadcrumbLabelContext.Provider value={{ label, setLabel }}>
      {children}
    </AdminBreadcrumbLabelContext.Provider>
  );
}

export function useAdminBreadcrumbLabel() {
  return useContext(AdminBreadcrumbLabelContext);
}

/** Sets dynamic breadcrumb title on detail pages (client). */
export function AdminBreadcrumbLabelSetter({ label }: { label: string }) {
  const ctx = useAdminBreadcrumbLabel();
  const setLabel = ctx?.setLabel;
  if (!setLabel) return null;
  return <BreadcrumbLabelEffect label={label} setLabel={setLabel} />;
}

function BreadcrumbLabelEffect({
  label,
  setLabel,
}: {
  label: string;
  setLabel: (l: string | null) => void;
}) {
  useEffect(() => {
    setLabel(label);
    return () => setLabel(null);
  }, [label, setLabel]);
  return null;
}
