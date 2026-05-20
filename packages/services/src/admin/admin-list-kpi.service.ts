import mongoose from 'mongoose';
import {
  connectMongo,
  UserModel,
  ClubModel,
  TournamentModel,
  PlayerModel,
  MatchModel,
  LeagueModel,
} from '@tdarts/core';

export type AdminListKpiRange = '1d' | '7d' | '30d' | '1y' | 'all' | 'custom';

export type AdminListKpiGranularity = 'hour' | 'day' | 'week' | 'month' | 'year';

export type AdminListKpiPoint = { period: string; count: number };

export type AdminListKpiBreakdownSeries = {
  key: string;
  label: string;
  points: AdminListKpiPoint[];
};

export type AdminListKpiQuery = {
  range?: AdminListKpiRange | string | null;
  from?: string | null;
  to?: string | null;
  /** User-selected X-axis grouping (hour, day, week, month, year). */
  group?: AdminListKpiGranularity | string | null;
};

export type AdminListKpiSnapshot = {
  range: AdminListKpiRange;
  granularity: AdminListKpiGranularity;
  rangeLabel: string;
  total: number;
  deltaLabel?: string;
  delta?: number;
  /** Legacy single total line (same as first breakdown or aggregate). */
  series: AdminListKpiPoint[];
  /** Multi-series data for stacked/line chart (verified users, subscription tiers, …). */
  breakdownSeries: AdminListKpiBreakdownSeries[];
  chips?: { label: string; value: string | number }[];
};

const MS_DAY = 24 * 60 * 60 * 1000;

type RangeConfig = {
  range: AdminListKpiRange;
  since: Date | null;
  until: Date;
  priorSince: Date | null;
  priorUntil: Date | null;
  granularity: AdminListKpiGranularity;
  rangeLabel: string;
};

type SeriesDef = { key: string; label: string; match: Record<string, unknown> };

function parseDateOnly(raw?: string | null): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseGroup(raw?: string | null): AdminListKpiGranularity | null {
  if (raw === 'hour' || raw === 'day' || raw === 'week' || raw === 'month' || raw === 'year') return raw;
  return null;
}

function defaultGroupForSpan(spanDays: number): AdminListKpiGranularity {
  if (spanDays <= 2) return 'hour';
  if (spanDays <= 45) return 'day';
  if (spanDays <= 120) return 'week';
  if (spanDays <= 800) return 'month';
  return 'year';
}

function defaultGroupForPreset(preset: AdminListKpiRange): AdminListKpiGranularity {
  if (preset === '1d') return 'hour';
  if (preset === '7d') return 'day';
  if (preset === '30d') return 'day';
  if (preset === '1y') return 'month';
  return 'month';
}

function periodFormat(granularity: AdminListKpiGranularity): string {
  switch (granularity) {
    case 'hour':
      return '%Y-%m-%d %H:00';
    case 'day':
      return '%Y-%m-%d';
    case 'week':
      return '%G-W%V';
    case 'month':
      return '%Y-%m';
    case 'year':
      return '%Y';
  }
}

function periodLimit(granularity: AdminListKpiGranularity): number {
  switch (granularity) {
    case 'hour':
      return 168;
    case 'day':
      return 400;
    case 'week':
      return 260;
    case 'month':
      return 240;
    case 'year':
      return 50;
  }
}

const GROUP_LABELS: Record<AdminListKpiGranularity, string> = {
  hour: 'óra',
  day: 'nap',
  week: 'hét',
  month: 'hónap',
  year: 'év',
};

