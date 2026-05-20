import Link from 'next/link';
import {
  IconBuilding,
  IconCalendarEvent,
  IconChartBarPopular,
  IconChevronRight,
  IconClipboardList,
  IconDashboard,
  IconHelp,
  IconLogout,
  IconPlayerPlay,
  IconSearch,
  IconTrophy,
  IconUsers,
} from '@tabler/icons-react';

import { AdminMaterialSymbolsDemo } from './AdminMaterialSymbolsDemo';

const TEMPLATE_HINT = 'docs/docs-internal/admin-phases/new-admin-ui';

/**
 * Precision Core design-preview canvas (hard-coded demo data — no Mongo / services).
 * Compare visually with template PNG + HTML mocks under `{TEMPLATE_HINT}`.
 */
export function AdminDesignPreviewScreen({
  locale,
  userDisplayName,
}: {
  locale: string;
  userDisplayName: string;
}) {
  return (
    <div data-admin-design-preview="" className="admin-scrollbar bg-admin-surface text-admin-on-surface">
      {/* Section 2: Shell (sidebar + sticky header chrome) */}
      <div className="flex min-h-screen">
        <aside className="bg-admin-surface-sunken flex w-admin-sidebar shrink-0 flex-col border-admin-outline-variant border-r py-6 pr-4 pl-5">
          <div className="mb-8 px-1">
            <h1 className="font-semibold admin-text-headline-lg text-admin-primary tracking-tight">tDarts Admin</h1>
            <p className="admin-text-label-caps mt-1 opacity-70 text-admin-on-surface-variant">
              Management Platform <span className="font-normal normal-case opacity-60"> · preview</span>
            </p>
          </div>
          <nav className="admin-scrollbar flex-1 space-y-4 overflow-y-auto pr-1">
            <div>
              <p className="admin-text-label-caps mb-2 px-2 text-admin-on-surface-variant">Overview</p>
              <ShellNavActive icon={<IconDashboard size={20} />} label="Dashboard" />
            </div>
            <div>
              <p className="admin-text-label-caps mb-2 px-2 text-admin-on-surface-variant">Directory</p>
              <div className="space-y-1">
                <ShellNavInactive icon={<IconUsers size={20} />} label="Users" />
                <ShellNavInactive icon={<IconBuilding size={20} />} label="Clubs" />
                <ShellNavInactive icon={<IconTrophy size={20} />} label="Tournaments" />
                <ShellNavInactive icon={<IconPlayerPlay size={20} />} label="Players" />
              </div>
            </div>
            <div>
              <p className="admin-text-label-caps mb-2 px-2 text-admin-on-surface-variant">Growth</p>
              <div className="flex items-center justify-between rounded px-2 py-2 opacity-75 text-admin-on-surface-variant hover:bg-admin-surface-container cursor-default">
                <span className="flex items-center gap-2 admin-text-body-sm">
                  <IconChartBarPopular size={20} />
                  Ads · Campaigns
                </span>
                <span className="rounded border border-admin-outline-variant/50 px-1 text-[10px]">Soon</span>
              </div>
            </div>
            <div>
              <p className="admin-text-label-caps mb-2 px-2 text-admin-on-surface-variant">Operations</p>
              <div className="space-y-1">
                <ShellNavInactive icon={<IconClipboardList size={20} />} label="Logs" />
                <ShellNavInactive icon={<IconHelp size={20} />} label="Support" />
              </div>
            </div>
          </nav>
          <div className="mt-auto space-y-3 border-admin-outline-variant border-t pt-4">
            <div className="flex items-center gap-2 px-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-admin-outline-variant bg-admin-surface-variant text-admin-primary">
                <IconUsers size={22} stroke={1.5} />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold admin-text-body-sm">{userDisplayName}</p>
                <p className="admin-text-label-caps text-[10px] opacity-80 text-admin-on-surface-variant">
                  Super admin
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2 px-2 opacity-85 transition-colors admin-text-body-sm text-admin-on-surface-variant hover:text-admin-primary"
            >
              <IconLogout size={20} stroke={1.5} /> Exit app
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top chrome */}
          <header className="flex h-admin-header shrink-0 items-center justify-between border-admin-outline-variant border-b bg-admin-surface-sunken px-6">
            <div className="flex min-w-0 items-center gap-6">
              <div className="hidden flex-col md:flex">
                <span className="admin-text-label-caps text-[10px] text-admin-on-surface-variant">
                  DIRECTORY / USERS
                </span>
                <span className="font-semibold admin-text-body-sm text-admin-primary">Dashboard overview</span>
              </div>
              <nav className="hidden items-center gap-6 lg:flex">
                <span className="border-admin-primary cursor-default border-b-2 pb-1 font-medium admin-text-body-sm text-admin-primary">
                  Overview
                </span>
                <span className="opacity-60 admin-text-body-sm text-admin-on-surface-variant">Users</span>
                <span className="opacity-60 admin-text-body-sm text-admin-on-surface-variant">Clubs</span>
                <span className="opacity-60 admin-text-body-sm text-admin-on-surface-variant">Tournaments</span>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <IconSearch
                  size={18}
                  className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 opacity-55 text-admin-on-surface-variant"
                />
                <input
                  type="search"
                  readOnly
                  placeholder="Global search..."
                  aria-label="Search preview placeholder"
                  className="rounded border-0 bg-admin-surface-container/80 py-1.5 pr-3 pl-10 admin-text-body-sm text-admin-on-surface placeholder:text-admin-on-surface-variant/60 outline-none ring-admin-primary focus:ring-2"
                />
              </div>
              <button
                type="button"
                className="rounded bg-admin-primary-container px-4 py-2 font-bold admin-text-body-sm shadow-lg shadow-admin-darts-red/20 text-white hover:brightness-110"
              >
                Add User
              </button>
            </div>
          </header>

          <main className="admin-scrollbar flex-1 overflow-y-auto p-6 lg:p-8">
            {/* Section 1: tokens */}
            <Section title="Tokens & typography">
              <p className="mb-4 admin-text-body-sm text-admin-on-surface-variant opacity-85">
                Reference for Precision Core utilities. Canonical mocks:{' '}
                <code className="admin-text-mono-data text-admin-primary">{TEMPLATE_HINT}</code>
              </p>
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                <Swatch name="surface" className="bg-admin-surface" />
                <Swatch name="surface-sunken" className="bg-admin-surface-sunken" />
                <Swatch name="surface-elevated" className="bg-admin-surface-elevated" />
                <Swatch name="outline-variant" className="bg-admin-outline-variant" />
                <Swatch name="darts-red" className="bg-admin-darts-red" />
                <Swatch name="primary" className="bg-admin-primary" />
              </div>
              <div className="rounded-xl border border-white/10 bg-admin-surface-elevated p-4 md:p-6">
                <p className="admin-text-stats-lg text-admin-on-surface">2,251</p>
                <p className="admin-text-headline-lg mt-4 text-admin-on-surface">Headline lg — Space Grotesk</p>
                <p className="admin-text-body-sm mt-2 text-admin-on-surface-variant">Body — Inter for dense UI tables.</p>
                <p className="admin-text-label-caps mt-4 tracking-wider text-admin-on-surface-variant">Label caps mono</p>
                <p className="admin-text-mono-data mt-2 text-admin-primary">USR_684c2eaf9aab · 32ms latency</p>
              </div>
            </Section>

            {/* Sections 3–4: breadcrumbs + hero + stat band */}
            <Section title="Hero & stat band" className="mt-12">
              <div className="mb-6 flex flex-wrap items-center gap-2 opacity-85 admin-text-label-caps text-[10px] text-admin-on-surface-variant">
                <span>Admin</span>
                <IconChevronRight size={14} />
                <span className="text-admin-primary">Overview</span>
              </div>
              <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="admin-text-headline-lg text-xl font-bold md:text-3xl">Overview</h2>
                  <p className="mt-1 admin-text-body-sm text-admin-on-surface-variant opacity-85">
                    Operational snapshot of platform performance and engagement (sample numbers).
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="rounded-lg border border-admin-outline-variant bg-transparent px-3 py-2 admin-text-body-sm">
                    Secondary
                  </button>
                  <button type="button" className="rounded-lg bg-admin-primary-container px-3 py-2 font-semibold admin-text-body-sm text-white">
                    Primary
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatTile label="Users (total)" value="2,251" hint="Cumulative lifetime" icon={<IconUsers size={22} />} />
                <StatTile
                  label="New users (7d)"
                  value="32"
                  trend={<span className="font-semibold text-admin-success">+7% vs prior 7d</span>}
                  icon={<IconUsers size={22} />}
                />
                <StatTile
                  label="Active clubs"
                  value="177"
                  trend={<span className="font-semibold text-admin-primary">−2 (−100%) new active</span>}
                  icon={<IconBuilding size={22} />}
                />
                <StatTile label="Open feedback" value="0" hint="High or critical" icon={<IconHelp size={22} />} />
                <StatTile
                  label="API errors (24h)"
                  value="161"
                  trend={<span>−28 (−15%) vs prior 24h</span>}
                  danger
                  icon={<IconChartBarPopular size={22} />}
                />
              </div>
            </Section>

            {/* Section 5: charts */}
            <Section title="Chart cards (SVG placeholders)" className="mt-12">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-xl border border-white/5 bg-admin-surface-elevated p-4 md:p-5">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold admin-text-body-sm md:text-base">User signups (sample)</h3>
                      <p className="mt-1 text-xs text-admin-on-surface-variant opacity-85">
                        New accounts — compare with dashboard_overview mock.
                      </p>
                    </div>
                    <RangePills />
                  </div>
                  <div className="relative h-56 w-full">
                    <svg className="h-full w-full overflow-visible text-admin-darts-red" viewBox="0 0 800 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="pv-grad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#922210" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#922210" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[0, 50, 100, 150, 200].map((y) => (
                        <line
                          key={y}
                          x1={0}
                          x2={800}
                          y1={y}
                          y2={y}
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth={y === 200 ? 1.5 : 1}
                        />
                      ))}
                      <path
                        fill="url(#pv-grad)"
                        d="M0,160 Q100,160 150,140 T300,120 T450,50 T600,150 T800,180 V200 H0 Z"
                      />
                      <path d="M0,160 Q100,160 150,140 T300,120 T450,50 T600,150 T800,180" fill="none" stroke="#922210" strokeWidth={3} />
                    </svg>
                    <div className="flex justify-between opacity-60 admin-text-label-caps mt-2 px-1 text-[10px] text-admin-on-surface-variant">
                      <span>Sat</span>
                      <span>Mon</span>
                      <span>Wed</span>
                      <span>Fri</span>
                      <span>Sun</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/5 bg-admin-surface-elevated p-4 md:p-5">
                  <h3 className="font-semibold admin-text-body-sm">Open feedback by priority</h3>
                  <p className="mt-1 text-xs text-admin-on-surface-variant opacity-85">Tickets pending / in progress.</p>
                  <div className="mt-6 flex h-48 items-end gap-3 px-2">
                    <PriorityBar label="Low" pct={8} faded />
                    <PriorityBar label="Medium" pct={92} emphasized />
                    <PriorityBar label="High" pct={6} faded />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/5 bg-admin-surface-elevated p-4 md:p-5">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <div>
                    <h3 className="font-semibold admin-text-body-sm md:text-base">API errors by route (sample)</h3>
                    <p className="mt-1 text-xs text-admin-on-surface-variant opacity-85">
                      Top routes by bucket — aligns with observability dashboards.
                    </p>
                  </div>
                  <RangePills />
                </div>
                <div className="space-y-3 admin-text-table-data font-mono text-[11px] text-admin-on-surface-variant uppercase">
                  <RouteRow label="featureFlags.checkFeature" widthPct={92} value="1,842" />
                  <RouteRow label="tournaments.getUserTournaments" widthPct={32} value="641" />
                  <RouteRow label="profile.getPlayerStats" widthPct={26} value="523" />
                  <RouteRow label="stream.getTournamentViewerContext" widthPct={14} value="218" />
                </div>
              </div>
            </Section>

            {/* Section 6: tables */}
            <Section title="List / table styling" className="mt-12">
              <div className="custom-scrollbar-admin overflow-auto rounded-xl border border-white/5">
                <table className="w-full min-w-[640px] border-collapse text-left admin-text-table-data">
                  <thead>
                    <tr className="border-admin-outline-variant border-b bg-admin-surface-sunken admin-text-label-caps text-[10px] tracking-wider text-admin-on-surface-variant uppercase">
                      <th className="border-admin-outline-variant/40 border-r px-3 py-3">Email</th>
                      <th className="border-admin-outline-variant/40 border-r px-3 py-3">Username</th>
                      <th className="border-admin-outline-variant/40 border-r px-3 py-3">Flags</th>
                      <th className="border-admin-outline-variant/40 border-r px-3 py-3">Auth</th>
                      <th className="px-3 py-3">Last login</th>
                    </tr>
                  </thead>
                  <tbody>
                    <UserRow email="vera@club.example.com" username="vera_d" verified auth="google" last="2m ago" zebra />
                    <UserRow email="kai@club.example.com" username="kai_m" verified={false} auth="local" last="1h ago" />
                    <ClubRow zebra />
                  </tbody>
                </table>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FooterMini label="Total users" value="2,251" trend="+12.4% MoM" pos />
                <FooterMini label="Verified rate" value="84.2%" hint="1,895 accounts" />
                <FooterMini label="Active today" value="412" hint="Peak 18:00 UTC" />
                <FooterMini label="OAuth vs local" value="62% / 38%" hint="Rough split" />
              </div>
            </Section>

            {/* Section 7: detail */}
            <Section title="Detail layout (club-style)" className="mt-12">
              <div className="rounded-xl border border-white/10 border-l-4 bg-admin-surface-container px-4 py-3 md:px-5 border-l-admin-primary-container">
                <p className="font-semibold admin-text-body-sm">Revert limits</p>
                <p className="mt-1 text-xs text-admin-on-surface-variant opacity-95">
                  Some flag changes write to the audit log; not every field supports undo. Match production copy in{' '}
                  <code className="admin-text-mono-data">AdminRevertLimitsNote</code>.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <DetailCard title="Overview">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 admin-text-body-sm">
                    <dt className="text-admin-on-surface-variant">Subscription</dt>
                    <dd className="font-medium text-admin-success">free</dd>
                    <dt className="text-admin-on-surface-variant">Members</dt>
                    <dd>128</dd>
                    <dt className="text-admin-on-surface-variant">Location</dt>
                    <dd>Jóka · hu</dd>
                  </dl>
                </DetailCard>
                <DetailCard title="Staff">
                  <p className="admin-text-body-sm">
                    Admins · <span className="text-admin-primary">ops@club.example.com</span>
                  </p>
                  <p className="mt-2 opacity-85 admin-text-body-sm text-admin-on-surface-variant">Moderators — none</p>
                </DetailCard>
              </div>

              <div className="mt-4 rounded-xl border border-white/5 bg-admin-surface-elevated p-4 md:p-5">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <h3 className="font-semibold admin-text-body-sm">Club flags</h3>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex cursor-default items-center gap-2 admin-text-body-sm">
                      <input type="checkbox" disabled className="rounded border-admin-outline" /> Verified (sample)
                    </label>
                    <label className="flex cursor-default items-center gap-2 admin-text-body-sm">
                      <input type="checkbox" defaultChecked disabled className="rounded border-admin-outline" /> Active (sample)
                    </label>
                  </div>
                </div>
                <button type="button" className="w-full rounded-lg bg-admin-primary-container py-2.5 font-bold text-white sm:w-auto sm:px-8">
                  Save changes
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-white/5 bg-admin-surface-elevated p-4 md:p-5">
                <h3 className="font-semibold admin-text-body-sm">Recent admin activity</h3>
                <ul className="mt-4 space-y-4 border-admin-outline-variant border-l border-dashed pl-4 md:pl-6">
                  <TimelineItem title="Club flags updated" time="Today · 09:41 UTC" body="verified: false → true" />
                  <TimelineItem title="User verify" time="Yesterday · 18:12 UTC" body="actor staff-svc · target user_demo" />
                </ul>
              </div>
            </Section>

            {/* Section 8: chips / Material symbols */}
            <Section title="Status chips · buttons · icons" className="mt-12">
              <div className="mb-6 flex flex-wrap gap-2">
                <Chip kind="neutral">verified</Chip>
                <Chip kind="success">finished</Chip>
                <Chip kind="warning">pending</Chip>
                <Chip kind="danger">knockout</Chip>
                <Chip kind="info">oauth · google</Chip>
              </div>
              <div className="mb-6 flex flex-wrap gap-3">
                <button type="button" className="rounded-lg px-4 py-2 admin-text-body-sm text-admin-primary underline underline-offset-2">
                  Text link
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-admin-outline-variant bg-transparent px-4 py-2 admin-text-body-sm"
                >
                  Ghost
                </button>
              </div>
              <div>
                <p className="mb-3 admin-text-label-caps opacity-85 text-admin-on-surface-variant">Material Symbols</p>
                <AdminMaterialSymbolsDemo />
              </div>
            </Section>

            {/* Section 9: states */}
            <Section title="Empty · loading · error" className="mt-12">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex flex-col items-center rounded-xl border border-dashed border-admin-outline-variant/60 bg-admin-surface-elevated/50 py-14">
                  <IconCalendarEvent className="mb-4 opacity-45 text-admin-on-surface-variant" size={42} stroke={1.25} />
                  <p className="admin-text-body-sm italic opacity-80">No tournaments linked yet.</p>
                </div>
                <div className="space-y-2 rounded-xl border border-white/8 bg-admin-surface-elevated p-6">
                  <div className="h-6 animate-pulse rounded bg-admin-surface-container-high" />
                  <div className="h-6 animate-pulse rounded bg-admin-surface-container-high" />
                  <div className="h-28 animate-pulse rounded bg-admin-surface-container-high mt-6" />
                </div>
                <div className="rounded-xl border border-admin-error/35 bg-admin-surface-container p-6">
                  <p className="font-semibold admin-text-body-sm text-admin-error">Something went wrong</p>
                  <p className="mt-2 text-xs text-admin-on-surface-variant">Sample boundary — reuse production error fallback.</p>
                </div>
              </div>
            </Section>

            <p className="mt-14 pb-8 text-center text-xs text-admin-on-surface-variant opacity-70">
              Design preview route — hidden from navigation. Adjust tokens in globals.css `@theme` admin-* entries.
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section data-section={title.replace(/\s+/g, '-')}>
      <h2 className="mb-4 border-admin-outline-variant border-b pb-2 font-semibold admin-text-headline-lg text-lg md:text-xl">
        {title}
      </h2>
      <div className={className}>{children}</div>
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-1 overflow-hidden rounded-lg border border-admin-outline-variant/40">
      <div className={`h-14 w-full shrink-0 border-b border-black/40 ${className}`} />
      <span className="admin-text-table-data truncate px-1.5 pb-1.5 text-[11px] text-admin-on-surface-variant">{name}</span>
    </div>
  );
}

