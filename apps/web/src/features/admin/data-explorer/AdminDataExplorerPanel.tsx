'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { getTournamentStatusBadgeVariant, getFeedbackStatusBadgeVariant, getMatchStatusBadgeVariant } from '@/features/admin/lib/status-badges';
import { AdminRawJson } from '@/features/admin/components/AdminRawJson';
import { AdminSection } from '@/features/admin/components/AdminSection';
import { AdminConfirmDialog } from '@/features/admin/components/AdminConfirmDialog';
import {
  adminDataExplorerBrowseAction,
  adminDataExplorerGetAction,
  adminDataExplorerGlobalSearchAction,
  adminDataExplorerLookupAction,
  adminDataExplorerPatchAction,
} from '@/features/admin/data-explorer/actions';
import type { AdminGlobalSearchHit } from '@tdarts/services';

type Crumb = { collection: string; id: string; label: string };

type Props = {
  collections: string[];
  /** Effective `ADMIN_DATA_EXPLORER_WRITE` (typically super-admin). */
  canWrite: boolean;
};

const PAGE_LIMIT = 25;

export function AdminDataExplorerPanel({ collections, canWrite }: Props) {
  const t = useTranslations('Admin.data_explorer');
  const safeCollections = collections.length ? collections : ['users'];
  const [collection, setCollection] = useState(safeCollections[0] ?? '');
  const [filterRaw, setFilterRaw] = useState('{}');
  const filterRawRef = useRef(filterRaw);
  filterRawRef.current = filterRaw;
  const [page, setPage] = useState(1);
  const [browsePending, setBrowsePending] = useState(false);
  const [browse, setBrowse] = useState<{ total: number; rows: Record<string, unknown>[] } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [inspectCrumbs, setInspectCrumbs] = useState<Crumb[]>([]);
  const inspectTarget = inspectCrumbs.at(-1) ?? null;

  const [inspectPending, setInspectPending] = useState(false);
  const [inspect, setInspect] = useState<{
    doc: Record<string, unknown>;
    relations: { path: string; id: string; collection?: string; label: string }[];
  } | null>(null);

  const [patchRaw, setPatchRaw] = useState('{}');
  const [patchOpen, setPatchOpen] = useState(false);
  const [patchPending, setPatchPending] = useState(false);

  const [lookupColl, setLookupColl] = useState<'users' | 'clubs'>('users');
  const [lookupValue, setLookupValue] = useState('');
  const [lookupPending, setLookupPending] = useState(false);

  const [globalQ, setGlobalQ] = useState('');
  const [searchScope, setSearchScope] = useState('all');
  const [searchHits, setSearchHits] = useState<AdminGlobalSearchHit[] | null>(null);
  const [searchPending, setSearchPending] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const runGlobalSearch = async () => {
    const q = globalQ.trim();
    if (!q) {
      setSearchHits(null);
      return;
    }
    setSearchPending(true);
    setBanner(null);
    try {
      const res = await adminDataExplorerGlobalSearchAction(q, searchScope);
      if (!res.ok) {
        setSearchHits(null);
        setBanner(res.error);
        return;
      }
      setSearchHits(res.hits);
    } finally {
      setSearchPending(false);
    }
  };

  const openHit = (hit: AdminGlobalSearchHit) => {
    setInspectCrumbs([
      {
        collection: hit.collection,
        id: hit.id,
        label: `${hit.collection}: ${hit.title}`,
      },
    ]);
  };

  const statusBadge = (collection: string, status?: string) => {
    if (!status) return null;
    const v =
      collection === 'tournaments'
        ? getTournamentStatusBadgeVariant(status)
        : collection === 'feedback'
          ? getFeedbackStatusBadgeVariant(status)
          : collection === 'matches'
            ? getMatchStatusBadgeVariant(status)
            : 'secondary';
    return (
      <Badge variant={v as 'secondary'} className="text-xs">
        {status}
      </Badge>
    );
  };

  const browseNow = useCallback(async () => {
    setBanner(null);
    setBrowsePending(true);
    try {
      const res = await adminDataExplorerBrowseAction({
        collection,
        filterRaw: filterRawRef.current,
        page,
        limit: PAGE_LIMIT,
      });
      if (!res.ok) {
        setBrowse(null);
        setBanner(res.error);
        return;
      }
      setBrowse({ total: res.total, rows: res.rows });
    } finally {
      setBrowsePending(false);
    }
  }, [collection, page]);

  useEffect(() => {
    void browseNow();
  }, [browseNow]);

  const loadInspectFor = useCallback(
    async (target: Crumb) => {
      setInspectPending(true);
      setBanner(null);
      try {
        const res = await adminDataExplorerGetAction(target.collection, target.id);
        if (!res.ok) {
          setInspect(null);
          setBanner(res.error);
          return;
        }
        setInspect(res);
        if (canWrite) setPatchRaw('{}');
      } finally {
        setInspectPending(false);
      }
    },
    [canWrite],
  );

  useEffect(() => {
    if (!inspectTarget) {
      setInspect(null);
      return;
    }
    void loadInspectFor(inspectTarget);
  }, [inspectTarget, loadInspectFor]);

  const totalPages = browse ? Math.max(1, Math.ceil(browse.total / PAGE_LIMIT)) : 1;

  const lookupField = lookupColl === 'users' ? 'email' : 'name';

  return (
    <div className="space-y-4">
      {banner ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {banner}
        </div>
      ) : null}

      <AdminSection title={t('global_search_title')} description={t('description')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="dx-global-q">{t('global_search_placeholder')}</Label>
            <Input
              id="dx-global-q"
              value={globalQ}
              onChange={(e) => setGlobalQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void runGlobalSearch();
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('global_search_scope')}</Label>
            <select
              className="border-border bg-background min-w-[10rem] rounded-md border px-2 py-2 text-sm"
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value)}
            >
              <option value="all">{t('global_search_all')}</option>
              {safeCollections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" disabled={searchPending} onClick={() => void runGlobalSearch()}>
            {searchPending ? t('searching') : t('global_search_run')}
          </Button>
        </div>
        {searchHits !== null ? (
          <div className="mt-4">
            <p className="text-muted-foreground mb-2 text-xs">
              {searchHits.length
                ? t('global_search_hits', { count: searchHits.length })
                : t('global_search_empty')}
            </p>
            {searchHits.length > 0 ? (
              <div className="border-border overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
                    <tr>
                      <th className="px-3 py-2">Név / cím</th>
                      <th className="px-3 py-2">Típus</th>
                      <th className="px-3 py-2">Státusz</th>
                      <th className="px-3 py-2">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {searchHits.map((hit) => (
                      <tr
                        key={`${hit.collection}-${hit.id}`}
                        className="hover:bg-muted/40 cursor-pointer"
                        onClick={() => openHit(hit)}
                      >
                        <td className="px-3 py-2">
                          <span className="font-medium">{hit.title}</span>
                          {hit.subtitle ? (
                            <span className="text-muted-foreground block text-xs">{hit.subtitle}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">{hit.collection}</Badge>
                        </td>
                        <td className="px-3 py-2">{statusBadge(hit.collection, hit.status)}</td>
                        <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                          {hit.id.slice(-8)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminSection>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
      <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" className="mb-2 w-full justify-between">
            {t('advanced_browse')}
            <span className="text-muted-foreground text-xs">{advancedOpen ? '▲' : '▼'}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
      <AdminSection title={t('browse_title')} description={t('browse_description')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex min-w-[10rem] flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t('collection')}</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-2 text-sm"
              value={collection}
              onChange={(e) => {
                setCollection(e.target.value);
                setInspectCrumbs([]);
                setPage(1);
              }}
            >
              {safeCollections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="dx-filter">{t('filter_json')}</Label>
            <Textarea
              id="dx-filter"
              className="min-h-[4.5rem] font-mono text-xs"
              value={filterRaw}
              spellCheck={false}
              onChange={(e) => setFilterRaw(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={browsePending}
              onClick={() => {
                void browseNow();
              }}
            >
              {browsePending ? t('loading') : t('refresh')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
              }}
              disabled={page <= 1}
            >
              {t('prev_page')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={page >= totalPages}
            >
              {t('next_page')}
            </Button>
          </div>
        </div>

        {browse ? (
          <div className="mt-4 space-y-2">
            <p className="text-muted-foreground text-xs">
              {t('page_summary', { page, totalPages, total: browse.total })}
            </p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">_id</th>
                    <th className="px-3 py-2 font-medium">{t('preview')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {browse.rows.map((row) => {
                    const rid = row._id != null ? String(row._id) : '';
                    const serialized = JSON.stringify(row);
                    const compact = serialized.slice(0, 120);
                    return (
                      <tr
                        key={rid || compact}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => {
                          if (!rid) return;
                          setInspectCrumbs([
                            {
                              collection,
                              id: rid,
                              label: `${collection}:${rid.slice(0, 8)}`,
                            },
                          ]);
                        }}
                      >
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{rid || '—'}</td>
                        <td className="max-w-xl truncate px-3 py-2 font-mono text-xs text-muted-foreground">
                          {compact}
                          {serialized.length > 120 ? '…' : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </AdminSection>
        </CollapsibleContent>
      </Collapsible>
        </div>

        <div className="space-y-4">
      <AdminSection title={t('lookup_title')} description={t('lookup_description')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-[8rem] flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t('lookup')}</span>
            <select
              className="border-border bg-background rounded-md border px-2 py-2 text-sm"
              value={lookupColl}
              onChange={(e) => setLookupColl(e.target.value as 'users' | 'clubs')}
            >
              <option value="users">{t('lookup_user_email')}</option>
              <option value="clubs">{t('lookup_club_name')}</option>
            </select>
          </label>
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="dx-lookup">
              {lookupColl === 'users' ? t('email') : t('club_name')}
            </Label>
            <input
              id="dx-lookup"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={lookupValue}
              onChange={(e) => setLookupValue(e.target.value)}
              spellCheck={false}
            />
          </div>
          <Button
            type="button"
            disabled={lookupPending}
            onClick={async () => {
              setLookupPending(true);
              setBanner(null);
              try {
                const res = await adminDataExplorerLookupAction({
                  collection: lookupColl,
                  field: lookupField,
                  value: lookupValue,
                });
                if (!res.ok) {
                  setBanner(res.error);
                  return;
                }
                if (!res.id) {
                  setBanner(t('lookup_empty'));
                  return;
                }
                setInspectCrumbs([
                  {
                    collection: lookupColl,
                    id: res.id,
                    label: `${lookupColl}:${lookupValue.trim()}`,
                  },
                ]);
              } finally {
                setLookupPending(false);
              }
            }}
          >
            {lookupPending ? t('searching') : t('open')}
          </Button>
        </div>
      </AdminSection>

      <AdminSection title={t('inspector_title')} description={t('inspector_description')}>
        {!inspectTarget ? (
          <p className="text-muted-foreground text-sm">{t('inspector_empty')}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {inspectCrumbs.map((cr, i) => (
                <React.Fragment key={`${cr.collection}-${cr.id}-${i}`}>
                  {i > 0 ? <span className="text-muted-foreground">/</span> : null}
                  <button
                    type="button"
                    className={`rounded px-2 py-0.5 hover:bg-muted ${
                      i === inspectCrumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                    }`}
                    onClick={() => setInspectCrumbs((prev) => prev.slice(0, i + 1))}
                  >
                    {cr.label}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {inspectPending ? (
              <p className="text-muted-foreground text-sm">{t('loading_doc')}</p>
            ) : inspect ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {inspect.relations.length ? (
                    <span className="text-muted-foreground w-full text-xs">{t('relations')}</span>
                  ) : null}
                  {inspect.relations.map((r) =>
                    r.collection ? (
                      <button
                        key={`${r.path}-${r.id}`}
                        type="button"
                        onClick={() => {
                          setInspectCrumbs((prev) => [
                            ...prev,
                            { collection: r.collection!, id: r.id, label: `${r.path}: ${r.label}` },
                          ]);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs hover:bg-muted"
                      >
                        <span className="font-mono text-muted-foreground">{r.path}</span>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="secondary" className="font-normal">
                          {r.label}
                        </Badge>
                      </button>
                    ) : (
                      <Badge key={`${r.path}-${r.id}`} variant="outline" title="Unknown Mongoose ref collection mapping">
                        {r.path}: {r.id}
                      </Badge>
                    ),
                  )}
                </div>

                <AdminRawJson data={inspect.doc} />

                {canWrite ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="dx-patch">{t('patch_label')}</Label>
                      <Textarea
                        id="dx-patch"
                        spellCheck={false}
                        className="min-h-[6rem] font-mono text-xs"
                        value={patchRaw}
                        onChange={(e) => setPatchRaw(e.target.value)}
                      />
                      <Button type="button" variant="destructive" onClick={() => setPatchOpen(true)}>
                        {t('apply_patch')}
                      </Button>
                    </div>
                    <AdminConfirmDialog
                      open={patchOpen}
                      onOpenChange={setPatchOpen}
                      variant="danger"
                      title={t('patch_confirm_title')}
                      description={t('patch_confirm_description', {
                        collection: inspectTarget.collection,
                        id: inspectTarget.id,
                      })}
                      confirmPhrase="PATCH"
                      confirmLabel={t('apply_patch')}
                      pending={patchPending}
                      onConfirm={() => {
                        void (async () => {
                          setPatchPending(true);
                          setBanner(null);
                          try {
                            const res = await adminDataExplorerPatchAction({
                              collection: inspectTarget.collection,
                              id: inspectTarget.id,
                              patchRaw,
                            });
                            if (!res.ok) {
                              setBanner(res.error);
                              return;
                            }
                            setPatchOpen(false);
                            setPatchRaw('{}');
                            await loadInspectFor(inspectTarget);
                            await browseNow();
                          } finally {
                            setPatchPending(false);
                          }
                        })();
                      }}
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        )}
      </AdminSection>
        </div>
      </div>
    </div>
  );
}