function resolveQuery(query?: AdminListKpiQuery): RangeConfig {
  const explicitGroup = parseGroup(query?.group ?? null);
  const from = parseDateOnly(query?.from);
  const toRaw = parseDateOnly(query?.to);
  const until = toRaw ? endOfDay(toRaw) : new Date();

  if (from && until && from <= until) {
    const spanDays = (until.getTime() - from.getTime()) / MS_DAY;
    const granularity = explicitGroup ?? defaultGroupForSpan(spanDays);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return {
      range: 'custom',
      since: from,
      until,
      priorSince: null,
      priorUntil: null,
      granularity,
      rangeLabel: `${fmt(from)} – ${fmt(until)} · ${GROUP_LABELS[granularity]}`,
    };
  }

  const preset = AdminListKpiService.parseRange(query?.range ?? null);
  if (preset === 'all') {
    const granularity = explicitGroup ?? 'month';
    return {
      range: 'all',
      since: null,
      until: new Date(),
      priorSince: null,
      priorUntil: null,
      granularity,
      rangeLabel: `Összes idő · ${GROUP_LABELS[granularity]}`,
    };
  }

  const days =
    preset === '1d' ? 1 : preset === '30d' ? 30 : preset === '1y' ? 365 : preset === '7d' ? 7 : 7;
  const since = new Date(Date.now() - days * MS_DAY);
  const granularity = explicitGroup ?? defaultGroupForPreset(preset);
  const presetLabels: Record<string, string> = {
    '1d': '1 nap',
    '7d': '7 nap',
    '30d': '1 hónap',
    '1y': '1 év',
  };
  return {
    range: preset,
    since,
    until: new Date(),
    priorSince: new Date(Date.now() - days * 2 * MS_DAY),
    priorUntil: since,
    granularity,
    rangeLabel: `${presetLabels[preset] ?? preset} · ${GROUP_LABELS[granularity]}`,
  };
}

