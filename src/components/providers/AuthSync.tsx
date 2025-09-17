"use client";
import { useAuthSync } from '@/hooks/useAuthSync';

export default function AuthSync() {
  useAuthSync();
  return null; // Ez a komponens nem renderel semmit, csak szinkronizálja az auth-t
}