function ShellNavActive({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-r border-y border-r border-admin-outline-variant/50 border-l-[3px] border-l-admin-primary bg-admin-surface-elevated px-3 py-2 font-medium admin-text-body-sm text-admin-primary shadow-sm">
      {icon}
      {label}
    </span>
  );
}

function ShellNavInactive({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex cursor-default items-center gap-2 rounded px-3 py-2 opacity-90 transition-colors admin-text-body-sm text-admin-on-surface-variant hover:bg-admin-surface-container hover:text-admin-on-surface">
      {icon}
      {label}
    </span>
  );
}

function StatTile({
  label,
  value,
  hint,
  trend,
  danger,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: React.ReactNode;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col justify-between rounded-xl border border-white/5 bg-admin-surface-elevated p-4 transition-colors hover:border-admin-primary/25 ${
        danger ? 'border-l-4 border-l-admin-darts-red/60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="admin-text-label-caps text-[11px] tracking-wider text-admin-on-surface-variant">{label}</span>
        {icon ? <span className="opacity-40 text-admin-on-surface-variant">{icon}</span> : null}
      </div>
      <div className="mt-3">
        <div className={`admin-text-stats-lg ${danger ? 'text-admin-darts-red' : 'text-admin-on-surface'}`}>{value}</div>
        {trend ? <div className="mt-1 admin-text-body-sm text-admin-on-surface-variant">{trend}</div> : null}
        {hint ? <div className="mt-1 opacity-60 admin-text-body-sm text-admin-on-surface-variant">{hint}</div> : null}
      </div>
    </div>
  );
}

function RangePills() {
  return (
    <div className="flex rounded-lg bg-admin-surface-sunken p-1">
      {['24h', '7d', '30d'].map((r, i) => (
        <span
          key={r}
          className={`rounded px-3 py-1 text-[10px] font-bold ${
            i === 1 ? 'bg-admin-surface-container-high text-admin-primary shadow' : 'opacity-70 text-admin-on-surface-variant'
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function PriorityBar({ label, pct, emphasized, faded }: { label: string; pct: number; emphasized?: boolean; faded?: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2">
      <div
        className={`flex w-full flex-col items-center justify-end rounded-t ${emphasized ? 'bg-admin-darts-red shadow-lg shadow-admin-darts-red/20' : ''} ${
          faded ? 'border-admin-darts-red/40 border-t-2 bg-admin-darts-red/15' : ''
        }`}
        style={{ height: `${Math.max(pct, 10)}%` }}
      />
      <span className={`admin-text-label-caps text-[10px] ${emphasized ? 'text-admin-primary' : 'opacity-60'}`}>{label}</span>
    </div>
  );
}

function RouteRow({ label, widthPct, value }: { label: string; widthPct: number; value: string }) {
  return (
    <div className="group">
      <div className="mb-1 flex justify-between text-[10px] group-hover:text-admin-on-surface">
        <span>{label}</span>
        <span className="font-bold text-admin-primary">{value}</span>
      </div>
      <div className="h-6 overflow-hidden rounded bg-admin-surface-sunken/80">
        <div className="h-full bg-admin-darts-red" style={{ width: `${widthPct}%` }} />
      </div>
    </div>
  );
}

function UserRow({
  email,
  username,
  verified,
  auth,
  last,
  zebra,
}: {
  email: string;
  username: string;
  verified: boolean;
  auth: string;
  last: string;
  zebra?: boolean;
}) {
  return (
    <tr className={`border-admin-outline-variant/30 border-b ${zebra ? 'bg-black/12' : ''}`}>
      <td className="border-admin-outline-variant/30 border-r px-3 py-2.5">{email}</td>
      <td className="border-admin-outline-variant/30 border-r px-3 py-2.5 font-mono">{username}</td>
      <td className="border-admin-outline-variant/30 border-r px-3 py-2.5">{verified ? <Chip kind="success">verified</Chip> : null}</td>
      <td className="border-admin-outline-variant/30 border-r px-3 py-2.5">
        <span className={`${auth === 'google' ? 'text-[#4299FF]' : ''} font-medium`}>{auth}</span>
      </td>
      <td className="px-3 py-2.5">{last}</td>
    </tr>
  );
}

function ClubRow({ zebra }: { zebra?: boolean }) {
  return (
    <tr className={`border-admin-outline-variant/30 border-b ${zebra ? 'bg-black/8' : ''}`}>
      <td colSpan={5} className="px-3 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-admin-surface-container-high font-semibold admin-text-body-sm">
            NE
          </div>
          <div className="min-w-0">
            <div className="font-medium admin-text-body-sm">Neo-Tokyo Elites</div>
            <div className="opacity-85 admin-text-mono-data mt-1 text-admin-on-surface-variant">ID: demo_club_stub</div>
          </div>
          <Sparkline />
          <Chip kind="info">Enterprise</Chip>
          <Chip kind="neutral">Operational</Chip>
        </div>
      </td>
    </tr>
  );
}

function Sparkline() {
  return (
    <svg className="h-8 shrink-0 w-28 text-admin-darts-red" aria-hidden preserveAspectRatio="none" viewBox="0 0 120 36">
      <path d="M0,28 Q20,26 38,22 T74,14 T118,24" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FooterMini({ label, value, hint, trend, pos }: { label: string; value: string; hint?: string; trend?: string; pos?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-admin-surface-elevated p-4">
      <p className="admin-text-label-caps text-[10px] opacity-85 text-admin-on-surface-variant">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="admin-text-stats-lg">{value}</span>
        {trend ? (
          <span className={`text-xs font-bold ${pos ? 'text-admin-success' : 'opacity-85 text-admin-on-surface-variant'}`}>{trend}</span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs opacity-75 text-admin-on-surface-variant">{hint}</p> : null}
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-admin-surface-elevated p-5">
      <h3 className="font-semibold admin-text-body-sm">{title}</h3>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function TimelineItem({ title, time, body }: { title: string; time: string; body: string }) {
  return (
    <li className="-ml-px relative pl-0">
      <span className="absolute top-2 -left-[5px] h-2.5 w-2.5 rounded-full border-2 border-admin-surface-elevated bg-admin-primary ring-2 ring-admin-outline-variant/30" />
      <p className="font-semibold admin-text-body-sm">{title}</p>
      <p className="admin-text-mono-data mt-0.5 opacity-85 text-admin-on-surface-variant">{time}</p>
      <p className="mt-2 rounded bg-black/35 px-3 py-2 font-mono text-xs text-admin-on-surface-variant">{body}</p>
    </li>
  );
}

function Chip({ kind, children }: { kind: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; children: React.ReactNode }) {
  const variants: Record<typeof kind, string> = {
    neutral: 'border border-admin-outline-variant/50 bg-black/35 text-admin-on-surface-variant',
    success: 'border border-admin-success/45 bg-emerald-500/22 text-emerald-200',
    warning: 'border border-admin-warning/55 bg-admin-warning/22 text-admin-on-surface-variant',
    danger: 'border border-admin-darts-red bg-admin-darts-red text-white',
    info: 'border border-[#4299FF]/55 bg-[#4299FF]/14 text-admin-on-surface',
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-tight ${variants[kind]}`}
    >
      {children}
    </span>
  );
}