async function countByPeriod(
  model: mongoose.Model<unknown>,
  match: Record<string, unknown>,
  dateField: string,
  cfg: RangeConfig,
): Promise<AdminListKpiPoint[]> {
  const dateMatch: Record<string, unknown> = {};
  if (cfg.since || cfg.until) {
    const bound: Record<string, Date> = {};
    if (cfg.since) bound.$gte = cfg.since;
    if (cfg.until) bound.$lte = cfg.until;
    dateMatch[dateField] = bound;
  }

  const format = periodFormat(cfg.granularity);
  const agg = await model.aggregate([
    { $match: { ...match, ...dateMatch } },
    {
      $group: {
        _id: { $dateToString: { format, date: `$${dateField}` } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: periodLimit(cfg.granularity) },
  ]);
  return (agg as { _id?: string; count?: number }[]).map((r) => ({
    period: String(r._id ?? ''),
    count: Number(r.count) || 0,
  }));
}

async function buildBreakdown(
  model: mongoose.Model<unknown>,
  defs: SeriesDef[],
  dateField: string,
  cfg: RangeConfig,
): Promise<AdminListKpiBreakdownSeries[]> {
  const rows = await Promise.all(
    defs.map(async (d) => ({
      key: d.key,
      label: d.label,
      points: await countByPeriod(model, d.match, dateField, cfg),
    })),
  );
  return rows;
}

function sumSeriesPoints(series: AdminListKpiBreakdownSeries[]): AdminListKpiPoint[] {
  const map = new Map<string, number>();
  for (const s of series) {
    for (const p of s.points) {
      map.set(p.period, (map.get(p.period) ?? 0) + p.count);
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({ period, count }));
}

export class AdminListKpiService {
  static parseRange(raw?: string | null): AdminListKpiRange {
    if (raw === '1d' || raw === '7d' || raw === '30d' || raw === '1y' || raw === 'all' || raw === 'custom') {
      return raw;
    }
    if (raw === '90d') return '30d';
    return '7d';
  }

  static async users(query?: AdminListKpiQuery): Promise<AdminListKpiSnapshot> {
    await connectMongo();
    const cfg = resolveQuery(query);
    const notDeleted = { isDeleted: { $ne: true } };
    const breakdownSeries = await buildBreakdown(
      UserModel,
      [
        { key: 'verified', label: 'Megerősített', match: { ...notDeleted, isVerified: true } },
        { key: 'unverified', label: 'Nem megerősített', match: { ...notDeleted, isVerified: { $ne: true } } },
        { key: 'admin', label: 'Admin', match: { ...notDeleted, isAdmin: true } },
        { key: 'registered', label: 'Összes regisztráció', match: notDeleted },
      ],
      'createdAt',
      cfg,
    );

    const [total, verified, unverified, admins, deleted] = await Promise.all([
      UserModel.countDocuments(notDeleted),
      UserModel.countDocuments({ ...notDeleted, isVerified: true }),
      UserModel.countDocuments({ ...notDeleted, isVerified: { $ne: true } }),
      UserModel.countDocuments({ ...notDeleted, isAdmin: true }),
      UserModel.countDocuments({ isDeleted: true }),
    ]);

    const periodSum = breakdownSeries.find((s) => s.key === 'registered')?.points ?? [];
    const current = periodSum.reduce((a, p) => a + p.count, 0);

    return {
      range: cfg.range,
      granularity: cfg.granularity,
      rangeLabel: cfg.rangeLabel,
      total,
      delta: cfg.since ? current : undefined,
      deltaLabel: cfg.since ? 'új regisztráció a periódusban' : undefined,
      series: periodSum,
      breakdownSeries,
      chips: [
        { label: 'Megerősített (állapot)', value: verified },
        { label: 'Nem megerősített', value: unverified },
        { label: 'Admin', value: admins },
        { label: 'Törölt', value: deleted },
      ],
    };
  }

  static async clubs(query?: AdminListKpiQuery): Promise<AdminListKpiSnapshot> {
    await connectMongo();
    const cfg = resolveQuery(query);
    const active = { isActive: true };
    const subModels = ['free', 'basic', 'pro', 'enterprise'] as const;

    const clubDefs: SeriesDef[] = [
      { key: 'verified', label: 'Verified klub', match: { ...active, verified: true } },
      { key: 'unverified', label: 'Nem verified', match: { ...active, verified: { $ne: true } } },
      ...subModels.map((sm) => ({
        key: `sub_${sm}`,
        label: `Csomag: ${sm}`,
        match: { ...active, subscriptionModel: sm },
      })),
      { key: 'registered', label: 'Új klub', match: active },
    ];

    const [breakdownSeries, tourSeries, total, verified, unverified, subAgg, withTournaments] =
      await Promise.all([
        buildBreakdown(ClubModel, clubDefs, 'createdAt', cfg),
        countByPeriod(
          TournamentModel,
          { isDeleted: { $ne: true } },
          'createdAt',
          cfg,
        ).then((points) => [{ key: 'tournaments', label: 'Új versenyek (klub aktivitás)', points }]),
        ClubModel.countDocuments(active),
        ClubModel.countDocuments({ ...active, verified: true }),
        ClubModel.countDocuments({ ...active, verified: { $ne: true } }),
        ClubModel.aggregate([
          { $match: active },
          { $group: { _id: '$subscriptionModel', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        ClubModel.aggregate([
          { $match: active },
          {
            $lookup: {
              from: 'tournaments',
              localField: '_id',
              foreignField: 'clubId',
              as: 't',
            },
          },
          { $match: { 't.0': { $exists: true } } },
          { $count: 'n' },
        ]),
      ]);

    const allBreakdown = [...breakdownSeries, ...tourSeries];
    const registeredPts = breakdownSeries.find((s) => s.key === 'registered')?.points ?? [];
    const current = registeredPts.reduce((a, p) => a + p.count, 0);
    const subChips = (subAgg as { _id?: string; count?: number }[]).map((r) => ({
      label: String(r._id ?? 'free'),
      value: Number(r.count) || 0,
    }));

    return {
      range: cfg.range,
      granularity: cfg.granularity,
      rangeLabel: cfg.rangeLabel,
      total,
      delta: cfg.since ? current : undefined,
      deltaLabel: cfg.since ? 'új klub a periódusban' : undefined,
      series: registeredPts,
      breakdownSeries: allBreakdown,
      chips: [
        { label: 'Verified (állapot)', value: verified },
        { label: 'Nem verified', value: unverified },
        { label: 'Van verseny', value: (withTournaments[0] as { n?: number } | undefined)?.n ?? 0 },
        ...subChips,
      ],
    };
  }

  static async tournaments(query?: AdminListKpiQuery): Promise<AdminListKpiSnapshot> {
    await connectMongo();
    const cfg = resolveQuery(query);
    const base = { isDeleted: { $ne: true }, isArchived: { $ne: true }, isSandbox: { $ne: true } };
    const statuses = ['pending', 'active', 'finished', 'cancelled'] as const;

    const breakdownSeries = await buildBreakdown(
      TournamentModel,
      [
        ...statuses.map((st) => ({
          key: `status_${st}`,
          label: st,
          match: { ...base, 'tournamentSettings.status': st },
        })),
        { key: 'verified', label: 'Verified', match: { ...base, verified: true } },
        { key: 'sandbox', label: 'Sandbox', match: { isDeleted: { $ne: true }, isSandbox: true } },
        { key: 'all', label: 'Összes (nem archivált)', match: base },
      ],
      'createdAt',
      cfg,
    );

    const [total, verified, sandbox, archived] = await Promise.all([
      TournamentModel.countDocuments(base),
      TournamentModel.countDocuments({ ...base, verified: true }),
      TournamentModel.countDocuments({ isSandbox: true, isDeleted: { $ne: true } }),
      TournamentModel.countDocuments({ isArchived: true, isDeleted: { $ne: true } }),
    ]);

    const allPts = breakdownSeries.find((s) => s.key === 'all')?.points ?? [];

    return {
      range: cfg.range,
      granularity: cfg.granularity,
      rangeLabel: cfg.rangeLabel,
      total,
      series: allPts,
      breakdownSeries,
      chips: [
        { label: 'Verified', value: verified },
        { label: 'Sandbox', value: sandbox },
        { label: 'Archivált', value: archived },
      ],
    };
  }

  static async players(query?: AdminListKpiQuery): Promise<AdminListKpiSnapshot> {
    await connectMongo();
    const cfg = resolveQuery(query);
    const types = ['individual', 'pair', 'team'] as const;

    const breakdownSeries = await buildBreakdown(
      PlayerModel,
      [
        ...types.map((t) => ({ key: `type_${t}`, label: t, match: { type: t } })),
        { key: 'with_user', label: 'Fiókkal', match: { userRef: { $exists: true, $ne: null } } },
        { key: 'all', label: 'Összes játékos', match: {} },
      ],
      'createdAt',
      cfg,
    );

    const total = await PlayerModel.countDocuments({});
    const withUser = await PlayerModel.countDocuments({ userRef: { $exists: true, $ne: null } });
    const allPts = breakdownSeries.find((s) => s.key === 'all')?.points ?? [];

    return {
      range: cfg.range,
      granularity: cfg.granularity,
      rangeLabel: cfg.rangeLabel,
      total,
      series: allPts,
      breakdownSeries,
      chips: [{ label: 'Fiókkal (állapot)', value: withUser }],
    };
  }

  static async matches(query?: AdminListKpiQuery): Promise<AdminListKpiSnapshot> {
    await connectMongo();
    const cfg = resolveQuery(query);

    const breakdownSeries = await buildBreakdown(
      MatchModel,
      [
        { key: 'ongoing', label: 'Élő', match: { status: 'ongoing' } },
        { key: 'finished', label: 'Befejezett', match: { status: 'finished' } },
        { key: 'pending', label: 'Függő', match: { status: 'pending' } },
        { key: 'manual', label: 'Manual override', match: { manualOverride: true } },
        { key: 'all', label: 'Összes aktivitás', match: {} },
      ],
      'updatedAt',
      cfg,
    );

    const total = await MatchModel.countDocuments({});
    const allPts = breakdownSeries.find((s) => s.key === 'all')?.points ?? [];

    return {
      range: cfg.range,
      granularity: cfg.granularity,
      rangeLabel: cfg.rangeLabel,
      total,
      series: allPts,
      breakdownSeries,
      chips: breakdownSeries
        .filter((s) => s.key !== 'all')
        .map((s) => ({
          label: s.label,
          value: s.points.reduce((a, p) => a + p.count, 0),
        })),
    };
  }

  static async leagues(query?: AdminListKpiQuery): Promise<AdminListKpiSnapshot> {
    await connectMongo();
    const cfg = resolveQuery(query);
    const active = { isActive: { $ne: false } };
    const inactive = { isActive: false };

    const breakdownSeries = await buildBreakdown(
      LeagueModel,
      [
        { key: 'active', label: 'Aktív', match: active },
        { key: 'inactive', label: 'Inaktív', match: inactive },
      ],
      'updatedAt',
      cfg,
    );

    const [total, activeCount, inactiveCount] = await Promise.all([
      LeagueModel.countDocuments({}),
      LeagueModel.countDocuments(active),
      LeagueModel.countDocuments(inactive),
    ]);
    const series = sumSeriesPoints(breakdownSeries);

    return {
      range: cfg.range,
      granularity: cfg.granularity,
      rangeLabel: cfg.rangeLabel,
      total,
      series,
      breakdownSeries,
      chips: [
        { label: 'Aktív (állapot)', value: activeCount },
        { label: 'Inaktív', value: inactiveCount },
      ],
    };
  }
}
