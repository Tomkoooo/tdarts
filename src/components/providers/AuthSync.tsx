"use client";
import { useAuthSync } from '@/hooks/useAuthSync';
import { useProfileCompletenessToast } from '@/hooks/useProfileCompletenessToast';
import { usePendingInvitesToast } from '@/hooks/usePendingInvitesToast';

export default function AuthSync() {
  useAuthSync();
  useProfileCompletenessToast();
  usePendingInvitesToast();
  return null; // Ez a komponens nem renderel semmit, csak szinkronizálja az auth-t
}
