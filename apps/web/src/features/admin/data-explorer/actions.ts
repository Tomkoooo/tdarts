'use server';

import { getServerUser } from '@/lib/getServerUser';
import {
  ADMIN_CAPABILITIES,
  AdminAuthorizationService,
  AdminDataExplorerService,
  type AdminExplorerRelation,
} from '@tdarts/services';

async function requireDataExplorerRead() {
  const user = await getServerUser();
  if (!user?._id) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(
    String(user._id),
    ADMIN_CAPABILITIES.ADMIN_DATA_EXPLORER_READ,
  );
  if (!ok) throw new Error('Forbidden');
  return user;
}

async function requireDataExplorerWrite() {
  const user = await getServerUser();
  if (!user?._id) throw new Error('Unauthorized');
  const ok = await AdminAuthorizationService.hasAdminCapability(
    String(user._id),
    ADMIN_CAPABILITIES.ADMIN_DATA_EXPLORER_WRITE,
  );
  if (!ok) throw new Error('Forbidden');
  return user;
}

function parseJsonObject(label: string, raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${label}: invalid JSON`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label}: must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

export async function adminDataExplorerGlobalSearchAction(
  q: string,
  scope?: string,
): Promise<
  | { ok: true; hits: Awaited<ReturnType<typeof AdminDataExplorerService.globalSearch>> }
  | { ok: false; error: string }
> {
  try {
    await requireDataExplorerRead();
    const collections =
      scope && scope !== 'all' ? [scope] : undefined;
    const hits = await AdminDataExplorerService.globalSearch(q, { collections });
    return { ok: true, hits };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Search failed' };
  }
}

export async function adminDataExplorerBrowseAction(input: {
  collection: string;
  filterRaw: string;
  page: number;
  limit: number;
}): Promise<{ ok: true; total: number; rows: Record<string, unknown>[] } | { ok: false; error: string }> {
  try {
    await requireDataExplorerRead();
    const filter = parseJsonObject('Filter', input.filterRaw);
    const page = Number.isFinite(input.page) ? input.page : 1;
    const limit = Number.isFinite(input.limit) ? input.limit : 25;
    const { total, rows } = await AdminDataExplorerService.browse({
      collection: input.collection,
      filter,
      page,
      limit,
    });
    return { ok: true, total, rows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminDataExplorerGetAction(
  collection: string,
  id: string,
): Promise<
  | { ok: true; doc: Record<string, unknown>; relations: AdminExplorerRelation[] }
  | { ok: false; error: string }
> {
  try {
    await requireDataExplorerRead();
    const payload = await AdminDataExplorerService.getDocument(collection, id);
    if (!payload) return { ok: false, error: 'Not found' };
    return { ok: true, doc: payload.doc, relations: payload.relations };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminDataExplorerLookupAction(input: {
  collection: string;
  field: string;
  value: string;
}): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  try {
    await requireDataExplorerRead();
    const id = await AdminDataExplorerService.lookupByField(
      input.collection,
      input.field,
      input.value,
    );
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}

export async function adminDataExplorerPatchAction(input: {
  collection: string;
  id: string;
  patchRaw: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const actor = await requireDataExplorerWrite();
    const patch = parseJsonObject('Patch', input.patchRaw);
    await AdminDataExplorerService.applyPatch(String(actor._id), input.collection, input.id, patch);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}
