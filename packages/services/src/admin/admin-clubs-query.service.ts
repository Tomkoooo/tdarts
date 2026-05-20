import mongoose from 'mongoose';
import { connectMongo, ClubModel, PlayerModel, TournamentModel, UserModel } from '@tdarts/core';

export type AdminClubMemberPreview = { _id: string; name: string };
export type AdminClubStaffPreview = { _id: string; email: string; name: string };
export type AdminClubTournamentPreview = {
  _id: string;
  tournamentId: string;
  status: string;
  isArchived: boolean;
  isSandbox: boolean;
  createdAt: string;
};

export type AdminClubAdminContext = {
  members: AdminClubMemberPreview[];
  admins: AdminClubStaffPreview[];
  moderators: AdminClubStaffPreview[];
  tournaments: AdminClubTournamentPreview[];
};

export type AdminClubListRow = {
  _id: string;
  name: string;
  country: string;
  city: string | null;
  /** Club contact email when present on document. */
  contactEmail: string | null;
  subscriptionModel: string;
  verified: boolean;
  isActive: boolean;
  membersCount: number;
  featureFlags: { liveMatchFollowing?: boolean; advancedStatistics?: boolean };
  updatedAt: string;
};

export type AdminClubsDirectorySummary = {
  totalClubs: number;
  activeClubs: number;
  verifiedClubs: number;
  totalMembers: number;
};

const CLUB_SORT_FIELD: Record<string, string> = {
  name: 'name',
  country: 'country',
  tier: 'subscriptionModel',
  members: 'membersCount',
  updated: 'updatedAt',
};

function resolveClubAggSort(sort?: { key: string; dir: 'asc' | 'desc' }): Record<string, 1 | -1> {
  if (!sort || !CLUB_SORT_FIELD[sort.key]) return { updatedAt: -1 };
  const f = CLUB_SORT_FIELD[sort.key];
  const d = sort.dir === 'asc' ? 1 : -1;
  return { [f]: d };
}

export class AdminClubsQueryService {
  static async getDirectorySummary(): Promise<AdminClubsDirectorySummary> {
    await connectMongo();
    const agg = await ClubModel.aggregate([
      {
        $addFields: {
          membersCount: { $size: { $ifNull: ['$members', []] } },
        },
      },
      {
        $group: {
          _id: null,
          totalClubs: { $sum: 1 },
          activeClubs: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          verifiedClubs: { $sum: { $cond: [{ $eq: ['$verified', true] }, 1, 0] } },
          totalMembers: { $sum: '$membersCount' },
        },
      },
    ]);

    const doc = agg[0] as
      | { totalClubs: number; activeClubs: number; verifiedClubs: number; totalMembers: number }
      | undefined;

    return {
      totalClubs: doc?.totalClubs ?? 0,
      activeClubs: doc?.activeClubs ?? 0,
      verifiedClubs: doc?.verifiedClubs ?? 0,
      totalMembers: doc?.totalMembers ?? 0,
    };
  }

