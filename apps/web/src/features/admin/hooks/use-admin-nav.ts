'use client';

import { useMemo } from 'react';
import { adminNavGroups } from '@/features/admin/config/nav';
import type { AdminNavGroup, AdminNavItem } from '@/features/admin/types/nav';

function filterItems(items: AdminNavItem[], capabilities: Set<string>): AdminNavItem[] {
  return items
    .filter((item) => !item.capability || capabilities.has(item.capability))
    .map((item) => {
      if (!item.items?.length) return item;
      const children = filterItems(item.items, capabilities);
      if (children.length === 0) return null;
      return { ...item, items: children };
    })
    .filter((item): item is AdminNavItem => item !== null);
}

export function useFilteredAdminNavGroups(capabilities: string[]): AdminNavGroup[] {
  const capSet = useMemo(() => new Set(capabilities), [capabilities]);

  return useMemo(() => {
    return adminNavGroups
      .map((group) => ({
        ...group,
        items: filterItems(group.items, capSet),
      }))
      .filter((group) => group.items.length > 0);
  }, [capSet]);
}