  static async list(params: {
    q?: string;
    page: number;
    limit: number;
    verified?: 'all' | 'yes' | 'no';
    isActive?: 'all' | 'yes' | 'no';
    subscriptionModel?: 'all' | 'free' | 'basic' | 'pro' | 'enterprise';
    sort?: { key: string; dir: 'asc' | 'desc' };
  }): Promise<{ total: number; rows: AdminClubListRow[] }> {
    await connectMongo();
    const limit = Math.min(Math.max(params.limit, 1), 100);
    const page = Math.max(params.page, 1);
    const skip = (page - 1) * limit;

    const match: Record<string, unknown> = {};
    const q = params.q?.trim();
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(esc, 'i');
      match.$or = [
        { name: rx },
        { location: rx },
        { 'structuredLocation.city': rx },
        { 'structuredLocation.formattedAddress': rx },
      ];
    }
    if (params.verified === 'yes') match.verified = true;
    if (params.verified === 'no') match.verified = false;
    if (params.isActive === 'yes') match.isActive = true;
    if (params.isActive === 'no') match.isActive = false;
    if (params.subscriptionModel && params.subscriptionModel !== 'all') {
      match.subscriptionModel = params.subscriptionModel;
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: match },
      {
        $addFields: {
          membersCount: { $size: { $ifNull: ['$members', []] } },
        },
      },
      {
        $project: {
          name: 1,
          country: 1,
          city: '$structuredLocation.city',
          contactEmail: '$contact.email',
          subscriptionModel: 1,
          verified: 1,
          isActive: 1,
          membersCount: 1,
          featureFlags: 1,
          updatedAt: 1,
        },
      },
      { $sort: resolveClubAggSort(params.sort) },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'c' }],
        },
      },
    ];

    const agg = await ClubModel.aggregate(pipeline);
    const facet = agg[0] as {
      rows: Record<string, unknown>[];
      total: { c: number }[];
    };
    const total = facet?.total?.[0]?.c ?? 0;
    const rows: AdminClubListRow[] = (facet?.rows ?? []).map((doc) => ({
      _id: String(doc._id),
      name: String(doc.name ?? ''),
      country: String(doc.country ?? ''),
      city: doc.city != null ? String(doc.city) : null,
      contactEmail:
        doc.contactEmail != null && String(doc.contactEmail).trim() !== ''
          ? String(doc.contactEmail).trim()
          : null,
      subscriptionModel: String(doc.subscriptionModel ?? 'free'),
      verified: Boolean(doc.verified),
      isActive: Boolean(doc.isActive),
      membersCount: Number(doc.membersCount) || 0,
      featureFlags: (doc.featureFlags as AdminClubListRow['featureFlags']) ?? {},
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return { total, rows };
  }

  static async getById(clubId: string): Promise<Record<string, unknown> | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(clubId)) return null;
    const doc = await ClubModel.findById(clubId).lean();
    if (!doc) return null;
    const o = doc as Record<string, unknown>;
    // Strip heavy arrays from default payload for overview — callers can refetch if needed
    return {
      _id: String(o._id),
      name: o.name,
      description: o.description,
      location: o.location,
      structuredLocation: o.structuredLocation,
      address: o.address,
      logo: o.logo,
      contact: o.contact,
      subscriptionModel: o.subscriptionModel,
      featureFlags: o.featureFlags,
      verified: o.verified,
      isActive: o.isActive,
      country: o.country,
      billingInfo: o.billingInfo,
      landingPage: o.landingPage,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      membersCount: Array.isArray(o.members) ? o.members.length : 0,
      adminCount: Array.isArray(o.admin) ? o.admin.length : 0,
      moderatorsCount: Array.isArray(o.moderators) ? o.moderators.length : 0,
    };
  }

  static async getClubAdminContext(clubId: string): Promise<AdminClubAdminContext | null> {
    await connectMongo();
    if (!mongoose.Types.ObjectId.isValid(clubId)) return null;
    const club = await ClubModel.findById(clubId)
      .select('members admin moderators')
      .lean();
    if (!club) return null;
    const c = club as {
      members?: unknown[];
      admin?: unknown[];
      moderators?: unknown[];
    };
    const memberIds = (c.members ?? []).map((id) => String(id));
    const adminIds = (c.admin ?? []).map((id) => String(id));
    const moderatorIds = (c.moderators ?? []).map((id) => String(id));
    const clubOid = new mongoose.Types.ObjectId(clubId);

    const [members, admins, moderators, tournamentDocs] = await Promise.all([
      memberIds.length
        ? PlayerModel.find({ _id: { $in: memberIds } })
            .select('name')
            .limit(50)
            .lean()
        : [],
      adminIds.length
        ? UserModel.find({ _id: { $in: adminIds } })
            .select('email name')
            .lean()
        : [],
      moderatorIds.length
        ? UserModel.find({ _id: { $in: moderatorIds } })
            .select('email name')
            .lean()
        : [],
      TournamentModel.find({ clubId: clubOid, isDeleted: { $ne: true } })
        .select('tournamentId tournamentSettings.status isArchived isSandbox createdAt')
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),
    ]);

    const mapStaff = (docs: Record<string, unknown>[]): AdminClubStaffPreview[] =>
      docs.map((u) => ({
        _id: String(u._id),
        email: String(u.email ?? ''),
        name: String(u.name ?? ''),
      }));

    return {
      members: (members as Record<string, unknown>[]).map((p) => ({
        _id: String(p._id),
        name: String(p.name ?? ''),
      })),
      admins: mapStaff(admins as Record<string, unknown>[]),
      moderators: mapStaff(moderators as Record<string, unknown>[]),
      tournaments: (tournamentDocs as Record<string, unknown>[]).map((t) => {
        const settings = t.tournamentSettings as { status?: string } | undefined;
        return {
          _id: String(t._id),
          tournamentId: String(t.tournamentId ?? ''),
          status: String(settings?.status ?? '—'),
          isArchived: Boolean(t.isArchived),
          isSandbox: Boolean(t.isSandbox),
          createdAt:
            t.createdAt instanceof Date ? t.createdAt.toISOString() : new Date().toISOString(),
        };
      }),
    };
  }
}
